import { promises as fs } from 'node:fs'
import type { Dirent } from 'node:fs'
import type { FileHandle } from 'node:fs/promises'
import path from 'node:path'
import type {
  FileContent,
  SaveResult,
  SnapshotContent,
  SnapshotInfo,
  TemplateFile,
  TreeNode
} from '../shared/types'
import {
  assertContained,
  joinRel,
  normalizeRel,
  PathValidationError,
  toAbsolute,
  toAbsoluteReal,
  validateEntryName
} from './paths'

const MAX_FILE_BYTES = 8 * 1024 * 1024
const MAX_TREE_DEPTH = 16
const MAX_TREE_NODES = 20_000
const HISTORY_DIR = '.history'
const TEMPLATES_DIR = '_templates'
const MAX_SNAPSHOTS = 40
const SKIPPED_DIRS = new Set(['node_modules', '.git', '.obsidian', '.vscode', '.trash', TEMPLATES_DIR, '_attachments'])

export interface OpenedArchive {
  root: string
  tree: TreeNode
}

export async function openArchive(directory: string): Promise<OpenedArchive> {
  if (typeof directory !== 'string' || !directory) {
    throw new PathValidationError('No folder was selected.')
  }
  const root = await fs.realpath(directory)
  const stat = await fs.stat(root)
  if (!stat.isDirectory()) {
    throw new PathValidationError('The selected path is not a folder.')
  }
  return { root, tree: await buildTree(root) }
}

export async function buildTree(root: string): Promise<TreeNode> {
  const budget = { count: 0 }
  return scanDirectory(root, '', 0, budget)
}

async function scanDirectory(
  root: string,
  relPath: string,
  depth: number,
  budget: { count: number }
): Promise<TreeNode> {
  const absolute = relPath ? path.join(root, ...relPath.split('/')) : root
  const node: TreeNode = {
    name: relPath ? path.posix.basename(relPath) : path.basename(root),
    path: relPath,
    kind: 'folder',
    children: []
  }

  if (depth >= MAX_TREE_DEPTH || budget.count >= MAX_TREE_NODES) return node

  let entries: Dirent[]
  try {
    entries = await fs.readdir(absolute, { withFileTypes: true })
  } catch {
    return node
  }

  entries.sort((a, b) => {
    const aDir = a.isDirectory() ? 0 : 1
    const bDir = b.isDirectory() ? 0 : 1
    if (aDir !== bDir) return aDir - bDir
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
  })

  for (const entry of entries) {
    if (budget.count >= MAX_TREE_NODES) break
    if (entry.name === '_sealed' && entry.isFile()) {
      node.sealed = true
      continue
    }
    if (entry.name.startsWith('.')) continue
    if (entry.isSymbolicLink()) continue

    if (entry.isDirectory()) {
      if (SKIPPED_DIRS.has(entry.name)) continue
      budget.count += 1
      node.children!.push(
        await scanDirectory(root, joinRel(relPath, entry.name), depth + 1, budget)
      )
    } else if (entry.isFile() && /\.md$/i.test(entry.name)) {
      budget.count += 1
      node.children!.push({
        name: entry.name,
        path: joinRel(relPath, entry.name),
        kind: 'file'
      })
    }
  }

  return node
}

export async function readPage(root: string, relPath: unknown): Promise<FileContent> {
  const rel = normalizeRel(relPath)
  if (!rel) throw new PathValidationError('No record was specified.')
  if (!/\.md$/i.test(rel)) throw new PathValidationError('Only .md pages can be opened.')

  const absolute = await toAbsoluteReal(root, rel)
  const stat = await fs.stat(absolute)
  if (!stat.isFile()) throw new PathValidationError('That record is not a file.')
  if (stat.size > MAX_FILE_BYTES) {
    throw new PathValidationError('This record is too large to open (8 MB limit).')
  }

  const content = await fs.readFile(absolute, 'utf8')
  return { path: rel, content, mtimeMs: stat.mtimeMs }
}

/** Atomic save: write a sibling temp file, fsync, then rename over the target. */
export async function writePage(
  root: string,
  relPath: unknown,
  content: unknown
): Promise<SaveResult> {
  const rel = normalizeRel(relPath)
  if (!rel) throw new PathValidationError('No record was specified.')
  if (!/\.md$/i.test(rel)) throw new PathValidationError('Only .md pages can be saved.')
  if (typeof content !== 'string') throw new PathValidationError('Record content must be text.')
  if (Buffer.byteLength(content, 'utf8') > MAX_FILE_BYTES) {
    throw new PathValidationError('This record is too large to save (8 MB limit).')
  }

  const absolute = await toAbsoluteReal(root, rel)
  const snapshotId = await snapshotExisting(root, rel, absolute).catch(() => undefined)
  await atomicWrite(absolute, content)

  const stat = await fs.stat(absolute)
  const revision = await incrementRevision(root, rel)
  return { mtimeMs: stat.mtimeMs, snapshotId, revision }
}

async function incrementRevision(root: string, rel: string): Promise<number> {
  const directory = path.join(root, HISTORY_DIR)
  await fs.mkdir(directory, { recursive: true })
  const file = path.join(directory, 'revisions.json')
  let data: Record<string, number> = {}
  try {
    const raw = await fs.readFile(file, 'utf8')
    const parsed = JSON.parse(raw) as Record<string, unknown>
    for (const [key, value] of Object.entries(parsed ?? {})) {
      if (typeof value === 'number' && Number.isFinite(value)) data[key] = value
    }
  } catch {
    data = {}
  }

  if (typeof data[rel] !== 'number') {
    const snapshots = await listSnapshots(root, rel)
    data[rel] = snapshots.length
  }
  const next = data[rel] + 1
  data[rel] = next
  await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf8')
  return next
}

async function atomicWrite(absolute: string, content: string): Promise<void> {
  const directory = path.dirname(absolute)
  const temp = path.join(
    directory,
    `.${path.basename(absolute)}.${process.pid}.${Date.now().toString(36)}.${Math.random()
      .toString(36)
      .slice(2, 8)}.tmp`
  )

  let handle: FileHandle | undefined
  try {
    handle = await fs.open(temp, 'w')
    await handle.writeFile(content, 'utf8')
    await handle.sync()
    await handle.close()
    handle = undefined
    await renameWithRetry(temp, absolute)
  } finally {
    if (handle) await handle.close().catch(() => undefined)
    await fs.unlink(temp).catch(() => undefined)
  }
}

function snapshotStamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

function snapshotDirectory(root: string, rel: string): string {
  const dir = path.posix.dirname(rel)
  return path.join(root, HISTORY_DIR, ...dir.split('/').filter(Boolean))
}

function snapshotPrefix(rel: string): string {
  return `${path.posix.basename(rel).replace(/\.md$/i, '')}@`
}

async function snapshotExisting(
  root: string,
  rel: string,
  absolute: string
): Promise<string | undefined> {
  let stat
  try {
    stat = await fs.stat(absolute)
  } catch {
    return undefined
  }
  if (!stat.isFile()) return undefined

  const existing = await fs.readFile(absolute)
  if (existing.byteLength === 0) return undefined

  const directory = snapshotDirectory(root, rel)
  await fs.mkdir(directory, { recursive: true })
  const id = `${snapshotPrefix(rel)}${snapshotStamp()}.md`
  await fs.writeFile(path.join(directory, id), existing)

  try {
    const prefix = snapshotPrefix(rel)
    const entries = (await fs.readdir(directory))
      .filter((entry) => entry.startsWith(prefix) && entry.endsWith('.md'))
      .sort()
      .reverse()
    await Promise.all(
      entries.slice(MAX_SNAPSHOTS).map((entry) =>
        fs.unlink(path.join(directory, entry)).catch(() => undefined)
      )
    )
  } catch {
    // Retention is best-effort; the new snapshot is already safe.
  }

  return id
}

export async function listSnapshots(root: string, relPath: unknown): Promise<SnapshotInfo[]> {
  const rel = normalizeRel(relPath)
  if (!rel || !/\.md$/i.test(rel)) return []
  const directory = snapshotDirectory(root, rel)
  const prefix = snapshotPrefix(rel)
  let entries: string[]
  try {
    entries = await fs.readdir(directory)
  } catch {
    return []
  }

  const snapshots: SnapshotInfo[] = []
  for (const entry of entries) {
    if (!entry.startsWith(prefix) || !entry.endsWith('.md')) continue
    try {
      const stat = await fs.stat(path.join(directory, entry))
      if (stat.isFile()) snapshots.push({ id: entry, mtimeMs: stat.mtimeMs, size: stat.size })
    } catch {
      // Ignore snapshots removed between readdir and stat.
    }
  }
  return snapshots.sort((a, b) => b.id.localeCompare(a.id))
}

function validateSnapshotId(rel: string, id: unknown): string {
  if (typeof id !== 'string' || id !== path.basename(id) || !/\.md$/i.test(id)) {
    throw new PathValidationError('Invalid snapshot identifier.')
  }
  if (!id.startsWith(snapshotPrefix(rel))) {
    throw new PathValidationError('That snapshot does not belong to this record.')
  }
  return id
}

export async function readSnapshot(
  root: string,
  relPath: unknown,
  id: unknown
): Promise<SnapshotContent> {
  const rel = normalizeRel(relPath)
  if (!rel || !/\.md$/i.test(rel)) throw new PathValidationError('Invalid record path.')
  const safeId = validateSnapshotId(rel, id)
  const target = path.join(snapshotDirectory(root, rel), safeId)
  assertContained(root, target)
  const stat = await fs.stat(target)
  if (!stat.isFile()) throw new PathValidationError('That snapshot is not a file.')
  return {
    id: safeId,
    content: await fs.readFile(target, 'utf8'),
    mtimeMs: stat.mtimeMs
  }
}

export async function restoreSnapshot(
  root: string,
  relPath: unknown,
  id: unknown
): Promise<SaveResult> {
  const snapshot = await readSnapshot(root, relPath, id)
  return writePage(root, relPath, snapshot.content)
}

function templateName(rawName: unknown): string {
  if (typeof rawName !== 'string') throw new PathValidationError('Template name must be text.')
  const trimmed = rawName.trim()
  const withExt = /\.md$/i.test(trimmed) ? trimmed : `${trimmed}.md`
  return validateEntryName(withExt, 'file')
}

export async function listTemplates(root: string): Promise<TemplateFile[]> {
  const directory = path.join(root, TEMPLATES_DIR)
  try {
    await fs.mkdir(directory, { recursive: true })
  } catch {
    return []
  }
  let entries: Dirent[]
  try {
    entries = await fs.readdir(directory, { withFileTypes: true })
  } catch {
    return []
  }
  const templates: TemplateFile[] = []
  for (const entry of entries) {
    if (!entry.isFile() || !/\.md$/i.test(entry.name) || entry.name.startsWith('.')) continue
    try {
      templates.push({
        name: entry.name,
        content: await fs.readFile(path.join(directory, entry.name), 'utf8')
      })
    } catch {
      // Ignore unreadable templates.
    }
  }
  return templates.sort((a, b) => a.name.localeCompare(b.name))
}

export async function saveTemplate(
  root: string,
  rawName: unknown,
  content: unknown
): Promise<TemplateFile> {
  if (typeof content !== 'string') throw new PathValidationError('Template content must be text.')
  if (Buffer.byteLength(content, 'utf8') > MAX_FILE_BYTES) {
    throw new PathValidationError('This template is too large to save (8 MB limit).')
  }
  const name = templateName(rawName)
  const directory = path.join(root, TEMPLATES_DIR)
  await fs.mkdir(directory, { recursive: true })
  const target = path.join(directory, name)
  assertContained(root, target)
  await atomicWrite(target, content)
  return { name, content }
}


async function renameWithRetry(from: string, to: string): Promise<void> {
  let lastError: unknown
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      await fs.rename(from, to)
      return
    } catch (err) {
      lastError = err
      const code = (err as NodeJS.ErrnoException).code
      if (code !== 'EPERM' && code !== 'EBUSY' && code !== 'EACCES') throw err
      await new Promise((resolve) => setTimeout(resolve, 25 * (attempt + 1)))
    }
  }
  throw lastError
}

async function requireDirectory(root: string, relPath: unknown): Promise<string> {
  const rel = normalizeRel(relPath)
  const absolute = await toAbsoluteReal(root, rel)
  const stat = await fs.stat(absolute)
  if (!stat.isDirectory()) throw new PathValidationError('Target is not a folder.')
  return absolute
}

export async function createPage(
  root: string,
  dirRelPath: unknown,
  rawName: unknown
): Promise<{ path: string }> {
  const directory = await requireDirectory(root, dirRelPath)
  const name = validateEntryName(rawName, 'file')
  const target = path.join(directory, name)
  assertContained(root, target)

  try {
    await fs.writeFile(target, '', { encoding: 'utf8', flag: 'wx' })
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new PathValidationError(`A record named "${name}" already exists here.`)
    }
    throw err
  }

  return { path: joinRel(normalizeRel(dirRelPath), name) }
}

export async function createFolder(
  root: string,
  dirRelPath: unknown,
  rawName: unknown
): Promise<{ path: string }> {
  const directory = await requireDirectory(root, dirRelPath)
  const name = validateEntryName(rawName, 'folder')
  const target = path.join(directory, name)
  assertContained(root, target)

  try {
    await fs.mkdir(target)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new PathValidationError(`A folder named "${name}" already exists here.`)
    }
    throw err
  }

  return { path: joinRel(normalizeRel(dirRelPath), name) }
}

export async function renameEntry(
  root: string,
  relPath: unknown,
  rawName: unknown
): Promise<{ path: string }> {
  const rel = normalizeRel(relPath)
  if (!rel) throw new PathValidationError('The archive root cannot be renamed here.')

  const absolute = await toAbsoluteReal(root, rel)
  const stat = await fs.stat(absolute)
  const name = validateEntryName(rawName, stat.isDirectory() ? 'folder' : 'file')
  const target = path.join(path.dirname(absolute), name)
  assertContained(root, target)

  const sameTarget =
    process.platform === 'win32'
      ? target.toLowerCase() === absolute.toLowerCase()
      : target === absolute

  if (!sameTarget) {
    try {
      await fs.access(target)
      throw new PathValidationError(`"${name}" already exists in that folder.`)
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
    }
  }

  await fs.rename(absolute, target)
  const parent = rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : ''
  return { path: joinRel(parent, name) }
}

/** Moves an entry into another existing folder inside the archive. */
export async function moveEntry(
  root: string,
  relPath: unknown,
  targetDirRel: unknown
): Promise<{ path: string }> {
  const rel = normalizeRel(relPath)
  if (!rel) throw new PathValidationError('The archive root cannot be moved.')

  const absolute = await toAbsoluteReal(root, rel)
  const stat = await fs.stat(absolute)
  const name = path.basename(absolute)
  const targetDir = await requireDirectory(root, targetDirRel)
  const target = path.join(targetDir, name)
  assertContained(root, target)

  if (stat.isDirectory()) {
    const targetRel = normalizeRel(path.relative(root, target).split(path.sep).join('/'))
    if (targetRel === rel || targetRel.startsWith(`${rel}/`)) {
      throw new PathValidationError('A folder cannot be moved inside itself.')
    }
  }

  const sameTarget =
    process.platform === 'win32'
      ? target.toLowerCase() === absolute.toLowerCase()
      : target === absolute

  if (sameTarget) {
    return { path: rel }
  }

  try {
    await fs.access(target)
    throw new PathValidationError(`"${name}" already exists in that folder.`)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
  }

  await fs.rename(absolute, target)
  return { path: joinRel(normalizeRel(targetDirRel), name) }
}

/** Resolves an entry for deletion; the caller moves it to the recycle bin. */
export async function resolveForDelete(root: string, relPath: unknown): Promise<string> {
  const rel = normalizeRel(relPath)
  if (!rel) throw new PathValidationError('The archive root cannot be deleted.')
  const absolute = await toAbsoluteReal(root, rel)
  const stat = await fs.stat(absolute)
  if (stat.isDirectory()) {
    // Refuse to delete the root through a symlinked alias as well.
    if (path.resolve(absolute) === path.resolve(root)) {
      throw new PathValidationError('The archive root cannot be deleted.')
    }
  }
  return absolute
}

/** Cheap existence check used by the renderer after a rename/delete. */
export async function entryExists(root: string, relPath: unknown): Promise<boolean> {
  try {
    const absolute = toAbsolute(root, relPath)
    await fs.access(absolute)
    return true
  } catch {
    return false
  }
}

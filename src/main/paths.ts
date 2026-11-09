import { promises as fs } from 'node:fs'
import path from 'node:path'

/**
 * All filesystem access funnels through this module. It is the only place that
 * converts a renderer-supplied relative path into an absolute path, and it
 * refuses anything that could escape the mounted archive root.
 */
export class PathValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PathValidationError'
  }
}

const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i
const ILLEGAL_NAME_CHARS = /[<>:"/\\|?*\u0000-\u001f]/
const MAX_SEGMENTS = 64

/**
 * Normalizes a renderer path into a clean root-relative, forward-slash path.
 * Rejects absolute paths, traversal segments, drive letters and NUL bytes.
 */
export function normalizeRel(relPath: unknown): string {
  if (typeof relPath !== 'string') {
    throw new PathValidationError('Path must be text.')
  }
  if (relPath.includes('\u0000')) {
    throw new PathValidationError('Path contains an invalid character.')
  }

  const trimmed = relPath.trim()
  if (trimmed === '' || trimmed === '.') return ''

  if (
    path.isAbsolute(trimmed) ||
    /^[a-zA-Z]:/.test(trimmed) ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('\\')
  ) {
    throw new PathValidationError('Absolute paths are not permitted.')
  }

  const segments = trimmed.split(/[\\/]+/).filter((segment) => segment.length > 0)
  if (segments.length > MAX_SEGMENTS) {
    throw new PathValidationError('Path is nested too deeply.')
  }

  const safe: string[] = []
  for (const segment of segments) {
    if (segment === '.') continue
    if (segment === '..') {
      throw new PathValidationError('Path traversal is not permitted.')
    }
    // Windows treats colons as drive/stream separators and silently trims
    // trailing dots and spaces, which could alias a different file.
    if (segment.includes(':')) {
      throw new PathValidationError('Path contains an invalid character.')
    }
    if (/[. ]$/.test(segment)) {
      throw new PathValidationError('Path contains an invalid name.')
    }
    if (WINDOWS_RESERVED.test(segment)) {
      throw new PathValidationError('Path contains a reserved system name.')
    }
    safe.push(segment)
  }
  return safe.join('/')
}

/** True when `candidate` is `root` or lives underneath it. */
export function assertContained(root: string, candidate: string): void {
  const rel = path.relative(root, candidate)
  if (rel === '') return
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new PathValidationError('Resolved path escapes the colony archive.')
  }
}

/**
 * Converts a relative path to an absolute one and verifies containment.
 * Does not touch the disk.
 */
export function toAbsolute(root: string, relPath: unknown): string {
  const rel = normalizeRel(relPath)
  const candidate = path.resolve(root, ...rel.split('/').filter(Boolean))
  assertContained(root, candidate)
  return candidate
}

async function nearestExistingRealPath(target: string): Promise<string> {
  let current = target
  for (let depth = 0; depth < 64; depth += 1) {
    try {
      return await fs.realpath(current)
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
      const parent = path.dirname(current)
      if (parent === current) break
      current = parent
    }
  }
  throw new PathValidationError('Unable to resolve archive path.')
}

/**
 * Resolves symlinks and junctions for existing paths so a link cannot be used
 * to reach outside the archive. For new entries, the nearest existing parent is
 * verified instead.
 */
export async function toAbsoluteReal(root: string, relPath: unknown): Promise<string> {
  const absolute = toAbsolute(root, relPath)
  try {
    const real = await fs.realpath(absolute)
    assertContained(root, real)
    return real
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
    const parent = await nearestExistingRealPath(path.dirname(absolute))
    assertContained(root, parent)
    return absolute
  }
}

/** Validates a single file/folder name. Never accepts separators. */
export function validateEntryName(rawName: unknown, kind: 'file' | 'folder'): string {
  if (typeof rawName !== 'string') {
    throw new PathValidationError('Name must be text.')
  }
  const name = rawName.trim()

  if (!name) throw new PathValidationError('Name cannot be empty.')
  if (name.length > 120) throw new PathValidationError('Name is too long (120 characters max).')
  if (name === '.' || name === '..') throw new PathValidationError('That name is reserved.')
  if (ILLEGAL_NAME_CHARS.test(name)) {
    throw new PathValidationError('Name cannot contain < > : " / \\ | ? * or control characters.')
  }
  if (/[. ]$/.test(name)) {
    throw new PathValidationError('Name cannot end with a space or a period.')
  }
  if (name.startsWith('.')) {
    throw new PathValidationError('Name cannot start with a period.')
  }
  if (WINDOWS_RESERVED.test(name)) {
    throw new PathValidationError(`"${name}" is a reserved system name.`)
  }

  if (kind === 'file') {
    if (!/\.md$/i.test(name)) {
      throw new PathValidationError('Pages must use the .md extension.')
    }
    if (name.length <= 3) {
      throw new PathValidationError('Name needs at least one character before .md.')
    }
  }

  return name
}

/** Parent of a normalized relative path; root ("") has no parent. */
export function parentRel(relPath: string): string {
  const normalized = normalizeRel(relPath)
  if (!normalized) return ''
  const index = normalized.lastIndexOf('/')
  return index === -1 ? '' : normalized.slice(0, index)
}

/** Joins two relative path fragments with forward slashes. */
export function joinRel(...parts: Array<string | undefined>): string {
  return parts
    .filter((part): part is string => typeof part === 'string' && part.length > 0)
    .join('/')
    .replace(/\/+/g, '/')
    .replace(/^\/|\/$/g, '')
}

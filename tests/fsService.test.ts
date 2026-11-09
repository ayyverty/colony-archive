import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  buildTree,
  createFolder,
  createPage,
  entryExists,
  listSnapshots,
  listTemplates,
  moveEntry,
  openArchive,
  readPage,
  readSnapshot,
  renameEntry,
  resolveForDelete,
  restoreSnapshot,
  saveTemplate,
  writePage
} from '../src/main/fsService'
import { PathValidationError } from '../src/main/paths'

let root = ''

function pause(ms = 8): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

beforeEach(async () => {
  root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'colony-fs-')))
  await fs.mkdir(path.join(root, 'factions'), { recursive: true })
  await fs.mkdir(path.join(root, 'factions', 'deep'), { recursive: true })
  await fs.writeFile(path.join(root, 'home.md'), '# Home\n\nWelcome.\n', 'utf8')
  await fs.writeFile(path.join(root, 'factions', 'empire.md'), '# Empire\n', 'utf8')
  await fs.writeFile(path.join(root, 'factions', 'deep', 'log.md'), '# Log\n', 'utf8')
  await fs.writeFile(path.join(root, 'ignore.txt'), 'not markdown', 'utf8')
  await fs.mkdir(path.join(root, '.hidden'), { recursive: true })
  await fs.writeFile(path.join(root, '.hidden', 'secret.md'), '# Hidden\n', 'utf8')
  await fs.mkdir(path.join(root, 'node_modules'), { recursive: true })
  await fs.mkdir(path.join(root, '_templates'), { recursive: true })
  await fs.mkdir(path.join(root, '.history'), { recursive: true })
})

afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true })
})

describe('buildTree', () => {
  it('shows only folders and .md files, folders first', async () => {
    const tree = await buildTree(root)
    expect(tree.kind).toBe('folder')
    const names = (tree.children ?? []).map((node) => node.name)
    expect(names).toEqual(['factions', 'home.md'])

    const factions = tree.children?.find((node) => node.name === 'factions')
    expect(factions?.kind).toBe('folder')
    expect((factions?.children ?? []).map((node) => node.name)).toEqual(['deep', 'empire.md'])
  })

  it('omits hidden and tooling directories', async () => {
    const tree = await buildTree(root)
    const names = (tree.children ?? []).map((node) => node.name)
    expect(names).not.toContain('.hidden')
    expect(names).not.toContain('.history')
    expect(names).not.toContain('_templates')
    expect(names).not.toContain('node_modules')
    expect(names).not.toContain('ignore.txt')
  })

  it('omits symlinked directories', async () => {
    const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'colony-outside-'))
    try {
      try {
        await fs.symlink(outside, path.join(root, 'linked'), 'junction')
      } catch {
        return
      }
      const tree = await buildTree(root)
      expect((tree.children ?? []).map((node) => node.name)).not.toContain('linked')
    } finally {
      await fs.rm(outside, { recursive: true, force: true })
    }
  })

  it('openArchive returns a real root', async () => {
    const opened = await openArchive(root)
    expect(opened.root).toBe(root)
    expect(opened.tree.children?.length).toBeGreaterThan(0)
  })
})

describe('readPage', () => {
  it('reads markdown with mtime', async () => {
    const page = await readPage(root, 'home.md')
    expect(page.content).toContain('# Home')
    expect(page.mtimeMs).toBeGreaterThan(0)
  })

  it('rejects traversal, non-markdown and missing files', async () => {
    await expect(readPage(root, '../../etc/passwd')).rejects.toThrow(PathValidationError)
    await expect(readPage(root, 'ignore.txt')).rejects.toThrow(PathValidationError)
    await expect(readPage(root, 'missing.md')).rejects.toThrow()
  })
})

describe('writePage', () => {
  it('saves atomically without leaving temp files', async () => {
    const result = await writePage(root, 'home.md', '# Home\n\nUpdated.\n')
    expect(result.mtimeMs).toBeGreaterThan(0)

    const page = await readPage(root, 'home.md')
    expect(page.content).toBe('# Home\n\nUpdated.\n')

    const entries = await fs.readdir(root)
    expect(entries.some((entry) => entry.endsWith('.tmp'))).toBe(false)
  })

  it('refuses to write outside the root', async () => {
    await expect(writePage(root, '../escape.md', 'nope')).rejects.toThrow(PathValidationError)
    await expect(writePage(root, 'ignore.txt', 'nope')).rejects.toThrow(PathValidationError)
  })

  it('creates a page when the file does not exist yet', async () => {
    await writePage(root, 'factions/new.md', '# New\n')
    expect(await entryExists(root, 'factions/new.md')).toBe(true)
  })
})

describe('create / rename / delete helpers', () => {
  it('creates pages and folders inside a directory', async () => {
    const page = await createPage(root, 'factions', 'rebels.md')
    expect(page.path).toBe('factions/rebels.md')
    expect(await entryExists(root, page.path)).toBe(true)

    const folder = await createFolder(root, '', 'research')
    expect(folder.path).toBe('research')
    expect((await fs.stat(path.join(root, 'research'))).isDirectory()).toBe(true)
  })

  it('rejects duplicate names', async () => {
    await expect(createPage(root, 'factions', 'empire.md')).rejects.toThrow(PathValidationError)
    await expect(createFolder(root, '', 'factions')).rejects.toThrow(PathValidationError)
  })

  it('renames files and folders, remapping the returned path', async () => {
    const file = await renameEntry(root, 'factions/empire.md', 'imperium.md')
    expect(file.path).toBe('factions/imperium.md')
    expect(await entryExists(root, 'factions/imperium.md')).toBe(true)

    const folder = await renameEntry(root, 'factions', 'factions-old')
    expect(folder.path).toBe('factions-old')
    expect(await entryExists(root, 'factions-old/deep/log.md')).toBe(true)
  })

  it('rejects rename collisions and invalid names', async () => {
    await expect(renameEntry(root, 'home.md', 'factions')).rejects.toThrow(PathValidationError)
    await expect(renameEntry(root, 'home.md', 'note.txt')).rejects.toThrow(PathValidationError)
  })

  it('protects the archive root from deletion', async () => {
    await expect(resolveForDelete(root, '')).rejects.toThrow(PathValidationError)
    await expect(resolveForDelete(root, 'home.md')).resolves.toBe(path.join(root, 'home.md'))
  })
})

describe('snapshots', () => {
  it('snapshots the previous content when overwriting a record', async () => {
    const original = await readPage(root, 'home.md')
    const result = await writePage(root, 'home.md', '# Home\n\nChanged.\n')
    expect(result.snapshotId).toBeTruthy()

    const snapshots = await listSnapshots(root, 'home.md')
    expect(snapshots).toHaveLength(1)
    expect(snapshots[0].id).toBe(result.snapshotId)
    expect(snapshots[0].size).toBeGreaterThan(0)

    const snapshot = await readSnapshot(root, 'home.md', result.snapshotId)
    expect(snapshot.content).toBe(original.content)
  })

  it('does not snapshot a brand new or empty record', async () => {
    const created = await writePage(root, 'fresh.md', '# Fresh\n')
    expect(created.snapshotId).toBeUndefined()
    expect(await listSnapshots(root, 'fresh.md')).toEqual([])

    await fs.writeFile(path.join(root, 'empty.md'), '', 'utf8')
    const saved = await writePage(root, 'empty.md', '# Filled\n')
    expect(saved.snapshotId).toBeUndefined()
  })

  it('keeps snapshots in a hidden history directory per record', async () => {
    await writePage(root, 'factions/empire.md', '# Empire\n\nOne.\n')
    await pause()
    await writePage(root, 'factions/empire.md', '# Empire\n\nTwo.\n')

    const snapshots = await listSnapshots(root, 'factions/empire.md')
    expect(snapshots.length).toBeGreaterThanOrEqual(2)
    expect(await entryExists(root, 'factions/empire.md')).toBe(true)
    const tree = await buildTree(root)
    expect((tree.children ?? []).map((node) => node.name)).not.toContain('.history')
  })

  it('restores a snapshot and snapshots the restored-over content', async () => {
    await writePage(root, 'home.md', '# Home\n\nSecond.\n')
    const [snapshot] = await listSnapshots(root, 'home.md')
    await pause()

    const restored = await restoreSnapshot(root, 'home.md', snapshot.id)
    expect(restored.snapshotId).toBeTruthy()
    expect((await readPage(root, 'home.md')).content).toContain('Welcome.')
    expect((await listSnapshots(root, 'home.md')).length).toBe(2)
  })

  it('rejects snapshots from another record or outside the archive', async () => {
    await writePage(root, 'home.md', '# Home\n\nChanged.\n')
    const [snapshot] = await listSnapshots(root, 'home.md')

    await expect(readSnapshot(root, 'factions/empire.md', snapshot.id)).rejects.toThrow(
      PathValidationError
    )
    await expect(readSnapshot(root, 'home.md', '../escape.md')).rejects.toThrow(
      PathValidationError
    )
  })
})

describe('templates', () => {
  it('saves, lists and overwrites templates', async () => {
    const saved = await saveTemplate(root, 'colonist', '# {{title}}\n')
    expect(saved).toEqual({ name: 'colonist.md', content: '# {{title}}\n' })

    await saveTemplate(root, 'faction.md', '---\ntype: faction\n---\n')
    const templates = await listTemplates(root)
    expect(templates.map((template) => template.name)).toEqual(['colonist.md', 'faction.md'])

    await saveTemplate(root, 'colonist', '# Changed\n')
    expect((await listTemplates(root)).find((t) => t.name === 'colonist.md')?.content).toBe(
      '# Changed\n'
    )
  })

  it('rejects invalid template names', async () => {
    await expect(saveTemplate(root, '../escape', 'x')).rejects.toThrow(PathValidationError)
    await expect(saveTemplate(root, 'con', 'x')).rejects.toThrow(PathValidationError)
    await expect(saveTemplate(root, '', 'x')).rejects.toThrow(PathValidationError)
  })
})

describe('moveEntry', () => {
  it('moves a record into another folder', async () => {
    const moved = await moveEntry(root, 'home.md', 'factions')
    expect(moved.path).toBe('factions/home.md')
    expect(await entryExists(root, 'factions/home.md')).toBe(true)
    expect(await entryExists(root, 'home.md')).toBe(false)
  })

  it('treats a move to the current folder as a no-op', async () => {
    const moved = await moveEntry(root, 'factions/empire.md', 'factions')
    expect(moved.path).toBe('factions/empire.md')
  })

  it('moves folders and rejects moving one into itself', async () => {
    await expect(moveEntry(root, 'factions', 'factions/deep')).rejects.toThrow(
      PathValidationError
    )
  })

  it('rejects collisions, traversal and missing targets', async () => {
    await fs.writeFile(path.join(root, 'factions', 'home.md'), '# Existing\n', 'utf8')
    await expect(moveEntry(root, 'home.md', 'factions')).rejects.toThrow(PathValidationError)
    await expect(moveEntry(root, 'factions/empire.md', '../outside')).rejects.toThrow(
      PathValidationError
    )
    await expect(moveEntry(root, 'home.md', 'missing')).rejects.toThrow()
    await expect(moveEntry(root, '', 'factions')).rejects.toThrow(PathValidationError)
  })
})

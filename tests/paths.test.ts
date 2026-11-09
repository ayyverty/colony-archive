import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  PathValidationError,
  assertContained,
  normalizeRel,
  toAbsolute,
  toAbsoluteReal,
  validateEntryName
} from '../src/main/paths'

let root = ''
let outside = ''

beforeAll(async () => {
  root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'colony-paths-')))
  outside = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'colony-outside-')))
  await fs.mkdir(path.join(root, 'notes'), { recursive: true })
  await fs.writeFile(path.join(root, 'notes', 'entry.md'), '# Entry\n', 'utf8')
  await fs.writeFile(path.join(outside, 'secret.md'), 'top secret', 'utf8')
})

afterAll(async () => {
  await fs.rm(root, { recursive: true, force: true })
  await fs.rm(outside, { recursive: true, force: true })
})

describe('normalizeRel', () => {
  it('accepts root-relative paths and normalizes separators', () => {
    expect(normalizeRel('notes/entry.md')).toBe('notes/entry.md')
    expect(normalizeRel('notes\\entry.md')).toBe('notes/entry.md')
    expect(normalizeRel('./notes//entry.md')).toBe('notes/entry.md')
    expect(normalizeRel('')).toBe('')
    expect(normalizeRel('.')).toBe('')
  })

  it.each([
    '../../etc/passwd',
    '..\\..\\Windows\\win.ini',
    'notes/../../etc/passwd',
    '/etc/passwd',
    '\\\\server\\share\\file.md',
    'C:\\Windows\\win.ini',
    'c:/Windows/win.ini'
  ])('rejects traversal or absolute path %s', (candidate) => {
    expect(() => normalizeRel(candidate)).toThrow(PathValidationError)
  })

  it('rejects NUL bytes and non-strings', () => {
    expect(() => normalizeRel('notes/\u0000entry.md')).toThrow(PathValidationError)
    expect(() => normalizeRel(null)).toThrow(PathValidationError)
    expect(() => normalizeRel(42)).toThrow(PathValidationError)
  })

  it.each([
    'notes/D:foo.md',
    'notes/file.md:stream',
    'notes/CON.md',
    'notes/trailing.',
    'notes/trailing /foo.md'
  ])('rejects Windows-unsafe segment in %s', (candidate) => {
    expect(() => normalizeRel(candidate)).toThrow(PathValidationError)
  })
})

describe('containment', () => {
  it('keeps resolved paths inside the archive root', () => {
    expect(toAbsolute(root, 'notes/entry.md')).toBe(path.join(root, 'notes', 'entry.md'))
    expect(() => toAbsolute(root, '../escape.md')).toThrow(PathValidationError)
    expect(() => assertContained(root, outside)).toThrow(PathValidationError)
    expect(() => assertContained(root, path.join(root, '..', 'sibling'))).toThrow(
      PathValidationError
    )
  })

  it('blocks symlink escapes when links can be created', async () => {
    const link = path.join(root, 'escape-link')
    try {
      await fs.symlink(outside, link, 'junction')
    } catch {
      return // Windows without developer mode: skip rather than fail.
    }

    await expect(toAbsoluteReal(root, 'escape-link/secret.md')).rejects.toThrow(
      PathValidationError
    )
    await fs.rm(link, { recursive: true, force: true })
  })

  it('allows new entries under existing directories', async () => {
    const resolved = await toAbsoluteReal(root, 'notes/brand-new.md')
    expect(resolved.startsWith(root)).toBe(true)
  })
})

describe('validateEntryName', () => {
  it('accepts ordinary page and folder names', () => {
    expect(validateEntryName('Getting started.md', 'file')).toBe('Getting started.md')
    expect(validateEntryName('  Colony  ', 'folder')).toBe('Colony')
    expect(validateEntryName('trailing ', 'folder')).toBe('trailing')
  })

  it.each([
    ['', 'file'],
    ['   ', 'folder'],
    ['..', 'folder'],
    ['.hidden', 'file'],
    ['note.txt', 'file'],
    ['bad/name.md', 'file'],
    ['bad\\name.md', 'file'],
    ['bad:name.md', 'file'],
    ['trailing.', 'folder'],
    ['CON', 'folder'],
    ['lpt1.md', 'file'],
    ['x'.repeat(121), 'folder'],
    ['.md', 'file']
  ])('rejects %s as a %s', (name, kind) => {
    expect(() => validateEntryName(name, kind as 'file' | 'folder')).toThrow(
      PathValidationError
    )
  })
})

import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { runIntegrityScan } from '../src/main/integrity'

let root = ''

beforeEach(async () => {
  root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'colony-integrity-')))
  await fs.mkdir(path.join(root, 'factions'), { recursive: true })
  await fs.writeFile(path.join(root, 'home.md'), '# Home\n\nSee [[Missing]] and [[Factions/empire]].\n', 'utf8')
  await fs.writeFile(path.join(root, 'factions', 'empire.md'), '---\ntitle: Empire\n---\n# Empire\n\n[[home]]\n', 'utf8')
  await fs.writeFile(path.join(root, 'empty.md'), '   \n', 'utf8')
  await fs.writeFile(path.join(root, 'bad.md'), '---\ntitle: Broken\n# no close\n', 'utf8')
  await fs.writeFile(path.join(root, 'orphan.md'), '# Orphan\n\nNo links here.\n', 'utf8')
})

afterEach(async () => {
  await fs.rm(root, { recursive: true, force: true })
})

describe('runIntegrityScan', () => {
  it('reports broken links, malformed frontmatter, empty files and orphans', async () => {
    const report = await runIntegrityScan(root)
    const codes = report.issues.map((issue) => issue.code)
    expect(codes).toContain('E-203')
    expect(codes).toContain('E-117')
    expect(codes).toContain('E-118')
    expect(codes).toContain('E-204')
    expect(report.scanned).toBe(5)
    expect(report.counts['E-203']).toBe(1)
  })

  it('streams progress for each file and issue', async () => {
    const lines: string[] = []
    await runIntegrityScan(root, { onProgress: (progress) => lines.push(progress.line) })
    expect(lines.some((line) => line.includes('scanning home.md'))).toBe(true)
    expect(lines.some((line) => line.includes('scan complete'))).toBe(true)
  })

  it('honours cancellation', async () => {
    const signal = { cancelled: false }
    signal.cancelled = true
    const report = await runIntegrityScan(root, { signal })
    expect(report.issues.length).toBeLessThanOrEqual(5)
  })
})

import { describe, expect, it } from 'vitest'
import { suggestRelated } from '../src/renderer/src/lib/suggestions'
import { buildArchiveIndex } from '../src/shared/wiki'

describe('suggestRelated', () => {
  const index = buildArchiveIndex('/archive', [
    { path: 'a.md', content: '---\ntitle: Alpha\ntags: [crew, combat]\n---\n# Alpha\n\n[[Beta]]\n', mtimeMs: 1 },
    { path: 'b.md', content: '---\ntitle: Beta\ntags: [crew]\n---\n# Beta\n\n[[Alpha]]\n', mtimeMs: 2 },
    { path: 'c.md', content: '---\ntitle: Gamma\ntags: [research]\n---\n# Gamma\n', mtimeMs: 3 }
  ])

  it('suggests pages sharing tags and links', () => {
    const results = suggestRelated(index, 'a.md', '---\ntitle: Alpha\ntags: [crew, combat]\n---\n# Alpha\n\n[[Beta]]\n')
    expect(results.map((result) => result.path)).toContain('b.md')
    expect(results.find((result) => result.path === 'b.md')?.reasons.length).toBeGreaterThan(0)
  })

  it('excludes the current page and unrelated pages', () => {
    const results = suggestRelated(index, 'a.md', '---\ntitle: Alpha\ntags: [crew, combat]\n---\n# Alpha\n')
    expect(results.map((result) => result.path)).not.toContain('a.md')
  })
})

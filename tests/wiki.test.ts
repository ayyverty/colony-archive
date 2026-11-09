import { describe, expect, it } from 'vitest'
import {
  buildArchiveIndex,
  buildExcerpt,
  createPageLookup,
  extractDirectives,
  extractTags,
  extractWikiLinks,
  formatRimDate,
  pageKind,
  parseRimDate,
  relativePageHref,
  resolveRelativePath,
  stripCode
} from '../src/shared/wiki'

describe('extractors', () => {
  it('strips fenced and inline code while preserving line count', () => {
    const source = 'before `inline`\n```\n# not-a-tag\n```\nafter'
    const stripped = stripCode(source)
    expect(stripped).not.toContain('inline')
    expect(stripped).not.toContain('not-a-tag')
    expect(stripped.split('\n')).toHaveLength(source.split('\n').length)
  })

  it('extracts normalised tags and ignores headings and code', () => {
    const source = [
      '# Heading',
      '',
      'A #Stub and #Colony-News, plus #a.',
      '`#inline`',
      '```',
      '#fenced',
      '```'
    ].join('\n')
    expect(extractTags(source)).toEqual(['colony-news', 'stub'])
  })

  it('extracts wiki links with headings and labels, de-duplicated', () => {
    const source = '[[Empire#History|the empire]] and [[Ava]] and [[Ava]] and `[[Ignored]]`'
    const links = extractWikiLinks(source)
    expect(links).toEqual([
      { target: 'Empire', heading: 'History', label: 'the empire', resolved: null },
      { target: 'Ava', heading: undefined, label: undefined, resolved: null }
    ])
  })

  it('extracts directive chips de-duplicated by kind and value', () => {
    const source = '{{colonist: Ava}} {{Colonist: ava}} {{ faction: Empire }} {{bad}}'
    expect(extractDirectives(source)).toEqual([
      { kind: 'colonist', value: 'Ava' },
      { kind: 'faction', value: 'Empire' }
    ])
  })
})

describe('RimWorld dates', () => {
  it('parses valid dates into quadrum and day', () => {
    expect(parseRimDate('5501-04-12')).toEqual({ year: 5501, quadrum: 4, day: 12 })
    expect(parseRimDate('5500-01-01')).toEqual({ year: 5500, quadrum: 1, day: 1 })
  })

  it('rejects malformed or out-of-range dates', () => {
    expect(parseRimDate('')).toBeNull()
    expect(parseRimDate(undefined)).toBeNull()
    expect(parseRimDate('5501-05-01')).toBeNull()
    expect(parseRimDate('5501-01-16')).toBeNull()
    expect(parseRimDate('5501-00-10')).toBeNull()
    expect(parseRimDate('year-01-01')).toBeNull()
  })

  it('formats dates with quadrum names', () => {
    expect(formatRimDate('5501-04-12')).toBe('5501 · Decembary 12')
    expect(formatRimDate('5501-01-02')).toBe('5501 · Aprimay 2')
    expect(formatRimDate('nope')).toBeNull()
  })
})

describe('excerpts and paths', () => {
  it('builds a plain-text excerpt from the first paragraph', () => {
    const body = '# Title\n\n**Bold** and [a link](https://example.test) and [[Ava|the lead]].\n\nSecond paragraph.'
    expect(buildExcerpt(body)).toBe('Bold and a link and the lead.')
  })

  it('truncates long excerpts with an ellipsis', () => {
    const excerpt = buildExcerpt('word '.repeat(100), 30)
    expect(excerpt.length).toBeLessThanOrEqual(30)
    expect(excerpt.endsWith('…')).toBe(true)
  })

  it('resolves relative paths and drops traversal', () => {
    expect(resolveRelativePath('a/b', '../c.md')).toBe('a/c.md')
    expect(resolveRelativePath('', 'a/./b')).toBe('a/b')
    expect(resolveRelativePath('a/b', '../../c')).toBe('c')
  })

  it('builds browser-friendly relative hrefs', () => {
    expect(relativePageHref('factions/empire.md', 'colonists/ava.md')).toBe('../colonists/ava.md')
    expect(relativePageHref('home.md', 'factions/empire.md', 'History')).toBe('factions/empire.md#History')
    expect(relativePageHref('a/b/c.md', 'a/d.md')).toBe('../d.md')
  })
})

describe('buildArchiveIndex', () => {
  const raw = [
    {
      path: 'factions/empire.md',
      content: [
        '---',
        'title: Empire',
        'type: Faction',
        'tags: [major]',
        'aliases: [Imperium]',
        'date: 5501-04-12',
        '---',
        '# Empire',
        '',
        'The empire sees [[Ava]] and [[Missing]].'
      ].join('\n'),
      mtimeMs: 100
    },
    {
      path: 'colonists/ava.md',
      content: [
        '---',
        'title: Ava',
        'type: colonist',
        'tags: [crew, stub]',
        '---',
        '# Ava',
        '',
        'Back to [[factions/empire|the empire]].'
      ].join('\n'),
      mtimeMs: 200
    },
    {
      path: 'notes.md',
      content: '# Notes\n\nTagged #major and #crew.\n',
      mtimeMs: 300
    }
  ]

  it('derives titles, kinds, tags, aliases and dates', () => {
    const index = buildArchiveIndex('/archive', raw, 42)
    expect(index.rootPath).toBe('/archive')
    expect(index.generatedAt).toBe(42)

    const empire = index.pages.find((page) => page.path === 'factions/empire.md')
    expect(empire?.title).toBe('Empire')
    expect(empire?.type).toBe('faction')
    expect(empire?.aliases).toEqual(['Imperium'])
    expect(empire?.date).toBe('5501-04-12')
    expect(pageKind(empire!)).toBe('faction')

    const ava = index.pages.find((page) => page.path === 'colonists/ava.md')
    expect(ava?.isStub).toBe(true)
    expect(pageKind(ava!)).toBe('colonist')

    const notes = index.pages.find((page) => page.path === 'notes.md')
    expect(notes?.title).toBe('Notes')
    expect(pageKind(notes!)).toBe('page')
  })

  it('resolves links, records backlinks and collects broken links', () => {
    const index = buildArchiveIndex('/archive', raw)

    const empire = index.pages.find((page) => page.path === 'factions/empire.md')
    expect(empire?.links.map((link) => link.resolved)).toEqual([
      'colonists/ava.md',
      null
    ])
    expect(empire?.backlinks).toEqual(['colonists/ava.md'])

    const ava = index.pages.find((page) => page.path === 'colonists/ava.md')
    expect(ava?.backlinks).toEqual(['factions/empire.md'])

    expect(index.brokenLinks).toEqual([{ from: 'factions/empire.md', target: 'Missing' }])
  })

  it('counts tags across pages, most frequent first', () => {
    const index = buildArchiveIndex('/archive', raw)
    expect(index.tags).toEqual([
      { tag: 'crew', count: 2 },
      { tag: 'major', count: 2 },
      { tag: 'stub', count: 1 }
    ])
    expect(index.pages.map((page) => page.path)).toEqual([
      'colonists/ava.md',
      'factions/empire.md',
      'notes.md'
    ])
  })

  it('normalises corrupt dates to null', () => {
    const index = buildArchiveIndex('/archive', [
      { path: 'a.md', content: '---\ndate: not-a-date\n---\n# A\n', mtimeMs: 1 }
    ])
    expect(index.pages[0].date).toBeNull()
  })
})

describe('createPageLookup', () => {
  const index = buildArchiveIndex('/archive', [
    {
      path: 'factions/empire.md',
      content: '---\ntitle: Empire\naliases: [Imperium]\ntype: faction\n---\n# Empire\n',
      mtimeMs: 1
    },
    {
      path: 'colonists/ava.md',
      content: '---\ntitle: Ava\ntype: colonist\n---\n# Ava\n',
      mtimeMs: 2
    },
    {
      path: 'colonists/deep/nested.md',
      content: '# Nested\n',
      mtimeMs: 3
    }
  ])
  const lookup = createPageLookup(index)

  it('resolves by path, stem, title and alias', () => {
    expect(lookup.resolve('factions/empire.md')?.path).toBe('factions/empire.md')
    expect(lookup.resolve('empire')?.path).toBe('factions/empire.md')
    expect(lookup.resolve('Empire')?.path).toBe('factions/empire.md')
    expect(lookup.resolve('Imperium')?.path).toBe('factions/empire.md')
    expect(lookup.resolve('nested')?.path).toBe('colonists/deep/nested.md')
    expect(lookup.resolve('missing')).toBeNull()
  })

  it('resolves paths relative to the source page', () => {
    expect(lookup.resolve('../factions/empire', 'colonists/ava.md')?.path).toBe(
      'factions/empire.md'
    )
    expect(lookup.resolve('deep/nested', 'colonists/ava.md')?.path).toBe(
      'colonists/deep/nested.md'
    )
  })

  it('finds directive targets by kind and value', () => {
    expect(lookup.findDirective('colonist', 'Ava')?.path).toBe('colonists/ava.md')
    expect(lookup.findDirective('faction', 'Imperium')?.path).toBe('factions/empire.md')
    expect(lookup.findDirective('item', 'Nobody')).toBeNull()
  })

  it('handles a null index gracefully', () => {
    const empty = createPageLookup(null)
    expect(empty.pages).toEqual([])
    expect(empty.resolve('anything')).toBeNull()
    expect(empty.findDirective('colonist', 'Ava')).toBeNull()
  })
})

describe('archive metadata', () => {
  it('parses _archive.md into archive meta and applies classification', () => {
    const index = buildArchiveIndex('/archive', [
      {
        path: '_archive.md',
        content: '---\nsettlement: New Hope\nleader: "[[Mira]]"\nfounded: 5500\nsector: SECTOR 9\nclassification: classified\n---\n# Archive\n',
        mtimeMs: 1
      },
      {
        path: 'notes.md',
        content: '---\ntitle: Notes\n---\n# Notes\n',
        mtimeMs: 2
      }
    ])
    expect(index.meta?.settlement).toBe('New Hope')
    expect(index.meta?.leader).toBe('Mira')
    expect(index.meta?.founded).toBe('5500')
    expect(index.meta?.sector).toBe('SECTOR 9')
    expect(index.meta?.classification).toBe('classified')
    expect(index.pages.map((page) => page.path)).toEqual(['notes.md'])
    expect(index.pages[0].classification).toBe('classified')
  })
})

import { describe, expect, it } from 'vitest'
import {
  listValue,
  parseFrontmatter,
  removeFrontmatter,
  serializeFrontmatter,
  setFrontmatter,
  splitCommaList,
  stringValue,
  updateFrontmatter
} from '../src/shared/frontmatter'

const DOCUMENT = ['---', 'title: Empire', 'type: faction', 'tags: [major, "trade hub"]', '---', '', '# Empire', '', 'Body text.'].join(
  '\n'
)

describe('parseFrontmatter', () => {
  it('parses scalars, inline lists and the body', () => {
    const parsed = parseFrontmatter(DOCUMENT)
    expect(parsed.hasFrontmatter).toBe(true)
    expect(parsed.error).toBeUndefined()
    expect(parsed.data.title).toBe('Empire')
    expect(parsed.data.type).toBe('faction')
    expect(parsed.data.tags).toEqual(['major', 'trade hub'])
    expect(parsed.body).toBe('\n# Empire\n\nBody text.')
  })

  it('parses block lists and lowercases keys', () => {
    const parsed = parseFrontmatter(
      ['---', 'Title: Ava', 'Aliases:', '  - A1', "  - 'A2'", '---', 'body'].join('\n')
    )
    expect(parsed.data.title).toBe('Ava')
    expect(parsed.data.aliases).toEqual(['A1', 'A2'])
  })

  it('keeps unknown keys and skips comments and blank lines', () => {
    const parsed = parseFrontmatter(['---', '# a comment', '', 'custom: value', '---', ''].join('\n'))
    expect(parsed.data.custom).toBe('value')
  })

  it('returns the plain body when no frontmatter is present', () => {
    const parsed = parseFrontmatter('# Plain\n\nText.')
    expect(parsed.hasFrontmatter).toBe(false)
    expect(parsed.data).toEqual({})
    expect(parsed.body).toBe('# Plain\n\nText.')
  })

  it('flags an unterminated block and leaves the source intact', () => {
    const source = '---\ntitle: Lost\n\n# Body'
    const parsed = parseFrontmatter(source)
    expect(parsed.hasFrontmatter).toBe(false)
    expect(parsed.body).toBe(source)
    expect(parsed.error).toContain('never closed')
  })

  it('strips a leading byte order mark', () => {
    const parsed = parseFrontmatter(`\uFEFF${DOCUMENT}`)
    expect(parsed.hasFrontmatter).toBe(true)
    expect(parsed.data.title).toBe('Empire')
  })
})

describe('serializeFrontmatter', () => {
  it('writes canonical keys first and quotes unsafe values', () => {
    const output = serializeFrontmatter(
      { date: '5501-04-12', custom: 'x', tags: ['a', 'b c'], title: 'A: B' },
      '# Body\n'
    )
    expect(output).toBe(
      ['---', 'title: "A: B"', 'tags: [a, b c]', 'date: 5501-04-12', 'custom: x', '---', '', '# Body', ''].join(
        '\n'
      )
    )
  })

  it('drops empty values and the block when nothing remains', () => {
    expect(serializeFrontmatter({ title: '  ', tags: [] }, '# Body\n')).toBe('# Body\n')
  })

  it('round-trips through parseFrontmatter', () => {
    const output = serializeFrontmatter(
      { title: 'Ava', type: 'colonist', tags: ['crew'], aliases: ['V'], date: '5501-04-12' },
      '# Ava\n\nCrew lead.\n'
    )
    const parsed = parseFrontmatter(output)
    expect(parsed.data).toMatchObject({
      title: 'Ava',
      type: 'colonist',
      tags: ['crew'],
      aliases: ['V'],
      date: '5501-04-12'
    })
    expect(parsed.body).toBe('\n# Ava\n\nCrew lead.\n')
  })

  it('preserves CRLF line endings', () => {
    const output = serializeFrontmatter({ title: 'Ava' }, '# Ava\r\n\r\nText.\r\n')
    expect(output).toContain('\r\n')
    expect(output.startsWith('---\r\ntitle: Ava\r\n---\r\n')).toBe(true)
  })
})

describe('frontmatter mutation helpers', () => {
  it('updates a single key without touching the body', () => {
    const updated = updateFrontmatter(DOCUMENT, { type: 'ideology' })
    expect(updated).toContain('type: ideology')
    expect(updated).toContain('title: Empire')
    expect(updated).toContain('# Empire\n\nBody text.')
  })

  it('ignores undefined patches and removes keys only through setFrontmatter', () => {
    const withUndefined = updateFrontmatter(DOCUMENT, { title: undefined })
    expect(withUndefined).toContain('title: Empire')

    const withoutTitle = setFrontmatter(DOCUMENT, { type: 'faction' })
    expect(withoutTitle).not.toContain('title:')
  })

  it('removes the block entirely', () => {
    expect(removeFrontmatter(DOCUMENT)).toBe('# Empire\n\nBody text.')
  })
})

describe('frontmatter value helpers', () => {
  it('coerces scalar and list values to strings', () => {
    expect(stringValue('Ava')).toBe('Ava')
    expect(stringValue(['Ava', 'V'])).toBe('Ava, V')
    expect(stringValue(undefined)).toBe('')
    expect(stringValue('')).toBe('')
  })

  it('normalises list values from arrays and comma strings', () => {
    expect(listValue(['a', ' b ', ''])).toEqual(['a', 'b'])
    expect(listValue('a, b,,c')).toEqual(['a', 'b', 'c'])
    expect(listValue(undefined)).toEqual([])
  })

  it('splits comma lists', () => {
    expect(splitCommaList('a, b , c,')).toEqual(['a', 'b', 'c'])
    expect(splitCommaList('')).toEqual([])
  })
})

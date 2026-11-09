import { describe, expect, it } from 'vitest'
import { splitPathForDisplay } from '../src/renderer/src/lib/pathDisplay'

describe('splitPathForDisplay', () => {
  it('splits directories, filenames and extensions', () => {
    expect(splitPathForDisplay('factions/the-empire.md')).toEqual({
      root: '~/',
      dir: 'factions/',
      file: 'the-empire',
      ext: '.md'
    })
  })

  it('handles root-level files', () => {
    expect(splitPathForDisplay('Home.md').file).toBe('Home')
    expect(splitPathForDisplay('Home.md').ext).toBe('.md')
  })
})

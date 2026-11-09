import { describe, expect, it } from 'vitest'
import { transformRedactions } from '../src/renderer/src/lib/markdown'

describe('transformRedactions', () => {
  const source = [
    '# Classified',
    '',
    ':::redacted',
    'Secret landing coordinates.',
    ':::',
    '',
    'Public note.'
  ].join('\n')

  it('redacts marked sections for classified pages', () => {
    const output = transformRedactions(source, 'classified')
    expect(output).toContain('redacted-block')
    expect(output).toContain('████')
    expect(output).not.toContain('Secret landing coordinates.')
  })

  it('leaves marked content visible for non-classified pages', () => {
    const output = transformRedactions(source, 'internal')
    expect(output).toContain('Secret landing coordinates.')
    expect(output).not.toContain('redacted-block')
  })
})

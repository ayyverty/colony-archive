import { describe, expect, it } from 'vitest'
import { transformAttachments } from '../src/renderer/src/lib/markdown'

describe('transformAttachments', () => {
  it('renders image and audio embeds', () => {
    const output = transformAttachments('![[photo.png]]\n![[clip.ogg]]')
    expect(output).toContain('class="attachment attachment--image"')
    expect(output).toContain('class="attachment attachment--audio"')
    expect(output).toContain('colony-attachment://photo.png')
  })

  it('leaves unknown embeds as wiki links', () => {
    expect(transformAttachments('![[notes.txt]]')).toBe('[[notes.txt]]')
  })
})

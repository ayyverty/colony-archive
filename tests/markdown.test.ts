import { describe, expect, it } from 'vitest'
import { neutralizeRawHtml } from '../src/renderer/src/lib/markdown'

describe('neutralizeRawHtml', () => {
  it('removes active elements entirely', () => {
    expect(neutralizeRawHtml('<script>window.x = 1</script>')).toBe('')
    expect(neutralizeRawHtml('<iframe src="https://evil.test"></iframe>')).toBe('')
    expect(neutralizeRawHtml('<style>body{display:none}</style>')).toBe('')
  })

  it('removes inline event handlers with quoted and unquoted values', () => {
    expect(neutralizeRawHtml('<img src="x" onerror="alert(1)">')).toBe('<img src="x">')
    expect(neutralizeRawHtml("<img src='x' ONLOAD='alert(1)'>")).toBe("<img src='x'>")
    expect(neutralizeRawHtml('<img src=x onerror=alert(1)>')).toBe('<img src=x>')
  })

  it('keeps benign HTML intact', () => {
    const html = '<details open><summary>Log</summary><p>Day 1</p></details>'
    expect(neutralizeRawHtml(html)).toBe(html)
    expect(neutralizeRawHtml('<a href="https://example.test">link</a>')).toBe(
      '<a href="https://example.test">link</a>'
    )
  })

  it('does not alter text that merely resembles an attribute', () => {
    expect(neutralizeRawHtml('one=two and three=four')).toBe('one=two and three=four')
  })

  it('strips self-closing and void active tags', () => {
    expect(neutralizeRawHtml('<link rel="stylesheet" href="x">')).toBe('')
    expect(neutralizeRawHtml('<base href="https://evil.test">')).toBe('')
    expect(neutralizeRawHtml('<meta http-equiv="refresh" content="0">')).toBe('')
  })
})

import { describe, expect, it } from 'vitest'
import { ERROR_LABELS, formatCodedError } from '../src/shared/errors'

describe('error taxonomy', () => {
  it('labels every code', () => {
    expect(ERROR_LABELS['E-203']).toBe('UNRESOLVED LINK')
    expect(formatCodedError('E-041', 'disk on fire')).toBe('E-041 ARCHIVE UNREACHABLE — disk on fire')
  })
})

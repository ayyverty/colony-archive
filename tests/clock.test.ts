import { describe, expect, it } from 'vitest'
import { formatTime, formatUptime, rimShipDate } from '../src/renderer/src/lib/clock'

describe('clock helpers', () => {
  it('formats time and uptime', () => {
    expect(formatTime(new Date(2026, 0, 1, 5, 6, 7))).toBe('05:06:07')
    expect(formatUptime(3723000)).toBe('01:02:03')
  })

  it('derives a RimWorld ship date', () => {
    const date = rimShipDate(new Date(2026, 0, 1), 5500)
    expect(date).toMatch(/^5500 (Aprimay|Jugust|Septober|Decembary) \d+$/)
  })
})

import { describe, expect, it } from 'vitest'
import { applyTableAction, detectTable } from '../src/renderer/src/lib/table'

const TABLE = ['# Log', '', '| Name | Role |', '| --- | --- |', '| Ava | Lead |', '| Mira | Medic |', ''].join(
  '\n'
)

function caretIn(line: string, offset = 0): number {
  const start = TABLE.indexOf(line)
  expect(start).toBeGreaterThanOrEqual(0)
  return start + offset
}

describe('detectTable', () => {
  it('detects the table around the caret', () => {
    const info = detectTable(TABLE, caretIn('| Ava', 2))
    expect(info).not.toBeNull()
    expect(info!.startLine).toBe(2)
    expect(info!.endLine).toBe(5)
    expect(info!.row).toBe(2)
    expect(info!.dataRows).toBe(2)
    expect(info!.cols).toBe(2)
    expect(info!.rows[0]).toEqual(['Name', 'Role'])
  })

  it('reports header and second-column positions', () => {
    const info = detectTable(TABLE, caretIn('| Name', 8))
    expect(info!.row).toBe(0)
    expect(info!.col).toBe(1)
  })

  it('rejects rows without a separator or with fewer than three lines', () => {
    expect(detectTable('a | b\nc | d\n', 0)).toBeNull()
    expect(detectTable('| a |\n| --- |\n', 0)).toBeNull()
    expect(detectTable('no table here', 0)).toBeNull()
  })
})

describe('applyTableAction', () => {
  it('adds a row after the caret row', () => {
    const result = applyTableAction(TABLE, caretIn('| Ava', 2), 'add-row')
    expect(result).not.toBeNull()
    expect(result!.doc.split('\n')).toEqual([
      '# Log',
      '',
      '| Name | Role |',
      '| --- | --- |',
      '| Ava | Lead |',
      '|   |   |',
      '| Mira | Medic |',
      ''
    ])
    expect(result!.pos).toBeGreaterThan(0)
  })

  it('removes the caret row but keeps the header and separator', () => {
    const result = applyTableAction(TABLE, caretIn('| Ava', 2), 'remove-row')
    expect(result!.doc).not.toContain('| Ava | Lead |')
    expect(result!.doc).toContain('| Mira | Medic |')
    expect(result!.doc).toContain('| Name | Role |')
  })

  it('refuses to remove the only data row', () => {
    const single = ['| a |', '| --- |', '| 1 |'].join('\n')
    expect(applyTableAction(single, single.indexOf('| 1'), 'remove-row')).toBeNull()
  })

  it('adds a column to every row', () => {
    const result = applyTableAction(TABLE, caretIn('| Ava', 2), 'add-col')
    const lines = result!.doc.split('\n')
    expect(lines[2]).toBe('| Name | Role |   |')
    expect(lines[3]).toBe('| --- | --- | --- |')
    expect(lines[4]).toBe('| Ava | Lead |   |')
  })

  it('removes the caret column but refuses to remove the last one', () => {
    const result = applyTableAction(TABLE, caretIn('| Name', 2), 'remove-col')
    expect(result!.doc.split('\n')[2]).toBe('| Name |')
    expect(result!.doc.split('\n')[3]).toBe('| --- |')

    const single = ['| a |', '| --- |', '| 1 |'].join('\n')
    expect(applyTableAction(single, single.indexOf('| 1'), 'remove-col')).toBeNull()
  })

  it('returns null when the caret is outside a table', () => {
    expect(applyTableAction(TABLE, 2, 'add-row')).toBeNull()
  })
})

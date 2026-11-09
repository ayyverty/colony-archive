export type TableAction = 'add-row' | 'remove-row' | 'add-col' | 'remove-col'

export interface TableDetection {
  /** 0-based line where the table starts. */
  startLine: number
  /** 0-based line where the table ends (inclusive). */
  endLine: number
  /** Caret row relative to the table (0 = header). */
  row: number
  /** Caret column (0-based). */
  col: number
  /** Number of data rows (excluding header and separator). */
  dataRows: number
  cols: number
  rows: string[][]
}

const SEPARATOR = /^\s*\|?\s*:?-{2,}/

function splitRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '')
  return trimmed.split('|').map((cell) => cell.trim())
}

function joinRow(cells: string[]): string {
  return `| ${cells.join(' | ')} |`
}

function isRow(line: string): boolean {
  return line.includes('|') && line.trim().length > 0
}

/** Finds the Markdown table surrounding a document offset, if any. */
export function detectTable(source: string, pos: number): TableDetection | null {
  const lines = source.split('\n')
  let lineIndex = 0
  let running = 0
  for (let index = 0; index < lines.length; index += 1) {
    const next = running + lines[index].length + 1
    if (pos < next || index === lines.length - 1) {
      lineIndex = index
      break
    }
    running = next
  }

  if (!isRow(lines[lineIndex] ?? '')) return null

  let start = lineIndex
  while (start > 0 && isRow(lines[start - 1])) start -= 1
  let end = lineIndex
  while (end < lines.length - 1 && isRow(lines[end + 1])) end += 1

  if (end - start < 2) return null
  if (!SEPARATOR.test(lines[start + 1] ?? '')) return null

  const rows = lines.slice(start, end + 1).map(splitRow)
  const cols = Math.max(1, ...rows.map((row) => row.length))
  const row = lineIndex - start

  const line = lines[lineIndex]
  const column = Math.max(0, line.slice(0, running === 0 ? pos : pos - running).split('|').length - 1)
  const col = Math.min(cols - 1, column)

  return { startLine: start, endLine: end, row, col, dataRows: end - start - 1, cols, rows }
}

function normalise(rows: string[][], cols: number): string[][] {
  return rows.map((row) => {
    const next = row.slice(0, cols)
    while (next.length < cols) next.push('')
    return next
  })
}

/** Applies a structural table edit and returns the new document and caret. */
export function applyTableAction(
  source: string,
  pos: number,
  action: TableAction
): { doc: string; pos: number } | null {
  const table = detectTable(source, pos)
  if (!table) return null

  const lines = source.split('\n')
  const rows = normalise(table.rows, table.cols)
  let caretRow = table.row
  let caretCol = table.col

  if (action === 'add-row') {
    const cells = Array.from({ length: table.cols }, () => ' ')
    const insertAt = Math.max(2, Math.min(rows.length, table.row + 1))
    rows.splice(insertAt, 0, cells)
    caretRow = insertAt
  } else if (action === 'remove-row') {
    if (rows.length <= 3) return null
    const removeAt = table.row <= 1 ? 2 : table.row
    rows.splice(removeAt, 1)
    caretRow = Math.min(removeAt, rows.length - 1)
  } else if (action === 'add-col') {
    for (const row of rows) row.push(' ')
    caretCol = table.cols
  } else {
    if (table.cols <= 1) return null
    const removeAt = Math.min(table.col, table.cols - 1)
    for (const row of rows) row.splice(removeAt, 1)
    caretCol = Math.max(0, removeAt - 1)
  }

  const rendered = rows.map((row, index) => {
    if (index === 1) {
      return `| ${row.map(() => '---').join(' | ')} |`
    }
    return joinRow(row)
  })

  lines.splice(table.startLine, table.endLine - table.startLine + 1, ...rendered)
  const doc = lines.join('\n')
  const targetLine = table.startLine + Math.min(caretRow, rendered.length - 1)
  let nextPos = 0
  for (let index = 0; index < targetLine; index += 1) nextPos += lines[index].length + 1

  return { doc, pos: nextPos + 2 + caretCol * 4 }
}

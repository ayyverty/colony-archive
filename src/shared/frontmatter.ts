import type { Frontmatter, FrontmatterValue } from './types'

export interface ParsedDocument {
  data: Frontmatter
  body: string
  hasFrontmatter: boolean
  error?: string
}

const START = /^---[ \t]*$/
const END = /^(---|\.\.\.)[ \t]*$/
const KEY = /^([A-Za-z0-9_.-]+)[ \t]*:[ \t]*(.*)$/
const LIST_ITEM = /^[ \t]*-[ \t]+(.*)$/

const CANONICAL_ORDER = ['title', 'type', 'classification', 'tags', 'aliases', 'date']

function unquote(raw: string): string {
  const value = raw.trim()
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    try {
      return JSON.parse(value) as string
    } catch {
      return value.slice(1, -1)
    }
  }
  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/''/g, "'")
  }
  return value
}

function splitInlineList(raw: string): string[] {
  const inner = raw.trim().replace(/^\[/, '').replace(/\]$/, '')
  const items: string[] = []
  let current = ''
  let quote: '"' | "'" | null = null
  for (let index = 0; index < inner.length; index += 1) {
    const char = inner[index]
    if (quote) {
      current += char
      if (char === quote && inner[index - 1] !== '\\') quote = null
      continue
    }
    if (char === '"' || char === "'") {
      quote = char
      current += char
      continue
    }
    if (char === ',') {
      items.push(unquote(current))
      current = ''
      continue
    }
    current += char
  }
  if (current.trim().length > 0 || items.length > 0) items.push(unquote(current))
  return items.map((item) => item.trim()).filter((item) => item.length > 0)
}

function parseValue(raw: string): FrontmatterValue {
  const value = raw.trim()
  if (!value) return ''
  if (value.startsWith('[') && value.endsWith(']')) return splitInlineList(value)
  return unquote(value)
}

/** Parses the simple YAML subset used by colony records. Unknown keys are kept. */
export function parseFrontmatter(source: string): ParsedDocument {
  const clean = source.replace(/^\uFEFF/, '')
  const eol = clean.includes('\r\n') ? '\r\n' : '\n'
  const lines = clean.split(/\r?\n/)

  if (!START.test(lines[0] ?? '')) {
    return { data: {}, body: clean, hasFrontmatter: false }
  }

  let end = -1
  for (let index = 1; index < lines.length; index += 1) {
    if (END.test(lines[index])) {
      end = index
      break
    }
  }

  if (end === -1) {
    return {
      data: {},
      body: clean,
      hasFrontmatter: false,
      error: 'Frontmatter opened with --- but was never closed.'
    }
  }

  const data: Frontmatter = {}
  let currentListKey: string | null = null

  for (let index = 1; index < end; index += 1) {
    const line = lines[index]
    if (!line.trim() || /^[ \t]*#/.test(line)) continue

    const listMatch = LIST_ITEM.exec(line)
    if (listMatch && currentListKey) {
      const existing = data[currentListKey]
      const values = Array.isArray(existing) ? existing : []
      values.push(unquote(listMatch[1]))
      data[currentListKey] = values
      continue
    }

    const match = KEY.exec(line)
    if (!match) continue
    const key = match[1].toLowerCase()
    const rawValue = match[2]
    if (!rawValue.trim()) {
      currentListKey = key
      data[key] = []
      continue
    }
    currentListKey = null
    data[key] = parseValue(rawValue)
  }

  return {
    data,
    body: lines.slice(end + 1).join(eol),
    hasFrontmatter: true
  }
}

function needsQuotes(value: string): boolean {
  return (
    value.length === 0 ||
    /^[\s]|[\s]$/.test(value) ||
    /[#,[\]{}"'\n\r]/.test(value) ||
    /:(\s|$)/.test(value)
  )
}

function formatScalar(value: string): string {
  return needsQuotes(value) ? JSON.stringify(value) : value
}

function formatValue(value: FrontmatterValue): string | null {
  if (Array.isArray(value)) {
    const items = value.filter((item) => item.trim().length > 0)
    if (items.length === 0) return null
    return `[${items.map(formatScalar).join(', ')}]`
  }
  const trimmed = value.trim()
  if (!trimmed) return null
  return formatScalar(trimmed)
}

export function serializeFrontmatter(data: Frontmatter, body: string): string {
  const eol = body.includes('\r\n') ? '\r\n' : '\n'
  const keys = [
    ...CANONICAL_ORDER.filter((key) => key in data),
    ...Object.keys(data).filter((key) => !CANONICAL_ORDER.includes(key))
  ]

  const lines: string[] = []
  for (const key of keys) {
    const formatted = formatValue(data[key])
    if (formatted === null) continue
    lines.push(`${key}: ${formatted}`)
  }

  if (lines.length === 0) {
    const trimmed = body.replace(/^\r?\n+/, '')
    return trimmed
  }

  const cleanBody = body.replace(/^\r?\n+/, '')
  return `---${eol}${lines.join(eol)}${eol}---${eol}${cleanBody ? `${eol}${cleanBody}` : ''}`
}

export function setFrontmatter(source: string, data: Frontmatter): string {
  const parsed = parseFrontmatter(source)
  return serializeFrontmatter(data, parsed.body)
}

export function updateFrontmatter(
  source: string,
  patch: Partial<Frontmatter>
): string {
  const parsed = parseFrontmatter(source)
  const next: Frontmatter = { ...parsed.data }
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue
    next[key] = value
  }
  return serializeFrontmatter(next, parsed.body)
}

export function removeFrontmatter(source: string): string {
  const parsed = parseFrontmatter(source)
  return parsed.body.replace(/^\r?\n+/, '')
}

export function stringValue(value: FrontmatterValue | undefined): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.join(', ')
  return ''
}

export function listValue(value: FrontmatterValue | undefined): string[] {
  if (Array.isArray(value)) return value.map((item) => item.trim()).filter(Boolean)
  if (typeof value === 'string' && value.trim()) {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

export function splitCommaList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

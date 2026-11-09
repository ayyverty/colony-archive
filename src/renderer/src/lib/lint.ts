export interface HeadingWarning {
  /** 1-based line number. */
  line: number
  from: number
  to: number
  text: string
}

/**
 * RimWorld's wiki style prefers sentence case for headings. This is a
 * deliberately conservative heuristic: it only flags headings where every
 * significant word is capitalized, and ignores known proper nouns/acronyms.
 */
const PROPER_NOUNS = new Set(
  [
    'rimworld',
    'royalty',
    'ideology',
    'biotech',
    'anomaly',
    'odyssey',
    'steam',
    'windows',
    'linux',
    'macos',
    'javascript',
    'typescript',
    'react',
    'api',
    'ui',
    'hp',
    'dna',
    'xml',
    'npc',
    'ai',
    'dlc',
    'mod'
  ].map((word) => word.toLowerCase())
)

const SMALL_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'of', 'for', 'to', 'in', 'on', 'at', 'by', 'with', 'from', 'vs', 'via'
])

const HEADING = /^(#{1,6})[ \t]+(.+?)[ \t]*#*[ \t]*$/
const FENCE = /^\s*(```|~~~)/

function stripInlineMarkup(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[\[([^\]]*)\]\]/g, '$1')
    .replace(/[`*_~]/g, '')
}

function cleanWord(raw: string): string {
  return raw.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
}

function isCapitalized(word: string): boolean {
  return /^\p{Lu}/u.test(word)
}

function isAcronym(word: string): boolean {
  return /^[\p{Lu}\p{N}]{2,}$/u.test(word)
}

function looksLikeTitleCase(heading: string): boolean {
  const words = stripInlineMarkup(heading)
    .split(/\s+/)
    .filter((word) => /[\p{L}]/u.test(word))

  if (words.length < 2) return false

  let capitalized = 0
  for (const raw of words) {
    const word = cleanWord(raw)
    if (!word) continue
    if (isAcronym(word)) continue
    if (PROPER_NOUNS.has(word.toLowerCase())) continue
    if (isCapitalized(word)) {
      capitalized += 1
      continue
    }
    if (SMALL_WORDS.has(word.toLowerCase())) continue
    return false
  }

  return capitalized >= 2
}

export function findTitleCaseHeadings(source: string): HeadingWarning[] {
  const warnings: HeadingWarning[] = []
  const lines = source.split('\n')
  let offset = 0
  let inFence = false

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const lineStart = offset
    offset += line.length + 1

    if (FENCE.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue

    const match = HEADING.exec(line)
    if (!match) continue

    const text = match[2]
    if (!looksLikeTitleCase(text)) continue

    const textStart = lineStart + (match[1]?.length ?? 0) + 1
    warnings.push({
      line: index + 1,
      from: textStart,
      to: textStart + text.length,
      text
    })
  }

  return warnings
}

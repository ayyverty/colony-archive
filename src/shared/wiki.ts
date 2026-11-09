import { listValue, parseFrontmatter, stringValue } from './frontmatter'
import type {
  ArchiveIndex,
  ArchiveMeta,
  Classification,
  BrokenLink,
  IndexedDirective,
  IndexedLink,
  IndexedPage,
  Relationship,
  TagCount
} from './types'

export interface RawPage {
  path: string
  content: string
  mtimeMs: number
  size?: number
}

const FENCE = /^\s*(```|~~~)/
const HEADING = /^#{1,6}[ \t]+(.+?)[ \t]*#*[ \t]*$/
const WIKI_LINK = /\[\[([^\]\n]+)\]\]/g
const DIRECTIVE = /\{\{\s*([A-Za-z][\w-]*)\s*:\s*([^{}\n]+?)\s*\}\}/g
const TAG = /(?:^|[\s([{,;:])#([\p{L}][\p{L}\p{N}_-]*)/gu
const RIM_DATE = /^(\d{3,5})-(\d{1,2})-(\d{1,2})$/

export const RIM_QUADRUMS = ['Aprimay', 'Jugust', 'Septober', 'Decembary'] as const
export const RESERVED_FILES = new Set(['_archive.md', '_log.md'])
const KNOWN_KINDS = [
  'colonist',
  'faction',
  'event',
  'item',
  'location',
  'ideology',
  'animal',
  'mechanoid',
  'quest',
  'stub',
  'artifact',
  'relic',
  'journey',
  'route',
  'caravan',
  'memorial',
  'colony'
] as const

/** Blanks fenced blocks and inline code while preserving line numbers. */
export function stripCode(source: string): string {
  return source
    .replace(/(```|~~~)[\s\S]*?\1/g, (match) => match.replace(/[^\n]/g, ' '))
    .replace(/`[^`\n]*`/g, (match) => ' '.repeat(match.length))
}

export function basename(path: string): string {
  const index = path.lastIndexOf('/')
  return index === -1 ? path : path.slice(index + 1)
}

export function dirname(path: string): string {
  const index = path.lastIndexOf('/')
  return index === -1 ? '' : path.slice(0, index)
}

export function stem(path: string): string {
  return basename(path).replace(/\.md$/i, '')
}

export function normalizeTag(raw: string): string {
  return raw.trim().replace(/^#+/, '').toLowerCase()
}

export function extractTags(source: string): string[] {
  const tags = new Set<string>()
  const text = stripCode(source)
  for (const match of text.matchAll(TAG)) {
    const tag = normalizeTag(match[1])
    if (tag.length > 1) tags.add(tag)
  }
  return [...tags].sort()
}

export function extractDirectives(source: string): IndexedDirective[] {
  const directives: IndexedDirective[] = []
  const seen = new Set<string>()
  for (const match of stripCode(source).matchAll(DIRECTIVE)) {
    const kind = match[1].toLowerCase()
    const value = match[2].trim()
    if (!value) continue
    const key = `${kind}:${value.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    directives.push({ kind, value })
  }
  return directives
}

interface ParsedWikiLink {
  target: string
  heading?: string
  label?: string
}

function parseWikiLink(inner: string): ParsedWikiLink {
  let body = inner.trim()
  let label: string | undefined
  const pipe = body.indexOf('|')
  if (pipe >= 0) {
    label = body.slice(pipe + 1).trim() || undefined
    body = body.slice(0, pipe)
  }
  let heading: string | undefined
  const hash = body.indexOf('#')
  if (hash >= 0) {
    heading = body.slice(hash + 1).trim() || undefined
    body = body.slice(0, hash)
  }
  return { target: body.trim(), heading, label }
}

export function extractWikiLinks(source: string): IndexedLink[] {
  const links: IndexedLink[] = []
  const seen = new Set<string>()
  for (const match of stripCode(source).matchAll(WIKI_LINK)) {
    const parsed = parseWikiLink(match[1])
    const key = `${parsed.target.toLowerCase()}#${parsed.heading ?? ''}`
    if (seen.has(key)) continue
    seen.add(key)
    links.push({ ...parsed, resolved: null })
  }
  return links
}

function firstHeading(source: string): string | null {
  let inFence = false
  for (const line of source.split(/\r?\n/)) {
    if (FENCE.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    const match = HEADING.exec(line)
    if (match) return match[1].trim()
  }
  return null
}

function plainText(line: string): string {
  return line
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_all, target: string, label?: string) => label ?? target)
    .replace(/<[^>]+>/g, '')
    .replace(/[`*_~>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function buildExcerpt(body: string, max = 240): string {
  let inFence = false
  const paragraph: string[] = []

  for (const rawLine of body.split(/\r?\n/)) {
    if (FENCE.test(rawLine)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue

    const line = rawLine.trim()
    if (!line) {
      if (paragraph.length > 0) break
      continue
    }
    if (HEADING.test(line) || /^[-*_]{3,}$/.test(line) || /^\|?\s*:?-{3,}/.test(line)) {
      if (paragraph.length > 0) break
      continue
    }

    const text = plainText(line.replace(/^[-*+]\s+/, '').replace(/^\d+[.)]\s+/, ''))
    if (text) paragraph.push(text)
    if (paragraph.join(' ').length >= max) break
  }

  const text = paragraph.join(' ').trim()
  if (text.length <= max) return text
  return `${text.slice(0, max - 1).trimEnd()}…`
}

export function parseRimDate(
  value: string | null | undefined
): { year: number; quadrum: number; day: number } | null {
  if (!value) return null
  const match = RIM_DATE.exec(value.trim())
  if (!match) return null
  const year = Number(match[1])
  const quadrum = Number(match[2])
  const day = Number(match[3])
  if (!Number.isInteger(year) || quadrum < 1 || quadrum > 4 || day < 1 || day > 15) return null
  return { year, quadrum, day }
}

export function addRimDays(value: string, days: number): string | null {
  const parsed = parseRimDate(value)
  if (!parsed) return null
  const totalDays = parsed.year * 60 + (parsed.quadrum - 1) * 15 + (parsed.day - 1) + days
  const year = Math.floor(totalDays / 60)
  const remainder = ((totalDays % 60) + 60) % 60
  const quadrum = Math.floor(remainder / 15) + 1
  const day = (remainder % 15) + 1
  return `${year}-${String(quadrum).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function formatRimDate(value: string | null | undefined): string | null {
  const date = parseRimDate(value)
  if (!date) return null
  return `${date.year} · ${RIM_QUADRUMS[date.quadrum - 1]} ${date.day}`
}

export function pageKind(page: IndexedPage): string {
  const type = (page.type ?? '').toLowerCase()
  if (type && KNOWN_KINDS.includes(type as (typeof KNOWN_KINDS)[number])) return type
  for (const kind of KNOWN_KINDS) {
    if (page.tags.includes(kind)) return kind
  }
  return type || 'page'
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+/g, '/')
}

function normalizePathKey(value: string): string {
  const key = normalizeKey(value)
  return /\.md$/i.test(key) ? key : `${key}.md`
}

function inList(list: string[], value: string): boolean {
  const wanted = normalizeKey(value.replace(/\[\[|\]\]/g, ''))
  return list.some((entry) => normalizeKey(entry.replace(/\[\[|\]\]/g, '')) === wanted)
}

export interface PageLookup {
  pages: IndexedPage[]
  byPath: Map<string, IndexedPage>
  get: (path: string) => IndexedPage | undefined
  resolve: (target: string, fromPath?: string) => IndexedPage | null
  findDirective: (kind: string, value: string, fromPath?: string) => IndexedPage | null
}

export function createPageLookup(index: ArchiveIndex | null): PageLookup {
  const pages = index?.pages ?? []
  const byPath = new Map<string, IndexedPage>()
  const byKey = new Map<string, IndexedPage[]>()

  const addKey = (raw: string, page: IndexedPage): void => {
    const key = normalizeKey(raw)
    if (!key) return
    const values = byKey.get(key) ?? []
    if (!values.includes(page)) values.push(page)
    byKey.set(key, values)
  }

  for (const page of pages) {
    byPath.set(normalizePathKey(page.path), page)
    byPath.set(normalizeKey(page.path), page)
    addKey(page.path, page)
    addKey(page.path.replace(/\.md$/i, ''), page)
    addKey(stem(page.path), page)
    addKey(page.title, page)
    for (const alias of page.aliases) addKey(alias, page)
  }

  const resolve = (target: string, fromPath = ''): IndexedPage | null => {
    const raw = target.trim()
    if (!raw) return byPath.get(normalizePathKey(fromPath)) ?? null

    const clean = raw.replace(/\\/g, '/')
    const candidates: string[] = []

    if (clean.startsWith('/')) {
      candidates.push(clean.slice(1))
    } else {
      const base = dirname(fromPath)
      if (base) candidates.push(resolveRelativePath(base, clean))
      candidates.push(clean)
    }

    for (const candidate of candidates) {
      const direct =
        byPath.get(normalizePathKey(candidate)) ?? byPath.get(normalizeKey(candidate))
      if (direct) return direct
    }

    const keyMatches = byKey.get(normalizeKey(clean))
    if (keyMatches?.length) return keyMatches[0]

    return null
  }

  const findDirective = (kind: string, value: string, fromPath = ''): IndexedPage | null => {
    const normalizedKind = kind.toLowerCase()
    const wanted = normalizeKey(value)

    for (const page of pages) {
      if (pageKind(page) !== normalizedKind) continue
      const keys = [
        page.path,
        page.path.replace(/\.md$/i, ''),
        stem(page.path),
        page.title,
        ...page.aliases
      ].map(normalizeKey)
      if (keys.includes(wanted)) return page
    }

    const resolved = resolve(value, fromPath)
    if (resolved) return resolved

    const keyMatches = byKey.get(wanted) ?? []
    return keyMatches[0] ?? null
  }

  return {
    pages,
    byPath,
    get: (path) => byPath.get(normalizePathKey(path)) ?? byPath.get(normalizeKey(path)),
    resolve,
    findDirective
  }
}

export function resolveRelativePath(baseDir: string, target: string): string {
  const stack = baseDir ? baseDir.split('/').filter(Boolean) : []
  for (const part of target.replace(/\\/g, '/').split('/')) {
    if (!part || part === '.') continue
    if (part === '..') stack.pop()
    else stack.push(part)
  }
  return stack.join('/')
}

/** A browser-friendly relative href from one page to another. */
export function relativePageHref(
  fromPath: string,
  targetPath: string,
  heading?: string
): string {
  const fromParts = dirname(fromPath).split('/').filter(Boolean)
  const targetParts = targetPath.split('/').filter(Boolean)
  let common = 0
  while (
    common < fromParts.length &&
    common < targetParts.length &&
    fromParts[common].toLowerCase() === targetParts[common].toLowerCase()
  ) {
    common += 1
  }
  const pieces = [
    ...Array.from({ length: fromParts.length - common }, () => '..'),
    ...targetParts.slice(common)
  ]
  const href = pieces.join('/') || basename(targetPath)
  return heading ? `${href}#${heading}` : href
}

export function parseClassification(value: string | null | undefined): Classification {
  const normalized = (value ?? '').trim().toLowerCase()
  if (normalized === 'public' || normalized === 'internal' || normalized === 'classified') {
    return normalized
  }
  return 'internal'
}

export function parseArchiveMeta(_rootPath: string, raw: RawPage | null): ArchiveMeta | null {
  if (!raw) return null
  const parsed = parseFrontmatter(raw.content)
  const rawLeader = stringValue(parsed.data.leader).trim()
  const leaderMatch = /\[\[([^\]]+)\]\]/.exec(rawLeader)
  const leader = leaderMatch?.[1]?.trim() ?? (rawLeader || null)
  const archivistRaw = stringValue(parsed.data.archivist).trim()
  const archivistMatch = /\[\[([^\]]+)\]\]/.exec(archivistRaw)
  const archivist = archivistMatch?.[1]?.trim() ?? (archivistRaw || null)
  const techLevelRaw = stringValue(parsed.data.tech_level ?? parsed.data.techLevel ?? parsed.data.era).trim().toLowerCase()
  const techLevel =
    techLevelRaw === 'neolithic' || techLevelRaw === 'industrial' || techLevelRaw === 'ultratech'
      ? (techLevelRaw as 'neolithic' | 'industrial' | 'ultratech')
      : 'spacer'
  const hostile = listValue(parsed.data.hostile_factions ?? parsed.data.hostileFactions)
  const allied = listValue(parsed.data.allied_factions ?? parsed.data.alliedFactions)
  const populationRaw = stringValue(parsed.data.population).trim()
  const population = populationRaw && Number.isFinite(Number(populationRaw)) ? Number(populationRaw) : null
  return {
    path: raw.path,
    title: stringValue(parsed.data.title).trim() || stem(raw.path),
    settlement: stringValue(parsed.data.settlement).trim() || null,
    leader,
    founded: stringValue(parsed.data.founded).trim() || null,
    sector: stringValue(parsed.data.sector).trim() || null,
    classification:
      parsed.data.classification !== undefined
        ? parseClassification(stringValue(parsed.data.classification))
        : null,
    techLevel,
    archivist,
    currentDate: stringValue(parsed.data.current_date ?? parsed.data.currentDate ?? parsed.data.date).trim() || null,
    colonyStatus: stringValue(parsed.data.status).trim() || null,
    population,
    faction: stringValue(parsed.data.faction).trim() || null,
    hostileFactions: hostile,
    alliedFactions: allied,
    archiveId: stringValue(parsed.data.archive_id ?? parsed.data.archiveId).trim() || null
  }
}

export function buildArchiveIndex(
  rootPath: string,
  rawPages: RawPage[],
  generatedAt = Date.now()
): ArchiveIndex {
  const archiveRaw = rawPages.find((raw) => raw.path === '_archive.md') ?? null
  const meta = parseArchiveMeta(rootPath, archiveRaw)
  const prepared: IndexedPage[] = rawPages
    .filter((raw) => !RESERVED_FILES.has(raw.path.split('/').pop() ?? raw.path))
    .map((raw) => {
    const parsed = parseFrontmatter(raw.content)
    const body = parsed.body
    const heading = firstHeading(body)
    const title = stringValue(parsed.data.title).trim() || heading || stem(raw.path)
    const type = stringValue(parsed.data.type).trim().toLowerCase() || null
    const classification = parsed.data.classification !== undefined
      ? parseClassification(stringValue(parsed.data.classification))
      : (meta?.classification ?? 'internal')
    const status = stringValue(parsed.data.status).trim() || null
    const factionRaw = stringValue(parsed.data.faction).trim()
    const stanceRaw = stringValue(parsed.data.stance).trim().toLowerCase()
    const stance =
      stanceRaw === 'allied' || stanceRaw === 'neutral' || stanceRaw === 'hostile'
        ? (stanceRaw as 'allied' | 'neutral' | 'hostile')
        : null
    const probe = type === 'faction' ? title : (factionRaw || title)
    const alignment =
      stance ??
      ((meta?.hostileFactions ? inList(meta.hostileFactions, probe) : false)
        ? 'hostile'
        : (meta?.alliedFactions ? inList(meta.alliedFactions, probe) : false)
          ? 'allied'
          : 'neutral')
    const source = stringValue(parsed.data.source).trim() || null
    const originRaw = stringValue(parsed.data.origin).trim().toLowerCase()
    const origin =
      originRaw === 'recovered' ? 'recovered' : originRaw === 'intercepted' ? 'intercepted' : null
    const signed = stringValue(parsed.data.signed).trim().toLowerCase() === 'true'
    const eventType = stringValue(parsed.data.event_type ?? parsed.data.eventType).trim() || type
    const relationships: Relationship[] = listValue(parsed.data.relationships).map((entry) => {
      const match = /^([^:]+):\s*(.+)$/.exec(entry.trim())
      return {
        kind: match ? match[1].trim() : 'related',
        target: match ? match[2].trim() : entry.trim(),
        resolved: null
      }
    })
    const skills = listValue(parsed.data.skills)
      .map((entry) => {
        const match = /^(.+?):\s*(\d+(?:\.\d+)?)$/.exec(entry.trim())
        return match ? { name: match[1].trim(), value: Number(match[2]) } : null
      })
      .filter((entry): entry is { name: string; value: number } => Boolean(entry))
    const dossier = {
      backstory: stringValue(parsed.data.backstory).trim() || null,
      traits: listValue(parsed.data.traits),
      skills,
      health: listValue(parsed.data.health_conditions ?? parsed.data.health),
      mood: stringValue(parsed.data.mood).trim() || null
    }
    const artifact =
      type === 'artifact' || type === 'relic'
        ? {
            origin: stringValue(parsed.data.origin).trim() || null,
            powers: listValue(parsed.data.powers),
            currentHolder: stringValue(parsed.data.current_holder ?? parsed.data.currentHolder).trim() || null,
            icon: stringValue(parsed.data.icon).trim() || null
          }
        : null
    const journey =
      type === 'journey' || type === 'route' || type === 'caravan'
        ? listValue(parsed.data.itinerary ?? parsed.data.route).map((entry) => {
            const match = /^(.+?):\s*(.+)$/.exec(entry.trim())
            return {
              date: match ? match[1].trim() : null,
              waypoint: match ? match[2].trim() : entry.trim(),
              resolved: null,
              note: null
            }
          })
        : []
    const tags = new Set<string>([
      ...extractTags(body),
      ...listValue(parsed.data.tags).map(normalizeTag)
    ])
    const aliases = listValue(parsed.data.aliases)
    const dateValue = stringValue(parsed.data.date).trim()
    const date = RIM_DATE.test(dateValue) ? dateValue : null
    const links = extractWikiLinks(body)
    const directives = extractDirectives(body)
    const cleanTags = [...tags].filter((tag) => tag.length > 1).sort()
    const isStub =
      cleanTags.includes('stub') || /\{\{\s*stub[\s}|]/i.test(body) || /\[!\s*stub\]/i.test(body)
    const words = body
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/[#>*_`[\]()]/g, ' ')
      .split(/\s+/)
      .filter(Boolean).length

    return {
      path: raw.path,
      title,
      type,
      classification,
      status,
      faction: factionRaw || null,
      stance,
      alignment,
      source,
      origin,
      signed,
      eventType,
      tags: cleanTags,
      aliases,
      date,
      excerpt: buildExcerpt(body),
      links,
      backlinks: [],
      directives,
      relationships,
      isStub,
      words,
      size: raw.size ?? new TextEncoder().encode(raw.content).length,
      mtimeMs: raw.mtimeMs,
      frontmatter: parsed.data,
      dossier,
      artifact,
      journey
    }
  })

  const provisional: ArchiveIndex = {
    rootPath,
    generatedAt,
    pages: prepared,
    tags: [],
    brokenLinks: [],
    meta
  }
  const lookup = createPageLookup(provisional)

  for (const page of prepared) {
    for (const relationship of page.relationships) {
      relationship.resolved = lookup.resolve(relationship.target, page.path)?.path ?? null
    }
    for (const stop of page.journey) {
      stop.resolved = lookup.resolve(stop.waypoint, page.path)?.path ?? null
    }
  }

  const backlinkMap = new Map<string, Set<string>>()
  const brokenLinks: BrokenLink[] = []
  const brokenSeen = new Set<string>()

  for (const page of prepared) {
    for (const link of page.links) {
      const target = link.target
        ? lookup.resolve(link.target, page.path)
        : lookup.resolve(page.path, page.path)
      link.resolved = target?.path ?? null
      if (!target) {
        if (link.target) {
          const key = `${page.path}\u0000${link.target}`
          if (!brokenSeen.has(key)) {
            brokenSeen.add(key)
            brokenLinks.push({ from: page.path, target: link.target })
          }
        }
        continue
      }
      if (target.path === page.path) continue
      const sources = backlinkMap.get(target.path) ?? new Set<string>()
      sources.add(page.path)
      backlinkMap.set(target.path, sources)
    }
  }

  for (const page of prepared) {
    page.backlinks = [...(backlinkMap.get(page.path) ?? [])].sort((a, b) =>
      a.localeCompare(b)
    )
  }

  const tagCounts = new Map<string, number>()
  for (const page of prepared) {
    for (const tag of page.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)
  }
  const tags: TagCount[] = [...tagCounts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))

  prepared.sort((a, b) => a.path.localeCompare(b.path))
  brokenLinks.sort((a, b) => a.from.localeCompare(b.from) || a.target.localeCompare(b.target))

  return { rootPath, generatedAt, pages: prepared, tags, brokenLinks, meta }
}

import { app } from 'electron'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { DEFAULT_CONFIG, type ArchiveConfig } from '../shared/types'

let cached: ArchiveConfig | null = null

function configPath(): string {
  const base = process.env['COLONY_USER_DATA'] ?? app.getPath('userData')
  return path.join(base, 'config.json')
}

function cleanArchives(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  for (const entry of value) {
    if (typeof entry !== 'string') continue
    const trimmed = entry.trim()
    if (!trimmed) continue
    const key = process.platform === 'win32' ? trimmed.toLowerCase() : trimmed
    if (seen.has(key)) continue
    seen.add(key)
  }
  return value
    .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    .filter((entry, index, list) => {
      const key = process.platform === 'win32' ? entry.toLowerCase() : entry
      return list.findIndex((candidate) => {
        const candidateKey =
          process.platform === 'win32' ? candidate.toLowerCase() : candidate
        return candidateKey === key
      }) === index
    })
}

function cleanFavorites(value: unknown): Record<string, string[]> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const out: Record<string, string[]> = {}
  for (const [key, paths] of Object.entries(value as Record<string, unknown>)) {
    if (!key || !Array.isArray(paths)) continue
    const clean = paths
      .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
      .map((entry) => entry.replace(/\\/g, '/'))
    if (clean.length) out[key] = [...new Set(clean)]
  }
  return out
}

export function sanitizeConfig(input: Partial<ArchiveConfig>): ArchiveConfig {
  const theme =
    input.theme === 'dark' || input.theme === 'light' || input.theme === 'system'
      ? input.theme
      : DEFAULT_CONFIG.theme

  const ratio =
    typeof input.splitRatio === 'number' && Number.isFinite(input.splitRatio)
      ? Math.min(0.78, Math.max(0.22, input.splitRatio))
      : DEFAULT_CONFIG.splitRatio

  const rootPath =
    typeof input.rootPath === 'string' && input.rootPath.trim().length > 0
      ? input.rootPath
      : null

  const display =
    input.display === 'clean' || input.display === 'phosphor'
      ? input.display
      : DEFAULT_CONFIG.display

  const sector =
    typeof input.sector === 'string' && input.sector.trim().length > 0
      ? input.sector.trim()
      : DEFAULT_CONFIG.sector

  const featureUsage =
    input.featureUsage && typeof input.featureUsage === 'object' && !Array.isArray(input.featureUsage)
      ? (input.featureUsage as Record<string, Record<string, number>>)
      : DEFAULT_CONFIG.featureUsage

  const unlocks =
    input.unlocks && typeof input.unlocks === 'object' && !Array.isArray(input.unlocks)
      ? (input.unlocks as Record<string, string[]>)
      : DEFAULT_CONFIG.unlocks

  const lastSeenVersion =
    typeof input.lastSeenVersion === 'string' ? input.lastSeenVersion : DEFAULT_CONFIG.lastSeenVersion

  const sealPassphrase =
    typeof input.sealPassphrase === 'string' && input.sealPassphrase.trim().length > 0
      ? input.sealPassphrase
      : DEFAULT_CONFIG.sealPassphrase

  const operatorName =
    typeof input.operatorName === 'string' && input.operatorName.trim().length > 0
      ? input.operatorName.trim()
      : DEFAULT_CONFIG.operatorName

  const archives = cleanArchives(input.archives)
  if (rootPath && !archives.includes(rootPath)) archives.unshift(rootPath)

  return {
    rootPath,
    archives,
    favorites: cleanFavorites(input.favorites),
    theme,
    previewVisible:
      typeof input.previewVisible === 'boolean'
        ? input.previewVisible
        : DEFAULT_CONFIG.previewVisible,
    sidebarVisible:
      typeof input.sidebarVisible === 'boolean'
        ? input.sidebarVisible
        : DEFAULT_CONFIG.sidebarVisible,
    splitRatio: ratio,
    bootSequence:
      typeof input.bootSequence === 'boolean' ? input.bootSequence : DEFAULT_CONFIG.bootSequence,
    linter: typeof input.linter === 'boolean' ? input.linter : DEFAULT_CONFIG.linter,
    autosave:
      typeof input.autosave === 'boolean' ? input.autosave : DEFAULT_CONFIG.autosave,
    typewriterScroll:
      typeof input.typewriterScroll === 'boolean'
        ? input.typewriterScroll
        : DEFAULT_CONFIG.typewriterScroll,
    display,
    keyclick: typeof input.keyclick === 'boolean' ? input.keyclick : DEFAULT_CONFIG.keyclick,
    sector,
    sealPassphrase,
    signOff: typeof input.signOff === 'boolean' ? input.signOff : DEFAULT_CONFIG.signOff,
    operatorName,
    featureUsage,
    unlocks,
    lastSeenVersion
  }
}

function legacyConfigPaths(): string[] {
  const base = process.env['COLONY_USER_DATA'] ?? app.getPath('userData')
  const parent = path.dirname(base)
  return [
    path.join(parent, 'Colony Archive', 'config.json'),
    path.join(parent, 'colony-archive', 'config.json')
  ]
}

export async function loadConfig(): Promise<ArchiveConfig> {
  if (cached) return cached
  const target = configPath()
  let raw: string | null = null
  try {
    raw = await fs.readFile(target, 'utf8')
  } catch {
    for (const legacy of legacyConfigPaths()) {
      try {
        raw = await fs.readFile(legacy, 'utf8')
        await fs.mkdir(path.dirname(target), { recursive: true })
        await fs.writeFile(target, raw, 'utf8')
        break
      } catch {
        // Try the next legacy location.
      }
    }
  }
  if (raw === null) {
    cached = { ...DEFAULT_CONFIG }
    return cached
  }
  try {
    const parsed = JSON.parse(raw) as Partial<ArchiveConfig>
    cached = sanitizeConfig({ ...DEFAULT_CONFIG, ...parsed })
  } catch {
    cached = { ...DEFAULT_CONFIG }
  }
  return cached
}

export async function saveConfig(patch: Partial<ArchiveConfig>): Promise<ArchiveConfig> {
  const current = await loadConfig()
  const next = sanitizeConfig({ ...current, ...patch })
  cached = next

  const target = configPath()
  await fs.mkdir(path.dirname(target), { recursive: true })
  const temp = `${target}.${process.pid}.tmp`
  await fs.writeFile(temp, JSON.stringify(next, null, 2), 'utf8')
  await fs.rename(temp, target)
  return next
}

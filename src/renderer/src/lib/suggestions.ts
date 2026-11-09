import type { ArchiveIndex, SeeAlsoSuggestion } from '@shared/types'
import { extractTags, extractWikiLinks } from '@shared/wiki'

function normalize(value: string): string {
  return value.trim().toLowerCase()
}

function sharedCount(a: string[], b: string[]): number {
  const set = new Set(b.map(normalize))
  return a.filter((item) => set.has(normalize(item))).length
}

export function suggestRelated(
  index: ArchiveIndex | null,
  currentPath: string,
  currentSource: string,
  limit = 6
): SeeAlsoSuggestion[] {
  if (!index) return []
  const currentPage = index.pages.find((page) => page.path === currentPath)
  const currentTags = [...new Set([...extractTags(currentSource), ...(currentPage?.tags ?? [])])]
  const currentLinks = new Set(extractWikiLinks(currentSource).map((link) => normalize(link.target)))
  const currentFields = new Set([
    currentPage?.type ?? '',
    currentPage?.faction ?? '',
    currentPage?.status ?? '',
    ...(currentPage?.tags ?? [])
  ].map(normalize).filter(Boolean))

  return index.pages
    .filter((page) => page.path !== currentPath && !page.path.startsWith('_'))
    .map((page) => {
      const reasons: string[] = []
      let score = 0

      const tagScore = sharedCount(currentTags, page.tags)
      if (tagScore > 0) {
        score += tagScore * 4
        reasons.push(`${tagScore} shared tag${tagScore === 1 ? '' : 's'}`)
      }

      const linkOverlap = [...currentLinks].filter((target) => page.links.some((link) => normalize(link.target) === target)).length
      if (linkOverlap > 0) {
        score += linkOverlap * 3
        reasons.push(`${linkOverlap} shared link${linkOverlap === 1 ? '' : 's'}`)
      }

      const pageFields = new Set([page.type ?? '', page.faction ?? '', page.status ?? '', ...page.tags].map(normalize).filter(Boolean))
      const fieldOverlap = [...currentFields].filter((field) => pageFields.has(field)).length
      if (fieldOverlap > 0) {
        score += fieldOverlap * 2
        reasons.push('shared metadata')
      }

      if (currentPage?.backlinks.includes(page.path)) {
        score += 1
        reasons.push('backlink')
      }

      if (currentLinks.has(normalize(page.title)) || currentLinks.has(normalize(page.path.replace(/\.md$/i, '')))) {
        score -= 3
      }

      return { path: page.path, title: page.title, score, reasons }
    })
    .filter((suggestion) => suggestion.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit)
}
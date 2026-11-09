import { useArchiveStore } from '../state/store'
import { parseFrontmatter, removeFrontmatter } from '@shared/frontmatter'
import { extractWikiLinks } from '@shared/wiki'

export function RelatedNudge({ path }: { path: string }) {
  const draft = useArchiveStore((state) => state.drafts[path] ?? '')
  const setSeeAlsoOpen = useArchiveStore((state) => state.setSeeAlsoOpen)
  const parsed = parseFrontmatter(draft)
  if (parsed.hasFrontmatter === false && !draft.trim()) return null
  const links = extractWikiLinks(removeFrontmatter(draft))
  if (links.length > 0) return null
  if (path.startsWith('_')) return null

  return (
    <div className="related-nudge">
      <span>&gt; This page doesn't link anywhere.</span>
      <button type="button" onClick={() => setSeeAlsoOpen(true)}>
        See suggestions
      </button>
    </div>
  )
}
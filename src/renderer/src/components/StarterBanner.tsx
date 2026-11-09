import { useArchiveStore } from '../state/store'
import { inferTypeFromPath } from '@shared/pageTemplates'
import { parseFrontmatter } from '@shared/frontmatter'

export function StarterBanner({ path }: { path: string }) {
  const draft = useArchiveStore((state) => state.drafts[path] ?? '')
  const applyStarterFrontmatter = useArchiveStore((state) => state.applyStarterFrontmatter)
  const parsed = parseFrontmatter(draft)
  const inferred = inferTypeFromPath(path)
  if (parsed.hasFrontmatter || !inferred) return null

  return (
    <div className="starter-banner">
      <span>No metadata found.</span>
      <button type="button" className="btn btn--ghost" onClick={() => applyStarterFrontmatter(path, inferred)}>
        Add {inferred} fields
      </button>
    </div>
  )
}
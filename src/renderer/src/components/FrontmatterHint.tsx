import { useArchiveStore } from '../state/store'
import { inferTypeFromPath } from '@shared/pageTemplates'
import { parseFrontmatter } from '@shared/frontmatter'

export function FrontmatterHint({ path }: { path: string }) {
  const draft = useArchiveStore((state) => state.drafts[path] ?? '')
  const applyStarterFrontmatter = useArchiveStore((state) => state.applyStarterFrontmatter)
  const parsed = parseFrontmatter(draft)
  const inferred = inferTypeFromPath(path)
  if (parsed.hasFrontmatter || !inferred) return null

  return (
    <div className="frontmatter-hint">
      <span>&gt; No metadata found.</span>
      <button type="button" onClick={() => applyStarterFrontmatter(path, inferred)}>
        Add {inferred} fields
      </button>
    </div>
  )
}
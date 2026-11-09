import { useArchiveStore } from '../state/store'
import { useDebouncedValue } from '../lib/useDebouncedValue'
import { parseFrontmatter } from '@shared/frontmatter'

export function SourceAttribution() {
  const selected = useArchiveStore((state) => state.selected)
  const draft = useArchiveStore((state) => (selected ? state.drafts[selected] : undefined))
  const debounced = useDebouncedValue(draft ?? '', 200)
  const data = parseFrontmatter(debounced).data
  const source = typeof data.source === 'string' ? data.source.trim() : ''
  const origin = typeof data.origin === 'string' ? data.origin.trim().toLowerCase() : ''

  if (!source && !origin) return null

  return (
    <div className="source-attribution">
      {origin === 'recovered' ? <span className="source-attribution__stamp">RECOVERED FROM RUINS</span> : null}
      {origin === 'intercepted' ? <span className="source-attribution__stamp">INTERCEPTED TRANSMISSION</span> : null}
      {source ? <span className="source-attribution__line">source: {source}</span> : null}
    </div>
  )
}
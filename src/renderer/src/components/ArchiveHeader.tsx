import { useArchiveStore } from '../state/store'
import { useDebouncedValue } from '../lib/useDebouncedValue'
import { parseFrontmatter } from '@shared/frontmatter'

export function ArchiveHeader({ classification }: { classification?: string }) {
  const selected = useArchiveStore((state) => state.selected)
  const draft = useArchiveStore((state) => (selected ? state.drafts[selected] : undefined))
  const debounced = useDebouncedValue(draft ?? '', 200)
  const data = parseFrontmatter(debounced).data
  const archiveMeta = useArchiveStore((state) => state.archiveMeta)
  const sector = useArchiveStore((state) => state.sector)
  const index = useArchiveStore((state) => state.index)
  const page = selected ? index?.pages.find((p) => p.path === selected) : undefined

  const resolvedSector = archiveMeta?.sector ?? sector
  const resolvedClassification = (classification ?? page?.classification ?? archiveMeta?.classification ?? 'internal').toUpperCase()
  const alignment = page?.alignment ?? 'neutral'
  const origin = typeof data.origin === 'string' ? data.origin : page?.origin

  return (
    <div className={`archive-header archive-header--${alignment} archive-header--${resolvedClassification.toLowerCase()}`}>
      <span>RIMCODEX</span>
      <span className="archive-header__sep">//</span>
      <span>{resolvedSector}</span>
      <span className="archive-header__sep">//</span>
      <span>CLASSIFIED: {resolvedClassification}</span>
      {origin === 'recovered' ? <span className="archive-header__stamp">RECOVERED FROM RUINS</span> : null}
      {origin === 'intercepted' ? <span className="archive-header__stamp">INTERCEPTED TRANSMISSION</span> : null}
    </div>
  )
}
import { useMemo } from 'react'
import { parseFrontmatter } from '@shared/frontmatter'
import { createPageLookup } from '@shared/wiki'
import { useArchiveStore } from '../state/store'
import { useDebouncedValue } from '../lib/useDebouncedValue'

export function JourneyCard() {
  const selected = useArchiveStore((state) => state.selected)
  const index = useArchiveStore((state) => state.index)
  const draft = useArchiveStore((state) => (selected ? state.drafts[selected] : undefined))
  const debounced = useDebouncedValue(draft ?? '', 200)
  const lookup = useMemo(() => createPageLookup(index), [index])
  const data = useMemo(() => parseFrontmatter(debounced).data, [debounced])

  const type = (data.type ?? '').toString().toLowerCase()
  if (type !== 'journey' && type !== 'route' && type !== 'caravan' && !data.itinerary && !data.route) return null

  const stops = Array.isArray(data.itinerary ?? data.route)
    ? (data.itinerary ?? data.route) as string[]
    : []

  return (
    <div className="journey-card">
      <div className="journey-card__label">JOURNEY LOG</div>
      <ol className="journey-card__stops">
        {stops.map((stop, index) => {
          const match = /^(.+?):\s*(.+)$/.exec(String(stop).trim())
          const date = match ? match[1].trim() : null
          const waypoint = match ? match[2].trim() : String(stop).trim()
          const resolved = lookup.resolve(waypoint.replace(/\[\[|\]\]/g, ''), selected ?? '')
          return (
            <li key={`${date}-${waypoint}-${index}`} className="journey-stop">
              <span className="journey-stop__date">{date ?? '—'}</span>
              <span className="journey-stop__waypoint">
                {resolved ? (
                  <button type="button" className="wikilink" onClick={() => void useArchiveStore.getState().selectPath(resolved.path)}>
                    {resolved.title}
                  </button>
                ) : (
                  waypoint
                )}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
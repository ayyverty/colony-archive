import { useMemo, useState } from 'react'
import { formatRimDate, pageKind, parseRimDate } from '@shared/wiki'
import { useArchiveStore } from '../state/store'

const FILTERS = ['ALL', 'RAID', 'RESEARCH', 'BIRTH', 'DEATH', 'TRADE']

export function TimelineScreen() {
  const index = useArchiveStore((state) => state.index)
  const selectPath = useArchiveStore((state) => state.selectPath)
  const setWorkspace = useArchiveStore((state) => state.setWorkspace)
  const [filter, setFilter] = useState('ALL')

  const entries = useMemo(() => {
    if (!index) return []
    return index.pages
      .map((page) => {
        const parsed = parseRimDate(page.date)
        if (!parsed) return null
        return { page, parsed }
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
      .filter(({ page }) => {
        if (filter === 'ALL') return true
        const kind = (page.eventType ?? page.type ?? '').toLowerCase()
        const tags = page.tags.join(' ')
        return kind === filter.toLowerCase() || tags.includes(filter.toLowerCase())
      })
      .sort((a, b) => (a.page.date ?? '').localeCompare(b.page.date ?? ''))
  }, [index, filter])

  const years = useMemo(() => {
    const groups = new Map<number, typeof entries>()
    for (const entry of entries) {
      const list = groups.get(entry.parsed.year) ?? []
      list.push(entry)
      groups.set(entry.parsed.year, list)
    }
    return [...groups.entries()].sort((a, b) => a[0] - b[0])
  }, [entries])

  const open = (path: string) => {
    void selectPath(path)
    setWorkspace('archive')
  }

  return (
    <div className="screen screen--timeline">
      <header className="screen__head">
        <div>
          <div className="screen__eyebrow">TIMELINE.SVC // MISSION LOG</div>
          <h1 className="screen__title">Colony Timeline</h1>
        </div>
        <div className="screen__meta">{entries.length} dated records</div>
      </header>
      <div className="timeline-filters">
        {FILTERS.map((value) => (
          <button
            key={value}
            type="button"
            className={`tag-chip ${filter === value ? 'tag-chip--active' : ''}`}
            onClick={() => setFilter(value)}
          >
            {value}
          </button>
        ))}
      </div>
      <div className="screen__body screen__body--single">
        {!index ? <div className="panel-empty">Indexing archive…</div> : null}
        {years.map(([year, items]) => (
          <section className="timeline__year" key={year}>
            <header className="timeline__year-head">
              <span className="timeline__year-label">YEAR {year}</span>
              <span className="timeline__year-count">{items.length}</span>
            </header>
            <ol className="timeline__events">
              {items.map(({ page }) => (
                <li key={page.path}>
                  <button type="button" className="timeline__event" onClick={() => open(page.path)}>
                    <span className="timeline__rail">
                      <span className={`kind-dot kind-dot--${pageKind(page)}`} />
                    </span>
                    <span className="timeline__date">{formatRimDate(page.date)}</span>
                    <span className="timeline__title">{page.title}</span>
                  </button>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </div>
  )
}
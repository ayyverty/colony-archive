import { useMemo } from 'react'
import { RIM_QUADRUMS, formatRimDate, pageKind, parseRimDate } from '@shared/wiki'
import { useArchiveStore } from '../../state/store'

interface Entry {
  path: string
  title: string
  date: string
  year: number
  quadrum: number
  day: number
  kind: string
  isStub: boolean
}

export function TimelinePanel() {
  const index = useArchiveStore((state) => state.index)
  const selectPath = useArchiveStore((state) => state.selectPath)

  const entries = useMemo<Entry[]>(() => {
    if (!index) return []
    const out: Entry[] = []
    for (const page of index.pages) {
      const parsed = parseRimDate(page.date)
      if (!parsed) continue
      out.push({
        path: page.path,
        title: page.title,
        date: page.date ?? '',
        year: parsed.year,
        quadrum: parsed.quadrum,
        day: parsed.day,
        kind: pageKind(page),
        isStub: page.isStub
      })
    }
    return out.sort(
      (a, b) => a.year - b.year || a.quadrum - b.quadrum || a.day - b.day
    )
  }, [index])

  const years = useMemo(() => {
    const groups = new Map<number, Entry[]>()
    for (const entry of entries) {
      const list = groups.get(entry.year) ?? []
      list.push(entry)
      groups.set(entry.year, list)
    }
    return [...groups.entries()].sort((a, b) => a[0] - b[0])
  }, [entries])

  if (!index) return <div className="panel-empty">Indexing archive…</div>
  if (entries.length === 0) {
    return (
      <div className="panel-empty">
        No dated events. Add <code>date: 5501-04-12</code> to a page&apos;s frontmatter
        to place it on the colony timeline.
      </div>
    )
  }

  return (
    <div className="timeline">
      <div className="timeline__scale">
        <span>{entries.length} events</span>
        <span>
          {RIM_QUADRUMS[0]} — {RIM_QUADRUMS[3]}
        </span>
      </div>

      {years.map(([year, events]) => (
        <section className="timeline__year" key={year}>
          <header className="timeline__year-head">
            <span className="timeline__year-label">YEAR {year}</span>
            <span className="timeline__year-count">{events.length}</span>
          </header>
          <ol className="timeline__events">
            {events.map((entry) => (
              <li key={entry.path}>
                <button
                  type="button"
                  className="timeline__event"
                  onClick={() => void selectPath(entry.path)}
                  title={entry.path}
                >
                  <span className="timeline__rail">
                    <span className={`kind-dot kind-dot--${entry.kind}`} />
                  </span>
                  <span className="timeline__date">{formatRimDate(entry.date)}</span>
                  <span className="timeline__title">{entry.title}</span>
                  {entry.isStub ? <span className="timeline__stub">stub</span> : null}
                </button>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  )
}

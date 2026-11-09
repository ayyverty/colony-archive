import { useMemo } from 'react'
import { formatRimDate, pageKind, parseRimDate } from '@shared/wiki'
import { useArchiveStore } from '../state/store'

export function DashboardView() {
  const index = useArchiveStore((state) => state.index)
  const selectPath = useArchiveStore((state) => state.selectPath)

  const data = useMemo(() => {
    if (!index) return null
    const counts = new Map<string, number>()
    for (const page of index.pages) {
      const kind = pageKind(page)
      counts.set(kind, (counts.get(kind) ?? 0) + 1)
    }
    const dated = index.pages
      .filter((page) => parseRimDate(page.date))
      .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
    const recent = dated.slice(0, 6)
    const stubs = index.pages.filter((page) => page.isStub).slice(0, 8)
    const recentWrites = [...index.pages]
      .sort((a, b) => b.mtimeMs - a.mtimeMs)
      .slice(0, 5)
    return { counts, recent, stubs, recentWrites }
  }, [index])

  if (!data) {
    return <div className="panel-empty">Indexing archive…</div>
  }

  const { counts, recent, stubs, recentWrites } = data
  const colonist = counts.get('colonist') ?? 0
  const faction = counts.get('faction') ?? 0
  const event = counts.get('event') ?? 0
  const item = counts.get('item') ?? 0

  return (
    <div className="dashboard">
      <header className="dashboard__head">
        <div>
          <div className="dashboard__eyebrow">RIMCODEX // DASHBOARD</div>
          <h1 className="dashboard__title">Colony status</h1>
        </div>
        <div className="dashboard__stamp">
          {index?.generatedAt ? new Date(index.generatedAt).toLocaleTimeString('en-US', { hour12: false }) : '—'}
        </div>
      </header>

      <div className="dashboard__grid">
        <div className="dash-card">
          <div className="dash-card__label">populace</div>
          <div className="dash-card__value">{colonist}</div>
          <div className="dash-card__hint">colonist records</div>
        </div>
        <div className="dash-card">
          <div className="dash-card__label">factions</div>
          <div className="dash-card__value">{faction}</div>
          <div className="dash-card__hint">known powers</div>
        </div>
        <div className="dash-card">
          <div className="dash-card__label">events</div>
          <div className="dash-card__value">{event}</div>
          <div className="dash-card__hint">dated chronicles</div>
        </div>
        <div className="dash-card">
          <div className="dash-card__label">items</div>
          <div className="dash-card__value">{item}</div>
          <div className="dash-card__hint">catalogued things</div>
        </div>
        <div className="dash-card dash-card--warn">
          <div className="dash-card__label">open stubs</div>
          <div className="dash-card__value">{index?.pages.filter((page) => page.isStub).length ?? 0}</div>
          <div className="dash-card__hint">awaiting records</div>
        </div>
        <div className="dash-card dash-card--warn">
          <div className="dash-card__label">broken links</div>
          <div className="dash-card__value">{index?.brokenLinks.length ?? 0}</div>
          <div className="dash-card__hint">unresolved references</div>
        </div>
      </div>

      <div className="dashboard__columns">
        <section className="dash-panel">
          <div className="dash-panel__title">recent events</div>
          {recent.length === 0 ? (
            <div className="dash-empty">No dated events. Add <code>date: 5501-04-12</code>.</div>
          ) : (
            <ul className="dash-list">
              {recent.map((page) => (
                <li key={page.path}>
                  <button type="button" className="dash-row" onClick={() => void selectPath(page.path)}>
                    <span className="dash-row__stamp">{formatRimDate(page.date)}</span>
                    <span className="dash-row__title">{page.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="dash-panel">
          <div className="dash-panel__title">open stubs</div>
          {stubs.length === 0 ? (
            <div className="dash-empty">No stubs. The archive is complete.</div>
          ) : (
            <ul className="dash-list">
              {stubs.map((page) => (
                <li key={page.path}>
                  <button type="button" className="dash-row" onClick={() => void selectPath(page.path)}>
                    <span className="dash-row__stamp dash-row__stamp--stub">stub</span>
                    <span className="dash-row__title">{page.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="dash-panel">
          <div className="dash-panel__title">recently written</div>
          <ul className="dash-list">
            {recentWrites.map((page) => (
              <li key={page.path}>
                <button type="button" className="dash-row" onClick={() => void selectPath(page.path)}>
                  <span className="dash-row__stamp">
                    {new Date(page.mtimeMs).toLocaleDateString('en-US', {
                      month: 'short',
                      day: '2-digit'
                    })}
                  </span>
                  <span className="dash-row__title">{page.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="dash-panel">
          <div className="dash-panel__title">tag census</div>
          {index?.tags.length ? (
            <div className="dash-tags">
              {index.tags.slice(0, 18).map((tag) => (
                <span className="md-tag" key={tag.tag}>
                  #{tag.tag} <span className="dash-tags__count">{tag.count}</span>
                </span>
              ))}
            </div>
          ) : (
            <div className="dash-empty">No tags yet.</div>
          )}
        </section>
      </div>
    </div>
  )
}

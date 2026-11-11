import { useArchiveStore } from '../state/store'
import { DashboardView } from './DashboardView'

export function BriefingScreen() {
  const rootPath = useArchiveStore((state) => state.rootPath)
  const selectPath = useArchiveStore((state) => state.selectPath)
  const setWorkspace = useArchiveStore((state) => state.setWorkspace)
  const favorites = useArchiveStore((state) => state.favorites)
  const index = useArchiveStore((state) => state.index)
  const openManual = useArchiveStore((state) => state.openManual)
  const createDashboard = useArchiveStore((state) => state.createDashboard)
  const runIntegrityScan = useArchiveStore((state) => state.runIntegrityScan)

  const recent = index?.pages.slice(-5).reverse() ?? []

  return (
    <div className="screen screen--briefing">
      <header className="screen__head">
        <div>
          <div className="screen__eyebrow">BRIEFING // MISSION STATUS</div>
          <h1 className="screen__title">Command Deck</h1>
        </div>
        <div className="screen__meta">{rootPath ? 'archive mounted' : 'no archive mounted'}</div>
      </header>

      <div className="briefing-actions">
        <button type="button" className="btn btn--accent" onClick={() => void createDashboard()}>
          Open dashboard
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => setWorkspace('archive')}>
          Open archive
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => setWorkspace('search')}>
          Search records
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => void runIntegrityScan()}>
          Run scan
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => void openManual()}>
          Open manual
        </button>
      </div>

      {favorites.length > 0 ? (
        <section className="briefing-section">
          <h2>Pinned records</h2>
          <div className="briefing-list">
            {favorites.map((path) => (
              <button key={path} type="button" onClick={() => void selectPath(path)}>
                {path}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {recent.length > 0 ? (
        <section className="briefing-section">
          <h2>Recent records</h2>
          <div className="briefing-list">
            {recent.map((page) => (
              <button key={page.path} type="button" onClick={() => void selectPath(page.path)}>
                {page.title}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="briefing-section">
        <h2>Dashboard</h2>
        <DashboardView />
      </section>
    </div>
  )
}
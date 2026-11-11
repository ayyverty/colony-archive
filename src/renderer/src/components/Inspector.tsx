import { lazy, Suspense } from 'react'
import { useArchiveStore } from '../state/store'

const BacklinksPanel = lazy(() => import('./panels/BacklinksPanel').then((m) => ({ default: m.BacklinksPanel })))
const HistoryPanel = lazy(() => import('./panels/HistoryPanel').then((m) => ({ default: m.HistoryPanel })))
const SeeAlsoPanel = lazy(() => import('./SeeAlsoPanel').then((m) => ({ default: m.SeeAlsoPanel })))

export function Inspector() {
  const open = useArchiveStore((state) => state.inspectorOpen)
  const tab = useArchiveStore((state) => state.inspectorTab)
  const setTab = useArchiveStore((state) => state.openInspector)
  const close = useArchiveStore((state) => state.closeInspector)
  const selected = useArchiveStore((state) => state.selected)

  if (!open || !selected) return null

  return (
    <aside className="inspector">
      <div className="inspector__head">
        <span className="inspector__title">RECORD INSPECTOR</span>
        <button type="button" className="inspector__close" onClick={close}>×</button>
      </div>
      <div className="inspector__tabs">
        {(['details', 'backlinks', 'see-also', 'history', 'metadata'] as const).map((item) => (
          <button
            key={item}
            type="button"
            className={`inspector__tab ${tab === item ? 'inspector__tab--active' : ''}`}
            onClick={() => setTab(item)}
          >
            {item.replace('-', ' ')}
          </button>
        ))}
      </div>
      <div className="inspector__body">
        <Suspense fallback={null}>
          {tab === 'details' ? <div className="panel-empty">Record details are shown in the preview and metadata editor.</div> : null}
          {tab === 'backlinks' ? <BacklinksPanel /> : null}
          {tab === 'see-also' ? <SeeAlsoPanel /> : null}
          {tab === 'history' ? <HistoryPanel /> : null}
          {tab === 'metadata' ? <div className="panel-empty">Use the metadata editor above the record.</div> : null}
        </Suspense>
      </div>
    </aside>
  )
}
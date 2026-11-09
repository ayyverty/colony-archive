import { useArchiveStore } from '../state/store'

export function IntegrityScanPanel() {
  const scanRunning = useArchiveStore((state) => state.scanRunning)
  const scanProgress = useArchiveStore((state) => state.scanProgress)
  const scanTotal = useArchiveStore((state) => state.scanTotal)
  const scanLines = useArchiveStore((state) => state.scanLines)
  const scanReport = useArchiveStore((state) => state.scanReport)
  const runIntegrityScan = useArchiveStore((state) => state.runIntegrityScan)
  const cancelIntegrityScan = useArchiveStore((state) => state.cancelIntegrityScan)

  const percent = scanTotal > 0 ? Math.min(100, Math.round((scanProgress / scanTotal) * 100)) : 0

  return (
    <div className="integrity">
      <div className="integrity__actions">
        <button
          type="button"
          className="btn btn--accent"
          disabled={scanRunning}
          onClick={() => void runIntegrityScan()}
        >
          {scanRunning ? 'Scanning…' : 'RUN SCAN'}
        </button>
        {scanRunning ? (
          <button type="button" className="btn btn--ghost" onClick={() => void cancelIntegrityScan()}>
            Cancel
          </button>
        ) : null}
      </div>

      <div className="integrity__bar">
        <div className="integrity__bar-fill" style={{ width: `${percent}%` }} />
      </div>
      <div className="integrity__status">
        {scanRunning
          ? `${scanProgress}/${scanTotal || '?'}`
          : scanReport
            ? `${scanReport.scanned} records · ${scanReport.issues.length} issue(s) · ${scanReport.durationMs}ms`
            : 'idle'}
      </div>

      <div className="integrity__log">
        {scanLines.length === 0 ? (
          <div className="console__line console__line--dim">&gt; no scan output yet</div>
        ) : (
          scanLines.map((line, index) => (
            <div className="console__line" key={`${line}-${index}`}>
              <span className="console__message">{line}</span>
            </div>
          ))
        )}
      </div>

      {scanReport && scanReport.issues.length > 0 ? (
        <ul className="panel-list">
          {scanReport.issues.map((issue, index) => (
            <li key={`${issue.code}-${issue.path}-${index}`} className="panel-item">
              <span className="panel-item__head">
                <span className="panel-item__title">{issue.code}</span>
                <span className="panel-item__path">{issue.path}</span>
              </span>
              <span className="panel-item__excerpt">{issue.message}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
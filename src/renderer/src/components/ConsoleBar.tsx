import { useEffect, useRef } from 'react'
import { useArchiveStore } from '../state/store'

export function ConsoleBar() {
  const entries = useArchiveStore((state) => state.consoleEntries)
  const open = useArchiveStore((state) => state.consoleOpen)
  const toggleConsole = useArchiveStore((state) => state.toggleConsole)
  const clearConsole = useArchiveStore((state) => state.clearConsole)
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const element = logRef.current
    if (element) element.scrollTop = element.scrollHeight
  }, [entries, open])

  const last = entries[entries.length - 1]

  return (
    <div className={`console ${open ? 'console--open' : ''}`}>
      <button
        type="button"
        className="console__bar"
        onClick={toggleConsole}
        title={open ? 'Collapse console' : 'Expand console'}
      >
        <span className="console__chevron">{open ? '▾' : '▸'}</span>
        <span className="console__title">console</span>
        <span className="console__last">
          {last ? `> ${last.message}` : '> awaiting activity'}
        </span>
        <span className="console__count">{entries.length}</span>
      </button>

      {open ? (
        <div className="console__log" ref={logRef}>
          {entries.length === 0 ? (
            <div className="console__line console__line--dim">&gt; no activity logged yet</div>
          ) : (
            entries.map((entry) => (
              <div className={`console__line console__line--${entry.kind}`} key={entry.id}>
                <span className="console__time">
                  {new Date(entry.at).toLocaleTimeString('en-US', { hour12: false })}
                </span>
                <span className="console__glyph">
                  {entry.kind === 'error' ? '!' : entry.kind === 'save' ? '✓' : '>'}
                </span>
                <span className="console__message">{entry.message}</span>
              </div>
            ))
          )}
        </div>
      ) : null}

      {open ? (
        <button type="button" className="console__clear" onClick={clearConsole} title="Clear console">
          clear
        </button>
      ) : null}
    </div>
  )
}

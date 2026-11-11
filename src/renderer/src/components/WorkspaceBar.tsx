import { useArchiveStore } from '../state/store'
import type { WorkspaceId } from '@shared/types'

const WORKSPACES: Array<{ id: string; label: string; code: string; shortcut: string }> = [
  { id: 'home', label: 'Briefing', code: 'HOME', shortcut: '' },
  { id: 'archive', label: 'Archive', code: 'ARCHIVE.EXE', shortcut: 'F1' },
  { id: 'search', label: 'Search', code: 'INDEXER.SVC', shortcut: 'F2' },
  { id: 'timeline', label: 'Chronicle', code: 'CHRONO.SVC', shortcut: 'F6' },
  { id: 'graph', label: 'Relations', code: 'RELATIONS.SVC', shortcut: 'F4' },
  { id: 'diagnostics', label: 'Diagnostics', code: 'DIAGNOSTICS.SYS', shortcut: 'F3' },
  { id: 'inbox', label: 'Inbox', code: 'INBOX.SVC', shortcut: '' },
  { id: 'manual', label: 'Manual', code: 'MANUAL.SYS', shortcut: 'F5' },
  { id: 'settings', label: 'Config', code: 'CONFIG.SYS', shortcut: '' }
]

export function WorkspaceBar() {
  const workspace = useArchiveStore((state) => state.workspace)
  const setWorkspace = useArchiveStore((state) => state.setWorkspace)
  const goBack = useArchiveStore((state) => state.goBack)
  const goForward = useArchiveStore((state) => state.goForward)
  const canGoBack = useArchiveStore((state) => state.historyIndex > 0)
  const canGoForward = useArchiveStore((state) => state.historyIndex < state.navigationHistory.length - 1)

  return (
    <nav className="workspace-bar" aria-label="Primary navigation">
      <div className="workspace-bar__nav">
        <button type="button" className="workspace-bar__nav-button" onClick={() => void goBack()} disabled={!canGoBack} title="Back">
          ◀
        </button>
        <button type="button" className="workspace-bar__nav-button" onClick={() => void goForward()} disabled={!canGoForward} title="Forward">
          ▶
        </button>
      </div>
      {WORKSPACES.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`workspace-bar__item ${workspace === item.id ? 'workspace-bar__item--active' : ''}`}
          onClick={() => setWorkspace(item.id as WorkspaceId)}
          title={item.shortcut ? `${item.label} (${item.shortcut})` : item.label}
        >
          <span className="workspace-bar__label">{item.label}</span>
          <span className="workspace-bar__code">{item.code}</span>
        </button>
      ))}
    </nav>
  )
}
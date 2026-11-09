import { useArchiveStore } from '../state/store'
import { PathTooltip } from './PathTooltip'
import { basename } from '../lib/paths'


export function TabBar() {
  const tabs = useArchiveStore((state) => state.tabs)
  const selected = useArchiveStore((state) => state.selected)
  const drafts = useArchiveStore((state) => state.drafts)
  const saved = useArchiveStore((state) => state.saved)
  const selectPath = useArchiveStore((state) => state.selectPath)
  const closeTab = useArchiveStore((state) => state.closeTab)

  if (tabs.length === 0) return null

  return (
    <div className="tabbar" role="tablist" aria-label="Open records">
      {tabs.map((path, index) => {
        const dirty = drafts[path] !== undefined && drafts[path] !== saved[path]
        return (
          <div
            key={path}
            className={`tab ${selected === path ? 'tab--active' : ''}`}
            role="tab"
            aria-selected={selected === path}
          >
            <button
              type="button"
              className="tab__label"
              onClick={() => void selectPath(path)}
              title={path}
            >
              <span className="tab__index">[{index + 1}]</span>
              {basename(path)}
              {dirty ? <span className="tab__dirty">●</span> : null}
              <PathTooltip path={path} kind="file" />
            </button>
            <button
              type="button"
              className="tab__close"
              title="Close tab"
              onClick={() => closeTab(path)}
            >
              ×
            </button>
          </div>
        )
      })}
    </div>
  )
}
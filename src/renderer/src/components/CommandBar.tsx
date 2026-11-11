import { useEffect, useMemo, useRef, useState } from 'react'
import { useArchiveStore } from '../state/store'
import { basename } from '../lib/paths'

export function CommandBar() {
  const open = useArchiveStore((state) => state.paletteOpen)
  const setPaletteOpen = useArchiveStore((state) => state.setPaletteOpen)
  const index = useArchiveStore((state) => state.index)
  const archives = useArchiveStore((state) => state.archives)
  const rootPath = useArchiveStore((state) => state.rootPath)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      window.setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  const items = useMemo(() => {
    const state = useArchiveStore.getState()
    const list: Array<{ id: string; label: string; hint: string; group: string; run: () => void }> = []
    for (const page of index?.pages ?? []) {
      list.push({ id: `page:${page.path}`, label: page.title, hint: page.path, group: 'records', run: () => void state.selectPath(page.path) })
    }
    const consoles: Array<[string, string, string]> = [
      ['home', 'Briefing', 'Home and recent records'],
      ['archive', 'Archive', 'Record tree and editor'],
      ['search', 'Search', 'Search and filters'],
      ['timeline', 'Chronicle', 'Dated records'],
      ['graph', 'Relations', 'Relationship graph'],
      ['diagnostics', 'Diagnostics', 'Health and scan'],
      ['inbox', 'Inbox', 'Dispatches'],
      ['manual', 'Manual', 'Operator manual'],
      ['settings', 'Config', 'Settings and profile']
    ]
    for (const [id, label, hint] of consoles) {
      list.push({ id: `console:${id}`, label, hint, group: 'consoles', run: () => state.setWorkspace(id as never) })
    }
    const commands: Array<[string, string, string, () => void]> = [
      ['new-page', 'New Record', 'Create a record', () => state.newPageFromSelection()],
      ['save', 'Save Record', 'Ctrl S', () => void state.saveSelected()],
      ['scan', 'Run Integrity Scan', 'Check archive health', () => void state.runIntegrityScan()],
      ['manual', 'Open Manual', 'F5', () => state.setWorkspace('manual')],
      ['settings', 'Open Config', '', () => state.setWorkspace('settings')],
      ['back', 'Go Back', 'Alt Left', () => void state.goBack()],
      ['forward', 'Go Forward', 'Alt Right', () => void state.goForward()]
    ]
    for (const [id, label, hint, run] of commands) {
      list.push({ id: `cmd:${id}`, label, hint, group: 'commands', run })
    }
    for (const archive of archives) {
      if (archive === rootPath) continue
      list.push({ id: `archive:${archive}`, label: `Mount ${basename(archive)}`, hint: archive, group: 'archives', run: () => void state.switchArchive(archive) })
    }
    return list
  }, [index, archives, rootPath])

  const commandOnly = query.trim().startsWith('>')
  const needle = query.trim().replace(/^>/, '').trim().toLowerCase()
  const filtered = useMemo(() => {
    if (!needle) return items.slice(0, 12)
    return items
      .filter((item) => commandOnly ? item.group === 'commands' || item.group === 'consoles' : true)
      .map((item) => {
        const label = item.label.toLowerCase()
        const hint = item.hint.toLowerCase()
        let score = -1
        if (label.startsWith(needle)) score = 100
        else if (label.includes(needle)) score = 60
        else if (hint.includes(needle)) score = 30
        return { item, score }
      })
      .filter((entry) => entry.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 18)
      .map((entry) => entry.item)
  }, [items, needle, commandOnly])

  useEffect(() => {
    setActive(0)
  }, [query])

  const run = (item: (typeof filtered)[number] | undefined) => {
    if (!item) return
    setPaletteOpen(false)
    item.run()
  }

  return (
    <div className="command-bar">
      <span className="command-bar__prompt">&gt;</span>
      <input
        ref={inputRef}
        className="command-bar__input"
        value={query}
        placeholder="Search records, consoles, commands…"
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setActive((value) => Math.min(filtered.length - 1, value + 1))
          } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            setActive((value) => Math.max(0, value - 1))
          } else if (event.key === 'Enter') {
            event.preventDefault()
            run(filtered[active])
          } else if (event.key === 'Escape') {
            setQuery('')
            setPaletteOpen(false)
          }
        }}
      />
      <span className="command-bar__hint">Ctrl K</span>
      {(open || query.trim().length > 0) && filtered.length > 0 ? (
        <div className="command-bar__results">
          {filtered.map((item, position) => (
            <button
              key={item.id}
              type="button"
              className={`command-bar__result ${position === active ? 'command-bar__result--active' : ''}`}
              onMouseEnter={() => setActive(position)}
              onClick={() => run(item)}
            >
              <span className="command-bar__result-label">{item.label}</span>
              <span className="command-bar__result-hint">{item.hint}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
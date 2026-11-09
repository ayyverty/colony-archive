import { useEffect, useMemo, useRef, useState } from 'react'
import { useArchiveStore } from '../state/store'
import { basename } from '../lib/paths'

interface PaletteItem {
  id: string
  label: string
  hint?: string
  group: string
  run: () => void
}

export function CommandPalette() {
  const open = useArchiveStore((state) => state.paletteOpen)
  const setPaletteOpen = useArchiveStore((state) => state.setPaletteOpen)
  const index = useArchiveStore((state) => state.index)
  const archives = useArchiveStore((state) => state.archives)
  const rootPath = useArchiveStore((state) => state.rootPath)

  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setActive(0)
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }, [open])

  const items = useMemo<PaletteItem[]>(() => {
    const state = useArchiveStore.getState()
    const list: PaletteItem[] = []

    for (const page of index?.pages ?? []) {
      list.push({
        id: `page:${page.path}`,
        label: page.title,
        hint: page.path,
        group: 'records',
        run: () => void state.selectPath(page.path)
      })
    }

    const commands: Array<[string, string, string, () => void]> = [
      ['new-page', 'New page', 'Ctrl N', () => state.newPageFromSelection()],
      ['new-folder', 'New folder', 'Ctrl ⇧ N', () => state.newFolderFromSelection()],
      ['save', 'Save record', 'Ctrl S', () => void state.saveSelected()],
      ['dashboard', 'Open colony dashboard', '', () => void state.createDashboard()],
      ['backlinks', 'Show backlinks', '', () => state.togglePanel('backlinks')],
      ['timeline', 'Open timeline', '', () => state.togglePanel('timeline')],
      ['graph', 'Open relationship graph', '', () => state.togglePanel('graph')],
      ['diagnostics', 'Run diagnostics', '', () => state.togglePanel('diagnostics')],
      ['history', 'Version history', '', () => state.togglePanel('history')],
      ['templates', 'Template manager', '', () => state.togglePanel('templates')],
      ['export', 'Export archive', '', () => state.togglePanel('export')],
      ['index', 'Rebuild index', '', () => void state.refreshIndex()],
      ['focus', 'Toggle focus mode', 'Ctrl ⇧ F', () => state.toggleFocusMode()],
      ['theme', 'Toggle theme', 'Ctrl ⇧ T', () => state.toggleTheme()],
      ['preview', 'Toggle preview', 'Ctrl P', () => state.togglePreview()],
      ['sidebar', 'Toggle sidebar', 'Ctrl B', () => state.toggleSidebar()],
      ['linter', 'Toggle style linter', 'Ctrl ⇧ L', () => state.toggleLinter()],
      ['autosave', 'Toggle autosave', '', () => state.toggleAutosave()],
      ['typewriter', 'Toggle typewriter scrolling', '', () => state.toggleTypewriter()],
      ['console', 'Toggle console log', '', () => state.toggleConsole()],
      ['mount', 'Mount another archive…', 'Ctrl O', () => void state.openFolder()],
      ['unmount', 'Unmount archive', '', () => void state.unmountArchive()],
      ['workspace-archive', 'Switch to ARCHIVE.EXE', 'F1', () => state.setWorkspace('archive')],
      ['workspace-index', 'Switch to INDEXER.SVC', 'F2', () => state.setWorkspace('index')],
      ['workspace-diagnostics', 'Switch to DIAGNOSTICS.SYS', 'F3', () => state.setWorkspace('diagnostics')],
      ['workspace-graph', 'Switch to GRAPH.SVC', 'F4', () => state.setWorkspace('graph')],
      ['workspace-manual', 'Switch to MANUAL.SYS', 'F5', () => state.setWorkspace('manual')],
      ['log', 'Open operator log', '', () => void state.openLog()],
      ['scan', 'Run integrity scan', '', () => void state.runIntegrityScan()],
      ['manual', 'Open operator manual', 'F5', () => state.setWorkspace('manual')],
      ['display', 'Toggle display (CLEAN/PHOSPHOR)', '', () => state.toggleDisplay()],
      ['keyclick', 'Toggle keystroke click', '', () => state.toggleKeyclick()],
      ['about', 'About RimCodex', '', () => state.openDialog({ kind: 'about' })]
    ]

    for (const [id, label, hint, run] of commands) {
      list.push({ id: `cmd:${id}`, label, hint, group: 'commands', run })
    }

    for (const archive of archives) {
      if (archive === rootPath) continue
      list.push({
        id: `archive:${archive}`,
        label: `Mount ${basename(archive)}`,
        hint: archive,
        group: 'archives',
        run: () => void state.switchArchive(archive)
      })
    }

    const features: Array<[string, string, string, string]> = [
      ['feature:templates', 'Templates', 'Create records from built-in or user templates.', 'templates'],
      ['feature:slash', 'Slash commands', 'Type / at line start for templates and actions.', 'slash-commands'],
      ['feature:frontmatter', 'Frontmatter', 'Add metadata and starter fields.', 'frontmatter'],
      ['feature:see-also', 'See also', 'Related-page suggestions.', 'see-also'],
      ['feature:attachments', 'Attachments', 'Drop images or audio as evidence.', 'attachments'],
      ['feature:timeline', 'Timeline', 'Browse dated records chronologically.', 'timeline'],
      ['feature:inbox', 'Inbox', 'File dispatches and promote them.', 'inbox'],
      ['feature:scan', 'Integrity scan', 'Check links, empty files, and orphans.', 'diagnostics'],
      ['feature:sealed', 'Sealed archives', 'Lock folders with a passphrase.', 'sealed'],
      ['feature:manual', 'Operator manual', 'Read the in-fiction manual.', 'manual']
    ]
    for (const [id, label, description, anchor] of features) {
      list.push({
        id,
        label,
        hint: description,
        group: 'features',
        run: () => void state.openManual(anchor)
      })
    }

    return list
  }, [index, archives, rootPath])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return items.slice(0, 80)
    const commandOnly = needle.startsWith('>')
    const search = commandOnly ? needle.slice(1).trim() : needle
    const scored = items
      .map((item) => {
        if (commandOnly && item.group === 'records') return { item, score: -1 }
        const label = item.label.toLowerCase()
        const hint = (item.hint ?? '').toLowerCase()
        let score = -1
        if (!search) score = 10
        else if (label.startsWith(search)) score = 100
        else if (label.includes(search)) score = 60
        else if (hint.includes(search)) score = 30
        return { item, score }
      })
      .filter((entry) => entry.score >= 0)
      .sort((a, b) => b.score - a.score)
    return scored.slice(0, 60).map((entry) => entry.item)
  }, [items, query])

  useEffect(() => {
    setActive(0)
  }, [query])

  if (!open) return null

  const run = (item: PaletteItem | undefined): void => {
    if (!item) return
    setPaletteOpen(false)
    item.run()
  }

  return (
    <div className="overlay palette-overlay" onPointerDown={() => setPaletteOpen(false)}>
      <div className="palette" onPointerDown={(event) => event.stopPropagation()}>
        <div className="palette__input-row">
          <span className="palette__prompt">&gt;</span>
          <input
            ref={inputRef}
            className="palette__input"
            value={query}
            placeholder="run a command or jump to a record…"
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
                event.preventDefault()
                setPaletteOpen(false)
              }
            }}
          />
          <span className="palette__hint">↵ run · esc close</span>
        </div>

        <div className="palette__results">
          {filtered.length === 0 ? (
            <div className="palette__empty">No matching commands or records.</div>
          ) : (
            filtered.map((item, position) => {
              const previous = filtered[position - 1]
              const showGroup = !previous || previous.group !== item.group
              return (
                <div key={item.id}>
                  {showGroup ? <div className="palette__group">{item.group}</div> : null}
                  <button
                    type="button"
                    className={`palette__item ${position === active ? 'palette__item--active' : ''}`}
                    onMouseEnter={() => setActive(position)}
                    onClick={() => run(item)}
                  >
                    <span className="palette__item-label">{item.label}</span>
                    {item.hint ? <span className="palette__item-hint">{item.hint}</span> : null}
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

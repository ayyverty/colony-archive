import { useEffect, useState } from 'react'
import { useArchiveStore, isDirty } from '../state/store'
import { basename } from '../lib/paths'
import { prefersReducedMotion } from '../lib/theme'
import { INFOBOX_TEMPLATE, STUB_TEMPLATE } from '../lib/templates'
import { SystemClock } from './SystemClock'
import { Dropdown } from './Dropdown'
import type { DropdownEntry } from './Dropdown'
import {
  CloseIcon,
  EyeIcon,
  EyeOffIcon,
  MaximizeIcon,
  MinusIcon,
  MoonIcon,
  RestoreIcon,
  SunIcon
} from './Icons'

interface TitleBarProps {
  resolvedTheme: 'dark' | 'light'
  maximized: boolean
}

/** Types the record name out a character at a time, terminal style. */
function useTypedText(value: string): string {
  const [text, setText] = useState(value)

  useEffect(() => {
    if (!value || prefersReducedMotion() || value.length < 2) {
      setText(value)
      return
    }
    let cursor = 0
    setText('')
    const timer = window.setInterval(() => {
      cursor += 1
      setText(value.slice(0, cursor))
      if (cursor >= value.length) window.clearInterval(timer)
    }, 18)
    return () => window.clearInterval(timer)
  }, [value])

  return text
}

export function TitleBar({ resolvedTheme, maximized }: TitleBarProps) {
  const rootPath = useArchiveStore((state) => state.rootPath)
  const archives = useArchiveStore((state) => state.archives)
  const selected = useArchiveStore((state) => state.selected)
  const theme = useArchiveStore((state) => state.theme)
  const previewVisible = useArchiveStore((state) => state.previewVisible)
  const sidebarVisible = useArchiveStore((state) => state.sidebarVisible)
  const autosave = useArchiveStore((state) => state.autosave)
  const typewriterScroll = useArchiveStore((state) => state.typewriterScroll)
  const focusMode = useArchiveStore((state) => state.focusMode)
  const panels = useArchiveStore((state) => state.panels)
  const dirty = useArchiveStore((state) => isDirty(state, state.selected))
  const workspace = useArchiveStore((state) => state.workspace)
  const display = useArchiveStore((state) => state.display)
  const keyclick = useArchiveStore((state) => state.keyclick)
  const sector = useArchiveStore((state) => state.sector)
  const archiveMeta = useArchiveStore((state) => state.archiveMeta)

  const openFolder = useArchiveStore((state) => state.openFolder)
  const switchArchive = useArchiveStore((state) => state.switchArchive)
  const newPageFromSelection = useArchiveStore((state) => state.newPageFromSelection)
  const newFolderFromSelection = useArchiveStore((state) => state.newFolderFromSelection)
  const saveSelected = useArchiveStore((state) => state.saveSelected)
  const togglePreview = useArchiveStore((state) => state.togglePreview)
  const toggleSidebar = useArchiveStore((state) => state.toggleSidebar)
  const toggleTheme = useArchiveStore((state) => state.toggleTheme)
  const toggleLinter = useArchiveStore((state) => state.toggleLinter)
  const toggleAutosave = useArchiveStore((state) => state.toggleAutosave)
  const toggleTypewriter = useArchiveStore((state) => state.toggleTypewriter)
  const toggleFocusMode = useArchiveStore((state) => state.toggleFocusMode)
  const toggleDisplay = useArchiveStore((state) => state.toggleDisplay)
  const toggleKeyclick = useArchiveStore((state) => state.toggleKeyclick)
  const toggleSignOff = useArchiveStore((state) => state.toggleSignOff)
  const setSector = useArchiveStore((state) => state.setSector)
  const setTechLevel = useArchiveStore((state) => state.setTechLevel)
  const setSealPassphrase = useArchiveStore((state) => state.setSealPassphrase)
  const openInbox = useArchiveStore((state) => state.openInbox)
  const openDialog = useArchiveStore((state) => state.openDialog)
  const closeDialog = useArchiveStore((state) => state.closeDialog)
  const unmountArchive = useArchiveStore((state) => state.unmountArchive)
  const runIntegrityScan = useArchiveStore((state) => state.runIntegrityScan)
  const openLog = useArchiveStore((state) => state.openLog)
  const setWorkspace = useArchiveStore((state) => state.setWorkspace)
  const togglePanel = useArchiveStore((state) => state.togglePanel)
  const openPanel = useArchiveStore((state) => state.openPanel)
  const createDashboard = useArchiveStore((state) => state.createDashboard)
  const savePageAsTemplate = useArchiveStore((state) => state.savePageAsTemplate)
  const setPaletteOpen = useArchiveStore((state) => state.setPaletteOpen)
  const requestInsert = useArchiveStore((state) => state.requestInsert)

  const rootName = rootPath ? basename(rootPath) : null
  const typedName = useTypedText(selected ? basename(selected) : '')
  const panelMark = (id: keyof typeof panels): string => (panels[id] ? '● ' : '')

  const menu: DropdownEntry[] = [
    { section: 'Archive' },
    { id: 'open', label: 'MOUNT ARCHIVE…', hint: 'Ctrl O', onSelect: () => void openFolder() },
    { id: 'unmount', label: 'UNMOUNT ARCHIVE', onSelect: () => void unmountArchive() },
    ...(archives.length > 1
      ? [
          { section: 'Mounted archives' } as const,
          ...archives.map((archive) => ({
            id: `archive:${archive}`,
            label: `${archive === rootPath ? '● ' : ''}${basename(archive)}`,
            hint: archive === rootPath ? 'mounted' : 'switch',
            onSelect: () => void switchArchive(archive)
          }))
        ]
      : []),
    'sep',
    { section: 'Workspaces' },
    { id: 'ws-archive', label: `${workspace === 'archive' ? '● ' : ''}ARCHIVE.EXE`, hint: 'F1', onSelect: () => setWorkspace('archive') },
    { id: 'ws-index', label: `${workspace === 'index' ? '● ' : ''}INDEXER.SVC`, hint: 'F2', onSelect: () => setWorkspace('index') },
    { id: 'ws-diagnostics', label: `${workspace === 'diagnostics' ? '● ' : ''}DIAGNOSTICS.SYS`, hint: 'F3', onSelect: () => setWorkspace('diagnostics') },
    { id: 'ws-graph', label: `${workspace === 'graph' ? '● ' : ''}GRAPH.SVC`, hint: 'F4', onSelect: () => setWorkspace('graph') },
    { id: 'ws-manual', label: `${workspace === 'manual' ? '● ' : ''}MANUAL.SYS`, hint: 'F5', onSelect: () => setWorkspace('manual') },
    { id: 'ws-timeline', label: `${workspace === 'timeline' ? '● ' : ''}TIMELINE.SVC`, hint: 'F6', onSelect: () => setWorkspace('timeline') },
    'sep',
    { section: 'Record' },
    { id: 'new-page', label: 'New page', hint: 'Ctrl N', onSelect: newPageFromSelection },
    { id: 'new-folder', label: 'New folder', hint: 'Ctrl ⇧ N', onSelect: newFolderFromSelection },
    {
      id: 'save',
      label: 'Save record',
      hint: 'Ctrl S',
      disabled: !dirty,
      onSelect: () => void saveSelected()
    },
    {
      id: 'save-template',
      label: 'Save as template',
      disabled: !selected,
      onSelect: () => selected && void savePageAsTemplate(selected)
    },
    { id: 'palette', label: 'Command palette', hint: 'Ctrl K', onSelect: () => setPaletteOpen(true) },
    'sep',
    { section: 'Panels' },
    { id: 'dashboard', label: 'Colony dashboard', hint: 'Ctrl ⇧ D', onSelect: () => void createDashboard() },
    { id: 'backlinks', label: `${panelMark('backlinks')}Backlinks`, onSelect: () => togglePanel('backlinks') },
    { id: 'timeline', label: `${panelMark('timeline')}Timeline`, onSelect: () => togglePanel('timeline') },
    { id: 'graph', label: `${panelMark('graph')}Relationship graph`, hint: 'Ctrl ⇧ G', onSelect: () => togglePanel('graph') },
    { id: 'diagnostics', label: `${panelMark('diagnostics')}Diagnostics`, onSelect: () => togglePanel('diagnostics') },
    { id: 'history', label: `${panelMark('history')}Version history`, hint: 'Ctrl ⇧ H', onSelect: () => togglePanel('history') },
    { id: 'templates', label: `${panelMark('templates')}Templates`, onSelect: () => togglePanel('templates') },
    { id: 'export', label: `${panelMark('export')}Export`, hint: 'Ctrl ⇧ E', onSelect: () => togglePanel('export') },
    { id: 'log', label: 'Operator log', onSelect: () => void openLog() },
    { id: 'scan', label: 'Run integrity scan', onSelect: () => void runIntegrityScan() },
    { id: 'manual', label: 'Operator manual', hint: 'F5', onSelect: () => setWorkspace('manual') },
    'sep',
    { section: 'Insert' },
    { id: 'infobox', label: 'RimWorld infobox', onSelect: () => requestInsert(INFOBOX_TEMPLATE) },
    { id: 'stub', label: 'Stub notice', onSelect: () => requestInsert(STUB_TEMPLATE) },
    'sep',
    { section: 'System' },
    { id: 'display', label: `Display: ${display === 'clean' ? 'CLEAN' : 'PHOSPHOR'}`, onSelect: toggleDisplay },
    { id: 'keyclick', label: `Key click: ${keyclick ? 'ON' : 'MUTED'}`, onSelect: toggleKeyclick },
    { id: 'signoff', label: `Sign-off: ${useArchiveStore.getState().signOff ? 'ON' : 'OFF'}`, onSelect: toggleSignOff },
    { id: 'sector', label: `Sector: ${sector}`, onSelect: () => openDialog({ kind: 'prompt', title: 'Set sector', label: 'Archive authority sector label.', initial: sector, confirmLabel: 'Set sector', onSubmit: async (value) => { setSector(value); closeDialog() } }) },
    { id: 'profile', label: `Profile: ${useArchiveStore.getState().profile.preset}`, onSelect: () => openPanel('profile') },
    { id: 'era', label: `Era: ${(archiveMeta?.techLevel ?? 'spacer').toUpperCase()}`, onSelect: () => openDialog({ kind: 'prompt', title: 'Set era', label: 'neolithic, industrial, spacer, or ultratech.', initial: archiveMeta?.techLevel ?? 'spacer', confirmLabel: 'Set era', onSubmit: async (value) => { await setTechLevel(value as 'neolithic' | 'industrial' | 'spacer' | 'ultratech'); closeDialog() } }) },
    { id: 'seal', label: 'Set seal passphrase', onSelect: () => openDialog({ kind: 'prompt', title: 'Seal passphrase', label: 'Fake passphrase for sealed archives.', initial: useArchiveStore.getState().sealPassphrase, confirmLabel: 'Set passphrase', onSubmit: async (value) => { setSealPassphrase(value); closeDialog() } }) },
    { id: 'inbox', label: 'Open inbox', onSelect: () => void openInbox() },
    'sep',
    { section: 'View' },
    {
      id: 'focus',
      label: focusMode ? 'Release focus mode' : 'Enter focus mode',
      hint: 'Ctrl ⇧ F',
      onSelect: toggleFocusMode
    },
    {
      id: 'preview',
      label: previewVisible ? 'Hide preview' : 'Show preview',
      hint: 'Ctrl P',
      onSelect: togglePreview
    },
    {
      id: 'sidebar',
      label: sidebarVisible ? 'Hide sidebar' : 'Show sidebar',
      hint: 'Ctrl B',
      onSelect: toggleSidebar
    },
    {
      id: 'autosave',
      label: `Autosave ${autosave ? 'on' : 'off'}`,
      onSelect: toggleAutosave
    },
    {
      id: 'typewriter',
      label: `Typewriter scroll ${typewriterScroll ? 'on' : 'off'}`,
      onSelect: toggleTypewriter
    },
    { id: 'linter', label: 'Style linter', hint: 'Ctrl ⇧ L', onSelect: toggleLinter },
    { id: 'theme', label: 'Toggle theme', hint: 'Ctrl ⇧ T', onSelect: toggleTheme },
    'sep',
    { id: 'about', label: 'About', onSelect: () => openDialog({ kind: 'about' }) }
  ]

  return (
    <header
      className="titlebar scanlines"
      onDoubleClick={(event) => {
        if (event.target === event.currentTarget) void window.api.windowToggleMaximize()
      }}
    >
      <div className="titlebar__brand">
        <span className="titlebar__mark">[RC]</span>
        <span className="titlebar__name">RimCodex</span>
      </div>
      <span className="titlebar__sep">//</span>
      <span className={`titlebar__folder ${rootName ? '' : 'titlebar__folder--empty'}`}>
        {rootName ?? 'no archive mounted'}
      </span>

      {selected ? (
        <>
          <span className="titlebar__sep titlebar__sep--dim">::</span>
          <span className="titlebar__file" title={selected}>
            {typedName}
            <span className="titlebar__cursor">_</span>
          </span>
        </>
      ) : null}

      <div className="titlebar__spacer" />

      <SystemClock />

      <div className="titlebar__actions">
        <button
          type="button"
          className="titlebar__toggle titlebar__toggle--wide"
          title="Command palette (Ctrl+K)"
          onClick={() => setPaletteOpen(true)}
        >
          ⌘K
        </button>
        <Dropdown label="Archive" items={menu} align="right" title="Archive menu" />
        <button
          type="button"
          className="titlebar__toggle"
          title={`Theme: ${theme === 'system' ? 'system' : resolvedTheme} (Ctrl+Shift+T)`}
          onClick={toggleTheme}
        >
          {resolvedTheme === 'dark' ? <MoonIcon /> : <SunIcon />}
        </button>
        <button
          type="button"
          className="titlebar__toggle"
          title={previewVisible ? 'Hide preview (Ctrl+P)' : 'Show preview (Ctrl+P)'}
          onClick={togglePreview}
        >
          {previewVisible ? <EyeIcon /> : <EyeOffIcon />}
        </button>

        <div className="window-controls">
          <button
            type="button"
            className="window-control"
            title="Minimise"
            onClick={() => void window.api.windowMinimize()}
          >
            <MinusIcon />
          </button>
          <button
            type="button"
            className="window-control"
            title={maximized ? 'Restore' : 'Maximise'}
            onClick={() => void window.api.windowToggleMaximize()}
          >
            {maximized ? <RestoreIcon /> : <MaximizeIcon />}
          </button>
          <button
            type="button"
            className="window-control window-control--close"
            title="Close"
            onClick={() => void window.api.windowClose()}
          >
            <CloseIcon />
          </button>
        </div>
      </div>
    </header>
  )
}

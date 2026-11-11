import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { ResolvedTheme } from '@shared/types'
import { useArchiveStore, dirtyPaths } from './state/store'
import { call, errorMessage } from './lib/api'
import { applyTheme, onSystemThemeChange, prefersReducedMotion, resolveTheme } from './lib/theme'
import { INFOBOX_TEMPLATE, STUB_TEMPLATE } from './lib/templates'
import { TitleBar } from './components/TitleBar'
import { Sidebar } from './components/Sidebar'
import { EditorPane } from './components/EditorPane'
import { PreviewPane } from './components/PreviewPane'
import { Splitter } from './components/Splitter'
import { StatusBar } from './components/StatusBar'
import { ContextMenu } from './components/ContextMenu'
import { DialogHost } from './components/Dialog'
import { ToastStack } from './components/ToastStack'
import { BootSequence } from './components/BootSequence'
import { CommandPalette } from './components/CommandPalette'
import { ConsoleBar } from './components/ConsoleBar'
import { SubWindow } from './components/SubWindow'
const BacklinksPanel = lazy(() => import('./components/panels/BacklinksPanel').then((m) => ({ default: m.BacklinksPanel })))
const DiagnosticsPanel = lazy(() => import('./components/panels/DiagnosticsPanel').then((m) => ({ default: m.DiagnosticsPanel })))
const TimelinePanel = lazy(() => import('./components/panels/TimelinePanel').then((m) => ({ default: m.TimelinePanel })))
const GraphPanel = lazy(() => import('./components/panels/GraphPanel').then((m) => ({ default: m.GraphPanel })))
const HistoryPanel = lazy(() => import('./components/panels/HistoryPanel').then((m) => ({ default: m.HistoryPanel })))
const TemplatesPanel = lazy(() => import('./components/panels/TemplatesPanel').then((m) => ({ default: m.TemplatesPanel })))
const ExportPanel = lazy(() => import('./components/panels/ExportPanel').then((m) => ({ default: m.ExportPanel })))
const IndexScreen = lazy(() => import('./components/IndexScreen').then((m) => ({ default: m.IndexScreen })))
const DiagnosticsScreen = lazy(() => import('./components/DiagnosticsScreen').then((m) => ({ default: m.DiagnosticsScreen })))
const GraphScreen = lazy(() => import('./components/GraphScreen').then((m) => ({ default: m.GraphScreen })))
const OperatorManual = lazy(() => import('./components/OperatorManual').then((m) => ({ default: m.OperatorManual })))
const IdleScreen = lazy(() => import('./components/IdleScreen').then((m) => ({ default: m.IdleScreen })))
const TimelineScreen = lazy(() => import('./components/TimelineScreen').then((m) => ({ default: m.TimelineScreen })))
const InboxPanel = lazy(() => import('./components/panels/InboxPanel').then((m) => ({ default: m.InboxPanel })))
const ProfilePanel = lazy(() => import('./components/panels/ProfilePanel').then((m) => ({ default: m.ProfilePanel })))
const MountSequence = lazy(() => import('./components/MountSequence').then((m) => ({ default: m.MountSequence })))
const ColonyBanner = lazy(() => import('./components/ColonyBanner').then((m) => ({ default: m.ColonyBanner })))
const TemplatePickerDialog = lazy(() => import('./components/TemplatePickerDialog').then((m) => ({ default: m.TemplatePickerDialog })))
const BriefingScreen = lazy(() => import('./components/BriefingScreen').then((m) => ({ default: m.BriefingScreen })))
const SettingsScreen = lazy(() => import('./components/SettingsScreen').then((m) => ({ default: m.SettingsScreen })))
const WorkspaceBar = lazy(() => import('./components/WorkspaceBar').then((m) => ({ default: m.WorkspaceBar })))
const CommandBar = lazy(() => import('./components/CommandBar').then((m) => ({ default: m.CommandBar })))
const Inspector = lazy(() => import('./components/Inspector').then((m) => ({ default: m.Inspector })))
import { SUBSYSTEMS } from './lib/subsystems'

interface PanelMeta {
  title: string
  subtitle: string
  program: string
  width: number
}

const PANEL_META: Record<string, PanelMeta> = {
  backlinks: { title: 'Backlinks', subtitle: 'references', program: SUBSYSTEMS.backlinks, width: 390 },
  diagnostics: { title: 'Diagnostics', subtitle: 'self-test', program: SUBSYSTEMS.diagnostics, width: 380 },
  timeline: { title: 'Timeline', subtitle: 'chronology', program: SUBSYSTEMS.timeline, width: 400 },
  graph: { title: 'Relationship graph', subtitle: 'link topology', program: SUBSYSTEMS.graph, width: 720 },
  history: { title: 'Version history', subtitle: '.history', program: SUBSYSTEMS.history, width: 400 },
  templates: { title: 'Templates', subtitle: '_templates', program: SUBSYSTEMS.templates, width: 390 },
  export: { title: 'Export', subtitle: 'html / pdf', program: SUBSYSTEMS.export, width: 380 },
  inbox: { title: 'Inbox', subtitle: 'dispatches', program: 'INBOX.SVC', width: 420 },
  profile: { title: 'Profile', subtitle: 'terms', program: 'PROFILE.SVC', width: 420 }
}

const PANEL_ORDER = Object.keys(PANEL_META)

function panelBody(id: string) {
  switch (id) {
    case 'backlinks':
      return <BacklinksPanel />
    case 'diagnostics':
      return <DiagnosticsPanel />
    case 'timeline':
      return <TimelinePanel />
    case 'graph':
      return <GraphPanel />
    case 'history':
      return <HistoryPanel />
    case 'templates':
      return <TemplatesPanel />
    case 'export':
      return <ExportPanel />
    case 'inbox':
      return <InboxPanel />
    case 'profile':
      return <ProfilePanel />
    default:
      return null
  }
}

function panelOrigin(id: string): { x: number; y: number } {
  const index = Math.max(0, PANEL_ORDER.indexOf(id))
  const meta = PANEL_META[id]
  const width = Math.min(meta.width, Math.max(280, window.innerWidth - 40))
  return {
    x: Math.max(14, window.innerWidth - width - 38 - (index % 4) * 22),
    y: 56 + (index % 4) * 24
  }
}

export default function App() {
  const theme = useArchiveStore((state) => state.theme)
  const previewVisible = useArchiveStore((state) => state.previewVisible)
  const panels = useArchiveStore((state) => state.panels)
  const focusMode = useArchiveStore((state) => state.focusMode)
  const workspace = useArchiveStore((state) => state.workspace)
  const rootPath = useArchiveStore((state) => state.rootPath)
  const newPagePickerDir = useArchiveStore((state) => state.newPagePickerDir)
  const closeNewPagePicker = useArchiveStore((state) => state.closeNewPagePicker)
  const display = useArchiveStore((state) => state.display)
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme('system'))
  const [maximized, setMaximized] = useState(false)
  const [bootVisible, setBootVisible] = useState(true)
  const [bootAnimationDone, setBootAnimationDone] = useState(false)
  const [startupReady, setStartupReady] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const config = await call(window.api.getConfig())
        if (cancelled) return

        const store = useArchiveStore.getState()
        store.hydrate(config)

        if (!config.bootSequence || prefersReducedMotion()) {
          setBootVisible(false)
          setBootAnimationDone(true)
          setStartupReady(true)
        }

        let rootState = await call(window.api.listTree())
        const rootDeadline = Date.now() + 10000
        while (!cancelled && !rootState.rootPath && Date.now() < rootDeadline) {
          await new Promise((resolve) => window.setTimeout(resolve, 100))
          rootState = await call(window.api.listTree())
        }
        if (cancelled) return
        useArchiveStore.getState().setRoot(rootState)
        setStartupReady(true)
        useArchiveStore.getState().checkWhatsNew()
      } catch (error) {
        if (cancelled) return
        setBootVisible(false)
        useArchiveStore.getState().pushToast('error', errorMessage(error))
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    setResolvedTheme(applyTheme(theme))
  }, [theme])

  useEffect(() => {
    document.documentElement.dataset.display = display
  }, [display])

  useEffect(() => {
    void import('./components/Editor')
  }, [])

  useEffect(() => {
    if (bootAnimationDone && startupReady) setBootVisible(false)
  }, [bootAnimationDone, startupReady])

  const archiveMeta = useArchiveStore((state) => state.archiveMeta)
  useEffect(() => {
    document.documentElement.dataset.era = archiveMeta?.techLevel ?? 'spacer'
  }, [archiveMeta?.techLevel])

  useEffect(
    () =>
      onSystemThemeChange(() => {
        if (useArchiveStore.getState().theme === 'system') {
          setResolvedTheme(applyTheme('system'))
        }
      }),
    []
  )

  useEffect(() => {
    const offTree = window.api.onTreeChanged(() => {
      const store = useArchiveStore.getState()
      void store.refreshTree()
      store.scheduleIndexRefresh()
    })

    const offRoot = window.api.onRootChanged((rootState) => {
      useArchiveStore.getState().setRoot(rootState)
      setStartupReady(true)
    })

    const offClose = window.api.onCloseRequested(() => {
      const state = useArchiveStore.getState()
      const dirty = dirtyPaths(state)
      if (dirty.length === 0) {
        void window.api.windowForceClose()
        return
      }
      state.openDialog({
        kind: 'confirm',
        title: 'Unsaved records',
        body: `${dirty.length} record${dirty.length === 1 ? '' : 's'} ${
          dirty.length === 1 ? 'has' : 'have'
        } unsaved changes. Discard them and close the terminal?`,
        confirmLabel: 'Discard and close',
        danger: true,
        onConfirm: async () => {
          await window.api.windowForceClose()
        }
      })
    })

    const offMenu = window.api.onMenuAction((action) => {
      const state = useArchiveStore.getState()
      switch (action) {
        case 'open-folder':
          void state.openFolder()
          break
        case 'unmount-archive':
          void state.unmountArchive()
          break
        case 'new-page':
          state.newPageFromSelection()
          break
        case 'new-folder':
          state.newFolderFromSelection()
          break
        case 'save':
          void state.saveSelected()
          break
        case 'toggle-preview':
          state.togglePreview()
          break
        case 'toggle-sidebar':
          state.toggleSidebar()
          break
        case 'toggle-theme':
          state.toggleTheme()
          break
        case 'toggle-linter':
          state.toggleLinter()
          break
        case 'toggle-autosave':
          state.toggleAutosave()
          break
        case 'toggle-typewriter':
          state.toggleTypewriter()
          break
        case 'toggle-display':
          state.toggleDisplay()
          break
        case 'toggle-keyclick':
          state.toggleKeyclick()
          break
        case 'command-palette':
          state.setPaletteOpen(true)
          break
        case 'focus-mode':
          state.toggleFocusMode()
          break
        case 'dashboard':
          void state.createDashboard()
          break
        case 'timeline':
          state.togglePanel('timeline')
          break
        case 'graph':
          state.togglePanel('graph')
          break
        case 'backlinks':
          state.togglePanel('backlinks')
          break
        case 'diagnostics':
          state.togglePanel('diagnostics')
          break
        case 'history':
          state.togglePanel('history')
          break
        case 'templates':
          state.togglePanel('templates')
          break
        case 'export':
          state.togglePanel('export')
          break
        case 'workspace-archive':
          state.setWorkspace('archive')
          break
        case 'workspace-index':
          state.setWorkspace('search')
          break
        case 'workspace-diagnostics':
          state.setWorkspace('diagnostics')
          break
        case 'workspace-graph':
          state.setWorkspace('graph')
          break
        case 'workspace-timeline':
          state.setWorkspace('timeline')
          break
        case 'operator-manual':
        case 'workspace-manual':
          state.setWorkspace('manual')
          break
        case 'open-log':
          void state.openLog()
          break
        case 'run-integrity-scan':
          void state.runIntegrityScan()
          break
        case 'set-sector':
          state.openDialog({
            kind: 'prompt',
            title: 'Set sector',
            label: 'Archive authority sector label.',
            initial: state.sector,
            confirmLabel: 'Set sector',
            onSubmit: async (value) => {
              state.setSector(value)
              state.closeDialog()
            }
          })
          break
        case 'insert-infobox':
          state.requestInsert(INFOBOX_TEMPLATE)
          break
        case 'insert-stub':
          state.requestInsert(STUB_TEMPLATE)
          break
        case 'about':
          state.openDialog({ kind: 'about' })
          break
        case 'close-tab': {
          const tab = state.selected
          if (tab) state.closeTab(tab)
          break
        }
        case 'next-tab':
          state.nextTab()
          break
        case 'prev-tab':
          state.prevTab()
          break
        default:
          break
      }
    })

    const offMaximized = window.api.onWindowMaximized((value) => setMaximized(value))

    return () => {
      offTree()
      offRoot()
      offClose()
      offMenu()
      offMaximized()
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const mod = event.ctrlKey || event.metaKey
      const key = event.key.toLowerCase()
      const state = useArchiveStore.getState()

      if (event.key === 'Escape') {
        if (state.paletteOpen) {
          state.setPaletteOpen(false)
          return
        }
        if (state.consoleOpen) {
          state.toggleConsole()
          return
        }
      }

      if (event.key === 'F1') {
        event.preventDefault()
        state.setWorkspace('archive')
      } else if (event.key === 'F2') {
        event.preventDefault()
        state.setWorkspace('search')
      } else if (event.key === 'F3') {
        event.preventDefault()
        state.setWorkspace('diagnostics')
      } else if (event.key === 'F4') {
        event.preventDefault()
        state.setWorkspace('graph')
      } else if (event.key === 'F5') {
        event.preventDefault()
        state.setWorkspace('manual')
      } else if (event.key === 'F6') {
        event.preventDefault()
        state.setWorkspace('timeline')
      } else if (mod && !event.shiftKey && key === 'k') {
        event.preventDefault()
        state.setPaletteOpen(!state.paletteOpen)
      } else if (mod && !event.shiftKey && key === 's') {
        event.preventDefault()
        void state.saveSelected()
      } else if (mod && !event.shiftKey && key === 'p') {
        event.preventDefault()
        state.togglePreview()
      } else if (mod && !event.shiftKey && key === 'b') {
        event.preventDefault()
        state.toggleSidebar()
      } else if (mod && !event.shiftKey && key === 'n') {
        event.preventDefault()
        state.newPageFromSelection()
      } else if (mod && !event.shiftKey && key === 'o') {
        event.preventDefault()
        void state.openFolder()
      } else if (mod && !event.shiftKey && key === 'w') {
        event.preventDefault()
        if (state.selected) state.closeTab(state.selected)
      } else if (mod && key === 'tab') {
        event.preventDefault()
        if (event.shiftKey) state.prevTab()
        else state.nextTab()
      } else if (mod && event.shiftKey && key === 'n') {
        event.preventDefault()
        state.newFolderFromSelection()
      } else if (mod && event.shiftKey && key === 't') {
        event.preventDefault()
        state.toggleTheme()
      } else if (mod && event.shiftKey && key === 'l') {
        event.preventDefault()
        state.toggleLinter()
      } else if (mod && event.shiftKey && key === 'f') {
        event.preventDefault()
        state.toggleFocusMode()
      } else if (mod && event.shiftKey && key === 'd') {
        event.preventDefault()
        void state.createDashboard()
      } else if (mod && event.shiftKey && key === 'g') {
        event.preventDefault()
        state.togglePanel('graph')
      } else if (mod && event.shiftKey && key === 'h') {
        event.preventDefault()
        state.togglePanel('history')
      } else if (mod && event.shiftKey && key === 'e') {
        event.preventDefault()
        state.togglePanel('export')
      } else if (mod && !event.shiftKey && event.key === '`') {
        event.preventDefault()
        state.toggleConsole()
      } else if (event.key === 'F2') {
        event.preventDefault()
        state.renameSelected()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const openPanels = PANEL_ORDER.filter((id) => panels[id as keyof typeof panels])

  const workspaceView = (() => {
    if (workspace === 'home') return <Suspense fallback={null}><BriefingScreen /></Suspense>
    if (workspace === 'search') return <Suspense fallback={null}><IndexScreen /></Suspense>
    if (workspace === 'diagnostics') return <Suspense fallback={null}><DiagnosticsScreen /></Suspense>
    if (workspace === 'graph') return <Suspense fallback={null}><GraphScreen /></Suspense>
    if (workspace === 'timeline') return <Suspense fallback={null}><TimelineScreen /></Suspense>
    if (workspace === 'manual') return <Suspense fallback={null}><OperatorManual /></Suspense>
    if (workspace === 'settings') return <Suspense fallback={null}><SettingsScreen /></Suspense>
    if (workspace === 'inbox') return <Suspense fallback={null}><InboxPanel /></Suspense>
    if (!rootPath) return <Suspense fallback={null}><IdleScreen /></Suspense>
    return (
      <>
        <Sidebar />
        <div className="content" ref={contentRef}>
          <EditorPane />
          {previewVisible ? <Splitter containerRef={contentRef} /> : null}
          {previewVisible ? <PreviewPane /> : null}
        </div>
      </>
    )
  })()

  return (
    <div className={`app ${focusMode ? 'app--focus' : ''}`}>
      <TitleBar resolvedTheme={resolvedTheme} maximized={maximized} />
      <Suspense fallback={null}><ColonyBanner /></Suspense>
      <Suspense fallback={null}><WorkspaceBar /></Suspense>
      <Suspense fallback={null}><CommandBar /></Suspense>

      <div className="workspace">
        {workspace === 'archive' ? (
          workspaceView
        ) : (
          <div className="content content--screen">{workspaceView}</div>
        )}
      </div>

      <ConsoleBar />
      <StatusBar resolvedTheme={resolvedTheme} />

      {workspace === 'archive' ? (
        openPanels.map((id) => (
          <SubWindow
            key={id}
            title={PANEL_META[id].program}
            subtitle={PANEL_META[id].title}
            width={Math.min(PANEL_META[id].width, Math.max(280, window.innerWidth - 40))}
            initial={panelOrigin(id)}
            onClose={() => useArchiveStore.getState().closePanel(id as keyof typeof panels)}
          >
            {panelBody(id)}
          </SubWindow>
        ))
      ) : null}

      <Suspense fallback={null}><Inspector /></Suspense>
      <CommandPalette />
      <ContextMenu />
      <DialogHost />
      <ToastStack />
      {newPagePickerDir !== null ? (
        <Suspense fallback={null}>
          <TemplatePickerDialog dirPath={newPagePickerDir} onClose={closeNewPagePicker} />
        </Suspense>
      ) : null}
      <Suspense fallback={null}><MountSequence /></Suspense>

      {bootVisible ? <BootSequence onDone={() => setBootAnimationDone(true)} /> : null}
    </div>
  )
}
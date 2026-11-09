import { create } from 'zustand'
import type {
  ArchiveConfig,
  ArchiveIndex,
  RootState,
  SnapshotInfo,
  TemplateFile,
  ArchiveMeta,
  DisplayMode,
  IntegrityReport,
  ThemeSetting,
  TreeNode,
  WorkspaceId
} from '@shared/types'
import { call, errorMessage } from '../lib/api'
import { ancestors, basename, dirname, findNode, treeContains } from '../lib/paths'
import { resolveTheme } from '../lib/theme'
import { parseFrontmatter, stringValue, updateFrontmatter } from '@shared/frontmatter'
import { addRimDays, parseRimDate } from '@shared/wiki'
import { PAGE_TEMPLATES, starterFrontmatterForType } from '@shared/pageTemplates'
import { APP_RELEASE } from '@shared/release'
import { DEFAULT_PROFILE, profileFromMeta, profileToFields, PROFILE_PRESETS } from '@shared/profiles'
import type { ArchiveProfile } from '@shared/types'

export type ToastKind = 'info' | 'error' | 'success'

export interface Toast {
  id: number
  kind: ToastKind
  message: string
}

export interface PromptDialog {
  kind: 'prompt'
  title: string
  label: string
  initial: string
  confirmLabel: string
  onSubmit: (value: string) => Promise<void>
}

export interface ConfirmDialog {
  kind: 'confirm'
  title: string
  body: string
  confirmLabel: string
  danger?: boolean
  onConfirm: () => Promise<void>
}

export interface AboutDialog {
  kind: 'about'
}

export type DialogState = PromptDialog | ConfirmDialog | AboutDialog | null

export interface ContextTarget {
  x: number
  y: number
  path: string
  kind: 'file' | 'folder' | 'root'
}

export type PanelId =
  | 'backlinks'
  | 'diagnostics'
  | 'timeline'
  | 'graph'
  | 'history'
  | 'templates'
  | 'export'
  | 'inbox'
  | 'profile'

export type ConsoleKind = 'info' | 'save' | 'error' | 'system'

export interface ConsoleEntry {
  id: number
  kind: ConsoleKind
  message: string
  at: number
}

export type EditorActionKind =
  | 'bold'
  | 'italic'
  | 'heading'
  | 'list'
  | 'link'
  | 'table'
  | 'table-add-row'
  | 'table-remove-row'
  | 'table-add-col'
  | 'table-remove-col'

export interface EditorAction {
  id: number
  kind: EditorActionKind
}

export interface TableInfo {
  row: number
  col: number
  rows: number
  cols: number
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'autosaved' | 'error'

export interface ArchiveStore {
  config: ArchiveConfig | null
  rootPath: string | null
  archives: string[]
  tree: TreeNode | null
  expanded: Record<string, boolean>
  selected: string | null
  drafts: Record<string, string>
  saved: Record<string, string>
  mtimes: Record<string, number>
  loading: boolean
  previewVisible: boolean
  sidebarVisible: boolean
  splitRatio: number
  theme: ThemeSetting
  linter: boolean
  bootSequence: boolean
  autosave: boolean
  typewriterScroll: boolean
  focusMode: boolean
  workspace: WorkspaceId
  unsealed: Record<string, boolean>
  focusedPane: 'tree' | 'editor' | 'preview' | null
  tabs: string[]
  mounting: boolean
  mountLines: string[]
  display: DisplayMode
  keyclick: boolean
  sector: string
  sealPassphrase: string
  signOff: boolean
  operatorName: string
  featureUsage: Record<string, Record<string, number>>
  unlocks: Record<string, string[]>
  lastSeenVersion: string
  seeAlsoOpen: boolean
  newPagePickerDir: string | null
  archiveMeta: ArchiveMeta | null
  profile: ArchiveProfile
  revisions: Record<string, number>
  lastRevision: { path: string; from: number; to: number } | null
  scanRunning: boolean
  scanProgress: number
  scanTotal: number
  scanLines: string[]
  scanReport: IntegrityReport | null
  booted: boolean
  cursorLine: number
  cursorCol: number
  insertRequest: { id: number; text: string } | null
  editorAction: EditorAction | null
  tableInfo: TableInfo | null
  toasts: Toast[]
  dialog: DialogState
  contextMenu: ContextTarget | null
  initialized: boolean

  index: ArchiveIndex | null
  indexLoading: boolean
  lastIndexAt: number | null
  lastSaveAt: number | null
  lastSavePath: string | null
  saveStatus: SaveStatus
  activeTag: string | null
  panels: Record<PanelId, boolean>
  paletteOpen: boolean
  consoleOpen: boolean
  consoleEntries: ConsoleEntry[]
  favorites: string[]
  templates: TemplateFile[]
  snapshots: SnapshotInfo[]
  snapshotsLoading: boolean

  hydrate: (config: ArchiveConfig) => void
  setRoot: (state: RootState) => void
  refreshTree: () => Promise<void>
  refreshIndex: () => Promise<void>
  scheduleIndexRefresh: () => void
  selectPath: (path: string) => Promise<void>
  clearSelection: () => void
  updateDraft: (path: string, content: string) => void
  saveSelected: () => Promise<void>
  savePath: (path: string, mode?: 'manual' | 'autosave') => Promise<void>

  setTheme: (theme: ThemeSetting) => void
  toggleTheme: () => void
  setPreviewVisible: (visible: boolean) => void
  togglePreview: () => void
  setSidebarVisible: (visible: boolean) => void
  toggleSidebar: () => void
  setSplitRatio: (ratio: number) => void
  commitSplitRatio: () => void
  toggleLinter: () => void
  toggleAutosave: () => void
  toggleTypewriter: () => void
  toggleFocusMode: () => void
  setSeeAlsoOpen: (open: boolean) => void
  setFocusedPane: (pane: 'tree' | 'editor' | 'preview' | null) => void
  setTechLevel: (level: 'neolithic' | 'industrial' | 'spacer' | 'ultratech') => Promise<void>
  syncArchiveDate: () => Promise<void>
  setArchiveDate: (date: string) => Promise<void>
  openInbox: () => Promise<void>
  saveDispatch: (kind: string, title: string, body: string) => Promise<void>
  promoteDispatch: (index: number) => Promise<void>
  unsealPath: (path: string, passphrase: string) => boolean
  toggleSignOff: () => void
  setSealPassphrase: (value: string) => void
  setProfile: (preset: string) => Promise<void>
  setProfileTerms: (terms: Partial<ArchiveProfile>) => Promise<void>
  openManual: (anchor?: string) => Promise<void>
  announceOnce: (key: string, message: string) => void
  checkWhatsNew: () => void
  savePageAsTemplate: (path: string) => Promise<void>
  convertPageType: (path: string, type: string, scaffold: boolean) => Promise<void>
  applyStarterFrontmatter: (path: string, type: string | null) => void
  useFeature: (key: string) => void
  openNewPagePicker: (dirPath: string) => void
  closeNewPagePicker: () => void
  checkArchivistStatus: () => void
  createMemorial: (path: string) => Promise<void>
  setWorkspace: (workspace: WorkspaceId) => void
  openTab: (path: string) => void
  closeTab: (path: string) => void
  nextTab: () => void
  prevTab: () => void
  toggleDisplay: () => void
  toggleKeyclick: () => void
  setSector: (sector: string) => void
  unmountArchive: () => Promise<void>
  openLog: () => Promise<void>
  runIntegrityScan: () => Promise<void>
  cancelIntegrityScan: () => Promise<void>

  toggleExpanded: (path: string) => void
  expandPath: (path: string) => void
  openDialog: (dialog: DialogState) => void
  closeDialog: () => void
  pushToast: (kind: ToastKind, message: string) => void
  dismissToast: (id: number) => void
  setContextMenu: (target: ContextTarget | null) => void
  requestInsert: (text: string) => void
  requestEditorAction: (kind: EditorActionKind) => void
  setTableInfo: (info: TableInfo | null) => void
  setCursor: (line: number, col: number) => void
  completeBoot: () => void

  openFolder: () => Promise<void>
  switchArchive: (rootPath: string) => Promise<void>
  newPageFromSelection: () => void
  newFolderFromSelection: () => void
  renameSelected: () => void
  deleteSelected: () => void
  promptNewPage: (dirPath: string) => void
  promptNewFolder: (dirPath: string) => void
  promptRename: (path: string, currentName: string) => void
  promptDelete: (path: string, name: string, kind: 'file' | 'folder') => void
  createEntry: (kind: 'file' | 'folder', dirPath: string, name: string) => Promise<void>
  renamePath: (path: string, name: string) => Promise<void>
  movePath: (path: string, targetDir: string) => Promise<void>
  deletePath: (path: string) => Promise<void>

  createDashboard: () => Promise<void>
  setActiveTag: (tag: string | null) => void
  togglePanel: (id: PanelId) => void
  openPanel: (id: PanelId) => void
  closePanel: (id: PanelId) => void
  setPaletteOpen: (open: boolean) => void
  toggleConsole: () => void
  log: (message: string, kind?: ConsoleKind) => void
  clearConsole: () => void
  toggleFavorite: (path: string) => void
  isFavorite: (path: string) => boolean
  loadTemplates: () => Promise<void>
  saveTemplateFile: (name: string, content: string) => Promise<void>
  loadSnapshots: (path: string) => Promise<void>
  restoreSnapshot: (path: string, id: string) => Promise<void>
}

let toastSeq = 0
let insertSeq = 0
let selectSeq = 0
let actionSeq = 0
let consoleSeq = 0
let indexSeq = 0
let indexTimer: number | null = null
let saveStatusTimer: number | null = null
const autosaveTimers = new Map<string, number>()

const AUTOSAVE_DELAY = 1400

export function isDirty(
  state: Pick<ArchiveStore, 'drafts' | 'saved'>,
  path: string | null
): boolean {
  if (!path) return false
  const draft = state.drafts[path]
  return draft !== undefined && draft !== state.saved[path]
}

export function dirtyPaths(state: Pick<ArchiveStore, 'drafts' | 'saved'>): string[] {
  return Object.keys(state.drafts).filter((path) => isDirty(state, path))
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}b`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}kb`
  return `${(bytes / (1024 * 1024)).toFixed(1)}mb`
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length
}

function persist(patch: Partial<ArchiveConfig>): void {
  void window.api.setConfig(patch).then((result) => {
    if (!result.ok) console.warn('[colony] failed to persist config:', result.error)
  })
}

function expandFor(expanded: Record<string, boolean>, path: string): Record<string, boolean> {
  const next = { ...expanded }
  for (const ancestor of ancestors(path)) next[ancestor] = true
  return next
}

function remapKey(key: string, from: string, to: string): string {
  if (key === from) return to
  if (key.startsWith(`${from}/`)) return to + key.slice(from.length)
  return key
}

function remapMap<T>(map: Record<string, T>, from: string, to: string): Record<string, T> {
  const next: Record<string, T> = {}
  for (const [key, value] of Object.entries(map)) next[remapKey(key, from, to)] = value
  return next
}

function remapList(list: string[], from: string, to: string): string[] {
  return list.map((entry) => remapKey(entry, from, to))
}

function favoritesFor(config: ArchiveConfig | null, rootPath: string | null): string[] {
  if (!config || !rootPath) return []
  return config.favorites[rootPath] ?? []
}

function defaultPanels(): Record<PanelId, boolean> {
  return {
    backlinks: false,
    diagnostics: false,
    timeline: false,
    graph: false,
    history: false,
    templates: false,
    export: false,
  inbox: false,
  profile: false
  }
}

async function chooseFolder(): Promise<void> {
  const store = useArchiveStore.getState()
  try {
    const result = await call(window.api.selectFolder())
    if (!result.canceled) store.setRoot(result.state)
  } catch (error) {
    store.pushToast('error', errorMessage(error))
  }
}

function findFile(tree: TreeNode | null, name: string): boolean {
  if (!tree) return false
  for (const child of tree.children ?? []) {
    if (child.kind === 'file' && child.name.toLowerCase() === name.toLowerCase()) return true
    if (child.kind === 'folder' && findFile(child, name)) return true
  }
  return false
}

export const useArchiveStore = create<ArchiveStore>()((set, get) => ({
  config: null,
  rootPath: null,
  archives: [],
  tree: null,
  expanded: {},
  selected: null,
  drafts: {},
  saved: {},
  mtimes: {},
  loading: false,
  previewVisible: true,
  sidebarVisible: true,
  splitRatio: 0.5,
  theme: 'system',
  linter: true,
  bootSequence: true,
  autosave: true,
  typewriterScroll: true,
  focusMode: false,
  workspace: 'archive',
  unsealed: {},
  focusedPane: null,
  tabs: [],
  mounting: false,
  mountLines: [],
  display: 'clean',
  keyclick: false,
  sector: 'SECTOR 7',
  sealPassphrase: 'colony',
  signOff: false,
  operatorName: 'OVERSEER-7',
  featureUsage: {},
  unlocks: {},
  lastSeenVersion: '',
  seeAlsoOpen: true,
  newPagePickerDir: null,
  archiveMeta: null,
  profile: DEFAULT_PROFILE,
  revisions: {},
  lastRevision: null,
  scanRunning: false,
  scanProgress: 0,
  scanTotal: 0,
  scanLines: [],
  scanReport: null,
  booted: false,
  cursorLine: 1,
  cursorCol: 1,
  insertRequest: null,
  editorAction: null,
  tableInfo: null,
  toasts: [],
  dialog: null,
  contextMenu: null,
  initialized: false,

  index: null,
  indexLoading: false,
  lastIndexAt: null,
  lastSaveAt: null,
  lastSavePath: null,
  saveStatus: 'idle',
  activeTag: null,
  panels: defaultPanels(),
  paletteOpen: false,
  consoleOpen: false,
  consoleEntries: [],
  favorites: [],
  templates: [],
  snapshots: [],
  snapshotsLoading: false,

  hydrate: (config) =>
    set({
      config,
      archives: config.archives,
      theme: config.theme,
      previewVisible: config.previewVisible,
      sidebarVisible: config.sidebarVisible,
      splitRatio: config.splitRatio,
      linter: config.linter,
      bootSequence: config.bootSequence,
      autosave: config.autosave,
      typewriterScroll: config.typewriterScroll,
      display: config.display,
      keyclick: config.keyclick,
      sector: config.sector,
      sealPassphrase: config.sealPassphrase,
      signOff: config.signOff,
      operatorName: config.operatorName,
      featureUsage: config.featureUsage,
      unlocks: config.unlocks,
      lastSeenVersion: config.lastSeenVersion,
      initialized: true
    }),

  setRoot: (state) => {
    const current = get()
    const sameRoot = state.rootPath === current.rootPath
    const newRoot = !sameRoot && !!state.rootPath
    set({
      rootPath: state.rootPath,
      tree: state.tree,
      archives: state.archives,
      expanded: state.tree ? { [state.tree.path]: true } : {},
      selected: sameRoot ? current.selected : null,
      drafts: sameRoot ? current.drafts : {},
      saved: sameRoot ? current.saved : {},
      mtimes: sameRoot ? current.mtimes : {},
      favorites: favoritesFor(current.config, state.rootPath),
      activeTag: sameRoot ? current.activeTag : null,
      tabs: sameRoot ? current.tabs : [],
      unsealed: sameRoot ? current.unsealed : {},
      mounting: newRoot,
      mountLines: newRoot
        ? [`> mounting ${state.rootPath}`, '> verifying archive root', '> scanning records', '> linking references', '> archive online']
        : [],
      archiveMeta: null,
      profile: DEFAULT_PROFILE
    })

    if (!state.rootPath) {
      set({ index: null, templates: [], snapshots: [], mounting: false, mountLines: [], archiveMeta: null })
      return
    }

    get().log(`mounted ${state.rootPath}`, 'system')
    void get().loadTemplates()
    if (newRoot) window.setTimeout(() => set({ mounting: false }), 520)
    window.setTimeout(() => void get().refreshIndex(), 250)
  },

  refreshTree: async () => {
    try {
      const state = await call(window.api.listTree())
      set({ rootPath: state.rootPath, tree: state.tree, archives: state.archives })

      const selected = get().selected
      if (!selected) return
      if (!state.tree || !treeContains(state.tree, selected)) {
        get().clearSelection()
        return
      }
      if (isDirty(get(), selected)) return

      try {
        const file = await call(window.api.readFile(selected))
        const current = get()
        if (current.selected !== selected || isDirty(current, selected)) return
        if (current.drafts[selected] !== file.content) {
          set((snapshot) => ({
            drafts: { ...snapshot.drafts, [selected]: file.content },
            saved: { ...snapshot.saved, [selected]: file.content },
            mtimes: { ...snapshot.mtimes, [selected]: file.mtimeMs }
          }))
        }
      } catch {
        // The record may have been removed between the scan and the read.
      }
    } catch (error) {
      get().pushToast('error', errorMessage(error))
    }
  },

  refreshIndex: async () => {
    if (!get().rootPath) {
      set({ index: null })
      return
    }
    const token = ++indexSeq
    set({ indexLoading: true })
    try {
      const index = await call(window.api.indexArchive())
      if (token !== indexSeq) return
      set({ index, archiveMeta: index?.meta ?? null, profile: profileFromMeta(index?.meta as unknown as Record<string, unknown> ?? null), indexLoading: false, lastIndexAt: Date.now() })
    } catch (error) {
      if (token !== indexSeq) return
      set({ indexLoading: false })
      get().pushToast('error', `Index failed: ${errorMessage(error)}`)
    }
  },

  scheduleIndexRefresh: () => {
    if (indexTimer !== null) window.clearTimeout(indexTimer)
    indexTimer = window.setTimeout(() => {
      indexTimer = null
      void get().refreshIndex()
    }, 500)
  },

  selectPath: async (path) => {
    const tree = get().tree
    const unsealed = get().unsealed
    const prefixes = []
    let current = ''
    for (const segment of path.split('/').filter(Boolean)) {
      current = current ? `${current}/${segment}` : segment
      prefixes.push(current)
    }
    const sealedAncestor = prefixes.reverse().find((prefix) => Boolean(findNode(tree, prefix)?.sealed) && !unsealed[prefix])
    if (sealedAncestor) {
      get().openDialog({
        kind: 'confirm',
        title: 'Unseal archive',
        body: '> UNSEAL ARCHIVE? THIS ACTION IS LOGGED.',
        confirmLabel: 'Unseal',
        danger: true,
        onConfirm: async () => {
          get().closeDialog()
          const passphrase = window.prompt('Seal passphrase')
          if (passphrase && get().unsealPath(sealedAncestor, passphrase)) {
            await get().selectPath(path)
          }
        }
      })
      return
    }
    const token = ++selectSeq
    const state = get()
    if (state.selected === path) {
      set({ paletteOpen: false })
      return
    }

    if (state.drafts[path] !== undefined) {
      set((snapshot) => ({
        selected: path,
        loading: false,
        paletteOpen: false,
        expanded: expandFor(snapshot.expanded, path),
        tabs: snapshot.tabs.includes(path) ? snapshot.tabs : [...snapshot.tabs, path]
      }))
      get().log(`opened ${path}`, 'info')
      return
    }

    set({ loading: true })
    try {
      const file = await call(window.api.readFile(path))
      if (token !== selectSeq) return
      set((snapshot) => ({
        selected: path,
        loading: false,
        paletteOpen: false,
        drafts: { ...snapshot.drafts, [path]: file.content },
        saved: { ...snapshot.saved, [path]: file.content },
        mtimes: { ...snapshot.mtimes, [path]: file.mtimeMs },
        expanded: expandFor(snapshot.expanded, path),
        tabs: snapshot.tabs.includes(path) ? snapshot.tabs : [...snapshot.tabs, path]
      }))
      get().log(`opened ${path}`, 'info')
    } catch (error) {
      if (token !== selectSeq) return
      set({ loading: false })
      get().pushToast('error', errorMessage(error))
    }
  },

  clearSelection: () => {
    selectSeq += 1
    set({ selected: null, loading: false })
  },

  updateDraft: (path, content) => {
    set((state) => ({ drafts: { ...state.drafts, [path]: content } }))
    if (!get().autosave) return

    const existing = autosaveTimers.get(path)
    if (existing !== undefined) window.clearTimeout(existing)
    autosaveTimers.set(
      path,
      window.setTimeout(() => {
        autosaveTimers.delete(path)
        if (!isDirty(get(), path)) return
        void get().savePath(path, 'autosave')
      }, AUTOSAVE_DELAY)
    )
  },

  saveSelected: async () => {
    const selected = get().selected
    if (!selected) return
    await get().savePath(selected, 'manual')
  },

  savePath: async (path, mode = 'manual') => {
    const state = get()
    const content = state.drafts[path]
    if (content === undefined) return
    if (content === state.saved[path]) return

    const pending = autosaveTimers.get(path)
    if (pending !== undefined) {
      window.clearTimeout(pending)
      autosaveTimers.delete(path)
    }

    set({ saveStatus: 'saving' })
    try {
      const result = await call(window.api.writeFile(path, content))
      set((snapshot) => ({
        saved: { ...snapshot.saved, [path]: content },
        mtimes: { ...snapshot.mtimes, [path]: result.mtimeMs },
        revisions: { ...snapshot.revisions, [path]: result.revision },
        lastRevision: { path, from: snapshot.revisions[path] ?? result.revision - 1, to: result.revision },
        lastSaveAt: Date.now(),
        lastSavePath: path,
        saveStatus: mode === 'autosave' ? 'autosaved' : 'saved'
      }))
      get().log(
        `${mode === 'autosave' ? 'autosaved' : 'saved'} ${path} (${formatBytes(byteLength(content))})`,
        'save'
      )
      const oldStatus = get().index?.pages.find((page) => page.path === path)?.status ?? null
      const newStatus = stringValue(parseFrontmatter(content).data.status).trim() || null
      const pageType = get().index?.pages.find((page) => page.path === path)?.type ?? null
      if (oldStatus !== 'dead' && newStatus === 'dead' && pageType === 'colonist') {
        get().openDialog({
          kind: 'confirm',
          title: 'Generate memorial',
          body: `Generate a memorial record for ${path}?`,
          confirmLabel: 'Generate memorial',
          onConfirm: async () => {
            get().closeDialog()
            await get().createMemorial(path)
          }
        })
      }
      get().scheduleIndexRefresh()
      if (saveStatusTimer !== null) window.clearTimeout(saveStatusTimer)
      saveStatusTimer = window.setTimeout(() => {
        saveStatusTimer = null
        set({ saveStatus: 'idle' })
      }, 1900)
    } catch (error) {
      set({ saveStatus: 'error' })
      get().pushToast('error', `Save failed: ${errorMessage(error)}`)
      get().log(`save failed ${path}: ${errorMessage(error)}`, 'error')
    }
  },

  setTheme: (theme) => {
    set({ theme })
    persist({ theme })
    get().log(`theme set to ${theme}`, 'system')
  },

  toggleTheme: () => {
    const next = resolveTheme(get().theme) === 'dark' ? 'light' : 'dark'
    get().setTheme(next)
  },

  setPreviewVisible: (visible) => {
    set({ previewVisible: visible })
    persist({ previewVisible: visible })
  },

  togglePreview: () => get().setPreviewVisible(!get().previewVisible),

  setSidebarVisible: (visible) => {
    set({ sidebarVisible: visible })
    persist({ sidebarVisible: visible })
  },

  toggleSidebar: () => get().setSidebarVisible(!get().sidebarVisible),

  setSplitRatio: (ratio) => set({ splitRatio: Math.min(0.78, Math.max(0.22, ratio)) }),

  commitSplitRatio: () => persist({ splitRatio: get().splitRatio }),

  toggleLinter: () => {
    const linter = !get().linter
    set({ linter })
    persist({ linter })
  },

  toggleAutosave: () => {
    const autosave = !get().autosave
    set({ autosave })
    persist({ autosave })
    get().log(`autosave ${autosave ? 'enabled' : 'disabled'}`, 'system')
  },

  toggleTypewriter: () => {
    const typewriterScroll = !get().typewriterScroll
    set({ typewriterScroll })
    persist({ typewriterScroll })
    get().log(`typewriter scrolling ${typewriterScroll ? 'enabled' : 'disabled'}`, 'system')
  },

  toggleFocusMode: () => {
    const focusMode = !get().focusMode
    set({ focusMode })
    get().log(`focus mode ${focusMode ? 'engaged' : 'released'}`, 'system')
  },

  setSeeAlsoOpen: (open) => set({ seeAlsoOpen: open }),

  setFocusedPane: (pane) => set({ focusedPane: pane }),

  setWorkspace: (workspace) => set({ workspace }),

  openTab: (path) =>
    set((state) => ({ tabs: state.tabs.includes(path) ? state.tabs : [...state.tabs, path] })),

  closeTab: (path) => {
    const state = get()
    const index = state.tabs.indexOf(path)
    if (index === -1) return
    const nextTabs = state.tabs.filter((entry) => entry !== path)
    let nextSelected = state.selected
    if (state.selected === path) {
      const fallback = nextTabs[index] ?? nextTabs[index - 1] ?? null
      nextSelected = fallback
      if (state.drafts[path] !== undefined && state.drafts[path] !== state.saved[path]) {
        get().pushToast('info', 'Draft retained in memory; reopen to edit.')
      }
    }
    set({ tabs: nextTabs, selected: nextSelected })
    if (nextSelected && nextSelected !== state.selected) {
      // keep the existing draft; selection state already has it
    }
  },

  nextTab: () => {
    const state = get()
    if (state.tabs.length === 0) return
    const index = state.tabs.indexOf(state.selected ?? '')
    const next = state.tabs[(index + 1 + state.tabs.length) % state.tabs.length]
    void get().selectPath(next)
  },

  prevTab: () => {
    const state = get()
    if (state.tabs.length === 0) return
    const index = state.tabs.indexOf(state.selected ?? '')
    const next = state.tabs[(index - 1 + state.tabs.length) % state.tabs.length]
    void get().selectPath(next)
  },

  toggleDisplay: () => {
    const display = get().display === 'clean' ? 'phosphor' : 'clean'
    set({ display })
    persist({ display })
    get().log(`display set to ${display}`, 'system')
  },

  toggleKeyclick: () => {
    const keyclick = !get().keyclick
    set({ keyclick })
    persist({ keyclick })
    get().log(`keystroke click ${keyclick ? 'enabled' : 'muted'}`, 'system')
  },

  setSector: (sector) => {
    const clean = sector.trim()
    if (!clean) return
    set({ sector: clean })
    persist({ sector: clean })
    get().log(`sector set to ${clean}`, 'system')
  },

  unmountArchive: async () => {
    const dirty = dirtyPaths(get())
    if (dirty.length > 0) {
      get().openDialog({
        kind: 'confirm',
        title: 'Unsaved records',
        body: `${dirty.length} record${dirty.length === 1 ? '' : 's'} ${dirty.length === 1 ? 'has' : 'have'} unsaved changes. Unmounting will keep drafts in memory.`,
        confirmLabel: 'Unmount',
        danger: true,
        onConfirm: async () => {
          get().closeDialog()
          const state = await call(window.api.unmountArchive())
          get().setRoot(state)
          get().setWorkspace('archive')
        }
      })
      return
    }
    const state = await call(window.api.unmountArchive())
    get().setRoot(state)
    get().setWorkspace('archive')
  },

  openLog: async () => {
    const state = get()
    if (!state.rootPath) return
    const path = '_log.md'
    try {
      await call(window.api.createFile('', path))
    } catch {
      // Already exists or creation failed; attempt to open either way.
    }
    await get().selectPath(path)
    get().setWorkspace('archive')
  },

  runIntegrityScan: async () => {
    if (get().scanRunning) return
    set({ scanRunning: true, scanProgress: 0, scanTotal: 0, scanLines: [], scanReport: null })
    get().log('> launching DIAGNOSTICS.SYS...', 'system')
    const off = window.api.onIntegrityProgress((progress) => {
      const p = progress as { current?: number; total?: number; line?: string; done?: boolean; issue?: unknown }
      set((state) => ({
        scanProgress: p.current ?? state.scanProgress,
        scanTotal: p.total ?? state.scanTotal,
        scanLines: p.line ? [...state.scanLines, String(p.line)] : state.scanLines
      }))
    })
    try {
      const report = await call(window.api.startIntegrityScan())
      set({ scanReport: report, scanRunning: false })
      get().log(
        `integrity scan complete: ${report.scanned} records, ${report.issues.length} issue(s)`,
        report.issues.length ? 'error' : 'save'
      )
    } catch (error) {
      set({ scanRunning: false })
      get().pushToast('error', errorMessage(error))
      get().log(`integrity scan failed: ${errorMessage(error)}`, 'error')
    } finally {
      off()
    }
  },

  cancelIntegrityScan: async () => {
    await call(window.api.cancelIntegrityScan())
    set({ scanRunning: false })
    get().log('integrity scan cancelled', 'system')
  },

    setTechLevel: async (level) => {
    const file = await call(window.api.readFile('_archive.md')).catch(() => null)
    const source = file?.content ?? '---\n---\n'
    await call(window.api.writeFile('_archive.md', updateFrontmatter(source, { tech_level: level })))
    await get().refreshIndex()
    get().log(`era set to ${level}`, 'system')
  },

  syncArchiveDate: async () => {
    const meta = get().archiveMeta
    const current = meta?.currentDate ?? (meta?.founded ? `${meta.founded}-01-01` : null)
    if (!current || !parseRimDate(current)) {
      get().pushToast('info', 'No colony date is set.')
      return
    }
    const next = addRimDays(current, 1)
    if (!next) return
    await get().setArchiveDate(next)
  },

  setArchiveDate: async (date) => {
    const clean = date.trim()
    if (!parseRimDate(clean)) {
      get().pushToast('error', 'Date must use the RimWorld form YYYY-Q-DD.')
      return
    }
    const file = await call(window.api.readFile('_archive.md')).catch(() => null)
    const source = file?.content ?? '---\n---\n'
    await call(window.api.writeFile('_archive.md', updateFrontmatter(source, { current_date: clean })))
    await get().refreshIndex()
    get().log(`colony date set to ${clean}`, 'system')
  },

  openInbox: async () => {
    try { await call(window.api.createFile('', '_inbox.md')) } catch { /* exists */ }
    await get().selectPath('_inbox.md')
    get().setWorkspace('archive')
    get().openPanel('inbox')
  },

  saveDispatch: async (kind, title, body) => {
    const file = await call(window.api.readFile('_inbox.md')).catch(() => null)
    const source = file?.content ?? '# INCOMING TRANSMISSIONS\n\n'
    const stamp = get().archiveMeta?.currentDate ?? new Date().toISOString().slice(0, 10)
    const entry = `\n## [${kind.toUpperCase()}] ${stamp} · ${title}\n\n${body.trim()}\n`
    await call(window.api.writeFile('_inbox.md', source.replace(/\s*$/, '') + entry))
    get().log('dispatch filed', 'system')
  },

  promoteDispatch: async (index) => {
    const file = await call(window.api.readFile('_inbox.md')).catch(() => null)
    if (!file) return
    const lines = file.content.split('\n')
    const starts: number[] = []
    lines.forEach((line, i) => { if (/^## \[/.test(line)) starts.push(i) })
    if (index < 0 || index >= starts.length) return
    const start = starts[index]
    const end = starts[index + 1] ?? lines.length
    const heading = lines[start].replace(/^## /, '')
    const body = lines.slice(start + 1, end).join('\n').trim()
    const title = heading.replace(/^\[[^\]]+\]\s*/, '').split('·').pop()?.trim() || 'Dispatch'
    const safeName = `${title.replace(/[<>:"/\\|?*]/g, '-')}.md`
    const content = `---\ntitle: ${title}\ntype: report\ndate: ${get().archiveMeta?.currentDate ?? ''}\n---\n\n${body}\n`
    try { await call(window.api.createFile('', safeName)) } catch { /* exists */ }
    await call(window.api.writeFile(safeName, content))
    const nextLines = [...lines.slice(0, start), ...lines.slice(end)]
    await call(window.api.writeFile('_inbox.md', nextLines.join('\n').replace(/\n{3,}/g, '\n\n')))
    await get().refreshTree()
    await get().selectPath(safeName)
    get().log(`dispatch promoted → ${safeName}`, 'system')
  },

  unsealPath: (path, passphrase) => {
    if (passphrase !== get().sealPassphrase) {
      get().pushToast('error', 'E-102 PATH REJECTED — invalid seal passphrase')
      return false
    }
    const tree = get().tree
    const ancestors = path.split('/').filter(Boolean)
    const prefixes = []
    let current = ''
    for (const segment of ancestors) {
      current = current ? `${current}/${segment}` : segment
      prefixes.push(current)
    }
    const sealedAncestor = prefixes.reverse().find((prefix) => Boolean(findNode(tree, prefix)?.sealed))
    const target = sealedAncestor ?? path
    set((state) => ({ unsealed: { ...state.unsealed, [target]: true } }))
    get().log(`sealed archive unlocked: ${target}`, 'system')
    return true
  },

  toggleSignOff: () => {
    const signOff = !get().signOff
    set({ signOff })
    persist({ signOff })
    get().log(`sign-off ${signOff ? 'enabled' : 'disabled'}`, 'system')
  },

  setSealPassphrase: (value) => {
    const clean = value.trim()
    if (!clean) return
    set({ sealPassphrase: clean })
    persist({ sealPassphrase: clean })
    get().log('seal passphrase updated', 'system')
  },

  openManual: async (anchor) => {
    try { await call(window.api.createFile('', '_manual.md')) } catch { /* exists */ }
    try { await call(window.api.writeFile('_manual.md', (await import('@shared/manual')).MANUAL_MARKDOWN)) } catch { /* keep existing */ }
    await get().selectPath('_manual.md')
    get().setWorkspace('archive')
    if (anchor) {
      window.setTimeout(() => {
        const id = anchor.startsWith('#') ? anchor.slice(1) : anchor
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 120)
    }
  },

  announceOnce: (key, message) => {
    const root = get().rootPath
    if (!root) return
    const unlocks = get().unlocks
    const seen = unlocks[root] ?? []
    if (seen.includes(key)) return
    const next = [...seen, key]
    const nextUnlocks = { ...unlocks, [root]: next }
    set({ unlocks: nextUnlocks })
    persist({ unlocks: nextUnlocks })
    get().log(message, 'system')
  },

  checkWhatsNew: () => {
    const config = get().config
    if (!config) return
    const version = APP_RELEASE.version
    const summary = APP_RELEASE.summary
    if (config.lastSeenVersion === version) return
    const next = { ...config, lastSeenVersion: version }
    set({ config: next, lastSeenVersion: version })
    persist({ lastSeenVersion: version })
    get().log(`> updated: ${summary}. see _manual.md.`, 'system')
  },

  savePageAsTemplate: async (path) => {
    const draft = get().drafts[path]
    const content = draft ?? (await call(window.api.readFile(path))).content
    const name = window.prompt('Template name:', path.split('/').pop()?.replace(/\.md$/i, '') ?? 'template')
    if (!name) return
    await call(window.api.saveTemplate(name, content))
    await get().loadTemplates()
    get().useFeature('template')
    get().pushToast('success', `Saved template ${name}`)
  },

  convertPageType: async (path, type, scaffold) => {
    const file = await call(window.api.readFile(path))
    const starter = starterFrontmatterForType(type)
    let next = updateFrontmatter(file.content, { type, ...starter })
    if (scaffold && !next.includes('## ')) {
      const template = PAGE_TEMPLATES.find((entry) => entry.type === type)
      if (template?.body) next = `${next.replace(/\s*$/, '')}\n\n${template.body}`
    }
    await call(window.api.writeFile(path, next))
    await get().refreshTree()
    await get().selectPath(path)
    get().useFeature('frontmatter')
  },

  applyStarterFrontmatter: (path, type) => {
    const draft = get().drafts[path]
    if (draft === undefined) return
    const starter = starterFrontmatterForType(type)
    const next = updateFrontmatter(draft, { type: type ?? undefined, ...starter })
    get().updateDraft(path, next)
    get().useFeature('frontmatter')
  },

  useFeature: (key) => {
    const root = get().rootPath
    if (!root) return
    const usage = get().featureUsage
    const archiveUsage = usage[root] ?? {}
    if ((archiveUsage[key] ?? 0) > 0) return
    const nextUsage = { ...usage, [root]: { ...archiveUsage, [key]: 1 } }
    set({ featureUsage: nextUsage })
    persist({ featureUsage: nextUsage })
    get().announceOnce(key, `> first ${key.replace(/-/g, ' ')} — see _manual.md for details.`)
  },

  openNewPagePicker: (dirPath) => {
    set({ newPagePickerDir: dirPath })
  },

  closeNewPagePicker: () => {
    set({ newPagePickerDir: null })
  },

  checkArchivistStatus: async () => {
    const meta = get().archiveMeta
    if (!meta?.archivist) return
    const archivist = meta.archivist
    const page = get().index?.pages.find((entry) => entry.title === archivist || entry.aliases.includes(archivist))
    if (page?.status !== 'dead') return
    const file = await call(window.api.readFile('_log.md')).catch(() => null)
    const marker = `MEMORIAL NOTICE: ARCHIVIST ${archivist.toUpperCase()} IS RECORDED AS DECEASED.`
    if (file?.content.includes(marker)) return
    const stamp = meta.currentDate ?? new Date().toISOString().slice(0, 10)
    const notice = `\n## ${stamp} · MEMORIAL NOTICE\n\n> ${marker}\n`
    const source = file?.content ?? '# OPERATOR LOG\n\n'
    await call(window.api.writeFile('_log.md', source.replace(/\s*$/, '') + notice))
    get().pushToast('info', `ARCHIVIST: [DECEASED] ${archivist}`)
  },

  createMemorial: async (path) => {
    const page = get().index?.pages.find((entry) => entry.path === path)
    if (!page) return
    const meta = get().archiveMeta
    const mentions = (page.backlinks ?? []).map((entry) => `- [[${entry}]]`).join('\n')
    const content = [
      '---',
      `title: Memorial: ${page.title}`,
      'type: memorial',
      `date: ${meta?.currentDate ?? ''}`,
      'tags: [memorial]',
      '---',
      '',
      `# Memorial: ${page.title}`,
      '',
      page.dossier.backstory ? `**Backstory:** ${page.dossier.backstory}` : '',
      '',
      '**Cause of death:** recorded in colony logs.',
      '',
      '## Mentioned in',
      mentions || '- none recorded'
    ].join('\n')
    try { await call(window.api.createFolder('', 'Memorials')) } catch { /* exists */ }
    const safeName = `${page.title}.md`
    try { await call(window.api.createFile('Memorials', safeName)) } catch { /* exists */ }
    await call(window.api.writeFile(`Memorials/${safeName}`, content))
    await get().refreshTree()
    await get().selectPath(`Memorials/${safeName}`)
    get().log(`memorial generated for ${page.title}`, 'system')
  },

  setProfile: async (preset) => {
    const profile = PROFILE_PRESETS[preset] ?? { ...DEFAULT_PROFILE, preset }
    const file = await call(window.api.readFile('_archive.md')).catch(() => null)
    const source = file?.content ?? '---\n---\n'
    await call(window.api.writeFile('_archive.md', updateFrontmatter(source, profileToFields(profile))))
    await get().refreshIndex()
    get().log(`archive profile set to ${profile.archive}`, 'system')
  },

  setProfileTerms: async (terms) => {
    const profile = { ...get().profile, ...terms }
    const file = await call(window.api.readFile('_archive.md')).catch(() => null)
    const source = file?.content ?? '---\n---\n'
    await call(window.api.writeFile('_archive.md', updateFrontmatter(source, profileToFields(profile))))
    await get().refreshIndex()
    get().log('archive profile updated', 'system')
  },

  toggleExpanded: (path) =>
    set((state) => ({ expanded: { ...state.expanded, [path]: !state.expanded[path] } })),

  expandPath: (path) =>
    set((state) => ({ expanded: { ...expandFor(state.expanded, path), [path]: true } })),

  openDialog: (dialog) => set({ dialog, contextMenu: null, paletteOpen: false }),
  closeDialog: () => set({ dialog: null }),

  pushToast: (kind, message) => {
    const id = ++toastSeq
    set((state) => ({ toasts: [...state.toasts.slice(-3), { id, kind, message }] }))
    setTimeout(() => get().dismissToast(id), kind === 'error' ? 7000 : 4000)
  },

  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),

  setContextMenu: (target) => set({ contextMenu: target }),

  requestInsert: (text) => {
    insertSeq += 1
    set({ insertRequest: { id: insertSeq, text } })
  },

  requestEditorAction: (kind) => {
    actionSeq += 1
    set({ editorAction: { id: actionSeq, kind } })
  },

  setTableInfo: (info) => set({ tableInfo: info }),

  setCursor: (line, col) => set({ cursorLine: line, cursorCol: col }),

  completeBoot: () => set({ booted: true }),

  openFolder: async () => {
    const dirty = dirtyPaths(get())
    if (dirty.length === 0) {
      await chooseFolder()
      return
    }
    get().openDialog({
      kind: 'confirm',
      title: 'Unsaved records',
      body: `${dirty.length} record${dirty.length === 1 ? '' : 's'} ${
        dirty.length === 1 ? 'has' : 'have'
      } unsaved changes. Switching archives will discard them.`,
      confirmLabel: 'Switch archive',
      danger: true,
      onConfirm: async () => {
        get().closeDialog()
        await chooseFolder()
      }
    })
  },

  switchArchive: async (rootPath) => {
    if (!rootPath || rootPath === get().rootPath) return
    const mount = async (): Promise<void> => {
      try {
        const state = await call(window.api.switchArchive(rootPath))
        get().setRoot(state)
      } catch (error) {
        get().pushToast('error', errorMessage(error))
      }
    }
    const dirty = dirtyPaths(get())
    if (dirty.length === 0) {
      await mount()
      return
    }
    get().openDialog({
      kind: 'confirm',
      title: 'Unsaved records',
      body: `${dirty.length} record${dirty.length === 1 ? '' : 's'} ${
        dirty.length === 1 ? 'has' : 'have'
      } unsaved changes. Mounting another archive will discard them.`,
      confirmLabel: 'Mount archive',
      danger: true,
      onConfirm: async () => {
        get().closeDialog()
        await mount()
      }
    })
  },

  newPageFromSelection: () => {
    const state = get()
    if (!state.selected) {
      state.openNewPagePicker('')
      return
    }
    const node = findNode(state.tree, state.selected)
    state.openNewPagePicker(node?.kind === 'folder' ? state.selected : dirname(state.selected))
  },

  newFolderFromSelection: () => {
    const state = get()
    if (!state.selected) {
      state.promptNewFolder('')
      return
    }
    const node = findNode(state.tree, state.selected)
    state.promptNewFolder(node?.kind === 'folder' ? state.selected : dirname(state.selected))
  },

  renameSelected: () => {
    const state = get()
    if (!state.selected) return
    const node = findNode(state.tree, state.selected)
    state.promptRename(state.selected, node?.name ?? state.selected)
  },

  deleteSelected: () => {
    const state = get()
    if (!state.selected) return
    const node = findNode(state.tree, state.selected)
    if (!node) return
    state.promptDelete(node.path, node.name, node.kind)
  },

  promptNewPage: (dirPath) => {
    const where = dirPath ? dirPath : 'the archive root'
    get().openDialog({
      kind: 'prompt',
      title: 'New page',
      label: `Create a Markdown page in ${where}.`,
      initial: 'Untitled.md',
      confirmLabel: 'Create page',
      onSubmit: async (value) => {
        await get().createEntry('file', dirPath, value)
      }
    })
  },

  promptNewFolder: (dirPath) => {
    const where = dirPath ? dirPath : 'the archive root'
    get().openDialog({
      kind: 'prompt',
      title: 'New folder',
      label: `Create a folder in ${where}.`,
      initial: 'New folder',
      confirmLabel: 'Create folder',
      onSubmit: async (value) => {
        await get().createEntry('folder', dirPath, value)
      }
    })
  },

  promptRename: (path, currentName) => {
    get().openDialog({
      kind: 'prompt',
      title: 'Rename',
      label: `Rename ${path}.`,
      initial: currentName,
      confirmLabel: 'Rename',
      onSubmit: async (value) => {
        await get().renamePath(path, value)
      }
    })
  },

  promptDelete: (path, name, kind) => {
    get().openDialog({
      kind: 'confirm',
      title: kind === 'folder' ? 'Delete folder' : 'Delete page',
      body: `Delete "${name}"? It will be moved to the system recycle bin.`,
      confirmLabel: 'Move to recycle bin',
      danger: true,
      onConfirm: async () => {
        await get().deletePath(path)
      }
    })
  },

  createEntry: async (kind, dirPath, name) => {
    const result =
      kind === 'file'
        ? await call(window.api.createFile(dirPath, name))
        : await call(window.api.createFolder(dirPath, name))
    get().log(`${kind === 'file' ? 'created' : 'created folder'} ${result.path}`, 'info')
    get().expandPath(dirPath)
    await get().refreshTree()
    if (kind === 'file') await get().selectPath(result.path)
    get().scheduleIndexRefresh()
  },

  renamePath: async (path, name) => {
    const result = await call(window.api.rename(path, name))
    set((state) => ({
      drafts: remapMap(state.drafts, path, result.path),
      saved: remapMap(state.saved, path, result.path),
      mtimes: remapMap(state.mtimes, path, result.path),
      expanded: remapMap(state.expanded, path, result.path),
      favorites: remapList(state.favorites, path, result.path),
      selected: state.selected ? remapKey(state.selected, path, result.path) : null
    }))
    get().log(`renamed ${path} → ${result.path}`, 'info')
    await get().refreshTree()
    get().scheduleIndexRefresh()
  },

  movePath: async (path, targetDir) => {
    const result = await call(window.api.move(path, targetDir))
    if (result.path === path) return
    set((state) => ({
      drafts: remapMap(state.drafts, path, result.path),
      saved: remapMap(state.saved, path, result.path),
      mtimes: remapMap(state.mtimes, path, result.path),
      expanded: remapMap(state.expanded, path, result.path),
      favorites: remapList(state.favorites, path, result.path),
      selected: state.selected ? remapKey(state.selected, path, result.path) : null
    }))
    get().log(`moved ${path} → ${result.path}`, 'info')
    await get().refreshTree()
    get().scheduleIndexRefresh()
  },

  deletePath: async (path) => {
    await call(window.api.remove(path))
    set((state) => {
      const under = (key: string): boolean => key === path || key.startsWith(`${path}/`)
      const filter = <T,>(map: Record<string, T>): Record<string, T> =>
        Object.fromEntries(Object.entries(map).filter(([key]) => !under(key)))
      return {
        drafts: filter(state.drafts),
        saved: filter(state.saved),
        mtimes: filter(state.mtimes),
        expanded: filter(state.expanded),
        favorites: state.favorites.filter((entry) => !under(entry)),
        selected: state.selected && under(state.selected) ? null : state.selected
      }
    })
    get().log(`moved ${path} to recycle bin`, 'info')
    await get().refreshTree()
    get().scheduleIndexRefresh()
  },

  createDashboard: async () => {
    const state = get()
    if (!state.rootPath) {
      state.pushToast('info', 'Mount an archive before creating a dashboard.')
      return
    }
    if (findFile(state.tree, '_dashboard.md')) {
      await state.selectPath('_dashboard.md')
      return
    }
    try {
      const result = await call(window.api.createFile('', '_dashboard.md'))
      await get().refreshTree()
      await get().selectPath(result.path)
      get().log('created colony dashboard', 'system')
    } catch (error) {
      get().pushToast('error', errorMessage(error))
    }
  },

  setActiveTag: (tag) => set({ activeTag: tag }),

  togglePanel: (id) =>
    set((state) => ({ panels: { ...state.panels, [id]: !state.panels[id] } })),

  openPanel: (id) => set((state) => ({ panels: { ...state.panels, [id]: true } })),

  closePanel: (id) => set((state) => ({ panels: { ...state.panels, [id]: false } })),

  setPaletteOpen: (open) => set({ paletteOpen: open }),

  toggleConsole: () => set((state) => ({ consoleOpen: !state.consoleOpen })),

  log: (message, kind = 'info') => {
    const entry: ConsoleEntry = { id: ++consoleSeq, kind, message, at: Date.now() }
    set((state) => ({ consoleEntries: [...state.consoleEntries.slice(-199), entry] }))
  },

  clearConsole: () => set({ consoleEntries: [] }),

  toggleFavorite: (path) => {
    const state = get()
    if (!state.rootPath) return
    const next = state.favorites.includes(path)
      ? state.favorites.filter((entry) => entry !== path)
      : [...state.favorites, path]
    const favorites = { ...(state.config?.favorites ?? {}), [state.rootPath]: next }
    set({
      favorites: next,
      config: state.config ? { ...state.config, favorites } : state.config
    })
    persist({ favorites })
    get().log(`${next.includes(path) ? 'pinned' : 'unpinned'} ${path}`, 'info')
  },

  isFavorite: (path) => get().favorites.includes(path),

  loadTemplates: async () => {
    if (!get().rootPath) {
      set({ templates: [] })
      return
    }
    try {
      const templates = await call(window.api.listTemplates())
      set({ templates })
    } catch {
      set({ templates: [] })
    }
  },

  saveTemplateFile: async (name, content) => {
    try {
      await call(window.api.saveTemplate(name, content))
      await get().loadTemplates()
      get().log(`template saved ${name}`, 'system')
    } catch (error) {
      get().pushToast('error', errorMessage(error))
    }
  },

  loadSnapshots: async (path) => {
    set({ snapshotsLoading: true })
    try {
      const snapshots = await call(window.api.listSnapshots(path))
      set({ snapshots, snapshotsLoading: false })
    } catch (error) {
      set({ snapshots: [], snapshotsLoading: false })
      get().pushToast('error', errorMessage(error))
    }
  },

  restoreSnapshot: async (path, id) => {
    try {
      await call(window.api.restoreSnapshot(path, id))
      const file = await call(window.api.readFile(path))
      set((state) => ({
        drafts: { ...state.drafts, [path]: file.content },
        saved: { ...state.saved, [path]: file.content },
        mtimes: { ...state.mtimes, [path]: file.mtimeMs }
      }))
      get().log(`restored snapshot ${id} → ${path}`, 'system')
      get().scheduleIndexRefresh()
    } catch (error) {
      get().pushToast('error', errorMessage(error))
    }
  }
}))

/** Reserves the dashboard filename so other modules can compare against it. */
export const DASHBOARD_PATH = '_dashboard.md'

export function isDashboard(path: string | null): boolean {
  return Boolean(path && basename(path).toLowerCase() === DASHBOARD_PATH)
}

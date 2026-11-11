export type ThemeSetting = 'dark' | 'light' | 'system'
export type ResolvedTheme = 'dark' | 'light'
export type NodeKind = 'file' | 'folder'
export type FocusedPane = 'tree' | 'editor' | 'preview' | null
export type AttachmentKind = 'image' | 'audio'
export type WorkspaceId = 'home' | 'archive' | 'search' | 'timeline' | 'graph' | 'diagnostics' | 'inbox' | 'manual' | 'settings'
export type DisplayMode = 'clean' | 'phosphor'
export type Classification = 'public' | 'internal' | 'classified'
export type ArchiveErrorCode =
  | 'E-000'
  | 'E-041'
  | 'E-102'
  | 'E-117'
  | 'E-118'
  | 'E-203'
  | 'E-204'
  | 'E-301'
  | 'E-404'

export interface TreeNode {
  /** Display name, e.g. "Getting started.md" */
  name: string
  /** Root-relative path using forward slashes. The root itself is "". */
  path: string
  kind: NodeKind
  children?: TreeNode[]
  sealed?: boolean
}

export interface ArchiveConfig {
  rootPath: string | null
  archives: string[]
  favorites: Record<string, string[]>
  theme: ThemeSetting
  previewVisible: boolean
  sidebarVisible: boolean
  splitRatio: number
  bootSequence: boolean
  linter: boolean
  autosave: boolean
  typewriterScroll: boolean
  display: DisplayMode
  keyclick: boolean
  sector: string
  sealPassphrase: string
  signOff: boolean
  operatorName: string
  featureUsage: Record<string, Record<string, number>>
  unlocks: Record<string, string[]>
  lastSeenVersion: string
}

export const DEFAULT_CONFIG: ArchiveConfig = {
  rootPath: null,
  archives: [],
  favorites: {},
  theme: 'system',
  previewVisible: true,
  sidebarVisible: true,
  splitRatio: 0.5,
  bootSequence: true,
  linter: true,
  autosave: true,
  typewriterScroll: true,
  display: 'clean',
  keyclick: false,
  sector: 'SECTOR 7',
  sealPassphrase: 'colony',
  signOff: false,
  operatorName: 'OVERSEER-7',
  featureUsage: {},
  unlocks: {},
  lastSeenVersion: ''
}

export interface RootState {
  rootPath: string | null
  tree: TreeNode | null
  archives: string[]
}

export interface SelectFolderResult {
  canceled: boolean
  state: RootState
}

export interface FileContent {
  path: string
  content: string
  mtimeMs: number
}

export interface SaveResult {
  mtimeMs: number
  snapshotId?: string
  revision: number
}

export interface EntryResult {
  path: string
}

export interface MaximizeState {
  maximized: boolean
}

export type FrontmatterValue = string | string[]
export type Frontmatter = Record<string, FrontmatterValue>

export interface IndexedDirective {
  kind: string
  value: string
}

export interface IndexedLink {
  target: string
  heading?: string
  label?: string
  resolved: string | null
}

export interface Relationship {
  kind: string
  target: string
  resolved: string | null
}

export interface DossierData {
  backstory: string | null
  traits: string[]
  skills: Array<{ name: string; value: number }>
  health: string[]
  mood: string | null
}

export interface ArtifactData {
  origin: string | null
  powers: string[]
  currentHolder: string | null
  icon: string | null
}

export interface JourneyStop {
  date: string | null
  waypoint: string
  resolved: string | null
  note: string | null
}

export interface IndexedPage {
  path: string
  title: string
  type: string | null
  classification: Classification
  status: string | null
  faction: string | null
  stance: 'allied' | 'neutral' | 'hostile' | null
  alignment: 'allied' | 'neutral' | 'hostile'
  source: string | null
  origin: 'recovered' | 'intercepted' | null
  signed: boolean
  eventType: string | null
  tags: string[]
  aliases: string[]
  date: string | null
  excerpt: string
  links: IndexedLink[]
  backlinks: string[]
  directives: IndexedDirective[]
  relationships: Relationship[]
  dossier: DossierData
  artifact: ArtifactData | null
  journey: JourneyStop[]
  isStub: boolean
  words: number
  size: number
  mtimeMs: number
  frontmatter: Frontmatter
}

export interface BrokenLink {
  from: string
  target: string
}

export interface TagCount {
  tag: string
  count: number
}

export interface ArchiveIndex {
  rootPath: string
  generatedAt: number
  pages: IndexedPage[]
  tags: TagCount[]
  brokenLinks: BrokenLink[]
  meta: ArchiveMeta | null
}

export interface ArchiveProfile {
  preset: string
  archive: string
  character: string
  group: string
  item: string
  location: string
  event: string
  journey: string
  keeper: string
  inbox: string
  log: string
}

export interface ArchiveMeta {
  path: string
  title: string
  settlement: string | null
  leader: string | null
  founded: string | null
  sector: string | null
  classification: Classification | null
  techLevel: 'neolithic' | 'industrial' | 'spacer' | 'ultratech'
  archivist: string | null
  currentDate: string | null
  colonyStatus: string | null
  population: number | null
  faction: string | null
  hostileFactions: string[]
  alliedFactions: string[]
  archiveId: string | null
  profile: ArchiveProfile
  term_archive: string | null
  term_character: string | null
  term_group: string | null
  term_item: string | null
  term_location: string | null
  term_event: string | null
  term_journey: string | null
  term_keeper: string | null
  term_inbox: string | null
  term_log: string | null
}

export interface IntegrityIssue {
  code: ArchiveErrorCode
  path: string
  message: string
  line?: number
}

export interface IntegrityReport {
  scanned: number
  durationMs: number
  issues: IntegrityIssue[]
  counts: Record<string, number>
}

export interface IntegrityProgress {
  phase: 'scan'
  current: number
  total: number
  line: string
  issue?: IntegrityIssue
  done?: boolean
}

export interface SnapshotInfo {
  id: string
  mtimeMs: number
  size: number
}

export interface SnapshotContent {
  id: string
  content: string
  mtimeMs: number
}

export interface TemplateFile {
  name: string
  content: string
}

export interface ExportResult {
  canceled: boolean
  path?: string
}

export type MenuAction =
  | 'open-folder'
  | 'new-page'
  | 'new-folder'
  | 'save'
  | 'toggle-preview'
  | 'toggle-sidebar'
  | 'toggle-theme'
  | 'insert-infobox'
  | 'insert-stub'
  | 'toggle-linter'
  | 'toggle-autosave'
  | 'toggle-typewriter'
  | 'command-palette'
  | 'focus-mode'
  | 'timeline'
  | 'graph'
  | 'backlinks'
  | 'diagnostics'
  | 'dashboard'
  | 'history'
  | 'templates'
  | 'export'
  | 'inbox'
  | 'about'
  | 'workspace-archive'
  | 'workspace-index'
  | 'workspace-diagnostics'
  | 'workspace-graph'
  | 'workspace-timeline'
  | 'workspace-manual'
  | 'unmount-archive'
  | 'set-sector'
  | 'run-integrity-scan'
  | 'toggle-display'
  | 'toggle-keyclick'
  | 'open-log'
  | 'operator-manual'
  | 'close-tab'
  | 'next-tab'
  | 'prev-tab'
  | 'set-era'
  | 'sync-date'
  | 'set-date'
  | 'open-inbox'
  | 'toggle-sign-off'
  | 'set-seal-passphrase'
export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: ArchiveErrorCode }

export interface ColonyApi {
  getConfig(): Promise<ApiResult<ArchiveConfig>>
  setConfig(patch: Partial<ArchiveConfig>): Promise<ApiResult<ArchiveConfig>>

  selectFolder(): Promise<ApiResult<SelectFolderResult>>
  currentRoot(): Promise<ApiResult<RootState>>
  listTree(): Promise<ApiResult<RootState>>
  switchArchive(rootPath: string): Promise<ApiResult<RootState>>
  unmountArchive(): Promise<ApiResult<RootState>>

  indexArchive(): Promise<ApiResult<ArchiveIndex>>

  startIntegrityScan(): Promise<ApiResult<IntegrityReport>>
  cancelIntegrityScan(): Promise<ApiResult<null>>

  readFile(path: string): Promise<ApiResult<FileContent>>
  writeFile(path: string, content: string): Promise<ApiResult<SaveResult>>

  createFile(dirPath: string, name: string): Promise<ApiResult<EntryResult>>
  createFolder(dirPath: string, name: string): Promise<ApiResult<EntryResult>>
  rename(path: string, newName: string): Promise<ApiResult<EntryResult>>
  move(path: string, targetDir: string): Promise<ApiResult<EntryResult>>
  remove(path: string): Promise<ApiResult<null>>
  reveal(path: string): Promise<ApiResult<null>>

  listSnapshots(path: string): Promise<ApiResult<SnapshotInfo[]>>
  readSnapshot(path: string, id: string): Promise<ApiResult<SnapshotContent>>
  restoreSnapshot(path: string, id: string): Promise<ApiResult<SaveResult>>

  listTemplates(): Promise<ApiResult<TemplateFile[]>>
  saveTemplate(name: string, content: string): Promise<ApiResult<TemplateFile>>

  exportHtml(suggestedName: string, html: string): Promise<ApiResult<ExportResult>>
  exportPdf(suggestedName: string, html: string): Promise<ApiResult<ExportResult>>

  openExternal(url: string): Promise<ApiResult<null>>
  attachmentSave(name: string, data: ArrayBuffer): Promise<ApiResult<AttachmentResult>>

  windowMinimize(): Promise<ApiResult<null>>
  windowToggleMaximize(): Promise<ApiResult<MaximizeState>>
  windowClose(): Promise<ApiResult<null>>
  windowForceClose(): Promise<ApiResult<null>>

  onTreeChanged(cb: () => void): () => void
  onRootChanged(cb: (state: RootState) => void): () => void
  onCloseRequested(cb: () => void): () => void
  onMenuAction(cb: (action: MenuAction) => void): () => void
  onWindowMaximized(cb: (maximized: boolean) => void): () => void
  onIntegrityProgress(cb: (progress: IntegrityProgress) => void): () => void

  platform: NodeJS.Platform
}

export interface SeeAlsoSuggestion {
  path: string
  title: string
  score: number
  reasons: string[]
}

export interface RunCommand {
  id: string
  label: string
  hint: string
  keywords?: string[]
  template?: string
  run?: 'timestamp' | 'file-to' | 'link' | 'see-also' | 'redacted' | 'table' | 'stamp'
}

export interface AttachmentResult {
  name: string
  url: string
  size: number
  kind: AttachmentKind
}

export const IPC = {
  configGet: 'config:get',
  configSet: 'config:set',
  archiveSelect: 'archive:select',
  archiveRoot: 'archive:root',
  archiveTree: 'archive:tree',
  archiveSwitch: 'archive:switch',
  archiveUnmount: 'archive:unmount',
  archiveIndex: 'archive:index',
  integrityScan: 'integrity:scan',
  integrityCancel: 'integrity:cancel',
  integrityProgress: 'integrity:progress',
  archiveTreeChanged: 'archive:tree-changed',
  archiveRootChanged: 'archive:root-changed',
  fileRead: 'file:read',
  fileWrite: 'file:write',
  entryCreateFile: 'entry:create-file',
  entryCreateFolder: 'entry:create-folder',
  entryRename: 'entry:rename',
  entryMove: 'entry:move',
  entryDelete: 'entry:delete',
  entryReveal: 'entry:reveal',
  historyList: 'history:list',
  historyRead: 'history:read',
  historyRestore: 'history:restore',
  templatesList: 'templates:list',
  templatesSave: 'templates:save',
  exportHtml: 'export:html',
  exportPdf: 'export:pdf',
  shellOpenExternal: 'shell:open-external',
  attachmentSave: 'attachment:save',
  windowMinimize: 'window:minimize',
  windowToggleMaximize: 'window:toggle-maximize',
  windowClose: 'window:close',
  windowForceClose: 'window:force-close',
  windowMaximized: 'window:maximized',
  appCloseRequested: 'app:close-requested',
  menuAction: 'menu:action'
} as const

import { BrowserWindow, dialog, ipcMain, shell } from 'electron'
import type { IpcMainInvokeEvent, OpenDialogOptions } from 'electron'
import { watch } from 'node:fs'
import type { FSWatcher } from 'node:fs'
import { loadConfig, saveConfig } from './config'
import * as fsService from './fsService'
import * as attachmentService from './attachmentService'
import { exportHtml, exportPdf } from './exportService'
import { ensureOnboarding } from './onboarding'
import { indexArchive, invalidateIndex } from './indexer'
import { PathValidationError, toAbsoluteReal } from './paths'
import {
  IPC,
  type ApiResult,
  type ArchiveConfig,
  type ArchiveErrorCode,

  type MenuAction,
  type RootState,
  type SelectFolderResult
} from '../shared/types'
import { runIntegrityScan } from './integrity'

let root: string | null = null
let watcher: FSWatcher | null = null
let watchTimer: NodeJS.Timeout | null = null
let allowClose = false
let integritySignal: { cancelled: boolean } | null = null

export function getRootPath(): string | null {
  return root
}

export function isCloseAllowed(): boolean {
  return allowClose
}

export function allowWindowClose(): void {
  allowClose = true
}

export function resetCloseGuard(): void {
  allowClose = false
}

function broadcast(channel: string, payload?: unknown): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) window.webContents.send(channel, payload)
  }
}

export function sendMenuAction(action: MenuAction): void {
  broadcast(IPC.menuAction, action)
}

function focusedWindow(): BrowserWindow | null {
  return BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? null
}

function requireRoot(): string {
  if (!root) throw new PathValidationError('No colony archive is mounted.')
  return root
}

function mountArchives(archives: string[], mounted: string): string[] {
  const next = archives.filter((entry) => entry !== mounted)
  return [mounted, ...next]
}

async function rootState(): Promise<RootState> {
  const config = await loadConfig()
  if (!root) return { rootPath: null, tree: null, archives: config.archives }
  return {
    rootPath: root,
    tree: await fsService.buildTree(root),
    archives: config.archives
  }
}

function stopWatching(): void {
  if (watchTimer) {
    clearTimeout(watchTimer)
    watchTimer = null
  }
  if (watcher) {
    watcher.close()
    watcher = null
  }
}

function startWatching(): void {
  stopWatching()
  if (!root) return
  try {
    watcher = watch(root, { recursive: true }, () => {
      invalidateIndex()
      if (watchTimer) clearTimeout(watchTimer)
      watchTimer = setTimeout(() => {
        watchTimer = null
        broadcast(IPC.archiveTreeChanged)
      }, 220)
    })
    watcher.on('error', () => stopWatching())
  } catch {
    watcher = null
  }
}

async function mountFolder(directory: string): Promise<RootState> {
  const opened = await fsService.openArchive(directory)
  await ensureOnboarding(opened.root)
  const tree = await fsService.buildTree(opened.root)
  root = opened.root
  invalidateIndex()
  startWatching()
  const config = await loadConfig()
  await saveConfig({
    rootPath: opened.root,
    archives: mountArchives(config.archives, opened.root)
  })
  const state: RootState = {
    rootPath: opened.root,
    tree,
    archives: mountArchives(config.archives, opened.root)
  }
  broadcast(IPC.archiveRootChanged, state)
  return state
}

export async function unmountArchive(): Promise<RootState> {
  stopWatching()
  root = null
  invalidateIndex()
  const config = await loadConfig()
  await saveConfig({ rootPath: null })
  const state: RootState = { rootPath: null, tree: null, archives: config.archives }
  broadcast(IPC.archiveRootChanged, state)
  return state
}

export async function restoreArchive(): Promise<void> {
  const config = await loadConfig()
  if (!config.rootPath) return
  try {
    const opened = await fsService.openArchive(config.rootPath)
    await ensureOnboarding(opened.root)
    await fsService.buildTree(opened.root)
    root = opened.root
    startWatching()
    if (opened.root !== config.rootPath) {
      await saveConfig({
        rootPath: opened.root,
        archives: mountArchives(config.archives, opened.root)
      })
    }
  } catch {
    root = null
    await saveConfig({ rootPath: null })
  }
}

const folderDialogOptions: OpenDialogOptions = {
  title: 'Mount colony data folder',
  buttonLabel: 'Mount archive',
  properties: ['openDirectory', 'createDirectory']
}

export async function promptForFolder(): Promise<SelectFolderResult> {
  const window = focusedWindow()
  const result = window
    ? await dialog.showOpenDialog(window, folderDialogOptions)
    : await dialog.showOpenDialog(folderDialogOptions)

  if (result.canceled || !result.filePaths[0]) {
    return { canceled: true, state: await rootState() }
  }

  const state = await mountFolder(result.filePaths[0])
  return { canceled: false, state }
}

function assertTrustedSender(event: IpcMainInvokeEvent): void {
  const frame = event.senderFrame
  if (!frame || frame.parent) {
    throw new Error('Rejected an IPC call from an untrusted frame.')
  }

  const frameUrl = frame.url ?? ''
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) {
    let trusted = false
    try {
      trusted = new URL(frameUrl).origin === new URL(devUrl).origin
    } catch {
      trusted = false
    }
    if (!trusted) throw new Error('Rejected an IPC call from an untrusted frame.')
  } else if (!frameUrl.startsWith('file://')) {
    throw new Error('Rejected an IPC call from an untrusted frame.')
  }
}

function toMessage(err: unknown): string {
  if (err instanceof PathValidationError) return err.message

  const code = (err as NodeJS.ErrnoException).code
  switch (code) {
    case 'ENOENT':
      return 'That record no longer exists on disk.'
    case 'EACCES':
    case 'EPERM':
      return 'The operating system denied access to that record.'
    case 'ENOSPC':
      return 'The disk is full.'
    case 'EBUSY':
      return 'That file is in use by another program.'
    case 'EEXIST':
      return 'That entry already exists.'
    case 'EISDIR':
      return 'That path is a folder.'
    case 'ENOTDIR':
      return 'Part of that path is not a folder.'
    default:
      break
  }

  if (err instanceof Error && err.message) return err.message
  return 'An unexpected archive error occurred.'
}

function errorCodeFor(err: unknown, fallback?: ArchiveErrorCode): ArchiveErrorCode | undefined {
  if (err instanceof PathValidationError) return 'E-102'
  const code = (err as NodeJS.ErrnoException).code
  if (code === 'ENOENT') return 'E-404'
  if (code === 'EACCES' || code === 'EPERM') return 'E-041'
  return fallback
}

function handle<T>(
  channel: string,
  fn: (event: IpcMainInvokeEvent, ...args: unknown[]) => Promise<T> | T,
  errorCode?: ArchiveErrorCode
): void {
  ipcMain.handle(channel, async (event, ...args): Promise<ApiResult<T>> => {
    try {
      assertTrustedSender(event)
      return { ok: true, data: await fn(event, ...args) }
    } catch (err) {
      return { ok: false, error: toMessage(err), code: errorCodeFor(err, errorCode) }
    }
  })
}

function assertWebUrl(raw: unknown): string {
  if (typeof raw !== 'string') throw new Error('Invalid link.')
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Error('Invalid link.')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http and https links can be opened.')
  }
  return url.toString()
}

async function remount(directory: unknown): Promise<RootState> {
  if (typeof directory !== 'string' || !directory.trim()) {
    throw new PathValidationError('No archive was specified.')
  }
  return mountFolder(directory)
}

export function registerIpc(): void {
  handle(IPC.configGet, () => loadConfig())
  handle(IPC.configSet, (_event, patch) =>
    saveConfig(patch as Partial<ArchiveConfig>)
  )

  handle(IPC.archiveSelect, () => promptForFolder())
  handle(IPC.archiveRoot, () => rootState())
  handle(IPC.archiveTree, () => rootState())
  handle(IPC.archiveSwitch, (_event, directory) => remount(directory))
  handle(IPC.archiveUnmount, () => unmountArchive())
  handle(IPC.archiveIndex, () => indexArchive(requireRoot()))

  handle(IPC.fileRead, (_event, relPath) => fsService.readPage(requireRoot(), relPath))
  handle(
    IPC.fileWrite,
    async (_event, relPath, content) => {
      const result = await fsService.writePage(requireRoot(), relPath, content)
      invalidateIndex()
      return result
    },
    'E-301'
  )

  handle(IPC.entryCreateFile, async (_event, dirPath, name) => {
    const result = await fsService.createPage(requireRoot(), dirPath, name)
    invalidateIndex()
    return result
  })
  handle(IPC.entryCreateFolder, async (_event, dirPath, name) => {
    const result = await fsService.createFolder(requireRoot(), dirPath, name)
    invalidateIndex()
    return result
  })
  handle(IPC.entryRename, async (_event, relPath, newName) => {
    const result = await fsService.renameEntry(requireRoot(), relPath, newName)
    invalidateIndex()
    return result
  })
  handle(IPC.entryMove, async (_event, relPath, targetDir) => {
    const result = await fsService.moveEntry(requireRoot(), relPath, targetDir)
    invalidateIndex()
    return result
  })
  handle(IPC.entryDelete, async (_event, relPath) => {
    const absolute = await fsService.resolveForDelete(requireRoot(), relPath)
    await shell.trashItem(absolute)
    invalidateIndex()
    return null
  })
  handle(IPC.entryReveal, async (_event, relPath) => {
    const absolute = await toAbsoluteReal(requireRoot(), relPath)
    shell.showItemInFolder(absolute)
    return null
  })

  handle(IPC.historyList, (_event, relPath) =>
    fsService.listSnapshots(requireRoot(), relPath)
  )
  handle(IPC.historyRead, (_event, relPath, id) =>
    fsService.readSnapshot(requireRoot(), relPath, id)
  )
  handle(IPC.historyRestore, async (_event, relPath, id) => {
    const result = await fsService.restoreSnapshot(requireRoot(), relPath, id)
    invalidateIndex()
    return result
  })

  handle(IPC.templatesList, () => fsService.listTemplates(requireRoot()))
  handle(IPC.templatesSave, (_event, name, content) =>
    fsService.saveTemplate(requireRoot(), name, content)
  )

  handle(IPC.integrityScan, async () => {
    const rootPath = requireRoot()
    integritySignal = { cancelled: false }
    const signal = integritySignal
    const report = await runIntegrityScan(rootPath, {
      signal,
      onProgress: (progress) => broadcast(IPC.integrityProgress, progress)
    })
    integritySignal = null
    return report
  }, 'E-041')

  handle(IPC.integrityCancel, () => {
    if (integritySignal) integritySignal.cancelled = true
    return null
  })

  handle(IPC.exportHtml, (_event, suggestedName, html) =>
    exportHtml(suggestedName, html)
  )
  handle(IPC.exportPdf, (_event, suggestedName, html) =>
    exportPdf(suggestedName, html)
  )

  handle(IPC.shellOpenExternal, async (_event, url) => {
    await shell.openExternal(assertWebUrl(url))
    return null
  })

  handle(IPC.attachmentSave, async (_event, name, data) => {
    const result = await attachmentService.saveAttachment(requireRoot(), name, data as ArrayBuffer)
    return {
      name: result.name,
      url: `colony-attachment://${encodeURIComponent(result.name)}`,
      size: result.size,
      kind: result.kind
    }
  })

  handle(IPC.windowMinimize, () => {
    focusedWindow()?.minimize()
    return null
  })
  handle(IPC.windowToggleMaximize, () => {
    const window = focusedWindow()
    if (!window) return { maximized: false }
    if (window.isMaximized()) window.unmaximize()
    else window.maximize()
    return { maximized: window.isMaximized() }
  })
  handle(IPC.windowClose, () => {
    focusedWindow()?.close()
    return null
  })
  handle(IPC.windowForceClose, () => {
    allowWindowClose()
    focusedWindow()?.close()
    return null
  })
}

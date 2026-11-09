import { contextBridge, ipcRenderer } from 'electron'
import {
  IPC,
  type ArchiveConfig,
  type ColonyApi,
  type IntegrityProgress,
  type MenuAction,
  type RootState
} from '../shared/types'

function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
  return ipcRenderer.invoke(channel, ...args) as Promise<T>
}

function subscribe<T>(channel: string, callback: (payload: T) => void): () => void {
  const listener = (_event: Electron.IpcRendererEvent, payload: T): void => callback(payload)
  ipcRenderer.on(channel, listener)
  return () => {
    ipcRenderer.removeListener(channel, listener)
  }
}

const api: ColonyApi = {
  getConfig: () => invoke(IPC.configGet),
  setConfig: (patch: Partial<ArchiveConfig>) => invoke(IPC.configSet, patch),

  selectFolder: () => invoke(IPC.archiveSelect),
  currentRoot: () => invoke(IPC.archiveRoot),
  listTree: () => invoke(IPC.archiveTree),
  switchArchive: (rootPath: string) => invoke(IPC.archiveSwitch, rootPath),
  unmountArchive: () => invoke(IPC.archiveUnmount),
  indexArchive: () => invoke(IPC.archiveIndex),

  readFile: (path: string) => invoke(IPC.fileRead, path),
  writeFile: (path: string, content: string) => invoke(IPC.fileWrite, path, content),

  createFile: (dirPath: string, name: string) => invoke(IPC.entryCreateFile, dirPath, name),
  createFolder: (dirPath: string, name: string) =>
    invoke(IPC.entryCreateFolder, dirPath, name),
  rename: (path: string, newName: string) => invoke(IPC.entryRename, path, newName),
  move: (path: string, targetDir: string) => invoke(IPC.entryMove, path, targetDir),
  remove: (path: string) => invoke(IPC.entryDelete, path),
  reveal: (path: string) => invoke(IPC.entryReveal, path),

  listSnapshots: (path: string) => invoke(IPC.historyList, path),
  readSnapshot: (path: string, id: string) => invoke(IPC.historyRead, path, id),
  restoreSnapshot: (path: string, id: string) => invoke(IPC.historyRestore, path, id),

  listTemplates: () => invoke(IPC.templatesList),
  saveTemplate: (name: string, content: string) =>
    invoke(IPC.templatesSave, name, content),

  exportHtml: (suggestedName: string, html: string) =>
    invoke(IPC.exportHtml, suggestedName, html),
  exportPdf: (suggestedName: string, html: string) =>
    invoke(IPC.exportPdf, suggestedName, html),

  openExternal: (url: string) => invoke(IPC.shellOpenExternal, url),
  attachmentSave: (name: string, data: ArrayBuffer) => invoke(IPC.attachmentSave, name, data),

  startIntegrityScan: () => invoke(IPC.integrityScan),
  cancelIntegrityScan: () => invoke(IPC.integrityCancel),

  windowMinimize: () => invoke(IPC.windowMinimize),
  windowToggleMaximize: () => invoke(IPC.windowToggleMaximize),
  windowClose: () => invoke(IPC.windowClose),
  windowForceClose: () => invoke(IPC.windowForceClose),

  onTreeChanged: (cb: () => void) => subscribe<void>(IPC.archiveTreeChanged, cb),
  onRootChanged: (cb: (state: RootState) => void) =>
    subscribe<RootState>(IPC.archiveRootChanged, cb),
  onCloseRequested: (cb: () => void) => subscribe<void>(IPC.appCloseRequested, cb),
  onMenuAction: (cb: (action: MenuAction) => void) =>
    subscribe<MenuAction>(IPC.menuAction, cb),
  onWindowMaximized: (cb: (maximized: boolean) => void) =>
    subscribe<boolean>(IPC.windowMaximized, cb),
  onIntegrityProgress: (cb: (progress: IntegrityProgress) => void) =>
    subscribe<IntegrityProgress>(IPC.integrityProgress, cb),

  platform: process.platform
}

contextBridge.exposeInMainWorld('api', api)

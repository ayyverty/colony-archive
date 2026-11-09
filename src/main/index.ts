import { app, BrowserWindow, Menu, net, protocol, session } from 'electron'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { attachmentPath } from './attachmentService'
import { loadConfig } from './config'
import {
  broadcastCurrentRoot,
  getRootPath,
  isCloseAllowed,
  promptForFolder,
  registerIpc,
  resetCloseGuard,
  restoreArchive
} from './ipc'
import { buildMenu } from './menu'
import { IPC } from '../shared/types'

const isDev = !app.isPackaged
let mainWindow: BrowserWindow | null = null

function createWindow(): BrowserWindow {
  resetCloseGuard()

  const window = new BrowserWindow({
    width: 1320,
    height: 840,
    minWidth: 880,
    minHeight: 540,
    show: false,
    frame: false,
    backgroundColor: '#070a0d',
    title: 'RimCodex',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      spellcheck: false
    }
  })

  mainWindow = window

  window.once('ready-to-show', () => {
    window.show()
  })

  window.on('close', (event) => {
    if (!isCloseAllowed()) {
      event.preventDefault()
      window.webContents.send(IPC.appCloseRequested)
    }
  })

  window.on('maximize', () => {
    if (!window.isDestroyed()) window.webContents.send(IPC.windowMaximized, true)
  })
  window.on('unmaximize', () => {
    if (!window.isDestroyed()) window.webContents.send(IPC.windowMaximized, false)
  })

  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-navigate', (event, url) => {
    if (url !== window.webContents.getURL()) event.preventDefault()
  })
  window.webContents.on('will-attach-webview', (event) => {
    event.preventDefault()
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    void window.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void window.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  window.on('closed', () => {
    if (mainWindow === window) mainWindow = null
  })

  return window
}

const hasLock = app.requestSingleInstanceLock()
if (!hasLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })

  app.whenReady().then(async () => {
    registerIpc()
    protocol.handle('colony-attachment', (request) => {
      const rootPath = getRootPath()
      if (!rootPath) return new Response('No archive mounted', { status: 404 })
      try {
        const url = new URL(request.url)
        const name = decodeURIComponent(url.hostname + url.pathname).replace(/^\/+/, '')
        const filePath = attachmentPath(rootPath, name)
        return net.fetch(pathToFileURL(filePath).toString())
      } catch {
        return new Response('Invalid attachment', { status: 400 })
      }
    })
    Menu.setApplicationMenu(buildMenu())

    session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => {
      callback(false)
    })
    session.defaultSession.setPermissionCheckHandler(() => false)

    createWindow()
    void restoreArchive()
      .then(() => broadcastCurrentRoot())
      .catch(() => undefined)

    const config = await loadConfig()
    if (!config.rootPath) {
      setTimeout(async () => {
        // Re-check in case the folder was mounted from the empty state before
        // the first-run prompt fired.
        const current = await loadConfig()
        if (!current.rootPath && BrowserWindow.getAllWindows().length > 0) {
          await promptForFolder()
        }
      }, 1400)
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}

import { app, Menu } from 'electron'
import type { MenuItemConstructorOptions } from 'electron'
import { sendMenuAction } from './ipc'

/**
 * The frameless window draws its own menu in the title bar; this application
 * menu exists for macOS conventions and keyboard-driven workflows.
 */
export function buildMenu(): Menu {
  const isMac = process.platform === 'darwin'
  const isDev = !app.isPackaged

  const template: MenuItemConstructorOptions[] = [
    ...(isMac ? [{ role: 'appMenu' as const }] : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Mount Archive…',
          accelerator: 'CmdOrCtrl+O',
          click: () => sendMenuAction('open-folder')
        },
        {
          label: 'Unmount Archive',
          click: () => sendMenuAction('unmount-archive')
        },
        { type: 'separator' },
        { label: 'New Page', accelerator: 'CmdOrCtrl+N', click: () => sendMenuAction('new-page') },
        {
          label: 'New Folder',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => sendMenuAction('new-folder')
        },
        { type: 'separator' },
        { label: 'Save', accelerator: 'CmdOrCtrl+S', click: () => sendMenuAction('save') },
        {
          label: 'Export…',
          accelerator: 'CmdOrCtrl+Shift+E',
          click: () => sendMenuAction('export')
        },
        ...(isMac ? [] : [{ type: 'separator' as const }, { role: 'quit' as const }])
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Command Palette…',
          accelerator: 'CmdOrCtrl+K',
          click: () => sendMenuAction('command-palette')
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'ARCHIVE.EXE', accelerator: 'F1', click: () => sendMenuAction('workspace-archive') },
        { label: 'INDEXER.SVC', accelerator: 'F2', click: () => sendMenuAction('workspace-index') },
        { label: 'DIAGNOSTICS.SYS', accelerator: 'F3', click: () => sendMenuAction('workspace-diagnostics') },
        { label: 'GRAPH.SVC', accelerator: 'F4', click: () => sendMenuAction('workspace-graph') },
        { label: 'MANUAL.SYS', accelerator: 'F5', click: () => sendMenuAction('operator-manual') },
        { type: 'separator' },
        { label: 'Toggle Preview', accelerator: 'CmdOrCtrl+P', click: () => sendMenuAction('toggle-preview') },
        { label: 'Toggle Sidebar', accelerator: 'CmdOrCtrl+B', click: () => sendMenuAction('toggle-sidebar') },
        {
          label: 'Focus Mode',
          accelerator: 'CmdOrCtrl+Shift+F',
          click: () => sendMenuAction('focus-mode')
        },
        {
          label: 'Typewriter Scrolling',
          click: () => sendMenuAction('toggle-typewriter')
        },
        {
          label: 'Autosave',
          click: () => sendMenuAction('toggle-autosave')
        },
        { type: 'separator' },
        { label: 'Toggle Theme', accelerator: 'CmdOrCtrl+Shift+T', click: () => sendMenuAction('toggle-theme') },
        { label: 'Toggle Display (CLEAN/PHOSPHOR)', click: () => sendMenuAction('toggle-display') },
        { label: 'Toggle Keystroke Click', click: () => sendMenuAction('toggle-keyclick') },
        { label: 'Toggle Style Linter', accelerator: 'CmdOrCtrl+Shift+L', click: () => sendMenuAction('toggle-linter') },
        { type: 'separator' },
        {
          label: 'Panels',
          submenu: [
            { label: 'Colony Dashboard', click: () => sendMenuAction('dashboard') },
            { label: 'Backlinks', click: () => sendMenuAction('backlinks') },
            { label: 'Timeline', click: () => sendMenuAction('timeline') },
            { label: 'Relationship Graph', click: () => sendMenuAction('graph') },
            { label: 'Diagnostics', click: () => sendMenuAction('diagnostics') },
            { label: 'Version History', click: () => sendMenuAction('history') },
            { label: 'Templates', click: () => sendMenuAction('templates') },
            { label: 'Export', click: () => sendMenuAction('export') },
            { label: 'Run Integrity Scan', click: () => sendMenuAction('run-integrity-scan') },
            { label: 'Operator Log', click: () => sendMenuAction('open-log') },
            { label: 'Operator Manual', click: () => sendMenuAction('operator-manual') }
          ]
        },
        { type: 'separator' },
        { label: 'Insert RimWorld Infobox', click: () => sendMenuAction('insert-infobox') },
        { label: 'Insert Stub Notice', click: () => sendMenuAction('insert-stub') },
        ...(isDev
          ? [
              { type: 'separator' as const },
              { role: 'reload' as const },
              { role: 'toggleDevTools' as const }
            ]
          : [])
      ]
    },
    {
      label: 'Help',
      submenu: [{ label: 'About RimCodex', click: () => sendMenuAction('about') }]
    }
  ]

  return Menu.buildFromTemplate(template)
}

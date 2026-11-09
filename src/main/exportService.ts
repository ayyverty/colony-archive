import { app, BrowserWindow, dialog } from 'electron'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { ExportResult } from '../shared/types'

const MAX_EXPORT_BYTES = 32 * 1024 * 1024

function cleanName(suggestedName: unknown, extension: string): string {
  const raw = typeof suggestedName === 'string' ? suggestedName.trim() : 'rimcodex'
  const base = path
    .basename(raw)
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/[. ]+$/g, '')
    .slice(0, 120)
  const safe = base || 'rimcodex'
  return new RegExp(`\\.${extension}$`, 'i').test(safe) ? safe : `${safe}.${extension}`
}

function validateHtml(html: unknown): string {
  if (typeof html !== 'string' || !html.trim()) {
    throw new Error('The export contains no content.')
  }
  if (Buffer.byteLength(html, 'utf8') > MAX_EXPORT_BYTES) {
    throw new Error('The export is too large (32 MB limit).')
  }
  return html
}

async function chooseTarget(
  suggestedName: unknown,
  extension: string,
  label: string
): Promise<string | null> {
  const window = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? null
  const options = {
    title: `Export ${label}`,
    defaultPath: path.join(app.getPath('documents'), cleanName(suggestedName, extension)),
    filters: [{ name: label, extensions: [extension] }]
  }
  const result = window
    ? await dialog.showSaveDialog(window, options)
    : await dialog.showSaveDialog(options)
  if (result.canceled || !result.filePath) return null
  return result.filePath
}

export async function exportHtml(
  suggestedName: unknown,
  html: unknown
): Promise<ExportResult> {
  const content = validateHtml(html)
  const target = await chooseTarget(suggestedName, 'html', 'HTML document')
  if (!target) return { canceled: true }
  await fs.writeFile(target, content, 'utf8')
  return { canceled: false, path: target }
}

export async function exportPdf(suggestedName: unknown, html: unknown): Promise<ExportResult> {
  const content = validateHtml(html)
  const target = await chooseTarget(suggestedName, 'pdf', 'PDF document')
  if (!target) return { canceled: true }

  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'colony-export-'))
  const temp = path.join(directory, 'export.html')
  const window = new BrowserWindow({
    width: 1024,
    height: 768,
    show: false,
    backgroundColor: '#ffffff',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      javascript: false,
      spellcheck: false
    }
  })

  try {
    await fs.writeFile(temp, content, 'utf8')
    await window.loadFile(temp)
    const pdf = await window.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      margins: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 }
    })
    await fs.writeFile(target, pdf)
  } finally {
    if (!window.isDestroyed()) window.destroy()
    await fs.rm(directory, { recursive: true, force: true }).catch(() => undefined)
  }

  return { canceled: false, path: target }
}

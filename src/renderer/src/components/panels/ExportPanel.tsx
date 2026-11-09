import { useState } from 'react'
import { useArchiveStore } from '../../state/store'
import { call, errorMessage } from '../../lib/api'
import { buildExportDocument, exportSlug } from '../../lib/export'
import type { ExportPage } from '../../lib/export'
import { basename, dirname } from '../../lib/paths'

type Scope = 'page' | 'tree'
type Format = 'html' | 'pdf'

export function ExportPanel() {
  const selected = useArchiveStore((state) => state.selected)
  const index = useArchiveStore((state) => state.index)
  const drafts = useArchiveStore((state) => state.drafts)
  const pushToast = useArchiveStore((state) => state.pushToast)
  const log = useArchiveStore((state) => state.log)

  const [scope, setScope] = useState<Scope>('page')
  const [format, setFormat] = useState<Format>('html')
  const [fileTitle, setFileTitle] = useState('')
  const [busy, setBusy] = useState(false)

  const title =
    scope === 'page' && selected
      ? index?.pages.find((page) => page.path === selected)?.title ??
        basename(selected).replace(/\.md$/i, '')
      : fileTitle || (scope === 'tree' ? 'Colony archive' : 'Colony record')

  const run = async (): Promise<void> => {
    if (busy) return
    if (scope === 'page' && !selected) {
      pushToast('info', 'Open a record before exporting a page.')
      return
    }
    if (!index) {
      pushToast('info', 'Wait for the archive index to finish.')
      return
    }

    setBusy(true)
    try {
      let pages: ExportPage[] = []

      if (scope === 'page' && selected) {
        const body =
          drafts[selected] ??
          (await call(window.api.readFile(selected))).content
        const page = index.pages.find((entry) => entry.path === selected)
        pages = [
          {
            path: selected,
            title: page?.title ?? basename(selected).replace(/\.md$/i, ''),
            body
          }
        ]
      } else {
        const targets = index.pages
        const loaded: ExportPage[] = []
        let cursor = 0

        const worker = async (): Promise<void> => {
          while (cursor < targets.length) {
            const page = targets[cursor]
            cursor += 1
            try {
              const body =
                drafts[page.path] ??
                (await call(window.api.readFile(page.path))).content
              loaded.push({ path: page.path, title: page.title, body })
            } catch {
              // A record removed mid-export is simply skipped.
            }
          }
        }

        await Promise.all(
          Array.from({ length: Math.min(6, targets.length) }, () => worker())
        )
        pages = loaded.sort((a, b) => a.path.localeCompare(b.path))
      }

      const html = buildExportDocument(title, pages, index, {
        archiveCode: index?.meta?.archiveId ?? undefined,
        exportedAt: index?.meta?.currentDate ?? undefined
      })
      const suggested = exportSlug(
        scope === 'tree'
          ? fileTitle || 'rimcodex'
          : `${dirname(selected ?? '').replace(/\//g, '-')}-${basename(selected ?? 'record')}`
      )

      const result =
        format === 'html'
          ? await call(window.api.exportHtml(suggested, html))
          : await call(window.api.exportPdf(suggested, html))

      if (result.canceled) {
        log('export cancelled', 'info')
      } else {
        pushToast('success', `Exported to ${result.path ?? 'disk'}`)
        log(`exported ${format.toUpperCase()} → ${result.path ?? 'disk'}`, 'save')
      }
    } catch (error) {
      pushToast('error', `Export failed: ${errorMessage(error)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="export">
      <div className="export__group">
        <span className="export__label">scope</span>
        <div className="seg">
          <button
            type="button"
            className={`seg__btn ${scope === 'page' ? 'seg__btn--active' : ''}`}
            onClick={() => setScope('page')}
          >
            current page
          </button>
          <button
            type="button"
            className={`seg__btn ${scope === 'tree' ? 'seg__btn--active' : ''}`}
            onClick={() => setScope('tree')}
          >
            whole archive
          </button>
        </div>
      </div>

      {scope === 'tree' ? (
        <label className="meta-field">
          <span className="meta-field__label">title</span>
          <input
            className="meta-field__input"
            value={fileTitle}
            onChange={(event) => setFileTitle(event.target.value)}
            placeholder="Colony archive"
          />
        </label>
      ) : null}

      <div className="export__group">
        <span className="export__label">format</span>
        <div className="seg">
          <button
            type="button"
            className={`seg__btn ${format === 'html' ? 'seg__btn--active' : ''}`}
            onClick={() => setFormat('html')}
          >
            html
          </button>
          <button
            type="button"
            className={`seg__btn ${format === 'pdf' ? 'seg__btn--active' : ''}`}
            onClick={() => setFormat('pdf')}
          >
            pdf
          </button>
        </div>
      </div>

      <div className="export__note">
        {scope === 'tree'
          ? 'A single styled HTML bundle with an index and every record.'
          : 'A styled standalone document for the open record.'}{' '}
        Local images are referenced, not embedded.
      </div>

      <button type="button" className="btn btn--accent export__run" disabled={busy} onClick={() => void run()}>
        {busy ? 'Rendering…' : `Export ${format.toUpperCase()}`}
      </button>
    </div>
  )
}

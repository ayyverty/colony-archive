import { useEffect, useRef, useState } from 'react'
import { useArchiveStore, isDirty } from '../state/store'
import { call, errorMessage } from '../lib/api'
import { lazy, Suspense } from 'react'
const Editor = lazy(() => import('./Editor').then((m) => ({ default: m.Editor })))
import { Dropdown } from './Dropdown'
import type { DropdownEntry } from './Dropdown'
import { FrontmatterEditor } from './FrontmatterEditor'
import { FormattingToolbar } from './FormattingToolbar'
import { TableHelper } from './TableHelper'
import { TabBar } from './TabBar'
import { PathPrompt } from './PathPrompt'
import { LogComposer } from './LogComposer'
import { StarterBanner } from './StarterBanner'
import { FrontmatterSuggest } from './FrontmatterSuggest'
import { TipTicker } from './TipTicker'
import { SeeAlsoPanel } from './SeeAlsoPanel'
import { RunPalette } from './RunPalette'
import { COLONY_LOG_TEMPLATE, INFOBOX_TEMPLATE, STUB_TEMPLATE } from '../lib/templates'
import { EyeIcon, EyeOffIcon, StarIcon, TemplateIcon } from './Icons'

function EmptyEditor() {
  const rootPath = useArchiveStore((state) => state.rootPath)
  const openFolder = useArchiveStore((state) => state.openFolder)
  const newPageFromSelection = useArchiveStore((state) => state.newPageFromSelection)

  return (
    <div className="empty">
      <TipTicker />
      <div className="empty__panel">
        <div className="empty__title">
          {rootPath ? 'No record selected' : 'No archive mounted'}
        </div>
        <div className="empty__body">
          {rootPath ? (
            <>
              Select a page from the archive tree, or create a new record with{' '}
              <code>Ctrl N</code>. Records are plain Markdown files inside{' '}
              <code>{rootPath.split(/[\\/]/).pop()}</code>.
            </>
          ) : (
            <>
              Mount a folder to index its Markdown records. Everything stays local:
              the archive is read and written directly on disk, confined to the
              folder you choose.
            </>
          )}
        </div>
        <div className="empty__actions">
          {rootPath ? (
            <>
              <button type="button" className="btn btn--accent" onClick={newPageFromSelection}>
                New page
              </button>
            </>
          ) : (
            <button type="button" className="btn btn--accent" onClick={() => void openFolder()}>
              Mount folder
            </button>
          )}
        </div>
        <div className="empty__meta">
          <span>Ctrl K — command palette</span>
          <span>Ctrl S — save</span>
          <span>Ctrl P — preview</span>
          <span>Ctrl ⇧ F — focus</span>
        </div>
      </div>
    </div>
  )
}

export function EditorPane() {
  const selected = useArchiveStore((state) => state.selected)
  const draft = useArchiveStore((state) => (state.selected ? state.drafts[state.selected] : undefined))
  const dirty = useArchiveStore((state) => isDirty(state, state.selected))
  const linter = useArchiveStore((state) => state.linter)
  const autosave = useArchiveStore((state) => state.autosave)
  const typewriterScroll = useArchiveStore((state) => state.typewriterScroll)
  const focusMode = useArchiveStore((state) => state.focusMode)
  const keyclick = useArchiveStore((state) => state.keyclick)
  const previewVisible = useArchiveStore((state) => state.previewVisible)
  const insertRequest = useArchiveStore((state) => state.insertRequest)
  const editorAction = useArchiveStore((state) => state.editorAction)
  const templates = useArchiveStore((state) => state.templates)
  const favorites = useArchiveStore((state) => state.favorites)
  const updateDraft = useArchiveStore((state) => state.updateDraft)
  const saveSelected = useArchiveStore((state) => state.saveSelected)
  const requestInsert = useArchiveStore((state) => state.requestInsert)
  const togglePreview = useArchiveStore((state) => state.togglePreview)
  const toggleFavorite = useArchiveStore((state) => state.toggleFavorite)
  const setCursor = useArchiveStore((state) => state.setCursor)
  const setTableInfo = useArchiveStore((state) => state.setTableInfo)
  const setFocusedPane = useArchiveStore((state) => state.setFocusedPane)
  const pushToast = useArchiveStore((state) => state.pushToast)
  const focusedPane = useArchiveStore((state) => state.focusedPane)
  const [runPalette, setRunPalette] = useState<{ slashPos: number; left: number; top: number } | null>(null)
  const seeAlsoOpen = useArchiveStore((state) => state.seeAlsoOpen)
  const setSeeAlsoOpen = useArchiveStore((state) => state.setSeeAlsoOpen)
  const executeRef = useRef<((commandId: string, slashPos: number) => void) | null>(null)
  const paneRef = useRef<HTMLElement>(null)

  useEffect(() => {
    setTableInfo(null)
  }, [selected, setTableInfo])

  const segments = selected ? selected.split('/') : []
  const content = draft ?? ''
  const pinned = selected ? favorites.includes(selected) : false

  const handleDrop = async (event: React.DragEvent<HTMLElement>): Promise<void> => {
    if (!event.dataTransfer.files || event.dataTransfer.files.length === 0) return
    event.preventDefault()
    for (const file of Array.from(event.dataTransfer.files)) {
      try {
        const buffer = await file.arrayBuffer()
        const result = await call(window.api.attachmentSave(file.name, buffer))
        if (selected) requestInsert(`![[${result.name}]]`)
        pushToast('success', `Attached ${result.name}`)
      } catch (error) {
        pushToast('error', errorMessage(error))
      }
    }
  }

  const templateItems: DropdownEntry[] = [
    { section: 'RimWorld' },
    {
      id: 'infobox',
      label: 'Colony infobox',
      onSelect: () => requestInsert(INFOBOX_TEMPLATE)
    },
    {
      id: 'stub',
      label: 'Stub notice',
      onSelect: () => requestInsert(STUB_TEMPLATE)
    },
    {
      id: 'log',
      label: 'Colony log table',
      onSelect: () => requestInsert(COLONY_LOG_TEMPLATE)
    }
  ]

  if (templates.length > 0) {
    templateItems.push({ section: 'Archive' })
    for (const template of templates) {
      templateItems.push({
        id: `template:${template.name}`,
        label: template.name.replace(/\.md$/i, ''),
        onSelect: () => requestInsert(template.content)
      })
    }
  }

  return (
    <section
      className={`editor-pane ${focusMode ? 'editor-pane--focus' : ''} ${focusedPane === 'editor' ? 'pane--focused' : ''}`}
      ref={paneRef as never}
      onFocusCapture={() => setFocusedPane('editor')}
      onPointerDown={() => setFocusedPane('editor')}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes('Files')) {
          event.preventDefault()
        }
      }}
      onDrop={(event) => void handleDrop(event)}
    >
      <div className="pane-header editor-pane__header">
        <div className="breadcrumb" title={selected ?? ''}>
          {segments.length === 0 ? (
            <span className="breadcrumb__current">No record</span>
          ) : (
            segments.map((segment, index) => (
              <span key={`${segment}-${index}`}>
                {index > 0 ? <span className="breadcrumb__sep">/</span> : null}
                <span
                  className={
                    index === segments.length - 1 ? 'breadcrumb__current' : undefined
                  }
                >
                  {segment}
                </span>
              </span>
            ))
          )}
        </div>

        <div className="editor-tools">
          <button
            type="button"
            className={`icon-btn ${pinned ? 'icon-btn--active' : ''}`}
            title={pinned ? 'Unpin record' : 'Pin record'}
            disabled={!selected}
            onClick={() => selected && toggleFavorite(selected)}
          >
            <StarIcon />
          </button>
          <Dropdown
            label={
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <TemplateIcon />
                Template
              </span>
            }
            align="right"
            title="Insert a template"
            items={templateItems}
          />
          <button
            type="button"
            className="btn btn--ghost"
            disabled={!selected || !dirty}
            title="Save record (Ctrl+S)"
            onClick={() => void saveSelected()}
          >
            {autosave && dirty ? 'Save' : 'Save'}
          </button>
          <button
            type="button"
            className="icon-btn"
            title="Toggle see also"
            onClick={() => setSeeAlsoOpen(!seeAlsoOpen)}
          >
            {seeAlsoOpen ? '◂' : '▸'}
          </button>
          <button
            type="button"
            className="icon-btn"
            title={previewVisible ? 'Hide preview (Ctrl+P)' : 'Show preview (Ctrl+P)'}
            onClick={togglePreview}
          >
            {previewVisible ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
      </div>

      {selected ? (
        <div className="editor-pane__body">
          <div className="editor-pane__main">
            <TabBar />
            <div className="editor-pane__path">
              <PathPrompt />
            </div>
            <FormattingToolbar />
            <FrontmatterEditor key={selected} path={selected} />
            {selected === '_log.md' ? <LogComposer path={selected} /> : null}
            <StarterBanner path={selected} />
            <FrontmatterSuggest path={selected} />
            <TableHelper />
            <Suspense fallback={<div className="editor-host" />}>
              <Editor
                key={selected}
                path={selected}
                value={content}
                linterEnabled={linter}
                typewriter={typewriterScroll}
                focusMode={focusMode}
                keyclick={keyclick}
                readOnly={selected === '_log.md'}
                onChange={(next) => updateDraft(selected, next)}
                onCursor={setCursor}
                onTableInfo={setTableInfo}
                onRunCommand={(slashPos, coords) => setRunPalette({ slashPos, left: coords.left, top: coords.top + 18 })}
                executeRef={executeRef}
                insertRequest={insertRequest}
                action={editorAction}
              />
            </Suspense>
          </div>
          {seeAlsoOpen ? <SeeAlsoPanel /> : null}
          <RunPalette
            open={Boolean(runPalette)}
            position={runPalette ? { left: runPalette.left, top: runPalette.top } : null}
            slashPos={runPalette?.slashPos ?? null}
            onClose={() => setRunPalette(null)}
            onRun={(commandId, slashPos) => {
              void executeRef.current?.(commandId, slashPos)
              setRunPalette(null)
            }}
          />
        </div>
      ) : (
        <EmptyEditor />
      )}
    </section>
  )
}

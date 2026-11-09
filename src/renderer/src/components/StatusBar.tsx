import { useMemo } from 'react'
import { useArchiveStore, isDirty } from '../state/store'
import { findTitleCaseHeadings } from '../lib/lint'
import { basename } from '../lib/paths'
import { WarningIcon } from './Icons'

interface StatusBarProps {
  resolvedTheme: 'dark' | 'light'
}

export function StatusBar({ resolvedTheme }: StatusBarProps) {
  const selected = useArchiveStore((state) => state.selected)
  const draft = useArchiveStore((state) => (state.selected ? state.drafts[state.selected] : undefined))
  const dirty = useArchiveStore((state) => isDirty(state, state.selected))
  const linter = useArchiveStore((state) => state.linter)
  const theme = useArchiveStore((state) => state.theme)
  const rootPath = useArchiveStore((state) => state.rootPath)
  const cursorLine = useArchiveStore((state) => state.cursorLine)
  const cursorCol = useArchiveStore((state) => state.cursorCol)
  const saveStatus = useArchiveStore((state) => state.saveStatus)
  const autosave = useArchiveStore((state) => state.autosave)
  const typewriterScroll = useArchiveStore((state) => state.typewriterScroll)
  const focusMode = useArchiveStore((state) => state.focusMode)
  const index = useArchiveStore((state) => state.index)
  const indexLoading = useArchiveStore((state) => state.indexLoading)
  const revisions = useArchiveStore((state) => state.revisions)
  const lastRevision = useArchiveStore((state) => state.lastRevision)
  const display = useArchiveStore((state) => state.display)
  const keyclick = useArchiveStore((state) => state.keyclick)
  const workspace = useArchiveStore((state) => state.workspace)
  const toggleDisplay = useArchiveStore((state) => state.toggleDisplay)
  const toggleKeyclick = useArchiveStore((state) => state.toggleKeyclick)
  const toggleTheme = useArchiveStore((state) => state.toggleTheme)
  const toggleLinter = useArchiveStore((state) => state.toggleLinter)
  const toggleAutosave = useArchiveStore((state) => state.toggleAutosave)
  const toggleTypewriter = useArchiveStore((state) => state.toggleTypewriter)
  const toggleFocusMode = useArchiveStore((state) => state.toggleFocusMode)

  const content = draft ?? ''
  const warnings = useMemo(
    () => (linter && selected ? findTitleCaseHeadings(content) : []),
    [linter, selected, content]
  )
  const words = useMemo(() => {
    const trimmed = content.trim()
    return trimmed ? trimmed.split(/\s+/).length : 0
  }, [content])

  const status = !selected
    ? 'IDLE'
    : saveStatus === 'saving'
      ? 'SAVING'
      : saveStatus === 'autosaved'
        ? 'AUTOSAVED'
        : dirty
          ? autosave
            ? 'AUTOSAVING'
            : 'MODIFIED'
          : saveStatus === 'error'
            ? 'SAVE ERROR'
            : 'SAVED'
  const revisionText = selected
    ? lastRevision && lastRevision.path === selected
      ? `REV ${lastRevision.from} → ${lastRevision.to}`
      : `REV ${revisions[selected] ?? 1}`
    : 'REV —'

  const statusClass = !selected
    ? ''
    : saveStatus === 'error'
      ? 'status--error'
      : dirty || saveStatus === 'saving'
        ? 'status--dirty'
        : 'status--saved'

  return (
    <footer className="statusbar scanlines">
      <div className={`statusbar__group ${statusClass}`}>
        <span className="statusbar__dot" />
        <span>{status}</span>
      </div>

      <div className="statusbar__group">
        <span>{workspace.toUpperCase()}</span>
      </div>

      <div className="statusbar__group">
        <span className="statusbar__path" title={selected ?? ''}>
          {selected ?? 'no record'}
        </span>
      </div>

      <div className="statusbar__spacer" />

      <button
        type="button"
        className={`statusbar__button statusbar__button--toggle ${autosave ? 'is-active' : ''}`}
        title="Toggle autosave"
        onClick={toggleAutosave}
      >
        auto {autosave ? 'on' : 'off'}
      </button>

      <button
        type="button"
        className={`statusbar__button statusbar__button--toggle ${typewriterScroll ? 'is-active' : ''}`}
        title="Toggle typewriter scrolling"
        onClick={toggleTypewriter}
      >
        type {typewriterScroll ? 'on' : 'off'}
      </button>

      <button
        type="button"
        className={`statusbar__button statusbar__button--toggle ${focusMode ? 'is-active' : ''}`}
        title="Toggle focus mode (Ctrl+Shift+F)"
        onClick={toggleFocusMode}
      >
        focus
      </button>

      <div className="statusbar__group">
        <span>{revisionText}</span>
      </div>

      <button
        type="button"
        className={`statusbar__button statusbar__button--toggle ${display === 'phosphor' ? 'is-active' : ''}`}
        title="Toggle display mode"
        onClick={toggleDisplay}
      >
        {display === 'clean' ? 'clean' : 'phosphor'}
      </button>

      <button
        type="button"
        className={`statusbar__button statusbar__button--toggle ${keyclick ? 'is-active' : ''}`}
        title="Toggle keystroke click"
        onClick={toggleKeyclick}
      >
        click {keyclick ? 'on' : 'off'}
      </button>

      {linter ? (
        <button
          type="button"
          className="statusbar__button"
          title={
            warnings.length
              ? `${warnings.length} heading${warnings.length === 1 ? '' : 's'} flagged — click to disable the style linter`
              : 'Style linter active — click to disable'
          }
          onClick={toggleLinter}
        >
          <WarningIcon />
          {warnings.length ? `${warnings.length} style` : 'lint on'}
        </button>
      ) : null}

      <div className="statusbar__group">
        <span>
          {indexLoading ? 'index…' : index ? `${index.pages.length} idx` : 'no idx'}
        </span>
      </div>

      <div className="statusbar__group">
        <span>
          Ln {cursorLine}:{String(cursorCol).padStart(2, '0')}
        </span>
      </div>

      <div className="statusbar__group">
        <span>{words.toLocaleString('en-US')} w</span>
      </div>

      <button
        type="button"
        className="statusbar__theme"
        title={`Theme: ${theme} — Ctrl+Shift+T`}
        onClick={toggleTheme}
      >
        theme: {resolvedTheme}
      </button>

      <div className="statusbar__group">
        <span>{rootPath ? basename(rootPath) : 'no root'}</span>
      </div>
    </footer>
  )
}

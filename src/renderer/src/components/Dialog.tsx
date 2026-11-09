import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useArchiveStore } from '../state/store'
import type { AboutDialog, ConfirmDialog, PromptDialog } from '../state/store'
import { errorMessage } from '../lib/api'
import { basename } from '../lib/paths'

function useEscape(close: () => void): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [close])
}

function PromptForm({ dialog }: { dialog: PromptDialog }) {
  const closeDialog = useArchiveStore((state) => state.closeDialog)
  const [value, setValue] = useState(dialog.initial)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEscape(closeDialog)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const submit = async (event?: FormEvent): Promise<void> => {
    event?.preventDefault()
    const trimmed = value.trim()
    if (!trimmed || busy) return
    setBusy(true)
    setError(null)
    try {
      await dialog.onSubmit(trimmed)
      closeDialog()
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <form className="dialog" onSubmit={(event) => void submit(event)}>
      <div className="dialog__head">
        <h2 className="dialog__title">{dialog.title}</h2>
      </div>
      <div className="dialog__body">
        <div>{dialog.label}</div>
        <input
          ref={inputRef}
          className="dialog__input"
          value={value}
          spellCheck={false}
          autoComplete="off"
          onChange={(event) => setValue(event.target.value)}
        />
        {error ? <div className="dialog__error">! {error}</div> : null}
      </div>
      <div className="dialog__actions">
        <button type="button" className="btn btn--ghost" onClick={closeDialog}>
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn--accent"
          disabled={busy || value.trim().length === 0}
        >
          {busy ? 'Working…' : dialog.confirmLabel}
        </button>
      </div>
      <div className="dialog__meta">Enter to confirm · Esc to cancel</div>
    </form>
  )
}

function ConfirmForm({ dialog }: { dialog: ConfirmDialog }) {
  const closeDialog = useArchiveStore((state) => state.closeDialog)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEscape(closeDialog)

  useEffect(() => {
    confirmRef.current?.focus()
  }, [])

  const confirm = async (): Promise<void> => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await dialog.onConfirm()
      closeDialog()
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <div className="dialog" role="dialog" aria-modal="true">
      <div className="dialog__head">
        <h2 className="dialog__title">{dialog.title}</h2>
      </div>
      <div className={`dialog__body ${dialog.danger ? 'dialog__body--danger' : ''}`}>
        <div>{dialog.body}</div>
        {error ? <div className="dialog__error">! {error}</div> : null}
      </div>
      <div className="dialog__actions">
        <button type="button" className="btn btn--ghost" onClick={closeDialog}>
          Cancel
        </button>
        <button
          ref={confirmRef}
          type="button"
          className={`btn ${dialog.danger ? 'btn--danger' : 'btn--accent'}`}
          disabled={busy}
          onClick={() => void confirm()}
        >
          {busy ? 'Working…' : dialog.confirmLabel}
        </button>
      </div>
    </div>
  )
}

function AboutPanel({ dialog }: { dialog: AboutDialog }) {
  const closeDialog = useArchiveStore((state) => state.closeDialog)
  const rootPath = useArchiveStore((state) => state.rootPath)
  useEscape(closeDialog)

  return (
    <div className="dialog" role="dialog" aria-modal="true">
      <div className="dialog__head">
        <h2 className="dialog__title">Colony archive</h2>
      </div>
      <div className="dialog__body">
        <div>A local-first Markdown terminal for colony records.</div>
        <dl className="about-grid">
          <dt>Version</dt>
          <dd>1.0.0</dd>
          <dt>Stack</dt>
          <dd>Electron · React · CodeMirror 6</dd>
          <dt>Archive</dt>
          <dd>{rootPath ? basename(rootPath) : 'not mounted'}</dd>
          <dt>Security</dt>
          <dd>contextIsolation · sandbox · path-confined fs</dd>
          <dt>Save</dt>
          <dd>Ctrl S · atomic temp + rename</dd>
          <dt>Preview</dt>
          <dd>Ctrl P · DOMPurify sanitized</dd>
          <dt>Theme</dt>
          <dd>Ctrl ⇧ T · persisted</dd>
        </dl>
        <div style={{ marginTop: 12, color: 'var(--text-faint)', fontSize: 10 }}>
          {dialog.kind === 'about' ? 'All records stay on this machine.' : null}
        </div>
      </div>
      <div className="dialog__actions">
        <button type="button" className="btn btn--accent" onClick={closeDialog}>
          Close
        </button>
      </div>
    </div>
  )
}

export function DialogHost() {
  const dialog = useArchiveStore((state) => state.dialog)
  const closeDialog = useArchiveStore((state) => state.closeDialog)

  if (!dialog) return null

  const key =
    dialog.kind === 'prompt'
      ? `prompt:${dialog.title}:${dialog.initial}:${dialog.label}`
      : dialog.kind === 'confirm'
        ? `confirm:${dialog.title}:${dialog.body}`
        : 'about'

  return (
    <div
      className="overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeDialog()
      }}
    >
      {dialog.kind === 'prompt' ? (
        <PromptForm key={key} dialog={dialog} />
      ) : dialog.kind === 'confirm' ? (
        <ConfirmForm key={key} dialog={dialog} />
      ) : (
        <AboutPanel key={key} dialog={dialog} />
      )}
    </div>
  )
}

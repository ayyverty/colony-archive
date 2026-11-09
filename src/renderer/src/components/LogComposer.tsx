import { useState } from 'react'
import { useArchiveStore } from '../state/store'

export function LogComposer({ path }: { path: string }) {
  const [text, setText] = useState('')
  const draft = useArchiveStore((state) => state.drafts[path] ?? '')
  const updateDraft = useArchiveStore((state) => state.updateDraft)
  const log = useArchiveStore((state) => state.log)

  const append = (): void => {
    if (!text.trim()) return
    const stamp = new Date().toLocaleString('en-US', { hour12: false })
    const entry = `\n## ${stamp}\n\n${text.trim()}\n`
    updateDraft(path, `${draft.replace(/\s*$/, '')}${entry}`)
    setText('')
    log(`log entry appended ${path}`, 'save')
  }

  return (
    <div className="log-composer">
      <textarea
        className="templates__textarea"
        rows={4}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Append to the operator log…"
      />
      <div className="templates__actions">
        <button type="button" className="btn btn--accent" onClick={append}>
          Append entry
        </button>
      </div>
    </div>
  )
}
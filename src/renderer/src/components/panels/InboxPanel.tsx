import { useState } from 'react'
import { useArchiveStore } from '../../state/store'

export function InboxPanel() {
  const [kind, setKind] = useState('todo')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const saveDispatch = useArchiveStore((state) => state.saveDispatch)
  const promoteDispatch = useArchiveStore((state) => state.promoteDispatch)
  const openInbox = useArchiveStore((state) => state.openInbox)
  const rootPath = useArchiveStore((state) => state.rootPath)

  const submit = async (): Promise<void> => {
    if (!title.trim() && !body.trim()) return
    await saveDispatch(kind, title.trim() || 'Untitled dispatch', body)
    setTitle('')
    setBody('')
  }

  return (
    <div className="inbox">
      <div className="panel__summary">
        <span>INBOX.SVC</span>
        <span>{rootPath ? 'transmissions' : 'no archive'}</span>
      </div>
      <div className="inbox__compose">
        <select className="meta-field__input" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="note">note</option>
          <option value="todo">todo</option>
          <option value="report">report</option>
        </select>
        <input
          className="meta-field__input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="title"
        />
        <textarea
          className="templates__textarea"
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="message body"
        />
        <div className="templates__actions">
          <button type="button" className="btn btn--accent" onClick={() => void submit()}>
            File dispatch
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => void openInbox()}>
            Open _inbox.md
          </button>
        </div>
      </div>
      <div className="panel-empty panel-empty--tight">
        Dispatches are stored in <code>_inbox.md</code>. Promote them from the open file.
      </div>
      <button type="button" className="btn btn--ghost" onClick={() => void promoteDispatch(0)}>
        Promote first dispatch
      </button>
    </div>
  )
}
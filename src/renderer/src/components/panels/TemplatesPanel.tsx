import { useEffect, useState } from 'react'
import { useArchiveStore } from '../../state/store'
import { COLONY_LOG_TEMPLATE, INFOBOX_TEMPLATE, STUB_TEMPLATE } from '../../lib/templates'

const BUILT_INS = [
  { name: 'Colony infobox', content: INFOBOX_TEMPLATE },
  { name: 'Stub notice', content: STUB_TEMPLATE },
  { name: 'Colony log table', content: COLONY_LOG_TEMPLATE }
]

export function TemplatesPanel() {
  const templates = useArchiveStore((state) => state.templates)
  const loadTemplates = useArchiveStore((state) => state.loadTemplates)
  const saveTemplateFile = useArchiveStore((state) => state.saveTemplateFile)
  const requestInsert = useArchiveStore((state) => state.requestInsert)
  const [name, setName] = useState('custom.md')
  const [content, setContent] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    void loadTemplates()
  }, [loadTemplates])

  const save = async (): Promise<void> => {
    if (!name.trim()) {
      setMessage('Name the template first.')
      return
    }
    setMessage(null)
    await saveTemplateFile(name.trim(), content)
    setMessage('saved to _templates/')
  }

  return (
    <div className="templates">
      <div className="panel__section-title">built-in</div>
      <ul className="panel-list panel-list--compact">
        {BUILT_INS.map((template) => (
          <li key={template.name}>
            <button
              type="button"
              className="panel-link"
              onClick={() => requestInsert(template.content)}
            >
              <span className="panel-link__glyph">＋</span>
              {template.name}
            </button>
          </li>
        ))}
      </ul>

      <div className="panel__section-title">archive templates</div>
      {templates.length === 0 ? (
        <div className="panel-empty panel-empty--tight">
          No custom templates. Save one below; it is stored in <code>_templates/</code>.
        </div>
      ) : (
        <ul className="panel-list panel-list--compact">
          {templates.map((template) => (
            <li key={template.name}>
              <button
                type="button"
                className="panel-link"
                onClick={() => {
                  setName(template.name)
                  setContent(template.content)
                  setMessage(null)
                }}
              >
                <span className="panel-link__glyph">▸</span>
                {template.name}
              </button>
              <button
                type="button"
                className="templates__insert"
                title="Insert into current record"
                onClick={() => requestInsert(template.content)}
              >
                insert
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="templates__editor">
        <label className="meta-field">
          <span className="meta-field__label">name</span>
          <input
            className="meta-field__input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="faction.md"
          />
        </label>
        <label className="meta-field">
          <span className="meta-field__label">body</span>
          <textarea
            className="templates__textarea"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={7}
            placeholder={'## Template body\n\n'}
          />
        </label>
        <div className="templates__actions">
          {message ? <span className="templates__message">{message}</span> : null}
          <button type="button" className="btn btn--accent" onClick={() => void save()}>
            Save template
          </button>
        </div>
      </div>
    </div>
  )
}

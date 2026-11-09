import { useState } from 'react'
import { PAGE_TEMPLATES, type PageTemplate } from '@shared/pageTemplates'
import { useArchiveStore } from '../state/store'
import { call } from '../lib/api'
import { renderMarkdown } from '../lib/markdown'
import { createPageLookup } from '@shared/wiki'

function serializeTemplate(template: PageTemplate, title: string): string {
  const frontmatter = { ...template.frontmatter, title: title || template.frontmatter.title }
  const lines = ['---']
  for (const [key, value] of Object.entries(frontmatter)) {
    if (Array.isArray(value)) lines.push(`${key}: [${value.join(', ')}]`)
    else if (value !== '') lines.push(`${key}: ${value}`)
  }
  lines.push('---', '', template.body)
  return lines.join('\n')
}

export function TemplatePickerDialog({
  dirPath,
  onClose
}: {
  dirPath: string
  onClose: () => void
}) {
  const [name, setName] = useState('New Page.md')
  const [selected, setSelected] = useState<PageTemplate>(PAGE_TEMPLATES[0])
  const [hovered, setHovered] = useState<PageTemplate>(PAGE_TEMPLATES[0])
  const templates = useArchiveStore((state) => state.templates)
  const index = useArchiveStore((state) => state.index)
  const useFeature = useArchiveStore((state) => state.useFeature)
  const lookup = createPageLookup(index)
  const selectPath = useArchiveStore((state) => state.selectPath)
  const preview = hovered ?? selected

  const create = async () => {
    const templateName = name.trim() || 'New Page.md'
    const result = await call(window.api.createFile(dirPath, templateName))
    const content = serializeTemplate(preview, templateName.replace(/\.md$/i, ''))
    await call(window.api.writeFile(result.path, content))
    useFeature('template')
    await selectPath(result.path)
    onClose()
  }

  const allTemplates = [
    ...PAGE_TEMPLATES,
    ...templates.map((template) => ({
      id: `user:${template.name}`,
      label: template.name.replace(/\.md$/i, ''),
      description: 'User template',
      type: 'page',
      frontmatter: {},
      body: template.content,
      builtin: false as never,
      manualAnchor: 'templates'
    }))
  ]

  return (
    <div className="overlay">
      <div className="dialog template-picker">
        <div className="dialog__head">
          <div className="dialog__title">New record</div>
        </div>
        <div className="dialog__body">
          <div className="template-picker__grid">
            {allTemplates.map((template) => (
              <button
                key={template.id}
                type="button"
                className={`template-card ${selected.id === template.id ? 'template-card--active' : ''}`}
                onMouseEnter={() => setHovered(template)}
                onFocus={() => setHovered(template)}
                onClick={() => setSelected(template)}
              >
                <span className="template-card__label">{template.label}</span>
                <span className="template-card__desc">{template.description}</span>
                {'builtin' in template && template.builtin === false ? <span className="template-card__badge">USER</span> : null}
              </button>
            ))}
          </div>
          <div className="template-picker__preview">
            <div className="template-picker__preview-title">{preview.label}</div>
            <div
              className="markdown"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(serializeTemplate(preview, preview.label), { lookup, fromPath: '' }) }}
            />
          </div>
          <label className="meta-field">
            <span className="meta-field__label">name</span>
            <input className="meta-field__input" value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <div className="meta-editor__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
            <button type="button" className="btn btn--accent" onClick={() => void create()}>Create</button>
          </div>
        </div>
      </div>
    </div>
  )
}
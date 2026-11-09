import { useMemo, useState } from 'react'
import {
  listValue,
  parseFrontmatter,
  splitCommaList,
  stringValue,
  updateFrontmatter
} from '@shared/frontmatter'
import { parseRimDate } from '@shared/wiki'
import { useArchiveStore } from '../state/store'

const TYPES = ['colonist', 'faction', 'event', 'item', 'location', 'ideology', 'animal', 'quest', 'page']

export function FrontmatterEditor({ path }: { path: string }) {
  const draft = useArchiveStore((state) => state.drafts[path] ?? '')
  const updateDraft = useArchiveStore((state) => state.updateDraft)
  const log = useArchiveStore((state) => state.log)
  const parsed = useMemo(() => parseFrontmatter(draft), [draft])
  const [open, setOpen] = useState(parsed.hasFrontmatter)
  const [title, setTitle] = useState(stringValue(parsed.data.title))
  const [type, setType] = useState(stringValue(parsed.data.type))
  const [classification, setClassification] = useState(stringValue(parsed.data.classification) || 'internal')
  const [tags, setTags] = useState(listValue(parsed.data.tags).join(', '))
  const [aliases, setAliases] = useState(listValue(parsed.data.aliases).join(', '))
  const [date, setDate] = useState(stringValue(parsed.data.date))
  const [error, setError] = useState<string | null>(null)

  const apply = (): void => {
    setError(null)
    if (date.trim() && !parseRimDate(date.trim())) {
      setError('Date must use the RimWorld form YYYY-Q-DD, e.g. 5501-04-12.')
      return
    }
    const next = updateFrontmatter(draft, {
      title: title.trim(),
      type: type.trim(),
      classification: classification.trim(),
      tags: splitCommaList(tags),
      aliases: splitCommaList(aliases),
      date: date.trim()
    })
    updateDraft(path, next)
    log(`metadata updated ${path}`, 'info')
  }

  return (
    <div className={`meta-editor ${open ? 'meta-editor--open' : ''}`}>
      <button
        type="button"
        className="meta-editor__toggle"
        onClick={() => setOpen((value) => !value)}
        title={open ? 'Collapse metadata' : 'Edit frontmatter metadata'}
      >
        <span className="meta-editor__chevron">{open ? '▾' : '▸'}</span>
        metadata
        {parsed.hasFrontmatter ? <span className="meta-editor__badge">yaml</span> : null}
        {parsed.error ? <span className="meta-editor__badge meta-editor__badge--warn">!</span> : null}
      </button>

      {open ? (
        <div className="meta-editor__form">
          <label className="meta-field">
            <span className="meta-field__label">title</span>
            <input
              className="meta-field__input"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Page title"
            />
          </label>
          <label className="meta-field">
            <span className="meta-field__label">type</span>
            <input
              className="meta-field__input"
              value={type}
              list="colony-page-types"
              onChange={(event) => setType(event.target.value)}
              placeholder="colonist"
            />
            <datalist id="colony-page-types">
              {TYPES.map((value) => (
                <option key={value} value={value} />
              ))}
            </datalist>
          </label>
          <label className="meta-field">
            <span className="meta-field__label">classification</span>
            <select
              className="meta-field__input"
              value={classification}
              onChange={(event) => setClassification(event.target.value)}
            >
              <option value="public">public</option>
              <option value="internal">internal</option>
              <option value="classified">classified</option>
            </select>
          </label>
          <label className="meta-field">
            <span className="meta-field__label">date</span>
            <input
              className="meta-field__input"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              placeholder="5501-04-12"
            />
          </label>
          <label className="meta-field meta-field--wide">
            <span className="meta-field__label">tags</span>
            <input
              className="meta-field__input"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="faction, stub"
            />
          </label>
          <label className="meta-field meta-field--wide">
            <span className="meta-field__label">aliases</span>
            <input
              className="meta-field__input"
              value={aliases}
              onChange={(event) => setAliases(event.target.value)}
              placeholder="The Empire, Empire"
            />
          </label>
          <div className="meta-editor__actions">
            {error ? <span className="meta-editor__error">{error}</span> : null}
            <button type="button" className="btn btn--ghost" onClick={apply}>
              Apply metadata
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

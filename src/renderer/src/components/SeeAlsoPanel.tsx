import { useMemo, useState } from 'react'
import { useArchiveStore } from '../state/store'
import { useDebouncedValue } from '../lib/useDebouncedValue'
import { suggestRelated } from '../lib/suggestions'

export function SeeAlsoPanel() {
  const selected = useArchiveStore((state) => state.selected)
  const index = useArchiveStore((state) => state.index)
  const draft = useArchiveStore((state) => (selected ? state.drafts[selected] : undefined))
  const requestInsert = useArchiveStore((state) => state.requestInsert)
  const updateDraft = useArchiveStore((state) => state.updateDraft)
  const debounced = useDebouncedValue(draft ?? '', 300)
  const [open, setOpen] = useState(true)

  const suggestions = useMemo(
    () => (selected ? suggestRelated(index, selected, debounced) : []),
    [index, selected, debounced]
  )

  if (!selected || !open) {
    return (
      <button type="button" className="see-also__toggle" onClick={() => setOpen(true)} title="Show see also">
        ▸
      </button>
    )
  }

  const addSeeAlso = (path: string) => {
    const title = index?.pages.find((page) => page.path === path)?.title ?? path
    const current = debounced
    const section = '\n\n## See also\n\n'
    const bullet = `- [[${title}]]\n`
    if (current.includes('## See also')) {
      updateDraft(selected, current.replace(/(## See also\n(?:.|\n)*?)(\n## |\n# |$)/, `$1${bullet}$2`))
    } else {
      updateDraft(selected, `${current.replace(/\s*$/, '')}${section}${bullet}`)
    }
  }

  return (
    <aside className="see-also">
      <div className="see-also__head">
        <span>SEE ALSO</span>
        <button type="button" className="see-also__close" onClick={() => setOpen(false)} title="Hide">
          ×
        </button>
      </div>
      {suggestions.length === 0 ? (
        <div className="see-also__empty">No related records detected.</div>
      ) : (
        <ul className="see-also__list">
          {suggestions.map((suggestion) => (
            <li key={suggestion.path} className="see-also__item">
              <button
                type="button"
                className="see-also__title"
                onClick={() => requestInsert(`[[${suggestion.title}]]`)}
                title={suggestion.path}
              >
                {suggestion.title}
              </button>
              <div className="see-also__reasons">
                {suggestion.reasons.map((reason) => (
                  <span key={reason} className="see-also__reason">{reason}</span>
                ))}
              </div>
              <button type="button" className="see-also__action" onClick={() => addSeeAlso(suggestion.path)}>
                see also
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}
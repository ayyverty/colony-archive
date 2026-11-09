import { useMemo } from 'react'
import { createPageLookup, pageKind } from '@shared/wiki'
import { useArchiveStore } from '../../state/store'

export function BacklinksPanel() {
  const selected = useArchiveStore((state) => state.selected)
  const index = useArchiveStore((state) => state.index)
  const selectPath = useArchiveStore((state) => state.selectPath)
  const lookup = useMemo(() => createPageLookup(index), [index])
  const page = selected ? lookup.get(selected) : undefined

  if (!selected) {
    return <div className="panel-empty">No record is open.</div>
  }
  if (!index) {
    return <div className="panel-empty">Indexing archive…</div>
  }
  if (!page) {
    return (
      <div className="panel-empty">
        This record is not indexed yet. Save it, then reopen the panel.
      </div>
    )
  }

  const backlinks = page.backlinks
    .map((path) => lookup.get(path))
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))

  return (
    <div className="panel">
      <div className="panel__summary">
        <span>{backlinks.length} backlinks</span>
        <span>{page.links.length} outgoing</span>
      </div>

      {backlinks.length === 0 ? (
        <div className="panel-empty panel-empty--tight">
          No record links here yet. Add a{' '}
          <code>[[{page.title}]]</code> reference from another page.
        </div>
      ) : (
        <ul className="panel-list">
          {backlinks.map((entry) => (
            <li key={entry.path}>
              <button
                type="button"
                className="panel-item"
                onClick={() => void selectPath(entry.path)}
                title={entry.path}
              >
                <span className="panel-item__head">
                  <span className={`kind-dot kind-dot--${pageKind(entry)}`} />
                  <span className="panel-item__title">{entry.title}</span>
                  <span className="panel-item__path">{entry.path}</span>
                </span>
                {entry.excerpt ? (
                  <span className="panel-item__excerpt">{entry.excerpt}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}

      {page.links.length > 0 ? (
        <>
          <div className="panel__section-title">outgoing</div>
          <ul className="panel-list panel-list--compact">
            {page.links.map((link) => {
              const target = link.resolved ? lookup.get(link.resolved) : undefined
              return (
                <li key={`${link.target}-${link.heading ?? ''}`}>
                  <button
                    type="button"
                    className={`panel-link ${target ? '' : 'panel-link--missing'}`}
                    disabled={!target}
                    onClick={() => target && void selectPath(target.path)}
                    title={target?.path ?? 'Missing record'}
                  >
                    <span className="panel-link__glyph">{target ? '▸' : '×'}</span>
                    {target?.title ?? link.target}
                    {link.heading ? (
                      <span className="panel-link__heading">#{link.heading}</span>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      ) : null}
    </div>
  )
}

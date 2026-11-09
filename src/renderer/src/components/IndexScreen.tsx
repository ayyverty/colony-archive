import { useMemo, useState } from 'react'
import { useArchiveStore } from '../state/store'
import { basename } from '../lib/paths'
import { pageKind } from '@shared/wiki'

export function IndexScreen() {
  const index = useArchiveStore((state) => state.index)
  const selected = useArchiveStore((state) => state.selected)
  const selectPath = useArchiveStore((state) => state.selectPath)
  const setWorkspace = useArchiveStore((state) => state.setWorkspace)
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState('all')

  const kinds = useMemo(() => {
    if (!index) return ['all']
    return ['all', ...new Set(index.pages.map((page) => pageKind(page)))]
  }, [index])

  const results = useMemo(() => {
    if (!index) return []
    const needle = query.trim().toLowerCase()
    return index.pages
      .filter((page) => (kind === 'all' ? true : pageKind(page) === kind))
      .filter((page) => {
        if (!needle) return true
        return (
          page.title.toLowerCase().includes(needle) ||
          page.path.toLowerCase().includes(needle) ||
          page.tags.some((tag) => tag.includes(needle)) ||
          page.excerpt.toLowerCase().includes(needle)
        )
      })
      .sort((a, b) => a.title.localeCompare(b.title))
  }, [index, query, kind])

  const open = (path: string) => {
    void selectPath(path)
    setWorkspace('archive')
  }

  return (
    <div className="screen screen--index">
      <header className="screen__head">
        <div>
          <div className="screen__eyebrow">INDEXER.SVC // SEARCH & BACKLINKS</div>
          <h1 className="screen__title">Archive Index</h1>
        </div>
        <div className="screen__meta">
          {index ? `${index.pages.length} records · ${index.tags.length} tags · ${index.brokenLinks.length} broken` : 'indexing…'}
        </div>
      </header>

      <div className="screen__toolbar">
        <input
          className="palette__input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="search title, path, tag, excerpt…"
        />
        <select className="meta-field__input" value={kind} onChange={(event) => setKind(event.target.value)}>
          {kinds.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>

      <div className="screen__body">
        <div className="screen__list">
          {results.map((page) => (
            <button
              type="button"
              key={page.path}
              className={`tag-results__row ${selected === page.path ? 'tag-results__row--active' : ''}`}
              onClick={() => open(page.path)}
            >
              <span className="tag-results__title">{page.title}</span>
              <span className="tag-results__path">{page.path}</span>
            </button>
          ))}
          {results.length === 0 ? <div className="panel-empty panel-empty--tight">No matching records.</div> : null}
        </div>
        <aside className="screen__detail">
          {selected ? (
            <div className="panel">
              <div className="panel__summary">
                <span>{basename(selected)}</span>
                <span>
                  {index?.pages.find((p) => p.path === selected)
                    ? pageKind(index.pages.find((p) => p.path === selected)!)
                    : 'page'}
                </span>
              </div>
            </div>
          ) : (
            <div className="panel-empty">Select a record to inspect it.</div>
          )}
        </aside>
      </div>
    </div>
  )
}
import { useMemo } from 'react'
import { createPageLookup } from '@shared/wiki'
import { useArchiveStore } from '../state/store'

export function RelationshipsPanel() {
  const selected = useArchiveStore((state) => state.selected)
  const index = useArchiveStore((state) => state.index)
  const selectPath = useArchiveStore((state) => state.selectPath)
  const lookup = useMemo(() => createPageLookup(index), [index])
  const page = selected ? index?.pages.find((p) => p.path === selected) : undefined

  if (!page) return null

  const relationships = page.relationships ?? []
  const members =
    page.type === 'faction'
      ? (index?.pages.filter((p) => p.faction && lookup.resolve(p.faction, p.path)?.path === page.path) ?? [])
      : []

  if (relationships.length === 0 && members.length === 0) return null

  return (
    <div className="relationships">
      {relationships.length > 0 ? (
        <div className="relationships__row">
          <span className="relationships__label">RELATIONSHIPS</span>
          {relationships.map((rel, index) => {
            const target = rel.resolved ? lookup.get(rel.resolved) : null
            return (
              <span key={`${rel.kind}-${rel.target}-${index}`} className="relationships__item">
                <span className="relationships__kind">[{rel.kind}]</span>
                {target ? (
                  <button type="button" className="wikilink" onClick={() => void selectPath(target.path)}>
                    {target.title}
                  </button>
                ) : (
                  <span className="wikilink wikilink--missing">{rel.target}</span>
                )}
              </span>
            )
          })}
        </div>
      ) : null}
      {members.length > 0 ? (
        <div className="relationships__row">
          <span className="relationships__label">KNOWN MEMBERS</span>
          {members.map((member) => (
            <button
              type="button"
              key={member.path}
              className="wikilink"
              onClick={() => void selectPath(member.path)}
            >
              {member.title}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
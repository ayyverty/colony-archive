import { useMemo } from 'react'
import { useArchiveStore } from '../state/store'
import { createPageLookup } from '@shared/wiki'

export function ArchiveContextStrip() {
  const archiveMeta = useArchiveStore((state) => state.archiveMeta)
  const index = useArchiveStore((state) => state.index)
  const selectPath = useArchiveStore((state) => state.selectPath)
  const lookup = useMemo(() => createPageLookup(index), [index])

  if (!archiveMeta) return null

  const leaderPage = archiveMeta.leader ? lookup.resolve(archiveMeta.leader, archiveMeta.path) : null
  const archivistPage = archiveMeta.archivist ? lookup.resolve(archiveMeta.archivist, archiveMeta.path) : null
  const archivistDead = archivistPage?.status === 'dead'

  return (
    <div className="archive-context">
      <span className="archive-context__label">SETTLEMENT</span>
      <span className="archive-context__value">{archiveMeta.settlement ?? 'Unknown'}</span>
      <span className="archive-context__label">LEADER</span>
      {leaderPage ? (
        <button
          type="button"
          className="archive-context__link"
          onClick={() => void selectPath(leaderPage.path)}
        >
          {leaderPage.title}
        </button>
      ) : (
        <span className="archive-context__value">{archiveMeta.leader ?? '—'}</span>
      )}
      <span className="archive-context__label">FOUNDED</span>
      <span className="archive-context__value">{archiveMeta.founded ?? '—'}</span>
      {archiveMeta.sector ? (
        <>
          <span className="archive-context__label">SECTOR</span>
          <span className="archive-context__value">{archiveMeta.sector}</span>
        </>
      ) : null}
      {archiveMeta.techLevel ? (
        <>
          <span className="archive-context__label">ERA</span>
          <span className="archive-context__value">{archiveMeta.techLevel.toUpperCase()}</span>
        </>
      ) : null}
      {archiveMeta.archivist ? (
        <>
          <span className="archive-context__label">ARCHIVIST</span>
          <span className={`archive-context__value ${archivistDead ? 'archive-context__value--dead' : ''}`}>
            {archivistDead ? '[DECEASED]' : archiveMeta.archivist}
          </span>
        </>
      ) : null}
      {archiveMeta.faction ? (
        <>
          <span className="archive-context__label">FACTION</span>
          <span className="archive-context__value">{archiveMeta.faction.replace(/\[\[|\]\]/g, '')}</span>
        </>
      ) : null}
    </div>
  )
}
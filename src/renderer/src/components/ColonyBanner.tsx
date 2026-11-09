import { useArchiveStore } from '../state/store'

export function ColonyBanner() {
  const rootPath = useArchiveStore((state) => state.rootPath)
  const archiveMeta = useArchiveStore((state) => state.archiveMeta)
  const profile = useArchiveStore((state) => state.profile)
  if (!rootPath) return null

  const fallen = archiveMeta?.colonyStatus === 'destroyed' || archiveMeta?.colonyStatus === 'fallen'
  const settlement = archiveMeta?.settlement ?? 'UNKNOWN COLONY'
  const status = (archiveMeta?.colonyStatus ?? 'STABLE').toUpperCase()
  const population = archiveMeta?.population ?? '—'

  return (
    <div className={`colony-banner ${fallen ? 'colony-banner--fallen' : ''}`}>
      {fallen ? <span className="colony-banner__warn">⚠ ARCHIVE OF A FALLEN COLONY</span> : null}
      <span>{profile.archive.toUpperCase()}: {settlement}</span>
      <span className="colony-banner__sep">—</span>
      <span>STATUS: {status}</span>
      <span className="colony-banner__sep">—</span>
      <span>POP: {population}</span>
    </div>
  )
}
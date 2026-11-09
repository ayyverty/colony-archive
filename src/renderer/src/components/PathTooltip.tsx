import { useState } from 'react'
import { useArchiveStore } from '../state/store'
import { createPageLookup } from '@shared/wiki'
import { useMemo } from 'react'

export function PathTooltip({ path, kind = 'file' }: { path: string; kind?: 'file' | 'folder' }) {
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const index = useArchiveStore((state) => state.index)
  const lookup = useMemo(() => createPageLookup(index), [index])
  const page = kind === 'file' ? lookup.get(path) : undefined

  const size = page ? `${Math.max(1, Math.round(page.size / 1024))}K` : '—'
  const date = page?.date ?? (page ? new Date(page.mtimeMs).toISOString().slice(0, 10) : '—')
  const time = page ? new Date(page.mtimeMs).toLocaleTimeString('en-US', { hour12: false }).slice(0, 5) : '—'
  const perm = kind === 'folder' ? 'drwxr-xr-x' : '-rw-r--r--'

  return (
    <span
      className="path-tooltip-anchor"
      onMouseEnter={(event) => {
        setPos({ x: event.clientX + 12, y: event.clientY + 12 })
        setVisible(true)
      }}
      onMouseLeave={() => setVisible(false)}
    >
      {visible ? (
        <span className="path-tooltip" style={{ left: pos.x, top: pos.y }}>
          {`${perm}  archivist  archive  ${size.padStart(5)}  ${date} ${time}  ${path}`}
        </span>
      ) : null}
    </span>
  )
}
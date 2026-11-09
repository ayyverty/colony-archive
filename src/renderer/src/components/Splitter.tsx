import { useState } from 'react'
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react'
import { useArchiveStore } from '../state/store'

interface SplitterProps {
  containerRef: RefObject<HTMLDivElement | null>
}

export function Splitter({ containerRef }: SplitterProps) {
  const setSplitRatio = useArchiveStore((state) => state.setSplitRatio)
  const commitSplitRatio = useArchiveStore((state) => state.commitSplitRatio)
  const [active, setActive] = useState(false)

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    event.preventDefault()
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    setActive(true)
    const previousCursor = document.body.style.cursor
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const onMove = (moveEvent: PointerEvent): void => {
      setSplitRatio((moveEvent.clientX - rect.left) / rect.width)
    }
    const onUp = (): void => {
      setActive(false)
      document.body.style.cursor = previousCursor
      document.body.style.userSelect = ''
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      commitSplitRatio()
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <div
      className={`splitter ${active ? 'splitter--active' : ''}`}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize preview pane"
      onPointerDown={onPointerDown}
      onDoubleClick={() => {
        setSplitRatio(0.5)
        commitSplitRatio()
      }}
    />
  )
}

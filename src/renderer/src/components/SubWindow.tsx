import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { CloseIcon } from './Icons'

interface SubWindowProps {
  title: string
  subtitle?: string
  width?: number
  initial?: { x: number; y: number }
  onClose: () => void
  children: ReactNode
}

export function SubWindow({
  title,
  subtitle,
  width = 380,
  initial,
  onClose,
  children
}: SubWindowProps) {
  const [position, setPosition] = useState(() => ({
    x: initial?.x ?? Math.max(64, window.innerWidth - width - 72),
    y: initial?.y ?? 96
  }))
  const frameRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if ((event.target as HTMLElement).closest('button')) return
    event.preventDefault()
    const startX = event.clientX - position.x
    const startY = event.clientY - position.y
    const frame = frameRef.current
    const previousCursor = document.body.style.cursor
    document.body.style.cursor = 'grabbing'

    const onMove = (moveEvent: PointerEvent): void => {
      const rect = frame?.getBoundingClientRect()
      const maxX = window.innerWidth - (rect?.width ?? width) - 8
      const maxY = window.innerHeight - 80
      setPosition({
        x: Math.min(maxX, Math.max(8, moveEvent.clientX - startX)),
        y: Math.min(maxY, Math.max(44, moveEvent.clientY - startY))
      })
    }
    const onUp = (): void => {
      document.body.style.cursor = previousCursor
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <div
      className="subwindow"
      ref={frameRef}
      style={{ left: position.x, top: position.y, width }}
    >
      <header className="subwindow__bar" onPointerDown={onPointerDown}>
        <span className="subwindow__dot" />
        <span className="subwindow__title">{title}</span>
        {subtitle ? <span className="subwindow__subtitle">{subtitle}</span> : null}
        <div className="subwindow__spacer" />
        <button type="button" className="subwindow__close" title="Close" onClick={onClose}>
          <CloseIcon />
        </button>
      </header>
      <div className="subwindow__body">{children}</div>
    </div>
  )
}

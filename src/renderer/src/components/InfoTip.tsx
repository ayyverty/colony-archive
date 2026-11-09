import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import { useArchiveStore } from '../state/store'

export function InfoTip({ label, description, manualAnchor }: { label: string; description: string; manualAnchor?: string }) {
  const [visible, setVisible] = useState(false)
  const [position, setPosition] = useState({ left: 0, top: 0 })
  const anchorRef = useRef<HTMLSpanElement>(null)
  const hideTimer = useRef<number | null>(null)
  const openManual = useArchiveStore((state) => state.openManual)

  const show = () => {
    if (hideTimer.current !== null) {
      window.clearTimeout(hideTimer.current)
      hideTimer.current = null
    }
    const rect = anchorRef.current?.getBoundingClientRect()
    if (rect) {
      const width = 240
      const left = Math.min(window.innerWidth - width - 12, Math.max(12, rect.left))
      const top = Math.min(window.innerHeight - 90, rect.bottom + 8)
      setPosition({ left, top })
    }
    setVisible(true)
  }

  const hide = () => {
    if (hideTimer.current !== null) window.clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(() => setVisible(false), 120)
  }

  useEffect(() => {
    return () => {
      if (hideTimer.current !== null) window.clearTimeout(hideTimer.current)
    }
  }, [])

  return (
    <>
      <span
        ref={anchorRef}
        className="info-tip"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        tabIndex={0}
      >
        {label}
      </span>
      {visible
        ? createPortal(
            <span
              className="info-tip__popup"
              style={{ left: position.left, top: position.top }}
              onMouseEnter={show}
              onMouseLeave={hide}
            >
              <span className="info-tip__description">{description}</span>
              {manualAnchor ? (
                <button type="button" className="info-tip__manual" onClick={() => void openManual(manualAnchor)}>
                  manual
                </button>
              ) : null}
            </span>,
            document.body
          )
        : null}
    </>
  )
}
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

export interface DropdownItem {
  id: string
  label: string
  hint?: string
  danger?: boolean
  disabled?: boolean
  onSelect: () => void
}

export interface DropdownSection {
  section: string
}

export type DropdownEntry = DropdownItem | DropdownSection | 'sep'

interface DropdownProps {
  label: ReactNode
  items: DropdownEntry[]
  align?: 'left' | 'right'
  className?: string
  title?: string
}

function isItem(entry: DropdownEntry): entry is DropdownItem {
  return typeof entry === 'object' && entry !== null && 'id' in entry
}

export function Dropdown({ label, items, align = 'left', className, title }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent): void => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className={`dropdown ${className ?? ''}`} ref={rootRef}>
      <button
        type="button"
        className={`dropdown__trigger ${open ? 'dropdown__trigger--open' : ''}`}
        onClick={() => setOpen((value) => !value)}
        title={title}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {label}
        <span className="dropdown__caret">▾</span>
      </button>

      {open && (
        <div
          className={`dropdown__panel ${align === 'right' ? 'dropdown__panel--right' : ''}`}
          role="menu"
        >
          {items.map((entry, index) => {
            if (entry === 'sep') {
              return <div className="dropdown__sep" key={`sep-${index}`} />
            }
            if (!isItem(entry)) {
              return (
                <div className="dropdown__section" key={`section-${entry.section}`}>
                  {entry.section}
                </div>
              )
            }
            return (
              <button
                type="button"
                role="menuitem"
                key={entry.id}
                className={`dropdown__item ${entry.danger ? 'dropdown__item--danger' : ''}`}
                disabled={entry.disabled}
                onClick={() => {
                  setOpen(false)
                  entry.onSelect()
                }}
              >
                <span>{entry.label}</span>
                {entry.hint ? <span className="dropdown__hint">{entry.hint}</span> : null}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

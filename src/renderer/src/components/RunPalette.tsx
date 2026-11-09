import { useEffect, useRef, useState } from 'react'
import { filterRunCommands } from '../lib/runCommands'

export function RunPalette({
  open,
  position,
  slashPos,
  onClose,
  onRun
}: {
  open: boolean
  position: { left: number; top: number } | null
  slashPos: number | null
  onClose: () => void
  onRun: (commandId: string, slashPos: number) => void
}) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const filtered = filterRunCommands(query)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setActive(0)
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }, [open])

  useEffect(() => {
    setActive(0)
  }, [query])

  if (!open || !position) return null

  return (
    <div className="run-palette" style={{ left: position.left, top: position.top }}>
      <input
        ref={inputRef}
        className="run-palette__input"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setActive((value) => Math.min(filtered.length - 1, value + 1))
          } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            setActive((value) => Math.max(0, value - 1))
          } else if (event.key === 'Enter') {
            event.preventDefault()
            if (filtered[active] && slashPos !== null) onRun(filtered[active].id, slashPos)
          } else if (event.key === 'Escape') {
            event.preventDefault()
            onClose()
          }
        }}
        placeholder="run command…"
      />
      <div className="run-palette__results">
        {filtered.map((command, index) => (
          <button
            type="button"
            key={command.id}
            className={`run-palette__item ${index === active ? 'run-palette__item--active' : ''}`}
            onMouseEnter={() => setActive(index)}
            onClick={() => slashPos !== null && onRun(command.id, slashPos)}
          >
            <span>{command.label}</span>
            <span className="run-palette__hint">{command.hint}</span>
          </button>
        ))}
      </div>
    </div>
  )
}


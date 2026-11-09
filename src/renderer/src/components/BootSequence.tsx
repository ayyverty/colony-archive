import { useEffect, useRef, useState } from 'react'

const LINES = [
  'mounting colony archive',
  'indexing record tree',
  'linking preview pipeline',
  'terminal ready'
]

interface BootSequenceProps {
  onDone: () => void
}

export function BootSequence({ onDone }: BootSequenceProps) {
  const [revealed, setRevealed] = useState(0)
  const [leaving, setLeaving] = useState(false)
  const doneRef = useRef(false)
  const timers = useRef<number[]>([])

  const finish = (): void => {
    if (doneRef.current) return
    doneRef.current = true
    setLeaving(true)
    timers.current.push(window.setTimeout(onDone, 240))
  }

  useEffect(() => {
    LINES.forEach((_, index) => {
      timers.current.push(
        window.setTimeout(() => setRevealed(index + 1), 170 + index * 160)
      )
    })
    timers.current.push(window.setTimeout(finish, 170 + LINES.length * 160 + 420))

    const skip = (): void => finish()
    window.addEventListener('keydown', skip)
    window.addEventListener('pointerdown', skip)
    return () => {
      window.removeEventListener('keydown', skip)
      window.removeEventListener('pointerdown', skip)
      timers.current.forEach((timer) => window.clearTimeout(timer))
      timers.current = []
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      className={`boot ${leaving ? 'boot--leaving' : ''}`}
      role="presentation"
      onClick={finish}
    >
      <div className="boot__inner">
        <div className="boot__header">RimCodex // Terminal</div>
        {LINES.map((line, index) => (
          <p className="boot__line" key={line} style={{ animationDelay: `${index * 30}ms` }}>
            <span className="boot__prompt">&gt; </span>
            {line}
            {revealed > index ? (
              <>
                <span className="boot__prompt"> .......... </span>
                <span className="boot__ok">OK</span>
              </>
            ) : (
              <span className="boot__cursor" />
            )}
          </p>
        ))}
        <div className="boot__footer">
          <span>local filesystem link</span>
          <button type="button" className="boot__skip" onClick={finish}>
            press any key to skip
          </button>
        </div>
      </div>
    </div>
  )
}

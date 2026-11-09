import { useState } from 'react'
import { useArchiveStore } from '../state/store'

export function InfoTip({ label, description, manualAnchor }: { label: string; description: string; manualAnchor?: string }) {
  const [visible, setVisible] = useState(false)
  const openManual = useArchiveStore((state) => state.openManual)

  return (
    <span
      className="info-tip"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
      tabIndex={0}
    >
      {label}
      {visible ? (
        <span className="info-tip__popup">
          {description}
          {manualAnchor ? (
            <button type="button" onClick={() => void openManual(manualAnchor)}>
              manual
            </button>
          ) : null}
        </span>
      ) : null}
    </span>
  )
}
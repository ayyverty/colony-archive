import { useArchiveStore } from '../state/store'

const GLYPHS = {
  info: '›',
  success: '✓',
  error: '!'
} as const

export function ToastStack() {
  const toasts = useArchiveStore((state) => state.toasts)
  const dismissToast = useArchiveStore((state) => state.dismissToast)

  if (toasts.length === 0) return null

  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.kind}`}>
          <span className="toast__glyph">{GLYPHS[toast.kind]}</span>
          <span className="toast__message">{toast.message}</span>
          <button
            type="button"
            className="toast__close"
            title="Dismiss"
            onClick={() => dismissToast(toast.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}

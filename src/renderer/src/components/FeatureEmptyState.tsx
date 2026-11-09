import { useArchiveStore } from '../state/store'

export function FeatureEmptyState({
  title,
  body,
  actionLabel,
  onAction,
  manualAnchor
}: {
  title: string
  body: string
  actionLabel?: string
  onAction?: () => void
  manualAnchor?: string
}) {
  const openManual = useArchiveStore((state) => state.openManual)
  return (
    <div className="panel-empty panel-empty--tight">
      <div className="feature-empty__title">{title}</div>
      <div>{body}</div>
      {actionLabel && onAction ? (
        <button type="button" className="btn btn--ghost" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
      {manualAnchor ? (
        <button type="button" className="panel-link" onClick={() => void openManual(manualAnchor)}>
          manual
        </button>
      ) : null}
    </div>
  )
}
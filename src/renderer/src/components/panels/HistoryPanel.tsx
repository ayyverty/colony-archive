import { useEffect } from 'react'
import { useArchiveStore, formatBytes } from '../../state/store'
import { basename } from '../../lib/paths'

function stamp(ms: number): string {
  return new Date(ms).toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

export function HistoryPanel() {
  const selected = useArchiveStore((state) => state.selected)
  const snapshots = useArchiveStore((state) => state.snapshots)
  const snapshotsLoading = useArchiveStore((state) => state.snapshotsLoading)
  const lastSaveAt = useArchiveStore((state) => state.lastSaveAt)
  const loadSnapshots = useArchiveStore((state) => state.loadSnapshots)
  const restoreSnapshot = useArchiveStore((state) => state.restoreSnapshot)
  const openDialog = useArchiveStore((state) => state.openDialog)
  const closeDialog = useArchiveStore((state) => state.closeDialog)

  useEffect(() => {
    if (selected) void loadSnapshots(selected)
    // lastSaveAt forces a reload after a save creates a new snapshot.
  }, [selected, lastSaveAt, loadSnapshots])

  if (!selected) return <div className="panel-empty">Open a record to inspect its history.</div>

  const restore = (id: string): void => {
    openDialog({
      kind: 'confirm',
      title: 'Restore snapshot',
      body: `Restore ${basename(selected)} from ${stamp(
        snapshots.find((snapshot) => snapshot.id === id)?.mtimeMs ?? Date.now()
      )}? The current contents are snapshotted first.`,
      confirmLabel: 'Restore',
      danger: true,
      onConfirm: async () => {
        closeDialog()
        await restoreSnapshot(selected, id)
        await loadSnapshots(selected)
      }
    })
  }

  return (
    <div className="history">
      <div className="panel__summary">
        <span>{snapshots.length} snapshots</span>
        <span>{selected}</span>
      </div>
      {snapshotsLoading ? (
        <div className="panel-empty panel-empty--tight">Scanning .history…</div>
      ) : snapshots.length === 0 ? (
        <div className="panel-empty panel-empty--tight">
          No snapshots yet. A copy is written to <code>.history/</code> before each
          overwrite.
        </div>
      ) : (
        <ul className="history__list">
          {snapshots.map((snapshot) => (
            <li className="history__row" key={snapshot.id}>
              <div className="history__meta">
                <span className="history__time">{stamp(snapshot.mtimeMs)}</span>
                <span className="history__size">{formatBytes(snapshot.size)}</span>
              </div>
              <div className="history__id">{snapshot.id}</div>
              <button
                type="button"
                className="btn btn--ghost history__restore"
                onClick={() => restore(snapshot.id)}
              >
                Restore
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

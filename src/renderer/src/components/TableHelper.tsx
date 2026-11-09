import { useArchiveStore } from '../state/store'

export function TableHelper() {
  const info = useArchiveStore((state) => state.tableInfo)
  const requestEditorAction = useArchiveStore((state) => state.requestEditorAction)

  if (!info) return null

  return (
    <div className="table-helper">
      <span className="table-helper__label">TABLE</span>
      <span className="table-helper__pos">
        r{info.row + 1} c{info.col + 1} · {info.rows}×{info.cols}
      </span>
      <div className="table-helper__group">
        <button
          type="button"
          className="table-helper__btn"
          title="Add row below"
          onClick={() => requestEditorAction('table-add-row')}
        >
          +row
        </button>
        <button
          type="button"
          className="table-helper__btn"
          title="Remove current row"
          onClick={() => requestEditorAction('table-remove-row')}
        >
          −row
        </button>
        <button
          type="button"
          className="table-helper__btn"
          title="Add column"
          onClick={() => requestEditorAction('table-add-col')}
        >
          +col
        </button>
        <button
          type="button"
          className="table-helper__btn"
          title="Remove current column"
          onClick={() => requestEditorAction('table-remove-col')}
        >
          −col
        </button>
      </div>
    </div>
  )
}

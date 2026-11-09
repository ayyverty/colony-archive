import { useArchiveStore } from '../state/store'

export function IdleScreen() {
  const openFolder = useArchiveStore((state) => state.openFolder)
  const archives = useArchiveStore((state) => state.archives)
  const switchArchive = useArchiveStore((state) => state.switchArchive)

  return (
    <div className="idle-screen">
      <div className="idle-screen__panel">
        <div className="idle-screen__title">&gt; NO ARCHIVE MOUNTED</div>
        <div className="idle-screen__body">
          Mount a colony archive to begin. Everything stays local: Markdown records are read
          and written directly inside the folder you choose.
        </div>
        <div className="idle-screen__actions">
          <button type="button" className="btn btn--accent" onClick={() => void openFolder()}>
            MOUNT ARCHIVE
          </button>
        </div>
        {archives.length > 0 ? (
          <div className="idle-screen__recent">
            <div className="idle-screen__label">recent mounts</div>
            <div className="idle-screen__list">
              {archives.map((archive) => (
                <button
                  type="button"
                  key={archive}
                  className="panel-link"
                  onClick={() => void switchArchive(archive)}
                >
                  <span className="panel-link__glyph">▸</span>
                  {archive}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <div className="idle-screen__meta">
          <span>Ctrl K — command palette</span>
          <span>Ctrl O — mount archive</span>
          <span>F1–F5 — workspaces</span>
        </div>
      </div>
    </div>
  )
}
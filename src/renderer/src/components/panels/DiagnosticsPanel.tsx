import { useArchiveStore } from '../../state/store'
import { countPages } from '../../lib/paths'

function stamp(value: number | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleTimeString('en-US', { hour12: false })
}

export function DiagnosticsPanel() {
  const rootPath = useArchiveStore((state) => state.rootPath)
  const tree = useArchiveStore((state) => state.tree)
  const index = useArchiveStore((state) => state.index)
  const indexLoading = useArchiveStore((state) => state.indexLoading)
  const lastIndexAt = useArchiveStore((state) => state.lastIndexAt)
  const lastSaveAt = useArchiveStore((state) => state.lastSaveAt)
  const lastSavePath = useArchiveStore((state) => state.lastSavePath)
  const theme = useArchiveStore((state) => state.theme)
  const autosave = useArchiveStore((state) => state.autosave)
  const typewriterScroll = useArchiveStore((state) => state.typewriterScroll)
  const linter = useArchiveStore((state) => state.linter)
  const archives = useArchiveStore((state) => state.archives)
  const usage = useArchiveStore((state) => state.featureUsage)
  const openManual = useArchiveStore((state) => state.openManual)
  const featureUsage = rootPath ? (usage[rootPath] ?? {}) : {}

  const pages = index?.pages.length ?? 0
  const stubs = index?.pages.filter((page) => page.isStub).length ?? 0
  const broken = index?.brokenLinks.length ?? 0
  const tags = index?.tags.length ?? 0
  const withFrontmatter = index?.pages.filter((page) => Object.keys(page.frontmatter ?? {}).length > 0).length ?? 0
  const wikiLinks = index?.pages.reduce((total, page) => total + page.links.length, 0) ?? 0
  const indexedBytes = index?.pages.reduce((total, page) => total + page.size, 0) ?? 0

  const rows: Array<[string, string, string?]> = [
    ['archive', rootPath ?? 'not mounted'],
    ['records', `${countPages(tree)} on disk`],
    ['indexed', indexLoading ? 'scanning…' : `${pages} pages`],
    ['bytes', `${(indexedBytes / 1024).toFixed(1)} kb`],
    ['broken', `${broken} links`, broken ? 'warn' : undefined],
    ['stubs', `${stubs} pages`, stubs ? 'warn' : undefined],
    ['tags', `${tags} distinct`],
    ['indexed_at', stamp(lastIndexAt)],
    ['last_save', lastSaveAt ? stamp(lastSaveAt) : '—'],
    ['save_path', lastSavePath ?? '—'],
    ['theme', theme],
    ['autosave', autosave ? 'enabled' : 'disabled'],
    ['typewriter', typewriterScroll ? 'enabled' : 'disabled'],
    ['linter', linter ? 'enabled' : 'disabled'],
    ['archives', `${archives.length} mounted`],
    ['templates', `${featureUsage.template ?? 0} used`, (featureUsage.template ?? 0) ? undefined : 'warn'],
    ['wiki-links', `${wikiLinks} total`, wikiLinks ? undefined : 'warn'],
    ['frontmatter', `${withFrontmatter} pages`, withFrontmatter ? undefined : 'warn'],
    ['see-also', `${featureUsage['see-also'] ?? 0} used`],
    ['attachments', `${featureUsage.attachment ?? 0} used`],
    ['slash', `${featureUsage.slash ?? 0} used`]
  ]

  return (
    <div className="diagnostics">
      <div className="diagnostics__boot">
        &gt; rimcodex --diagnose
        <span className="cursor-blink">_</span>
      </div>
      <div className="diagnostics__rows">
        {rows.map(([key, value, kind]) => (
          <div className="diagnostics__row" key={key}>
            <span className="diagnostics__key">{key}</span>
            <span className={`diagnostics__value ${kind ? `diagnostics__value--${kind}` : ''}`}>
              {value}
            </span>
          </div>
        ))}
      </div>
      <div className="diagnostics__footer">
        {indexLoading ? 'scan in progress' : 'all systems nominal'}
        <span className="cursor-blink">▌</span>
      </div>
      <button type="button" className="btn btn--ghost" onClick={() => void openManual('feature-discovery')}>
        open manual
      </button>
    </div>
  )
}

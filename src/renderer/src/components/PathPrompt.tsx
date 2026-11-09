import { useArchiveStore } from '../state/store'
import { ShellPath } from './ShellPath'

export function PathPrompt() {
  const selected = useArchiveStore((state) => state.selected)
  const setExpanded = useArchiveStore((state) => state.expandPath)

  if (!selected) {
    return <div className="path-prompt">archive://</div>
  }

  const segments = selected.split('/').filter(Boolean)
  const prefixes: string[] = []
  let current = ''
  for (const segment of segments) {
    current = current ? `${current}/${segment}` : segment
    prefixes.push(current)
  }

  return (
    <div className="path-prompt" title={selected}>
      <button type="button" className="path-prompt__root" onClick={() => setExpanded('')}>
        archive://
      </button>
      {segments.map((segment, index) => {
        const prefix = prefixes[index]
        const isLast = index === segments.length - 1
        return (
          <span key={prefix} className="path-prompt__segment">
            <span className="path-prompt__sep">/</span>
            {isLast ? (
              <span className="path-prompt__current">
                <ShellPath path={segment} />
              </span>
            ) : (
              <button
                type="button"
                className="path-prompt__link"
                onClick={() => setExpanded(prefix)}
                title={`Expand ${prefix}`}
              >
                {segment}
              </button>
            )}
          </span>
        )
      })}
    </div>
  )
}
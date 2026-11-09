import { useArchiveStore } from '../state/store'
import { useDebouncedValue } from '../lib/useDebouncedValue'
import { parseFrontmatter } from '@shared/frontmatter'

export function ArtifactCard() {
  const selected = useArchiveStore((state) => state.selected)
  const draft = useArchiveStore((state) => (selected ? state.drafts[selected] : undefined))
  const debounced = useDebouncedValue(draft ?? '', 200)
  const data = parseFrontmatter(debounced).data
  const type = (data.type ?? '').toString().toLowerCase()
  if (type !== 'artifact' && type !== 'relic') return null

  const origin = typeof data.origin === 'string' ? data.origin : null
  const powers = Array.isArray(data.powers) ? data.powers.map(String) : []
  const holder = typeof data.current_holder === 'string' ? data.current_holder : null
  const icon = typeof data.icon === 'string' ? data.icon : '◆'

  return (
    <div className="artifact-card">
      <div className="artifact-card__icon" aria-hidden="true">{icon}</div>
      <div className="artifact-card__body">
        <div className="artifact-card__label">RELIC</div>
        {origin ? <div className="artifact-card__line"><span>ORIGIN</span> {origin}</div> : null}
        {powers.length > 0 ? (
          <div className="artifact-card__line">
            <span>POWERS</span>
            <div className="artifact-card__chips">
              {powers.map((power) => (
                <span className="md-tag" key={power}>{power}</span>
              ))}
            </div>
          </div>
        ) : null}
        {holder ? <div className="artifact-card__line"><span>CURRENT HOLDER</span> {holder}</div> : null}
      </div>
    </div>
  )
}
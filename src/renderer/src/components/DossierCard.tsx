import { useMemo } from 'react'
import { parseFrontmatter } from '@shared/frontmatter'
import { useArchiveStore } from '../state/store'
import { useDebouncedValue } from '../lib/useDebouncedValue'

function moodColor(mood: string | null): string {
  const value = (mood ?? '').toLowerCase()
  if (value.includes('break') || value.includes('sad') || value.includes('furious')) return 'var(--danger)'
  if (value.includes('content') || value.includes('happy') || value.includes('joy')) return 'var(--accent)'
  return 'var(--warn)'
}

export function DossierCard() {
  const selected = useArchiveStore((state) => state.selected)
  const draft = useArchiveStore((state) => (selected ? state.drafts[selected] : undefined))
  const debounced = useDebouncedValue(draft ?? '', 200)
  const data = useMemo(() => parseFrontmatter(debounced).data, [debounced])

  const type = (data.type ?? '').toString().toLowerCase()
  const hasDossier =
    type === 'colonist' ||
    data.backstory ||
    data.traits ||
    data.skills ||
    data.health ||
    data.health_conditions ||
    data.mood
  if (!hasDossier) return null

  const skills = Array.isArray(data.skills)
    ? data.skills.map((entry) => {
        const match = /^(.+?):\s*(\d+(?:\.\d+)?)$/.exec(String(entry).trim())
        return match ? { name: match[1].trim(), value: Number(match[2]) } : null
      }).filter(Boolean) as Array<{ name: string; value: number }>
    : []

  const traits = Array.isArray(data.traits) ? data.traits.map(String) : []
  const health = Array.isArray(data.health_conditions ?? data.health)
    ? (data.health_conditions ?? data.health) as string[]
    : []
  const backstory = typeof data.backstory === 'string' ? data.backstory : null
  const mood = data.mood != null ? String(data.mood) : null

  return (
    <div className="dossier-card">
      <div className="dossier-card__head">
        <span className="dossier-card__label">COLONIST DOSSIER</span>
        {mood ? (
          <span className="dossier-card__mood" style={{ color: moodColor(mood) }}>
            MOOD: {mood}
          </span>
        ) : null}
      </div>
      {backstory ? <p className="dossier-card__backstory">{backstory}</p> : null}
      {traits.length > 0 ? (
        <div className="dossier-card__chips">
          {traits.map((trait) => (
            <span className="md-tag" key={trait}>{trait}</span>
          ))}
        </div>
      ) : null}
      {skills.length > 0 ? (
        <div className="dossier-card__skills">
          {skills.map((skill) => (
            <div className="dossier-skill" key={skill.name}>
              <span className="dossier-skill__name">{skill.name}</span>
              <div className="dossier-skill__bar">
                <div
                  className="dossier-skill__fill"
                  style={{ width: `${Math.min(100, (skill.value / 20) * 100)}%` }}
                />
              </div>
              <span className="dossier-skill__value">{skill.value}</span>
            </div>
          ))}
        </div>
      ) : null}
      {health.length > 0 ? (
        <div className="dossier-card__chips">
          {health.map((condition) => (
            <span className="chip chip--missing" key={condition}>{condition}</span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
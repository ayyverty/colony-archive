import { useArchiveStore } from '../state/store'
import { useDebouncedValue } from '../lib/useDebouncedValue'
import { parseFrontmatter } from '@shared/frontmatter'

const STAMP_COLORS: Record<string, string> = {
  approved: 'var(--accent)',
  denied: 'var(--danger)',
  classified: 'var(--warn)',
  draft: 'var(--text-faint)'
}

export function StampBadge() {
  const selected = useArchiveStore((state) => state.selected)
  const draft = useArchiveStore((state) => (selected ? state.drafts[selected] : undefined))
  const debounced = useDebouncedValue(draft ?? '', 200)
  const stamp = parseFrontmatter(debounced).data.stamp
  if (!stamp) return null
  const value = String(stamp).trim().toUpperCase()
  const color = STAMP_COLORS[value.toLowerCase()] ?? 'var(--accent-dim)'

  return (
    <div className="stamp-badge" style={{ color, borderColor: color }}>
      {value}
    </div>
  )
}
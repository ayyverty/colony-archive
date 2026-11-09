import { useArchiveStore } from '../state/store'
import { useDebouncedValue } from '../lib/useDebouncedValue'
import { parseFrontmatter } from '@shared/frontmatter'

export function SignOff() {
  const selected = useArchiveStore((state) => state.selected)
  const draft = useArchiveStore((state) => (selected ? state.drafts[selected] : undefined))
  const debounced = useDebouncedValue(draft ?? '', 200)
  const signOffGlobal = useArchiveStore((state) => state.signOff)
  const operatorName = useArchiveStore((state) => state.operatorName)
  const archiveDate = useArchiveStore((state) => state.archiveMeta?.currentDate ?? '')
  const data = parseFrontmatter(debounced).data
  const signed = String(data.signed ?? '').toLowerCase() === 'true'

  if (!signed && !signOffGlobal) return null

  return (
    <div className="sign-off">
      — Filed by {operatorName}, {archiveDate || new Date().toISOString().slice(0, 10)}
    </div>
  )
}
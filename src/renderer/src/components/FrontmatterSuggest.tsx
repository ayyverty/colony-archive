import { useArchiveStore } from '../state/store'
import { inferTypeFromPath, fieldSuggestionsForType, valueSuggestionsForField } from '@shared/pageTemplates'
import { parseFrontmatter } from '@shared/frontmatter'

export function FrontmatterSuggest({ path }: { path: string }) {
  const draft = useArchiveStore((state) => state.drafts[path] ?? '')
  const updateDraft = useArchiveStore((state) => state.updateDraft)
  const parsed = parseFrontmatter(draft)
  const inferred = inferTypeFromPath(path)
  const type = parsed.data.type ? String(parsed.data.type) : inferred
  if (parsed.hasFrontmatter) return null
  if (!draft.trim().startsWith('---')) return null

  const lines = draft.split('\n')
  const currentLine = lines[lines.length - 1] ?? ''
  const keyMatch = /^([A-Za-z0-9_.-]+)\s*:\s*(.*)$/.exec(currentLine.trim())
  const field = keyMatch?.[1] ?? null
  const valuePrefix = keyMatch?.[2] ?? ''
  const suggestions = field
    ? valueSuggestionsForField(field).filter((value) => value.startsWith(valuePrefix))
    : fieldSuggestionsForType(type).map((entry) => entry.field)

  if (suggestions.length === 0) return null

  const insert = (value: string) => {
    const nextLines = [...lines]
    if (field) {
      nextLines[nextLines.length - 1] = `${field}: ${value}`
    } else {
      nextLines.push(value)
    }
    updateDraft(path, nextLines.join('\n'))
  }

  return (
    <div className="frontmatter-suggest">
      <div className="frontmatter-suggest__label">
        {field ? `values for ${field}` : 'frontmatter fields'}
      </div>
      <div className="frontmatter-suggest__list">
        {suggestions.map((suggestion) => (
          <button key={suggestion} type="button" onClick={() => insert(suggestion)}>
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  )
}
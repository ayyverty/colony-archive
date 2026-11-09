import { useArchiveStore } from '../state/store'
import type { EditorActionKind } from '../state/store'

interface Tool {
  kind: EditorActionKind
  label: string
  title: string
}

const TOOLS: Tool[] = [
  { kind: 'bold', label: 'B', title: 'Bold (Ctrl+B)' },
  { kind: 'italic', label: 'I', title: 'Italic (Ctrl+I)' },
  { kind: 'heading', label: 'H', title: 'Heading' },
  { kind: 'list', label: '≡', title: 'Bullet list' },
  { kind: 'link', label: '↗', title: 'Link' },
  { kind: 'table', label: '▦', title: 'Insert table' }
]

export function FormattingToolbar() {
  const selected = useArchiveStore((state) => state.selected)
  const requestEditorAction = useArchiveStore((state) => state.requestEditorAction)
  const focusMode = useArchiveStore((state) => state.focusMode)
  const toggleFocusMode = useArchiveStore((state) => state.toggleFocusMode)
  const typewriterScroll = useArchiveStore((state) => state.typewriterScroll)
  const toggleTypewriter = useArchiveStore((state) => state.toggleTypewriter)

  if (!selected) return null

  return (
    <div className="format-bar">
      {TOOLS.map((tool) => (
        <button
          key={tool.kind}
          type="button"
          className="format-bar__btn"
          title={tool.title}
          onClick={() => requestEditorAction(tool.kind)}
        >
          {tool.label}
        </button>
      ))}
      <div className="format-bar__spacer" />
      <button
        type="button"
        className={`format-bar__btn format-bar__btn--wide ${focusMode ? 'is-active' : ''}`}
        title="Focus mode (Ctrl+Shift+F)"
        onClick={toggleFocusMode}
      >
        focus
      </button>
      <button
        type="button"
        className={`format-bar__btn format-bar__btn--wide ${typewriterScroll ? 'is-active' : ''}`}
        title="Typewriter scrolling"
        onClick={toggleTypewriter}
      >
        type
      </button>
    </div>
  )
}

import { useEffect, useRef } from 'react'
import { Compartment, EditorState, RangeSetBuilder, StateField } from '@codemirror/state'
import {
  EditorView,
  crosshairCursor,
  drawSelection,
  dropCursor,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  placeholder,
  rectangularSelection,
  scrollPastEnd,
  ViewPlugin
} from '@codemirror/view'
import type { DecorationSet, ViewUpdate } from '@codemirror/view'
import { Decoration } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { highlightSelectionMatches, search, searchKeymap } from '@codemirror/search'
import { markdown } from '@codemirror/lang-markdown'
import {
  HighlightStyle,
  bracketMatching,
  indentOnInput,
  syntaxHighlighting
} from '@codemirror/language'
import { linter } from '@codemirror/lint'
import { tags } from '@lezer/highlight'
import { findTitleCaseHeadings } from '../lib/lint'
import { applyTableAction, detectTable } from '../lib/table'
import { playKeyClick } from '../lib/audio'
import { runCommand } from '../lib/runCommandHandler'
import type { TableAction } from '../lib/table'
import type { EditorAction, EditorActionKind, TableInfo } from '../state/store'

const markdownHighlight = HighlightStyle.define([
  { tag: tags.heading1, color: 'var(--cm-heading)', fontWeight: '700' },
  { tag: tags.heading2, color: 'var(--cm-heading)', fontWeight: '600' },
  { tag: tags.heading3, color: 'var(--cm-heading)', fontWeight: '600' },
  { tag: tags.heading4, color: 'var(--cm-heading)' },
  { tag: tags.heading5, color: 'var(--cm-heading)' },
  { tag: tags.heading6, color: 'var(--cm-heading)' },
  { tag: tags.strong, color: 'var(--text)', fontWeight: '700' },
  { tag: tags.emphasis, color: 'var(--text)', fontStyle: 'italic' },
  { tag: tags.strikethrough, color: 'var(--text-faint)', textDecoration: 'line-through' },
  { tag: tags.link, color: 'var(--accent)' },
  { tag: tags.url, color: 'var(--accent-dim)' },
  { tag: tags.monospace, color: 'var(--cm-keyword)' },
  { tag: tags.quote, color: 'var(--text-dim)', fontStyle: 'italic' },
  { tag: tags.list, color: 'var(--accent-dim)' },
  { tag: tags.contentSeparator, color: 'var(--line-strong)' },
  { tag: tags.processingInstruction, color: 'var(--cm-marker)' },
  { tag: tags.meta, color: 'var(--text-faint)' },
  { tag: tags.comment, color: 'var(--text-faint)', fontStyle: 'italic' },
  { tag: tags.keyword, color: 'var(--cm-keyword)' },
  { tag: tags.string, color: 'var(--cm-string)' },
  { tag: tags.number, color: 'var(--cm-string)' },
  { tag: tags.atom, color: 'var(--cm-keyword)' }
])

const colonyTheme = EditorView.theme(
  {
    '&': {
      height: '100%',
      backgroundColor: 'var(--bg-1)',
      color: 'var(--text)',
      fontSize: '13.5px'
    },
    '.cm-scroller': {
      fontFamily: 'var(--font-mono)',
      lineHeight: '1.75'
    },
    '.cm-content': {
      padding: '20px 0 38vh',
      caretColor: 'var(--accent)'
    },
    '.cm-line': {
      padding: '0 26px 0 10px',
      transition: 'opacity 140ms var(--ease)'
    },
    '.cm-line.cm-dim': {
      opacity: '0.36'
    },
    '.cm-gutters': {
      backgroundColor: 'var(--bg-1)',
      color: 'var(--text-faint)',
      border: 'none',
      borderRight: '1px solid var(--line)'
    },
    '.cm-lineNumbers .cm-gutterElement': {
      minWidth: '36px',
      padding: '0 8px 0 14px'
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'transparent',
      color: 'var(--accent-dim)'
    },
    '.cm-activeLine': {
      backgroundColor: 'var(--cm-active-line)'
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: 'var(--accent)',
      borderLeftWidth: '2px'
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: 'var(--cm-selection)'
    },
    '.cm-selectionMatch': {
      backgroundColor: 'var(--accent-soft)'
    },
    '.cm-searchMatch': {
      backgroundColor: 'var(--accent-soft)',
      outline: '1px solid var(--accent-dim)'
    },
    '.cm-panels': {
      backgroundColor: 'var(--bg-2)',
      color: 'var(--text)',
      borderTop: '1px solid var(--line)'
    },
    '.cm-panels.cm-panels-top': {
      borderTop: 'none',
      borderBottom: '1px solid var(--line)'
    },
    '.cm-panel input': {
      padding: '2px 6px',
      border: '1px solid var(--line-strong)',
      backgroundColor: 'var(--bg-1)',
      color: 'var(--text)',
      fontFamily: 'var(--font-mono)',
      fontSize: '11px'
    },
    '.cm-panel button': {
      padding: '2px 8px',
      border: '1px solid var(--line-strong)',
      backgroundColor: 'transparent',
      color: 'var(--text-dim)',
      fontFamily: 'var(--font-mono)',
      fontSize: '10px',
      letterSpacing: '0.1em',
      textTransform: 'uppercase'
    },
    '.cm-tooltip': {
      border: '1px solid var(--line-strong)',
      backgroundColor: 'var(--bg-3)',
      color: 'var(--text)'
    },
    '.cm-diagnostic-warning': {
      paddingLeft: '8px',
      borderLeft: '2px solid var(--warn)'
    },
    '.cm-lintRange-warning': {
      backgroundImage: 'none',
      borderBottom: '1px dashed var(--warn)'
    },
    '.cm-foldPlaceholder': {
      border: '1px solid var(--line)',
      backgroundColor: 'var(--bg-3)',
      color: 'var(--accent-dim)'
    },
    '.cm-placeholder': {
      color: 'var(--text-faint)',
      fontStyle: 'normal'
    }
  },
  { dark: false }
)

const lintExtension = linter(
  (view) => {
    const length = view.state.doc.length
    return findTitleCaseHeadings(view.state.doc.toString()).map((warning) => ({
      from: warning.from,
      to: Math.min(length, Math.max(warning.from + 1, warning.to)),
      severity: 'warning' as const,
      message: `RimWorld style prefers sentence case: "${warning.text}"`
    }))
  },
  { delay: 500 }
)

function buildDim(state: EditorState): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  const active = state.doc.lineAt(state.selection.main.head).number
  for (let number = 1; number <= state.doc.lines; number += 1) {
    if (number === active) continue
    const line = state.doc.line(number)
    builder.add(line.from, line.from, Decoration.line({ class: 'cm-dim' }))
  }
  return builder.finish()
}

const dimField = StateField.define<DecorationSet>({
  create: buildDim,
  update(value, transaction) {
    if (transaction.docChanged || transaction.selection) return buildDim(transaction.state)
    return value
  },
  provide: (field) => EditorView.decorations.from(field)
})

const typewriterPlugin = ViewPlugin.fromClass(
  class {
    update(update: ViewUpdate) {
      if (!update.docChanged && !update.selectionSet) return
      const head = update.state.selection.main.head
      const coords = update.view.coordsAtPos(head)
      if (!coords) return
      const scroller = update.view.scrollDOM
      const rect = scroller.getBoundingClientRect()
      const delta = coords.top - (rect.top + rect.height / 2)
      if (Math.abs(delta) > 3) scroller.scrollTop += delta
    }
  }
)

function wrapSelection(
  view: EditorView,
  before: string,
  after: string,
  placeholderText: string
): void {
  const { from, to } = view.state.selection.main
  const selected = view.state.sliceDoc(from, to)
  const body = selected || placeholderText
  const insert = `${before}${body}${after}`
  view.dispatch({
    changes: { from, to, insert },
    selection: { anchor: from + before.length, head: from + before.length + body.length },
    scrollIntoView: true,
    userEvent: 'input'
  })
  view.focus()
}

function prefixLine(view: EditorView, prefix: string): void {
  const head = view.state.selection.main.head
  const line = view.state.doc.lineAt(head)
  const existing = /^(#{1,6}|[-*+]|\d+[.)])\s+/.exec(line.text)
  if (existing) {
    view.dispatch({
      changes: { from: line.from, to: line.from + existing[0].length, insert: prefix },
      selection: { anchor: line.from + prefix.length },
      scrollIntoView: true,
      userEvent: 'input'
    })
  } else {
    view.dispatch({
      changes: { from: line.from, insert: prefix },
      selection: { anchor: head + prefix.length },
      scrollIntoView: true,
      userEvent: 'input'
    })
  }
  view.focus()
}

const TABLE_TEMPLATE = '| Column | Column |\n| --- | --- |\n|  |  |\n'

function applyAction(view: EditorView, kind: EditorActionKind): void {
  switch (kind) {
    case 'bold':
      wrapSelection(view, '**', '**', 'bold text')
      break
    case 'italic':
      wrapSelection(view, '*', '*', 'italic text')
      break
    case 'heading':
      prefixLine(view, '## ')
      break
    case 'list':
      prefixLine(view, '- ')
      break
    case 'link': {
      const { from, to } = view.state.selection.main
      const selected = view.state.sliceDoc(from, to) || 'link text'
      const insert = `[${selected}](https://)`
      view.dispatch({
        changes: { from, to, insert },
        selection: { anchor: from + selected.length + 3, head: from + insert.length - 1 },
        scrollIntoView: true,
        userEvent: 'input'
      })
      view.focus()
      break
    }
    case 'table': {
      const { from, to } = view.state.selection.main
      view.dispatch({
        changes: { from, to, insert: TABLE_TEMPLATE },
        selection: { anchor: from + 2 },
        scrollIntoView: true,
        userEvent: 'input'
      })
      view.focus()
      break
    }
    case 'table-add-row':
    case 'table-remove-row':
    case 'table-add-col':
    case 'table-remove-col': {
      const head = view.state.selection.main.head
      const tableAction = kind.replace('table-', '') as TableAction
      const result = applyTableAction(view.state.doc.toString(), head, tableAction)
      if (!result) return
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: result.doc },
        selection: { anchor: result.pos },
        scrollIntoView: true,
        userEvent: 'input'
      })
      view.focus()
      break
    }
    default:
      break
  }
}

interface EditorProps {
  path: string
  value: string
  linterEnabled: boolean
  typewriter: boolean
  focusMode: boolean
  keyclick: boolean
  readOnly: boolean
  onChange: (value: string) => void
  onCursor: (line: number, col: number) => void
  onTableInfo: (info: TableInfo | null) => void
  onRunCommand: (slashPos: number, coords: { left: number; top: number }) => void
  executeRef?: React.MutableRefObject<((commandId: string, slashPos: number) => void) | null>
  insertRequest: { id: number; text: string } | null
  action: EditorAction | null
}

export function Editor({
  value,
  linterEnabled,
  typewriter,
  focusMode,
  keyclick,
  readOnly,
  onChange,
  onCursor,
  onTableInfo,
  onRunCommand,
  executeRef,
  insertRequest,
  action
}: EditorProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const initialValue = useRef(value)
  const initialLinter = useRef(linterEnabled)
  const initialTypewriter = useRef(typewriter)
  const initialFocus = useRef(focusMode)
  const initialReadOnly = useRef(readOnly)
  const callbacks = useRef({ onChange, onCursor, onTableInfo })
  const lastInsert = useRef<number | null>(insertRequest?.id ?? null)
  const lastAction = useRef<number | null>(action?.id ?? null)
  const lastTable = useRef('')
  const lintCompartment = useRef(new Compartment()).current
  const typewriterCompartment = useRef(new Compartment()).current
  const focusCompartment = useRef(new Compartment()).current
  const readOnlyCompartment = useRef(new Compartment()).current

  callbacks.current = { onChange, onCursor, onTableInfo }

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let view: EditorView
    view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: initialValue.current,
        extensions: [
          lineNumbers(),
          highlightActiveLineGutter(),
          highlightSpecialChars(),
          history(),
          drawSelection(),
          dropCursor(),
          EditorState.allowMultipleSelections.of(true),
          indentOnInput(),
          bracketMatching(),
          rectangularSelection(),
          crosshairCursor(),
          highlightActiveLine(),
          highlightSelectionMatches(),
          search({ top: true }),
          scrollPastEnd(),
          EditorView.lineWrapping,
          markdown(),
          syntaxHighlighting(markdownHighlight),
          colonyTheme,
          placeholder('// begin record…'),
          EditorView.contentAttributes.of({ spellcheck: 'false' }),
          keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, indentWithTab]),
          lintCompartment.of(initialLinter.current ? lintExtension : []),
          typewriterCompartment.of(initialTypewriter.current ? typewriterPlugin : []),
          focusCompartment.of(initialFocus.current ? dimField : []),
          readOnlyCompartment.of(
            initialReadOnly.current
              ? [EditorState.readOnly.of(true), EditorView.editable.of(false)]
              : []
          ),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              callbacks.current.onChange(update.state.doc.toString())
            }
            if (update.selectionSet || update.docChanged) {
              const head = update.state.selection.main.head
              const line = update.state.doc.lineAt(head)
              callbacks.current.onCursor(line.number, head - line.from + 1)
            }
            if (update.selectionSet || update.docChanged) {
              const info = tableInfoFor(update.state.doc.toString(), update.state.selection.main.head)
              const key = info ? `${info.row}:${info.col}:${info.rows}:${info.cols}` : ''
              if (key !== lastTable.current) {
                lastTable.current = key
                callbacks.current.onTableInfo(info)
              }
            }
          })
        ]
      })
    })

    viewRef.current = view
    if (executeRef) executeRef.current = (commandId, slashPos) => {
      void runCommand(commandId, slashPos, view)
    }
    view.focus()

    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [focusCompartment, lintCompartment, typewriterCompartment])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (value !== current) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: value } })
    }
  }, [value])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({
      effects: lintCompartment.reconfigure(linterEnabled ? lintExtension : [])
    })
  }, [linterEnabled, lintCompartment])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({
      effects: typewriterCompartment.reconfigure(typewriter ? typewriterPlugin : [])
    })
  }, [typewriter, typewriterCompartment])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({
      effects: focusCompartment.reconfigure(focusMode ? dimField : [])
    })
  }, [focusMode, focusCompartment])

  useEffect(() => {
    const view = viewRef.current
    if (!view || !keyclick) return
    const handler = (event: KeyboardEvent): void => {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (event.key.length !== 1) return
      playKeyClick()
    }
    view.dom.addEventListener('keydown', handler)
    return () => view.dom.removeEventListener('keydown', handler)
  }, [keyclick])

  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({
      effects: readOnlyCompartment.reconfigure(
        readOnly ? [EditorState.readOnly.of(true), EditorView.editable.of(false)] : []
      )
    })
  }, [readOnly, readOnlyCompartment])

  useEffect(() => {
    if (!insertRequest || lastInsert.current === insertRequest.id) return
    lastInsert.current = insertRequest.id
    const view = viewRef.current
    if (!view) return
    const { from, to } = view.state.selection.main
    view.dispatch({
      changes: { from, to, insert: insertRequest.text },
      selection: { anchor: from + insertRequest.text.length },
      scrollIntoView: true,
      userEvent: 'input'
    })
    view.focus()
  }, [insertRequest])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const handler = (event: KeyboardEvent): void => {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return
      const view = viewRef.current
      if (!view) return
      const { from, to } = view.state.selection.main
      if (from !== to) return
      const line = view.state.doc.lineAt(from)
      if (line.text.slice(0, from - line.from).trim() !== '') return
      const coords = view.coordsAtPos(from + 1)
      window.setTimeout(() => onRunCommand(from + 1, coords ?? { left: 80, top: 80 }), 0)
    }
    host.addEventListener('keydown', handler)
    return () => host.removeEventListener('keydown', handler)
  }, [onRunCommand])

  useEffect(() => {
    if (!action || lastAction.current === action.id) return
    lastAction.current = action.id
    const view = viewRef.current
    if (!view) return
    applyAction(view, action.kind)
  }, [action])

  return <div className="editor-host" ref={hostRef} />
}

function tableInfoFor(source: string, pos: number): TableInfo | null {
  const detection = detectTable(source, pos)
  if (!detection) return null
  return {
    row: Math.max(0, detection.row - 2),
    col: detection.col,
    rows: Math.max(0, detection.dataRows),
    cols: detection.cols
  }
}

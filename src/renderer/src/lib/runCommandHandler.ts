import { useArchiveStore } from '../state/store'
import { RUN_COMMANDS, timestampText } from '../lib/runCommands'
import type { EditorView } from '@codemirror/view'

export async function runCommand(commandId: string, slashPos: number, view: EditorView | null): Promise<void> {
  const store = useArchiveStore.getState()
  const selected = store.selected
  if (!selected || !view) return

  const command = RUN_COMMANDS.find((item) => item.id === commandId)
  if (!command) return

  if (commandId === 'timestamp') {
    replaceSlash(view, slashPos, timestampText())
    return
  }

  if (commandId === 'file-to') {
    const folder = window.prompt('Move this record to folder (leave blank for root):', '')
    if (folder === null) return
    await store.movePath(selected, folder.trim())
    replaceSlash(view, slashPos, '')
    return
  }

  if (commandId === 'link') {
    const target = window.prompt('Link to record:', '')
    if (!target) return
    replaceSlash(view, slashPos, `[[${target}]]`)
    return
  }

  if (commandId === 'see-also') {
    replaceSlash(view, slashPos, '## See also\n\n- ')
    return
  }

  if (commandId === 'redacted') {
    replaceSlash(view, slashPos, '> [!redacted] Classified\n> \n')
    return
  }

  if (command.template) {
    replaceSlash(view, slashPos, command.template)
    return
  }
}

function replaceSlash(view: EditorView, slashPos: number, text: string) {
  view.dispatch({
    changes: { from: slashPos - 1, to: slashPos, insert: text },
    selection: { anchor: slashPos - 1 + text.length },
    scrollIntoView: true,
    userEvent: 'input'
  })
}
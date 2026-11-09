import { formatTime } from './clock'

export interface RunCommand {
  id: string
  label: string
  hint: string
  keywords: string[]
  template?: string
}

export const RUN_COMMANDS: RunCommand[] = [
  {
    id: 'colonist',
    label: '/colonist',
    hint: 'insert colonist dossier',
    keywords: ['colonist', 'person', 'crew'],
    template: [
      '---',
      'title: ',
      'type: colonist',
      'status: alive',
      'backstory: ',
      'traits: []',
      'skills: []',
      'health_conditions: []',
      'mood: content',
      '---',
      '',
      '# ',
      ''
    ].join('\n')
  },
  {
    id: 'faction',
    label: '/faction',
    hint: 'insert faction record',
    keywords: ['faction', 'group'],
    template: [
      '---',
      'title: ',
      'type: faction',
      'stance: neutral',
      '---',
      '',
      '# ',
      ''
    ].join('\n')
  },
  {
    id: 'event',
    label: '/event',
    hint: 'insert dated event',
    keywords: ['event', 'raid', 'trade'],
    template: [
      '---',
      'title: ',
      'type: event',
      'date: ',
      '---',
      '',
      '# ',
      ''
    ].join('\n')
  },
  {
    id: 'timestamp',
    label: '/timestamp',
    hint: 'insert current colony time',
    keywords: ['timestamp', 'time', 'date'],
  },
  {
    id: 'file-to',
    label: '/file-to',
    hint: 'move this record to a folder',
    keywords: ['file', 'move', 'folder'],
  },
  {
    id: 'redacted',
    label: '/redacted',
    hint: 'insert redacted callout',
    keywords: ['redacted', 'secret'],
    template: '> [!redacted] Classified\n> \n'
  },
  {
    id: 'table',
    label: '/table',
    hint: 'insert Markdown table',
    keywords: ['table', 'grid'],
    template: '| Column | Column |\n| --- | --- |\n|  |  |\n'
  }
]

export function filterRunCommands(query: string): RunCommand[] {
  const needle = query.trim().toLowerCase().replace(/^\//, '')
  if (!needle) return RUN_COMMANDS
  return RUN_COMMANDS.filter((command) =>
    command.id.includes(needle) ||
    command.label.toLowerCase().includes(needle) ||
    command.keywords.some((keyword) => keyword.includes(needle))
  )
}

export function timestampText(): string {
  const now = new Date()
  return `${now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' })} · ${formatTime(now)}`
}
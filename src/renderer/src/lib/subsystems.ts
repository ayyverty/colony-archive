export const SUBSYSTEMS = {
  archive: 'ARCHIVE.EXE',
  index: 'INDEXER.SVC',
  diagnostics: 'DIAGNOSTICS.SYS',
  graph: 'GRAPH.SVC',
  manual: 'MANUAL.SYS',
  backlinks: 'INDEXER.SVC',
  timeline: 'CHRONO.SVC',
  history: 'HISTORY.LIB',
  templates: 'TEMPLATES.LIB',
  export: 'EXPORT.SYS',
  dashboard: 'ARCHIVE.EXE'
} as const

export type SubsystemName = (typeof SUBSYSTEMS)[keyof typeof SUBSYSTEMS]
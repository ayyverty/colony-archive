export interface PathParts {
  root: string
  dir: string
  file: string
  ext: string
}

export function splitPathForDisplay(path: string): PathParts {
  const normalized = path.replace(/\\/g, '/')
  const lastSlash = normalized.lastIndexOf('/')
  const dir = lastSlash >= 0 ? normalized.slice(0, lastSlash + 1) : ''
  const file = lastSlash >= 0 ? normalized.slice(lastSlash + 1) : normalized
  const dot = file.lastIndexOf('.')
  const ext = dot > 0 ? file.slice(dot) : ''
  const base = ext ? file.slice(0, dot) : file
  return { root: '~/', dir, file: base, ext }
}
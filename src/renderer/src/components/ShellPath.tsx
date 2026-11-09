import { splitPathForDisplay } from '../lib/pathDisplay'

export function ShellPath({ path, className = '' }: { path: string; className?: string }) {
  const parts = splitPathForDisplay(path)
  return (
    <span className={`shell-path ${className}`}>
      <span className="path-part--root">{parts.root}</span>
      {parts.dir ? <span className="path-part--dir">{parts.dir}</span> : null}
      <span className="path-part--file">{parts.file}</span>
      {parts.ext ? <span className="path-part--ext">{parts.ext}</span> : null}
    </span>
  )
}
import type { ArchiveErrorCode } from './types'

export interface CodedError {
  code: ArchiveErrorCode
  message: string
}

export const ERROR_LABELS: Record<ArchiveErrorCode, string> = {
  'E-000': 'UNEXPECTED ERROR',
  'E-041': 'ARCHIVE UNREACHABLE',
  'E-102': 'PATH REJECTED',
  'E-117': 'MALFORMED FRONTMATTER',
  'E-118': 'EMPTY RECORD',
  'E-203': 'UNRESOLVED LINK',
  'E-204': 'ORPHAN RECORD',
  'E-301': 'SAVE FAILED',
  'E-404': 'RECORD NOT FOUND'
}

export function codedError(code: ArchiveErrorCode, message: string): CodedError {
  return { code, message }
}

export function formatCodedError(code: ArchiveErrorCode, message: string): string {
  return `${code} ${ERROR_LABELS[code]} — ${message}`
}

export function isCodedError(value: unknown): value is CodedError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'code' in value &&
    'message' in value
  )
}
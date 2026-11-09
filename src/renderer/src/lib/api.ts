import type { ApiResult } from '@shared/types'
import { ERROR_LABELS } from '@shared/errors'

/** Unwraps the IPC envelope, turning a failure into a normal thrown Error. */
export async function call<T>(promise: Promise<ApiResult<T>>): Promise<T> {
  const result = await promise
  if (!result.ok) {
    const message =
      result.code && result.code in ERROR_LABELS
        ? `${result.code} ${ERROR_LABELS[result.code]} — ${result.error}`
        : result.error
    throw new Error(message)
  }
  return result.data
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string' && error) return error
  return 'An unexpected error occurred.'
}

import type { ResolvedTheme, ThemeSetting } from '@shared/types'

const DARK_QUERY = '(prefers-color-scheme: dark)'

export function prefersDark(): boolean {
  return window.matchMedia(DARK_QUERY).matches
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function resolveTheme(setting: ThemeSetting): ResolvedTheme {
  if (setting === 'system') return prefersDark() ? 'dark' : 'light'
  return setting
}

/** Applies the resolved theme to the document and returns it. */
export function applyTheme(setting: ThemeSetting): ResolvedTheme {
  const resolved = resolveTheme(setting)
  document.documentElement.dataset.theme = resolved
  return resolved
}

export function onSystemThemeChange(callback: () => void): () => void {
  const query = window.matchMedia(DARK_QUERY)
  query.addEventListener('change', callback)
  return () => query.removeEventListener('change', callback)
}

import type { ColonyApi } from '../shared/types'

declare global {
  interface Window {
    api: ColonyApi
  }
}

export {}

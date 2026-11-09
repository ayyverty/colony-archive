const RIM_QUADRUMS = ['Aprimay', 'Jugust', 'Septober', 'Decembary'] as const

export function pad(value: number, width = 2): string {
  return String(value).padStart(width, '0')
}

export function formatTime(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export function formatUptime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

export function rimShipDate(now: Date, foundedYear: number | null): string {
  const year = foundedYear ?? 5501
  const start = new Date(now.getFullYear(), 0, 1)
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000)
  const rimDay = (dayOfYear % 60) + 1
  const quadrumIndex = Math.floor((rimDay - 1) / 15)
  const day = ((rimDay - 1) % 15) + 1
  const shipYear = year + Math.floor(dayOfYear / 60)
  return `${shipYear} ${RIM_QUADRUMS[quadrumIndex]} ${day}`
}
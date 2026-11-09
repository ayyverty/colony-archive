import { useEffect, useState } from 'react'
import { useArchiveStore } from '../state/store'
import { formatTime, formatUptime, rimShipDate } from '../lib/clock'

const SESSION_START = Date.now()

export function SystemClock() {
  const archiveMeta = useArchiveStore((state) => state.archiveMeta)
  const syncArchiveDate = useArchiveStore((state) => state.syncArchiveDate)
  const setArchiveDate = useArchiveStore((state) => state.setArchiveDate)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const colonyDate = archiveMeta?.currentDate ?? (archiveMeta?.founded ? `${archiveMeta.founded}-01-01` : null)
  const shipDate = colonyDate ?? rimShipDate(new Date(now), archiveMeta?.founded ? Number(archiveMeta.founded) : null)

  return (
    <div className="titlebar__clock" title="Colony date and session uptime">
      <button
        type="button"
        className="titlebar__clock-date"
        onClick={() => void syncArchiveDate()}
        title="Advance colony date by one day"
      >
        {shipDate}
      </button>
      <span className="titlebar__clock-time">{formatTime(new Date(now))}</span>
      <span className="titlebar__clock-up">UP {formatUptime(now - SESSION_START)}</span>
      <button
        type="button"
        className="titlebar__clock-sync"
        onClick={() => {
          const value = window.prompt('Set colony date (YYYY-Q-DD)', colonyDate ?? '')
          if (value) void setArchiveDate(value)
        }}
        title="Set colony date"
      >
        sync
      </button>
    </div>
  )
}
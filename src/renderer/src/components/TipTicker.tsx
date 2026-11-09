import { useEffect, useState } from 'react'

const TIPS = [
  'Tip: type / for templates.',
  'Tip: [[links]] create backlinks.',
  'Tip: drop images into the editor to attach evidence.',
  'Tip: type --- to get frontmatter suggestions.',
  'Tip: open F2 INDEXER.SVC to search the archive.',
  'Tip: classify pages as public, internal, or classified.'
]

export function TipTicker() {
  const [index, setIndex] = useState(0)
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem('colony-tips-dismissed') === 'true')

  useEffect(() => {
    if (dismissed) return
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % TIPS.length), 8000)
    return () => window.clearInterval(timer)
  }, [dismissed])

  if (dismissed) return null

  return (
    <div className="tip-ticker">
      <span>{TIPS[index]}</span>
      <button type="button" onClick={() => setDismissed(true)} aria-label="Dismiss tip">
        ×
      </button>
    </div>
  )
}
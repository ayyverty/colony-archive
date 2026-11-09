import { useArchiveStore } from '../state/store'

export function MountSequence() {
  const mounting = useArchiveStore((state) => state.mounting)
  const mountLines = useArchiveStore((state) => state.mountLines)
  const setMounting = (value: boolean) => useArchiveStore.setState({ mounting: value })

  if (!mounting) return null

  return (
    <div className="mount-sequence" onClick={() => setMounting(false)}>
      <div className="mount-sequence__panel">
        <div className="mount-sequence__title">MOUNT SEQUENCE</div>
        {mountLines.map((line, index) => (
          <div
            key={`${line}-${index}`}
            className="mount-sequence__line"
            style={{ animationDelay: `${index * 90}ms` }}
          >
            {line}
          </div>
        ))}
        <div className="mount-sequence__hint">click to skip</div>
      </div>
    </div>
  )
}
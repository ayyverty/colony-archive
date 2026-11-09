let audioContext: AudioContext | null = null

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (audioContext) return audioContext
  const AudioCtor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioCtor) return null
  try {
    audioContext = new AudioCtor()
  } catch {
    audioContext = null
  }
  return audioContext
}

export function playKeyClick(): void {
  const context = getContext()
  if (!context) return
  try {
    if (context.state === 'suspended') void context.resume()
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'square'
    oscillator.frequency.value = 1320
    gain.gain.value = 0.018
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.035)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.04)
  } catch {
    // Audio is best-effort and must never break typing.
  }
}
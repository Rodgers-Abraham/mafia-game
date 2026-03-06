// ── Sound Manager ─────────────────────────────────────────────────────
const audioCache: { [key: string]: HTMLAudioElement } = {}

const SOUNDS = {
  night:       '/sounds/night.mp3',
  day:         '/sounds/day.mp3',
  death:       '/sounds/death.mp3',
  vote:        '/sounds/vote.mp3',
  investigate: '/sounds/investigate.mp3',
  cardFlip:    '/sounds/card-flip.mp3',
  win:         '/sounds/win.mp3',
  lose:        '/sounds/lose.mp3',
  button:      '/sounds/button.mp3',
  briefing:    '/sounds/briefing.mp3',
} as const

export type SoundName = keyof typeof SOUNDS

function getAudio(name: SoundName): HTMLAudioElement | null {
  if (typeof window === 'undefined') return null
  if (!audioCache[name]) {
    const audio = new Audio(SOUNDS[name])
    audio.preload = 'auto'
    audioCache[name] = audio
  }
  return audioCache[name]
}

export function playSound(name: SoundName, volume = 0.7, loop = false): void {
  try {
    const audio = getAudio(name)
    if (!audio) return
    audio.volume = volume
    audio.loop = loop
    audio.currentTime = 0
    audio.play().catch(() => {
      // Browser autoplay policy — ignore silently
    })
  } catch (e) {
    // Ignore
  }
}

export function stopSound(name: SoundName): void {
  try {
    const audio = audioCache[name]
    if (!audio) return
    audio.pause()
    audio.currentTime = 0
  } catch (e) {}
}

export function stopAllSounds(): void {
  Object.keys(audioCache).forEach(key => {
    try {
      audioCache[key].pause()
      audioCache[key].currentTime = 0
    } catch (e) {}
  })
}

export function setVolume(name: SoundName, volume: number): void {
  const audio = audioCache[name]
  if (audio) audio.volume = Math.max(0, Math.min(1, volume))
}

// Preload all sounds
export function preloadSounds(): void {
  if (typeof window === 'undefined') return
  Object.keys(SOUNDS).forEach(name => getAudio(name as SoundName))
}
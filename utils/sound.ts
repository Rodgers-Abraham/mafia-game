const sounds: { [key: string]: HTMLAudioElement } = {}

const soundFiles: { [key: string]: string } = {
  nightPhase: '/sounds/night-phase.mp3',
  dayPhase: '/sounds/day-phase.mp3',
  elimination: '/sounds/elimination.mp3',
  vote: '/sounds/vote.mp3',
  roleReveal: '/sounds/role-reveal.mp3',
  gameOver: '/sounds/game-over.mp3',
  win: '/sounds/win.mp3',
  click: '/sounds/click.mp3',
  investigate: '/sounds/investigate.mp3',
  protect: '/sounds/protect.mp3',
}

export function playSound(name: keyof typeof soundFiles) {
  if (typeof window === 'undefined') return

  try {
    if (!sounds[name]) {
      sounds[name] = new Audio(soundFiles[name])
      sounds[name].volume = 0.5
    }
    sounds[name].currentTime = 0
    sounds[name].play().catch(() => {
      // Autoplay blocked — ignore silently
    })
  } catch (e) {
    // Sound not found — ignore silently
  }
}

export function stopSound(name: keyof typeof soundFiles) {
  if (sounds[name]) {
    sounds[name].pause()
    sounds[name].currentTime = 0
  }
}

export function setVolume(name: keyof typeof soundFiles, volume: number) {
  if (sounds[name]) {
    sounds[name].volume = Math.min(1, Math.max(0, volume))
  }
}
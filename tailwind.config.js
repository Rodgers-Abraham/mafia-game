module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        mafia: {
          dark: '#0a0005',
          darker: '#050003',
          card: '#110011',
          border: '#3d0020',
          red: '#8B0000',
          gold: '#FFD700',
          blood: '#DC143C',
        },
        role: {
          mafia: '#8B0000',
          godfather: '#DC143C',
          detective: '#1E90FF',
          doctor: '#00A86B',
          bodyguard: '#708090',
          vigilante: '#FF6600',
          roleblocker: '#800080',
          jester: '#FFD700',
          mayor: '#DAA520',
          villager: '#F5F5DC',
        }
      },
      fontFamily: {
        spooky: ['Creepster', 'cursive'],
        body: ['Crimson Text', 'serif'],
        mono: ['Share Tech Mono', 'monospace'],
      },
      animation: {
        fadeIn: 'fadeIn 0.5s ease-in',
        slideUp: 'slideUp 0.5s ease-out',
        flicker: 'flicker 3s infinite',
        bloodDrip: 'bloodDrip 2s ease-in-out infinite',
        float: 'float 3s ease-in-out infinite',
        glowPulse: 'glowPulse 2s ease-in-out infinite',
        cardFlip: 'cardFlip 0.6s ease-in-out',
        shake: 'shake 0.5s ease-in-out',
        nightFade: 'nightFade 1s ease-in-out',
        dayFade: 'dayFade 1s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(30px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '10%': { opacity: '0.8' },
          '20%': { opacity: '1' },
          '30%': { opacity: '0.6' },
          '40%': { opacity: '1' },
          '50%': { opacity: '0.9' },
          '60%': { opacity: '0.7' },
          '70%': { opacity: '1' },
        },
        bloodDrip: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(8px)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(139,0,0,0.5)' },
          '50%': { boxShadow: '0 0 30px rgba(139,0,0,1), 0 0 60px rgba(139,0,0,0.5)' },
        },
        cardFlip: {
          '0%': { transform: 'rotateY(0deg)' },
          '50%': { transform: 'rotateY(90deg)' },
          '100%': { transform: 'rotateY(0deg)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-5px)' },
          '40%': { transform: 'translateX(5px)' },
          '60%': { transform: 'translateX(-3px)' },
          '80%': { transform: 'translateX(3px)' },
        },
        nightFade: {
          '0%': { background: '#0a0005', opacity: '0' },
          '100%': { background: '#000010', opacity: '1' },
        },
        dayFade: {
          '0%': { background: '#000010', opacity: '0' },
          '100%': { background: '#1a0505', opacity: '1' },
        },
      },
      backgroundImage: {
        'night-sky': "url('/images/night-bg.svg')",
        'blood-texture': "radial-gradient(ellipse at top, #1a0000 0%, #0a0005 100%)",
        'day-texture': "radial-gradient(ellipse at top, #1a0505 0%, #0a0005 100%)",
      },
      boxShadow: {
        'glow-red': '0 0 20px rgba(139,0,0,0.8)',
        'glow-blue': '0 0 20px rgba(30,144,255,0.8)',
        'glow-green': '0 0 20px rgba(0,168,107,0.8)',
        'glow-gold': '0 0 20px rgba(255,215,0,0.8)',
        'glow-purple': '0 0 20px rgba(128,0,128,0.8)',
        'glow-orange': '0 0 20px rgba(255,102,0,0.8)',
      }
    },
  },
  plugins: [],
}
import { Room } from '@/types/game'
import { useEffect, useState } from 'react'
import { playSound, stopAllSounds } from '@/utils/sound'
import React from 'react'

interface ResultsPhaseProps {
  room: Room
}

const ROLE_EMOJIS: { [key: string]: string } = {
  Mafia: '🔫', Godfather: '👑', Villager: '👤',
  Detective: '🔍', Doctor: '💉', Bodyguard: '🛡️',
  Vigilante: '⚔️', RoleBlocker: '🚫', Jester: '🤡', Mayor: '🏛️',
}
const ROLE_COLORS: { [key: string]: string } = {
  Mafia: '#8B0000', Godfather: '#DC143C', Villager: '#aaa',
  Detective: '#1E90FF', Doctor: '#00A86B', Bodyguard: '#708090',
  Vigilante: '#FF6600', RoleBlocker: '#800080', Jester: '#FFD700', Mayor: '#DAA520',
}

export default function ResultsPhase({ room }: ResultsPhaseProps) {
  const [revealed, setRevealed] = useState(false)
  const [countdown, setCountdown] = useState(5)

  const deadPlayers = room.players.filter((p) => !p.isAlive)
  const lastDead = deadPlayers[deadPlayers.length - 1]

  useEffect(() => {
    stopAllSounds()
    if (lastDead) playSound('death', 0.7)
    const t = setTimeout(() => setRevealed(true), 600)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!revealed) return
    const interval = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000)
    return () => clearInterval(interval)
  }, [revealed])

  const roleColor = lastDead?.role ? (ROLE_COLORS[lastDead.role] || '#aaa') : '#aaa'
  const roleEmoji = lastDead?.role ? (ROLE_EMOJIS[lastDead.role] || '❓') : '❓'

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-2xl w-full text-center animate-fadeIn">

        <div className="flex justify-center gap-6 mb-6 text-3xl">
          <span className="candle-flicker">🕯️</span>
          <span className="animate-float">⚰️</span>
          <span className="candle-flicker" style={{ animationDelay: '1s' }}>🕯️</span>
        </div>

        <h1 className="spooky-title mb-1" style={{ fontSize: '3rem', color: '#DC143C', textShadow: '0 0 30px rgba(220,20,60,0.8)' }}>
          ELIMINATION RESULTS
        </h1>
        <p className="text-gray-600 tracking-widest text-xs spooky-title mb-8">-- THE TOWN HAS SPOKEN --</p>

        {lastDead ? (
          <div className="rounded-2xl border-2 p-8 mb-8 animate-slideUp" style={{ borderColor: `${roleColor}66`, backgroundColor: `${roleColor}11`, boxShadow: `0 0 40px ${roleColor}33` }}>
            <div className="text-8xl mb-4" style={{ filter: `drop-shadow(0 0 20px ${roleColor})` }}>
              {revealed ? roleEmoji : '❓'}
            </div>
            <h2 className="text-4xl font-bold spooky-title mb-2 text-white">{lastDead.name}</h2>
            <p className="text-gray-500 spooky-title tracking-widest text-sm mb-4">HAS BEEN ELIMINATED</p>
            <div className="inline-block px-6 py-3 rounded-xl border mb-6" style={{ borderColor: `${roleColor}44`, backgroundColor: `${roleColor}22` }}>
              <p className="text-gray-500 text-xs spooky-title tracking-widest mb-1">ROLE REVEALED</p>
              <p className="text-2xl font-bold spooky-title" style={{ color: roleColor, textShadow: `0 0 10px ${roleColor}` }}>
                {revealed ? lastDead.role : '???'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl p-4 border" style={{ borderColor: '#00A86B33', backgroundColor: 'rgba(0,168,107,0.1)' }}>
                <p className="text-gray-500 text-xs spooky-title tracking-widest mb-1">STILL ALIVE</p>
                <p className="text-3xl font-bold spooky-title" style={{ color: '#00A86B' }}>{room.players.filter(p => p.isAlive).length}</p>
              </div>
              <div className="rounded-xl p-4 border" style={{ borderColor: '#8B000033', backgroundColor: 'rgba(139,0,0,0.1)' }}>
                <p className="text-gray-500 text-xs spooky-title tracking-widest mb-1">DECEASED</p>
                <p className="text-3xl font-bold spooky-title" style={{ color: '#8B0000' }}>{room.players.filter(p => !p.isAlive).length}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border p-8 mb-8" style={{ borderColor: '#3d002044', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="text-6xl mb-4">🤝</div>
            <p className="text-xl text-gray-400 spooky-title tracking-widest">NO ONE WAS ELIMINATED</p>
            <p className="text-gray-600 text-sm mt-2">The vote ended in a tie.</p>
          </div>
        )}

        <div className="flex items-center justify-center gap-3">
          <div className="w-2 h-2 bg-red-900 rounded-full animate-pulse" />
          <p className="text-gray-600 spooky-title tracking-widest text-sm">NIGHT FALLS IN {countdown}s...</p>
          <div className="w-2 h-2 bg-red-900 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
        </div>

      </div>
    </div>
  )
}
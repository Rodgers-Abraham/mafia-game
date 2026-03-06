import { useRouter } from 'next/router'
import { isMafia } from '@/utils/gameLogic'
import { useEffect, useState } from 'react'
import { playSound, stopAllSounds } from '@/utils/sound'
import React from 'react'
import { Room, Role } from '@/types/game'

interface GameEndedProps {
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

const WINNER_CONFIG = {
  mafia:  { title: 'MAFIA WINS',  subtitle: 'Darkness consumes the town',   emoji: '🔫', color: '#DC143C', bg: 'rgba(139,0,0,0.2)',     border: '#8B000066' },
  town:   { title: 'TOWN WINS',   subtitle: 'Justice has been served',       emoji: '⚖️', color: '#00A86B', bg: 'rgba(0,168,107,0.15)',  border: '#00A86B66' },
  jester: { title: 'JESTER WINS', subtitle: 'Chaos reigns supreme',          emoji: '🤡', color: '#FFD700', bg: 'rgba(255,215,0,0.1)',   border: '#FFD70066' },
}

export default function GameEnded({ room }: GameEndedProps) {
  const router = useRouter()
  const [revealed, setRevealed] = useState(false)
  const [myRole, setMyRole] = useState<Role | null>(null)

  const mafiaCount = room.players.filter((p) => p.role && isMafia(p.role)).length
  const villagerCount = room.players.length - mafiaCount
  const jesterWon = room.players.some((p) => p.role === 'Jester' && p.isAlive)

  let winner: 'mafia' | 'town' | 'jester' = 'town'
  if (mafiaCount >= villagerCount) winner = 'mafia'
  else if (jesterWon) winner = 'jester'

  const config = WINNER_CONFIG[winner]

  useEffect(() => {
    // Get current player's role to determine win/lose sound
    const stored = localStorage.getItem('roomData')
    if (stored) {
      const localData = JSON.parse(stored)
      const me = room.players.find(p => p.id === localData.playerId)
      if (me) setMyRole(me.role)
    }
    const t = setTimeout(() => setRevealed(true), 500)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!revealed || !myRole) return
    stopAllSounds()
    const isWinner =
      (winner === 'mafia' && isMafia(myRole)) ||
      (winner === 'town' && !isMafia(myRole) && myRole !== 'Jester') ||
      (winner === 'jester' && myRole === 'Jester')
    playSound(isWinner ? 'win' : 'lose', 0.7)
  }, [revealed, myRole])

  const isWinner = (role: Role | null) => {
    if (!role) return false
    if (winner === 'mafia') return isMafia(role)
    if (winner === 'town') return !isMafia(role) && role !== 'Jester'
    if (winner === 'jester') return role === 'Jester'
    return false
  }

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-5xl mx-auto animate-fadeIn">

        <div className="text-center rounded-2xl border-2 p-10 mb-10" style={{ borderColor: config.border, backgroundColor: config.bg, boxShadow: `0 0 60px ${config.color}33` }}>
          <div className="text-8xl mb-4 animate-float" style={{ filter: `drop-shadow(0 0 30px ${config.color})` }}>
            {config.emoji}
          </div>
          <h1 className="spooky-title mb-2" style={{ fontSize: '4rem', color: config.color, textShadow: `0 0 30px ${config.color}` }}>
            {config.title}
          </h1>
          <p className="text-gray-400 spooky-title tracking-widest text-lg">{config.subtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div>
            <h2 className="spooky-title tracking-widest text-sm mb-4 text-center" style={{ color: '#00A86B' }}>-- VICTORS --</h2>
            <div className="space-y-3">
              {room.players.filter(p => p.role && isWinner(p.role)).map((p, idx) => {
                const roleColor = p.role ? (ROLE_COLORS[p.role] || '#aaa') : '#aaa'
                return (
                  <div key={p.id} className="animate-slideUp flex items-center gap-4 p-4 rounded-xl border" style={{ animationDelay: `${idx * 0.1}s`, borderColor: '#00A86B33', backgroundColor: 'rgba(0,168,107,0.08)' }}>
                    <div className="text-3xl" style={{ filter: `drop-shadow(0 0 8px ${roleColor})` }}>{p.role ? ROLE_EMOJIS[p.role] || '❓' : '❓'}</div>
                    <div className="flex-1">
                      <div className="font-semibold text-white">{p.name}</div>
                      <div className="text-xs spooky-title tracking-wider" style={{ color: roleColor }}>{p.role}</div>
                    </div>
                    <div className="text-xs spooky-title" style={{ color: '#00A86B' }}>{p.isAlive ? 'SURVIVED' : 'FALLEN'}</div>
                  </div>
                )
              })}
            </div>
          </div>

          <div>
            <h2 className="spooky-title tracking-widest text-sm mb-4 text-center" style={{ color: '#8B0000' }}>-- DEFEATED --</h2>
            <div className="space-y-3">
              {room.players.filter(p => p.role && !isWinner(p.role)).map((p, idx) => {
                const roleColor = p.role ? (ROLE_COLORS[p.role] || '#aaa') : '#aaa'
                return (
                  <div key={p.id} className="animate-slideUp flex items-center gap-4 p-4 rounded-xl border opacity-70" style={{ animationDelay: `${idx * 0.1}s`, borderColor: '#8B000033', backgroundColor: 'rgba(139,0,0,0.08)' }}>
                    <div className="text-3xl grayscale">{p.role ? ROLE_EMOJIS[p.role] || '❓' : '❓'}</div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-400 line-through">{p.name}</div>
                      <div className="text-xs spooky-title tracking-wider text-gray-600">{p.role}</div>
                    </div>
                    <div className="text-xs spooky-title text-gray-700">DEFEATED</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border p-6 mb-10" style={{ borderColor: '#3d002044', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <h2 className="spooky-title tracking-widest text-xs text-gray-600 text-center mb-6">-- FINAL STANDINGS --</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {room.players.map((p) => {
              const roleColor = p.role ? (ROLE_COLORS[p.role] || '#aaa') : '#aaa'
              return (
                <div key={p.id} className="rounded-xl p-3 text-center border" style={{ borderColor: p.isAlive ? `${roleColor}44` : '#1a1a1a', backgroundColor: p.isAlive ? `${roleColor}11` : 'rgba(0,0,0,0.3)', opacity: p.isAlive ? 1 : 0.5 }}>
                  <div className={`text-2xl mb-1 ${!p.isAlive ? 'grayscale' : ''}`}>{p.role ? ROLE_EMOJIS[p.role] || '❓' : '❓'}</div>
                  <div className="text-xs font-semibold text-gray-300 truncate">{p.name}</div>
                  <div className="text-xs spooky-title mt-1" style={{ color: p.isAlive ? roleColor : '#444' }}>{p.role || 'Unknown'}</div>
                  <div className="text-xs mt-1" style={{ color: p.isAlive ? '#00A86B' : '#555' }}>{p.isAlive ? 'ALIVE' : 'DEAD'}</div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex justify-center">
          <button
            onClick={() => { stopAllSounds(); router.push('/') }}
            className="px-10 py-4 rounded-xl font-bold spooky-title tracking-wider text-lg transition-all duration-300 hover:scale-105 glow-red"
            style={{ backgroundColor: '#8B0000', border: '2px solid #DC143C', color: 'white' }}
          >
            🏠 RETURN HOME
          </button>
        </div>

      </div>
    </div>
  )
}
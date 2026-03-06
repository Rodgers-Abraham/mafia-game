import { Player } from '@/types/game'
import { getRoleDescription, getPlayerWinCondition } from '@/utils/gameLogic'
import { useEffect, useState } from 'react'
import { playSound, stopAllSounds } from '@/utils/sound'
import React from 'react'

interface RoleBriefingProps {
  player: Player | null
}

const ROLE_CONFIG: { [key: string]: { emoji: string; color: string; bgClass: string; title: string } } = {
  Mafia:       { emoji: '🔫', color: '#8B0000', bgClass: 'role-mafia',       title: 'YOU ARE THE ENEMY' },
  Godfather:   { emoji: '👑', color: '#DC143C', bgClass: 'role-godfather',   title: 'YOU RULE THE NIGHT' },
  Detective:   { emoji: '🔍', color: '#1E90FF', bgClass: 'role-detective',   title: 'SEEK THE TRUTH' },
  Doctor:      { emoji: '💉', color: '#00A86B', bgClass: 'role-doctor',      title: 'PROTECT THE INNOCENT' },
  Bodyguard:   { emoji: '🛡️', color: '#708090', bgClass: 'role-bodyguard',   title: 'GUARD WITH YOUR LIFE' },
  Vigilante:   { emoji: '⚔️', color: '#FF6600', bgClass: 'role-vigilante',   title: 'JUSTICE AT ANY COST' },
  RoleBlocker: { emoji: '🚫', color: '#800080', bgClass: 'role-roleblocker', title: 'SILENCE THE NIGHT' },
  Jester:      { emoji: '🤡', color: '#FFD700', bgClass: 'role-jester',      title: 'CHAOS IS YOUR GAME' },
  Mayor:       { emoji: '🏛️', color: '#DAA520', bgClass: 'role-mayor',       title: 'LEAD YOUR PEOPLE' },
  Villager:    { emoji: '👤', color: '#aaaaaa', bgClass: 'role-villager',    title: 'FIND THE ENEMY' },
}

export default function RoleBriefing({ player }: RoleBriefingProps) {
  const [timeLeft, setTimeLeft] = useState(10)
  const [revealed, setRevealed] = useState(false)
  const [flipped, setFlipped] = useState(false)

  useEffect(() => {
    stopAllSounds()
    playSound('briefing', 0.5)

    const flipTimer = setTimeout(() => {
      setFlipped(true)
      playSound('cardFlip', 0.8)
    }, 800)

    const revealTimer = setTimeout(() => setRevealed(true), 1400)

    return () => {
      clearTimeout(flipTimer)
      clearTimeout(revealTimer)
    }
  }, [])

  useEffect(() => {
    if (!revealed) return
    const interval = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000)
    return () => clearInterval(interval)
  }, [revealed])

  if (!player || !player.role) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center animate-pulse">
          <div className="text-6xl mb-4">🕯️</div>
          <p className="text-gray-400 spooky-title tracking-widest">LOADING YOUR FATE...</p>
        </div>
      </div>
    )
  }

  const config = ROLE_CONFIG[player.role] || ROLE_CONFIG['Villager']

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center animate-fadeIn">

        <p className="spooky-title tracking-widest text-gray-500 mb-6 text-sm">-- YOUR FATE HAS BEEN DECIDED --</p>

        <div className="card-flip-container mb-8" style={{ height: '380px' }}>
          <div className={`card-flip relative w-full h-full ${flipped ? 'flipped' : ''}`}>

            <div className="card-front flex items-center justify-center rounded-2xl border-2 border-red-900 bg-black" style={{ boxShadow: '0 0 40px rgba(139,0,0,0.4)' }}>
              <div className="text-center">
                <div className="text-8xl mb-4 animate-pulse">🂠</div>
                <p className="spooky-title text-red-800 tracking-widest text-lg">YOUR ROLE AWAITS...</p>
              </div>
            </div>

            <div className={`card-back flex items-center justify-center rounded-2xl border-2 ${config.bgClass}`} style={{ borderColor: config.color, boxShadow: `0 0 40px ${config.color}66` }}>
              <div className="text-center p-8">
                <div className="text-8xl mb-4" style={{ filter: `drop-shadow(0 0 20px ${config.color})` }}>{config.emoji}</div>
                <h2 className="spooky-title text-5xl font-bold mb-2" style={{ color: config.color, textShadow: `0 0 20px ${config.color}` }}>{player.role}</h2>
                <p className="spooky-title tracking-widest text-sm" style={{ color: `${config.color}99` }}>{config.title}</p>
              </div>
            </div>

          </div>
        </div>

        {revealed && (
          <div className="animate-slideUp rounded-xl border p-6 mb-6 text-left" style={{ borderColor: `${config.color}44`, backgroundColor: `${config.color}11` }}>
            <p className="text-gray-300 text-lg leading-relaxed mb-4">{getRoleDescription(player.role)}</p>
            <hr style={{ borderColor: `${config.color}33` }} className="my-4" />
            <div className="flex items-start gap-3">
              <span className="text-yellow-400 text-sm spooky-title tracking-widest whitespace-nowrap">WIN CONDITION:</span>
              <p className="font-semibold" style={{ color: config.color }}>{getPlayerWinCondition(player.role)}</p>
            </div>
          </div>
        )}

        {revealed && (
          <div className="animate-fadeIn">
            <div className="text-6xl font-bold spooky-title mb-2" style={{ color: config.color, textShadow: `0 0 20px ${config.color}` }}>{timeLeft}</div>
            <p className="text-gray-500 tracking-widest spooky-title text-sm">{timeLeft > 0 ? 'GAME BEGINS SOON...' : 'BEGINNING NOW...'}</p>
            <div className="mt-4 h-1 bg-gray-900 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${(timeLeft / 10) * 100}%`, backgroundColor: config.color, boxShadow: `0 0 10px ${config.color}` }} />
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
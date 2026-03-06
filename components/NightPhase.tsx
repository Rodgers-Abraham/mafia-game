import { Room, Player } from '@/types/game'
import { io } from 'socket.io-client'
import { useState, useEffect } from 'react'
import { isMafia } from '@/utils/gameLogic'
import React from 'react'

type ClientSocket = ReturnType<typeof io>

interface NightPhaseProps {
  room: Room
  player: Player | null
  socket: ClientSocket | null
}

const ROLE_CONFIG: { [key: string]: { color: string; glowClass: string; actionLabel: string; actionEmoji: string } } = {
  Mafia:       { color: '#8B0000', glowClass: 'glow-red',    actionLabel: 'Eliminate a player',        actionEmoji: '🔫' },
  Godfather:   { color: '#DC143C', glowClass: 'glow-red',    actionLabel: 'Eliminate a player',        actionEmoji: '👑' },
  Detective:   { color: '#1E90FF', glowClass: 'glow-blue',   actionLabel: 'Investigate a player',      actionEmoji: '🔍' },
  Doctor:      { color: '#00A86B', glowClass: 'glow-green',  actionLabel: 'Protect a player',          actionEmoji: '💉' },
  Bodyguard:   { color: '#708090', glowClass: 'glow-red',    actionLabel: 'Guard a player',            actionEmoji: '🛡️' },
  Vigilante:   { color: '#FF6600', glowClass: 'glow-orange', actionLabel: 'Eliminate a player (once)', actionEmoji: '⚔️' },
  RoleBlocker: { color: '#800080', glowClass: 'glow-purple', actionLabel: 'Block a player',            actionEmoji: '🚫' },
  Villager:    { color: '#aaaaaa', glowClass: '',             actionLabel: 'No night action',           actionEmoji: '👤' },
}

const avatars = ['🕵️', '🧛', '👻', '💀', '🎭', '🦹', '🧟', '👁️', '🔪', '🕯️']

export default function NightPhase({ room, player, socket }: NightPhaseProps) {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [timeLeft, setTimeLeft] = useState(60)

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  if (!player || !player.role) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center animate-pulse">
          <div className="text-6xl mb-4">🌙</div>
          <p className="text-gray-400 spooky-title tracking-widest">ENTERING THE NIGHT...</p>
        </div>
      </div>
    )
  }

  const role = player.role
  const config = ROLE_CONFIG[role] || ROLE_CONFIG['Villager']
  const alivePlayers = room.players.filter((p) => p.isAlive && p.id !== player.id)
  const hasNightAction =
    isMafia(role) ||
    role === 'Detective' ||
    role === 'Doctor' ||
    role === 'Bodyguard' ||
    role === 'Vigilante' ||
    role === 'RoleBlocker'

  const handleSubmitAction = () => {
    if (!socket || !hasNightAction || submitted) return

    let actionType = ''
    if (isMafia(role)) actionType = 'mafia-kill'
    else if (role === 'Detective') actionType = 'detective-investigate'
    else if (role === 'Doctor') actionType = 'doctor-protect'
    else if (role === 'Bodyguard') actionType = 'bodyguard-guard'
    else if (role === 'Vigilante') actionType = 'vigilante-kill'
    else if (role === 'RoleBlocker') actionType = 'block'

    socket.emit('night-action', { targetId: selectedTarget, actionType }, (response: { success: boolean }) => {
      if (response.success) {
        setSubmitted(true)
      } else {
        alert('Failed to submit action')
      }
    })
  }

  return (
    <div className="min-h-screen p-6 md:p-8 night-bg">
      <div className="max-w-6xl mx-auto animate-fadeIn">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex justify-center gap-6 mb-4 text-3xl">
            <span className="candle-flicker">🕯️</span>
            <span className="animate-float text-4xl">🌙</span>
            <span className="candle-flicker" style={{ animationDelay: '1.5s' }}>🕯️</span>
          </div>
          <h1
            className="spooky-title mb-1"
            style={{
              fontSize: '3.5rem',
              color: '#4a6fa5',
              textShadow: '0 0 30px rgba(74,111,165,0.8), 0 0 60px rgba(74,111,165,0.4)',
            }}
          >
            NIGHT PHASE
          </h1>
          <p className="text-gray-500 tracking-widest text-sm spooky-title">
            -- NIGHT {Math.ceil(room.currentDay / 2)} -- THE CITY SLEEPS --
          </p>

          {/* Timer */}
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-800 bg-black bg-opacity-50">
            <div className={`w-2 h-2 rounded-full ${timeLeft <= 10 ? 'bg-red-500 animate-pulse' : 'bg-blue-800'}`} />
            <span className={`spooky-title tracking-widest text-sm ${timeLeft <= 10 ? 'text-red-400' : 'text-gray-500'}`}>
              {timeLeft}s REMAINING
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left: Your Role & Action */}
          <div className="lg:col-span-1">
            <div
              className="rounded-xl border p-6 sticky top-8"
              style={{
                borderColor: `${config.color}44`,
                backgroundColor: `${config.color}11`,
                boxShadow: `0 0 30px ${config.color}22`,
              }}
            >
              {/* Role badge */}
              <div className="text-center mb-6">
                <div
                  className="text-5xl mb-2"
                  style={{ filter: `drop-shadow(0 0 15px ${config.color})` }}
                >
                  {config.actionEmoji}
                </div>
                <h2
                  className="spooky-title text-2xl font-bold"
                  style={{ color: config.color }}
                >
                  {role}
                </h2>
                <p className="text-gray-500 text-xs tracking-widest mt-1 spooky-title">YOUR ROLE</p>
              </div>

              {/* Action */}
              <div
                className="rounded-lg p-4 mb-4 border"
                style={{ borderColor: `${config.color}33`, backgroundColor: 'rgba(0,0,0,0.4)' }}
              >
                <p className="text-xs text-gray-500 spooky-title tracking-widest mb-1">TONIGHT'S MISSION</p>
                <p className="text-gray-200">{config.actionLabel}</p>
              </div>

              {/* Submit button */}
              {hasNightAction && !submitted && (
                <button
                  onClick={handleSubmitAction}
                  disabled={!selectedTarget}
                  className="w-full py-3 rounded-lg font-bold spooky-title tracking-wider transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105"
                  style={selectedTarget ? {
                    backgroundColor: config.color,
                    boxShadow: `0 0 20px ${config.color}88`,
                    color: 'white',
                  } : {
                    backgroundColor: '#1a1a1a',
                    border: `1px solid ${config.color}44`,
                    color: '#666',
                  }}
                >
                  {selectedTarget ? 'CONFIRM ACTION' : 'SELECT A TARGET'}
                </button>
              )}

              {submitted && (
                <div
                  className="w-full py-3 rounded-lg text-center spooky-title tracking-wider animate-fadeIn"
                  style={{ backgroundColor: '#00A86B22', border: '1px solid #00A86B44', color: '#00A86B' }}
                >
                  ACTION SUBMITTED
                </div>
              )}

              {!hasNightAction && (
                <div className="text-center py-4">
                  <p className="text-gray-600 text-sm spooky-title tracking-widest">
                    AWAIT THE DAWN...
                  </p>
                  <p className="text-gray-700 text-xs mt-1">No action available for your role</p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Target Selection */}
          <div className="lg:col-span-2">
            <h2 className="spooky-title text-xl tracking-widest text-gray-400 mb-6 text-center">
              -- SELECT YOUR TARGET --
            </h2>

            {!hasNightAction ? (
              <div className="flex items-center justify-center h-48">
                <div className="text-center">
                  <div className="text-6xl mb-4 animate-float">😴</div>
                  <p className="text-gray-600 spooky-title tracking-widest">THE INNOCENT SLEEP SOUNDLY</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {alivePlayers.map((target, idx) => (
                  <button
                    key={target.id}
                    onClick={() => !submitted && setSelectedTarget(target.id)}
                    disabled={submitted}
                    className="animate-slideUp p-4 rounded-xl border-2 transition-all duration-300 text-center hover:scale-105 disabled:cursor-not-allowed"
                    style={{
                      animationDelay: `${idx * 0.1}s`,
                      borderColor: selectedTarget === target.id ? config.color : '#2a0010',
                      backgroundColor: selectedTarget === target.id
                        ? `${config.color}22`
                        : 'rgba(0,0,0,0.5)',
                      boxShadow: selectedTarget === target.id
                        ? `0 0 20px ${config.color}66`
                        : 'none',
                    }}
                  >
                    <div className="text-3xl mb-2">
                      {avatars[idx % avatars.length]}
                    </div>
                    <div className="font-semibold text-white">{target.name}</div>
                    {selectedTarget === target.id && (
                      <div
                        className="text-xs mt-1 spooky-title tracking-wider animate-fadeIn"
                        style={{ color: config.color }}
                      >
                        TARGETED
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Mafia Chat */}
        {isMafia(role) && (
          <div className="mt-10">
            <div
              className="rounded-xl border p-6"
              style={{
                borderColor: '#8B000044',
                backgroundColor: 'rgba(139,0,0,0.1)',
                boxShadow: '0 0 30px rgba(139,0,0,0.2)',
              }}
            >
              <h3 className="spooky-title text-xl tracking-widest text-red-800 mb-2">
                🔫 MAFIA CHANNEL
              </h3>
              <p className="text-gray-600 text-sm">
                Coordinate with your fellow Mafia members. Only Mafia can see this.
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
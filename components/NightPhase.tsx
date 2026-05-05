import { Room, Player } from '@/types/game'
import { io } from 'socket.io-client'
import { useState, useEffect, useRef } from 'react'
import { isMafia } from '@/utils/gameLogic'
import { playSound, stopSound, stopAllSounds } from '@/utils/sound'
import React from 'react'

type ClientSocket = ReturnType<typeof io>

interface NightPhaseProps {
  room: Room
  player: Player | null
  socket: ClientSocket | null
  mafiaTeammates: { id: string; name: string; role: string; color: string }[]
}

const ROLE_CONFIG: { [key: string]: { color: string; actionLabel: string; actionEmoji: string } } = {
  Mafia:       { color: '#8B0000', actionLabel: 'Eliminate a player',        actionEmoji: '🔫' },
  Godfather:   { color: '#DC143C', actionLabel: 'Eliminate a player',        actionEmoji: '👑' },
  Detective:   { color: '#1E90FF', actionLabel: 'Investigate a player',      actionEmoji: '🔍' },
  Doctor:      { color: '#00A86B', actionLabel: 'Protect a player',          actionEmoji: '💉' },
  Bodyguard:   { color: '#708090', actionLabel: 'Guard a player',            actionEmoji: '🛡️' },
  Vigilante:   { color: '#FF6600', actionLabel: 'Eliminate a player (once)', actionEmoji: '⚔️' },
  RoleBlocker: { color: '#800080', actionLabel: 'Block a player',            actionEmoji: '🚫' },
  Villager:    { color: '#aaaaaa', actionLabel: 'No night action',           actionEmoji: '👤' },
}

interface MafiaMessage {
  playerId: string
  playerName: string
  playerColor: string
  message: string
  timestamp: number
}

export default function NightPhase({ room, player, socket, mafiaTeammates }: NightPhaseProps) {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [timeLeft, setTimeLeft] = useState(90)
  const [mafiaMessages, setMafiaMessages] = useState<MafiaMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [actionError, setActionError] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    stopAllSounds()
    playSound('night', 0.4, true)
    return () => stopSound('night')
  }, [])

  useEffect(() => {
    const interval = setInterval(() => setTimeLeft(t => Math.max(0, t - 1)), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!socket) return
    socket.on('mafia-chat-message', (msg: MafiaMessage) => {
      setMafiaMessages(prev => [...prev, msg])
    })
    return () => { socket.off('mafia-chat-message') }
  }, [socket])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mafiaMessages])

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
  const canTargetSelf = role === 'Doctor'
  const alivePlayers = room.players.filter(p => p.isAlive && (canTargetSelf || p.id !== player.id))
  const hasNightAction = isMafia(role) || ['Detective','Doctor','Bodyguard','Vigilante','RoleBlocker'].includes(role)
  const isMafiaPlayer = isMafia(role)

  const handleSelectTarget = (id: string) => {
    if (submitted) return
    setSelectedTarget(id)
    playSound('button', 0.5)
  }

  const handleSubmitAction = () => {
    if (!socket || !hasNightAction || submitted) return
    setActionError('')
    let actionType = ''
    if (isMafia(role)) actionType = 'mafia-kill'
    else if (role === 'Detective') actionType = 'detective-investigate'
    else if (role === 'Doctor') actionType = 'doctor-protect'
    else if (role === 'Bodyguard') actionType = 'bodyguard-guard'
    else if (role === 'Vigilante') actionType = 'vigilante-kill'
    else if (role === 'RoleBlocker') actionType = 'block'
    if (role === 'Detective') playSound('investigate', 0.8)
    else playSound('button', 0.6)
    socket.emit('night-action', { targetId: selectedTarget, actionType }, (response: { success: boolean; error?: string }) => {
      if (response.success) setSubmitted(true)
      else setActionError(response.error || 'Action rejected')
    })
  }

  const sendMafiaChat = (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatInput.trim() || !socket) return
    socket.emit('mafia-chat', { message: chatInput.trim() })
    setChatInput('')
  }

  return (
    <div className="min-h-screen p-6 md:p-8 night-bg">
      <div className="max-w-6xl mx-auto animate-fadeIn">

        <div className="text-center mb-8">
          <div className="flex justify-center gap-6 mb-4 text-3xl">
            <span className="candle-flicker">🕯️</span>
            <span className="animate-float text-4xl">🌙</span>
            <span className="candle-flicker" style={{ animationDelay: '1.5s' }}>🕯️</span>
          </div>
          <h1 className="spooky-title mb-1" style={{ fontSize: '3.5rem', color: '#4a6fa5', textShadow: '0 0 30px rgba(74,111,165,0.8)' }}>
            NIGHT PHASE
          </h1>
          <p className="text-gray-500 tracking-widest text-sm spooky-title">-- THE CITY SLEEPS --</p>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-800 bg-black bg-opacity-50">
            <div className={`w-2 h-2 rounded-full ${timeLeft <= 15 ? 'bg-red-500 animate-pulse' : 'bg-blue-800'}`} />
            <span className={`spooky-title tracking-widest text-sm ${timeLeft <= 15 ? 'text-red-400' : 'text-gray-500'}`}>
              {timeLeft}s REMAINING
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Role panel */}
          <div className="lg:col-span-1">
            <div className="rounded-xl border p-6 sticky top-8" style={{ borderColor: `${config.color}44`, backgroundColor: `${config.color}11`, boxShadow: `0 0 30px ${config.color}22` }}>
              <div className="text-center mb-6">
                <div className="text-5xl mb-2" style={{ filter: `drop-shadow(0 0 15px ${config.color})` }}>{config.actionEmoji}</div>
                <h2 className="spooky-title text-2xl font-bold" style={{ color: config.color }}>{role}</h2>
                <p className="text-gray-500 text-xs tracking-widest mt-1 spooky-title">YOUR ROLE</p>
              </div>

              {/* Mafia teammates */}
              {isMafiaPlayer && mafiaTeammates.length > 0 && (
                <div className="mb-4 p-3 rounded-lg border" style={{ borderColor: '#8B000044', backgroundColor: 'rgba(139,0,0,0.1)' }}>
                  <p className="text-xs text-red-900 spooky-title tracking-widest mb-2">YOUR TEAM</p>
                  {mafiaTeammates.map(t => (
                    <div key={t.id} className="flex items-center gap-2 py-1">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{ backgroundColor: t.color }}>
                        {t.name[0].toUpperCase()}
                      </div>
                      <span className="text-sm text-gray-300">{t.name}</span>
                      <span className="text-xs text-red-800 ml-auto spooky-title">{t.role}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-lg p-4 mb-4 border" style={{ borderColor: `${config.color}33`, backgroundColor: 'rgba(0,0,0,0.4)' }}>
                <p className="text-xs text-gray-500 spooky-title tracking-widest mb-1">TONIGHT'S MISSION</p>
                <p className="text-gray-200 text-sm">{config.actionLabel}</p>
              </div>

              {hasNightAction && !submitted && (
                <button
                  onClick={handleSubmitAction}
                  disabled={!selectedTarget}
                  className="w-full py-3 rounded-lg font-bold spooky-title tracking-wider transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105"
                  style={selectedTarget ? { backgroundColor: config.color, boxShadow: `0 0 20px ${config.color}88`, color: 'white' } : { backgroundColor: '#1a1a1a', border: `1px solid ${config.color}44`, color: '#666' }}
                >
                  {selectedTarget ? 'CONFIRM ACTION' : 'SELECT A TARGET'}
                </button>
              )}
              {submitted && (
                <div className="w-full py-3 rounded-lg text-center spooky-title tracking-wider animate-fadeIn" style={{ backgroundColor: '#00A86B22', border: '1px solid #00A86B44', color: '#00A86B' }}>
                  ACTION SUBMITTED
                </div>
              )}
              {actionError && <p className="text-xs text-red-400 mt-2 text-center">{actionError}</p>}
              {!hasNightAction && (
                <div className="text-center py-4">
                  <p className="text-gray-600 text-sm spooky-title tracking-widest">AWAIT THE DAWN...</p>
                </div>
              )}
            </div>
          </div>

          {/* Targets + mafia chat */}
          <div className="lg:col-span-2 space-y-6">
            {hasNightAction && (
              <div>
                <h2 className="spooky-title text-lg tracking-widest text-gray-400 mb-4 text-center">-- SELECT YOUR TARGET --</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {alivePlayers.map((target, idx) => (
                    <button
                      key={target.id}
                      onClick={() => handleSelectTarget(target.id)}
                      disabled={submitted}
                      className="animate-slideUp p-4 rounded-xl border-2 transition-all duration-300 text-center hover:scale-105 disabled:cursor-not-allowed"
                      style={{
                        animationDelay: `${idx * 0.1}s`,
                        borderColor: selectedTarget === target.id ? config.color : '#2a0010',
                        backgroundColor: selectedTarget === target.id ? `${config.color}22` : 'rgba(0,0,0,0.5)',
                        boxShadow: selectedTarget === target.id ? `0 0 20px ${config.color}66` : 'none',
                      }}
                    >
                      <div
                        className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center text-sm font-bold"
                        style={{ backgroundColor: target.color, boxShadow: `0 0 8px ${target.color}88` }}
                      >
                        {target.name[0].toUpperCase()}
                      </div>
                      <div className="font-semibold text-white text-sm">{target.name}</div>
                      {selectedTarget === target.id && (
                        <div className="text-xs mt-1 spooky-title tracking-wider animate-fadeIn" style={{ color: config.color }}>TARGETED</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!hasNightAction && (
              <div className="flex items-center justify-center h-48">
                <div className="text-center">
                  <div className="text-6xl mb-4 animate-float">😴</div>
                  <p className="text-gray-600 spooky-title tracking-widest">THE INNOCENT SLEEP SOUNDLY</p>
                </div>
              </div>
            )}

            {/* Mafia chat */}
            {isMafiaPlayer && (
              <div>
                <h2 className="spooky-title text-lg tracking-widest mb-3" style={{ color: '#8B0000' }}>🔫 MAFIA CHANNEL</h2>
                <div className="rounded-xl border flex flex-col" style={{ height: '220px', borderColor: '#8B000044', backgroundColor: 'rgba(139,0,0,0.08)' }}>
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {mafiaMessages.length === 0 && (
                      <div className="h-full flex items-center justify-center">
                        <p className="text-red-900 spooky-title tracking-widest text-xs">COORDINATE YOUR KILL...</p>
                      </div>
                    )}
                    {mafiaMessages.map((msg, idx) => (
                      <div key={idx} className="flex items-start gap-2 animate-fadeIn">
                        <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5" style={{ backgroundColor: msg.playerColor }}>
                          {msg.playerName[0].toUpperCase()}
                        </div>
                        <div>
                          <span className="text-xs font-semibold spooky-title" style={{ color: msg.playerColor }}>{msg.playerName}</span>
                          <p className="text-gray-300 text-sm break-words">{msg.message}</p>
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                  <form onSubmit={sendMafiaChat} className="border-t p-2 flex gap-2" style={{ borderColor: '#8B000033' }}>
                    <input
                      type="text"
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      placeholder="Speak only to your kind..."
                      maxLength={200}
                      className="flex-1 px-3 py-1.5 rounded-lg text-white placeholder-gray-700 focus:outline-none text-sm"
                      style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid #8B000033' }}
                    />
                    <button type="submit" className="px-3 py-1.5 rounded-lg text-xs spooky-title tracking-wider transition-all hover:scale-105" style={{ backgroundColor: '#5a0000', border: '1px solid #8B000066', color: '#ff6666' }}>
                      SEND
                    </button>
                  </form>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  )
}

import { Room, Player } from '@/types/game'
import { io } from 'socket.io-client'
import { useState, useEffect } from 'react'
import { playSound, stopAllSounds } from '@/utils/sound'
import React from 'react'

type ClientSocket = ReturnType<typeof io>

interface VotingPhaseProps {
  room: Room
  player: Player | null
  socket: ClientSocket | null
}

const avatars = ['🕵️', '🧛', '👻', '💀', '🎭', '🦹', '🧟', '👁️', '🔪', '🕯️']

export default function VotingPhase({ room, player, socket }: VotingPhaseProps) {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null)
  const [hasVoted, setHasVoted] = useState(false)
  const [timeLeft, setTimeLeft] = useState(60)

  useEffect(() => {
    stopAllSounds()
    playSound('vote', 0.6)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000)
    return () => clearInterval(interval)
  }, [])

  if (!player) return <div className="min-h-screen" />

  const handleSelectTarget = (id: string) => {
    if (hasVoted) return
    setSelectedTarget(id)
    playSound('button', 0.4)
  }

  const handleVote = () => {
    if (!selectedTarget || !socket) return
    playSound('vote', 0.7)
    socket.emit('vote', { targetId: selectedTarget }, (response: any) => {
      if (response.success) setHasVoted(true)
    })
  }

  const alivePlayers = room.players.filter((p) => p.isAlive && p.id !== player.id)
  const isUrgent = timeLeft <= 15

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-5xl mx-auto animate-fadeIn">

        <div className="text-center mb-10">
          <div className="flex justify-center gap-6 mb-4 text-3xl">
            <span className="animate-float">⚖️</span>
            <span className="animate-float" style={{ animationDelay: '0.5s' }}>🗳️</span>
            <span className="animate-float" style={{ animationDelay: '1s' }}>⚖️</span>
          </div>
          <h1 className="spooky-title mb-1" style={{ fontSize: '3.5rem', color: '#DC143C', textShadow: '0 0 30px rgba(220,20,60,0.8)' }}>
            VOTE TO ELIMINATE
          </h1>
          <p className="text-gray-500 tracking-widest text-sm spooky-title">-- CHOOSE YOUR SUSPECT WISELY --</p>
        </div>

        <div className="flex justify-center mb-10">
          <div className={`px-8 py-4 rounded-xl border text-center transition-all duration-500 ${isUrgent ? 'animate-pulse' : ''}`} style={{ borderColor: isUrgent ? '#DC143C88' : '#3d002044', backgroundColor: isUrgent ? 'rgba(220,20,60,0.15)' : 'rgba(0,0,0,0.5)', boxShadow: isUrgent ? '0 0 30px rgba(220,20,60,0.3)' : 'none', minWidth: '200px' }}>
            <p className="spooky-title tracking-widest text-xs text-gray-600 mb-1">TIME TO VOTE</p>
            <div className="text-5xl font-bold spooky-title" style={{ color: isUrgent ? '#DC143C' : '#aaa' }}>
              {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
            </div>
            <div className="mt-2 h-1 bg-gray-900 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${(timeLeft / 60) * 100}%`, backgroundColor: isUrgent ? '#DC143C' : '#555' }} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-10">
          {alivePlayers.map((target, idx) => {
            const isSelected = selectedTarget === target.id
            return (
              <button
                key={target.id}
                onClick={() => handleSelectTarget(target.id)}
                disabled={hasVoted}
                className="animate-slideUp p-5 rounded-xl border-2 transition-all duration-300 text-center disabled:cursor-not-allowed hover:scale-105"
                style={{
                  animationDelay: `${idx * 0.08}s`,
                  borderColor: isSelected ? '#DC143C' : '#2a0010',
                  backgroundColor: isSelected ? 'rgba(220,20,60,0.2)' : 'rgba(0,0,0,0.5)',
                  boxShadow: isSelected ? '0 0 25px rgba(220,20,60,0.5)' : 'none',
                  transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                }}
              >
                <div className="text-3xl mb-2">{avatars[idx % avatars.length]}</div>
                <div className="font-semibold text-white text-sm">{target.name}</div>
                {target.role === 'Mayor' && <div className="text-yellow-400 text-xs mt-1 spooky-title">MAYOR: 2x VOTE</div>}
                {isSelected && <div className="text-xs mt-2 spooky-title tracking-wider animate-fadeIn" style={{ color: '#DC143C' }}>SELECTED</div>}
              </button>
            )
          })}
        </div>

        <div className="text-center">
          {!hasVoted ? (
            <div>
              <button
                onClick={handleVote}
                disabled={!selectedTarget}
                className="px-12 py-4 rounded-xl font-bold text-xl spooky-title tracking-wider transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105"
                style={selectedTarget ? {
                  backgroundColor: '#8B0000',
                  border: '2px solid #DC143C',
                  boxShadow: '0 0 25px rgba(220,20,60,0.5)',
                  color: 'white',
                } : {
                  backgroundColor: '#111',
                  border: '2px solid #333',
                  color: '#555',
                }}
              >
                {selectedTarget ? '🗳️ CAST YOUR VOTE' : 'SELECT A SUSPECT'}
              </button>
              {!selectedTarget && (
                <p className="text-gray-700 text-xs mt-3 spooky-title tracking-widest">
                  CHOOSE WISELY -- AN INNOCENT LIFE MAY HANG IN THE BALANCE
                </p>
              )}
            </div>
          ) : (
            <div className="inline-flex flex-col items-center gap-3 px-10 py-6 rounded-xl border animate-fadeIn" style={{ borderColor: '#00A86B44', backgroundColor: 'rgba(0,168,107,0.1)' }}>
              <div className="text-4xl">✅</div>
              <p className="text-xl font-bold spooky-title tracking-wider" style={{ color: '#00A86B' }}>VOTE RECORDED</p>
              <p className="text-gray-500 text-sm spooky-title tracking-widest">AWAITING OTHER PLAYERS...</p>
              <div className="flex gap-1 mt-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full bg-green-800 animate-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
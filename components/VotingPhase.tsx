import { Room, Player } from '@/types/game'
import { Socket } from 'socket.io-client'
import { useState, useEffect } from 'react'

interface VotingPhaseProps {
  room: Room
  player: Player | null
  socket: Socket | null
}

export default function VotingPhase({ room, player, socket }: VotingPhaseProps) {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null)
  const [hasVoted, setHasVoted] = useState(false)
  const [timeLeft, setTimeLeft] = useState(60)

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  if (!player) {
    return <div className="min-h-screen bg-mafia-dark" />
  }

  const handleVote = () => {
    if (!selectedTarget || !socket) return

    socket.emit('vote', { targetId: selectedTarget }, (response: any) => {
      if (response.success) {
        setHasVoted(true)
      }
    })
  }

  const alivePlayers = room.players.filter((p) => p.isAlive && p.id !== player.id)

  return (
    <div className="min-h-screen bg-mafia-dark p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold">🗳️ VOTING PHASE</h1>
          <p className="text-2xl text-gray-400 mt-2">Who should be eliminated?</p>
        </div>

        {/* Timer */}
        <div className="text-center mb-12">
          <div className="text-6xl font-bold text-red-500 mb-2">
            {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
          </div>
          <p className="text-lg text-gray-400">Voting closes in {timeLeft} seconds</p>
        </div>

        {/* Voting Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {alivePlayers.map((target) => (
            <button
              key={target.id}
              onClick={() => !hasVoted && setSelectedTarget(target.id)}
              disabled={hasVoted}
              className={`p-6 rounded-lg border-2 transition ${
                selectedTarget === target.id && !hasVoted
                  ? 'border-red-500 bg-red-900 bg-opacity-30 transform scale-105'
                  : 'border-mafia-border bg-mafia-card hover:border-red-500'
              } ${hasVoted ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="text-4xl mb-3">👤</div>
              <div className="font-semibold text-lg">{target.name}</div>
              {target.role === 'Mayor' && <div className="text-yellow-400 text-sm mt-2">Vote: 2x</div>}
            </button>
          ))}
        </div>

        {/* Vote Button */}
        {!hasVoted && (
          <div className="text-center">
            <button
              onClick={handleVote}
              disabled={!selectedTarget}
              className="px-8 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded-lg font-bold text-lg transition"
            >
              Cast Vote
            </button>
          </div>
        )}

        {hasVoted && (
          <div className="text-center">
            <p className="text-xl text-green-400 font-semibold">✓ Vote recorded</p>
            <p className="text-gray-400 mt-2">Waiting for other players...</p>
          </div>
        )}
      </div>
    </div>
  )
}

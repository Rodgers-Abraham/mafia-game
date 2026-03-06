import { Room } from '@/types/game'
import { io } from 'socket.io-client'
import { useState } from 'react'

type ClientSocket = ReturnType<typeof io>

interface LobbyProps {
  room: Room
  socket: ClientSocket | null
}

export default function Lobby({ room, socket }: LobbyProps) {
  const [copied, setCopied] = useState(false)

  const handleStartGame = () => {
    if (!socket) return
    socket.emit('start-game', { roomId: room.id }, (response: any) => {
      if (!response.success) {
        alert(response.error || 'Failed to start game')
      }
    })
  }

  const copyRoomCode = () => {
    navigator.clipboard.writeText(room.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isHost = localStorage.getItem('isHost') === 'true'
  const minPlayers = room.minPlayers ?? 4
  const maxPlayers = room.maxPlayers ?? 20

  return (
    <div className="min-h-screen bg-mafia-dark p-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4">🔫 MAFIA GAME</h1>
          <p className="text-gray-400 mb-6">Share the room code with your friends</p>
          <div className="flex justify-center gap-4 items-center">
            <div className="text-3xl font-mono bg-mafia-card px-6 py-3 rounded border-2 border-red-600 tracking-widest">
              {room.id}
            </div>
            <button
              onClick={copyRoomCode}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition"
            >
              {copied ? '✓ Copied' : 'Copy Code'}
            </button>
          </div>
        </div>

        {/* Players Grid */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">
            Players in Room ({room.players.length}/{maxPlayers})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {room.players.map((player) => (
              <div
                key={player.id}
                className="bg-mafia-card border border-mafia-border rounded-lg p-4 text-center hover:border-red-500 transition"
              >
                <div className="text-2xl mb-2">👤</div>
                <div className="font-semibold text-lg">{player.name}</div>
                {player.isHost && (
                  <div className="text-yellow-400 text-sm mt-2">👑 HOST</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Start Game Button - Host only */}
        {isHost ? (
          <div className="text-center">
            <button
              onClick={handleStartGame}
              disabled={room.players.length < minPlayers}
              className="px-8 py-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-bold text-xl transition"
            >
              Start Game ({room.players.length} players)
            </button>
            <p className="text-gray-400 mt-4">
              {room.players.length < minPlayers
                ? `Need ${minPlayers - room.players.length} more player(s) to start`
                : '✅ Ready to start!'}
            </p>
          </div>
        ) : (
          <div className="text-center text-gray-400">
            <p>Waiting for host to start the game...</p>
          </div>
        )}

      </div>
    </div>
  )
}
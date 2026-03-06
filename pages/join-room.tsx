import { useState } from 'react'
import { useRouter } from 'next/router'
import { io } from 'socket.io-client'

export default function JoinRoom() {
  const router = useRouter()
  const [playerName, setPlayerName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!playerName.trim() || !roomCode.trim()) {
      setError('Please enter both name and room code')
      return
    }

    setLoading(true)
    setError('')

    try {
      // ✅ Explicit URL
      const socket = io('http://localhost:3000')

      // ✅ Wait for connection before emitting
      socket.on('connect', () => {
        socket.emit(
          'join-room',
          // ✅ Send roomId not roomCode (matches server expectation)
          { roomId: roomCode.toUpperCase(), playerName },
          (response: any) => {
            if (response.success) {
              // ✅ Store both room AND playerId for rejoin
              localStorage.setItem('roomData', JSON.stringify({
                ...response.room,
                playerId: response.playerId
              }))
              localStorage.setItem('isHost', 'false')
              router.push(`/room/${response.room.id}`)
            } else {
              setError(response.error || 'Failed to join room')
              setLoading(false)
            }
          }
        )
      })

      socket.on('connect_error', () => {
        setError('Could not connect to server. Is it running?')
        setLoading(false)
      })

    } catch (err) {
      setError('Connection error')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-mafia-dark text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-mafia-card border border-mafia-border rounded-lg p-8">
        <h1 className="text-3xl font-bold mb-6 text-center">Join Room</h1>
        <form onSubmit={handleJoinRoom} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              Your Name
            </label>
            <input
              id="name"
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your display name"
              className="w-full px-4 py-2 bg-mafia-dark border border-mafia-border rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label htmlFor="code" className="block text-sm font-medium mb-2">
              Room Code
            </label>
            <input
              id="code"
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="e.g., ABC123"
              maxLength={6}
              className="w-full px-4 py-2 bg-mafia-dark border border-mafia-border rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 uppercase tracking-widest"
            />
          </div>
          {error && <div className="text-red-400 text-sm">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded font-semibold transition"
          >
            {loading ? 'Joining...' : 'Join Room'}
          </button>
        </form>
        <div className="mt-6 text-center">
          <a href="/" className="text-gray-400 hover:text-white transition">
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  )
}
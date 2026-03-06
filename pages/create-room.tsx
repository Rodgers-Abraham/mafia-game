import { useState } from 'react'
import { useRouter } from 'next/router'
import { io } from 'socket.io-client'

export default function CreateRoom() {
  const router = useRouter()
  const [playerName, setPlayerName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!playerName.trim()) {
      setError('Please enter your name')
      return
    }

    setLoading(true)
    setError('')

    try {
      // ✅ Explicit URL so it actually finds your server
      const socket = io('http://localhost:3000', {
        timeout: 5000,
      })

      // ✅ Wait for connection before emitting
      socket.on('connect', () => {
        socket.emit('create-room', { playerName }, (response: any) => {
          if (response.success) {
            localStorage.setItem('roomData', JSON.stringify({
              ...response.room,
              playerId: response.playerId  
            }))
            localStorage.setItem('isHost', 'true')
            router.push(`/room/${response.room.id}`)
          } else {
            setError(response.error || 'Failed to create room')
            setLoading(false)
          }
        })
      })

      // ✅ Handle connection failure
      socket.on('connect_error', (err) => {
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
        <h1 className="text-3xl font-bold mb-6 text-center">Create Room</h1>
        <form onSubmit={handleCreateRoom} className="space-y-4">
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
              className="w-full px-4 py-2 bg-mafia-dark border border-mafia-border rounded text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
            />
          </div>
          {error && <div className="text-red-400 text-sm">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded font-semibold transition"
          >
            {loading ? 'Creating...' : 'Create Room'}
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
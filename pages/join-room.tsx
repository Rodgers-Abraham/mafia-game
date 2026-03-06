import { useState } from 'react'
import { useRouter } from 'next/router'
import { io } from 'socket.io-client'
import React from 'react'

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
      const socket = io('http://localhost:3000')

      socket.on('connect', () => {
        socket.emit(
          'join-room',
          { roomId: roomCode.toUpperCase(), playerName },
          (response: any) => {
            if (response.success) {
              localStorage.setItem('roomData', JSON.stringify({
                ...response.room,
                playerId: response.playerId,
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
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-slideUp">

        {/* Back link */}
        <div className="text-center mb-8">
          <a
            href="/"
            className="text-gray-600 hover:text-gray-400 transition spooky-title tracking-widest text-xs"
          >
            -- BACK TO HOME --
          </a>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border-2 p-8"
          style={{
            borderColor: '#1E90FF33',
            backgroundColor: 'rgba(0,0,0,0.7)',
            boxShadow: '0 0 40px rgba(30,144,255,0.1)',
          }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-3 animate-float">🚪</div>
            <h1
              className="spooky-title"
              style={{
                fontSize: '2.5rem',
                color: '#1E90FF',
                textShadow: '0 0 20px rgba(30,144,255,0.6)',
              }}
            >
              JOIN ROOM
            </h1>
            <p className="text-gray-600 text-xs spooky-title tracking-widest mt-1">
              ENTER IF YOU DARE
            </p>
          </div>

          {/* Form */}
          <div className="space-y-5">
            <div>
              <label className="block text-xs spooky-title tracking-widest text-gray-500 mb-2">
                YOUR NAME
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your display name"
                maxLength={20}
                className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-700 focus:outline-none transition-all duration-200"
                style={{
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  border: '1px solid #1E90FF22',
                }}
                onFocus={(e) => e.target.style.borderColor = '#1E90FF66'}
                onBlur={(e) => e.target.style.borderColor = '#1E90FF22'}
              />
            </div>

            <div>
              <label className="block text-xs spooky-title tracking-widest text-gray-500 mb-2">
                ROOM CODE
              </label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="e.g., ABC123"
                maxLength={6}
                className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-700 focus:outline-none transition-all duration-200 text-center text-2xl tracking-widest spooky-title"
                style={{
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  border: '1px solid #1E90FF22',
                }}
                onFocus={(e) => e.target.style.borderColor = '#1E90FF66'}
                onBlur={(e) => e.target.style.borderColor = '#1E90FF22'}
              />
            </div>

            {error && (
              <div
                className="px-4 py-3 rounded-xl text-sm animate-fadeIn"
                style={{
                  backgroundColor: 'rgba(139,0,0,0.2)',
                  border: '1px solid #8B000066',
                  color: '#DC143C',
                }}
              >
                {error}
              </div>
            )}

            <button
              onClick={handleJoinRoom}
              disabled={loading || !playerName.trim() || !roomCode.trim()}
              className="w-full py-4 rounded-xl font-bold spooky-title tracking-widest text-lg transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105"
              style={{
                backgroundColor: loading ? '#001a3a' : '#003580',
                border: '2px solid #1E90FF',
                boxShadow: loading ? 'none' : '0 0 20px rgba(30,144,255,0.3)',
                color: 'white',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span> ENTERING...
                </span>
              ) : (
                '🚪 JOIN ROOM'
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
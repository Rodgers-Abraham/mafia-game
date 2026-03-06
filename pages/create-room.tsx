import { useState } from 'react'
import { useRouter } from 'next/router'
import { io } from 'socket.io-client'
import React from 'react'

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
      const socket = io('http://localhost:3000', { timeout: 5000 })

      socket.on('connect', () => {
        socket.emit('create-room', { playerName }, (response: any) => {
          if (response.success) {
            localStorage.setItem('roomData', JSON.stringify({
              ...response.room,
              playerId: response.playerId,
            }))
            localStorage.setItem('isHost', 'true')
            router.push(`/room/${response.room.id}`)
          } else {
            setError(response.error || 'Failed to create room')
            setLoading(false)
          }
        })
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
            borderColor: '#8B000066',
            backgroundColor: 'rgba(0,0,0,0.7)',
            boxShadow: '0 0 40px rgba(139,0,0,0.2)',
          }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-3 animate-float">🔫</div>
            <h1
              className="spooky-title"
              style={{
                fontSize: '2.5rem',
                color: '#DC143C',
                textShadow: '0 0 20px rgba(220,20,60,0.8)',
              }}
            >
              CREATE ROOM
            </h1>
            <p className="text-gray-600 text-xs spooky-title tracking-widest mt-1">
              SUMMON YOUR PLAYERS
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
                onKeyDown={(e) => e.key === 'Enter' && handleCreateRoom(e)}
                placeholder="Enter your display name"
                maxLength={20}
                className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-700 focus:outline-none transition-all duration-200"
                style={{
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  border: '1px solid #3d002066',
                }}
                onFocus={(e) => e.target.style.borderColor = '#8B0000'}
                onBlur={(e) => e.target.style.borderColor = '#3d002066'}
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
              onClick={handleCreateRoom}
              disabled={loading || !playerName.trim()}
              className="w-full py-4 rounded-xl font-bold spooky-title tracking-widest text-lg transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105"
              style={{
                backgroundColor: loading ? '#3a0000' : '#8B0000',
                border: '2px solid #DC143C',
                boxShadow: loading ? 'none' : '0 0 20px rgba(220,20,60,0.4)',
                color: 'white',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span> SUMMONING...
                </span>
              ) : (
                '🔫 CREATE ROOM'
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
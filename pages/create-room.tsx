import { useState } from 'react'
import { useRouter } from 'next/router'
import { io } from 'socket.io-client'
import getSocketUrl from '@/utils/getSocketUrl'
import ColorPicker from '@/components/ColorPicker'
import React from 'react'

const ALL_COLORS = ['#e74c3c','#e67e22','#f1c40f','#2ecc71','#1abc9c','#3498db','#9b59b6','#e91e63','#00bcd4','#ff5722','#8bc34a','#607d8b']

export default function CreateRoom() {
  const router = useRouter()
  const [playerName, setPlayerName] = useState('')
  const [selectedColor, setSelectedColor] = useState(ALL_COLORS[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCreate = () => {
    if (!playerName.trim()) { setError('Please enter your name'); return }
    setLoading(true); setError('')
    const socket = io(getSocketUrl())
    socket.on('connect', () => {
      socket.emit('create-room', { playerName: playerName.trim(), color: selectedColor }, (response: any) => {
        if (response.success) {
          localStorage.setItem('roomData', JSON.stringify({ playerId: response.playerId, roomId: response.room.id }))
          localStorage.setItem('isHost', 'true')
          router.push(`/room/${response.room.id}`)
        } else {
          setError(response.error || 'Failed to create room')
          setLoading(false); socket.disconnect()
        }
      })
    })
    socket.on('connect_error', () => { setError('Could not connect to server'); setLoading(false) })
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full animate-fadeIn">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4 animate-float">🔫</div>
          <h1 className="spooky-title text-4xl mb-2" style={{ color: '#DC143C', textShadow: '0 0 20px rgba(220,20,60,0.8)' }}>CREATE ROOM</h1>
          <p className="text-gray-600 tracking-widest text-xs spooky-title">-- BECOME THE HOST --</p>
        </div>
        <div className="rounded-2xl border-2 p-8" style={{ borderColor: '#8B000044', backgroundColor: 'rgba(0,0,0,0.7)', boxShadow: '0 0 40px rgba(139,0,0,0.2)' }}>
          <div className="mb-6">
            <label className="block text-xs text-gray-500 spooky-title tracking-widest mb-2">YOUR NAME</label>
            <input
              type="text" value={playerName} onChange={e => setPlayerName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="Enter your name..." maxLength={20} autoFocus
              className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-600 focus:outline-none text-lg transition-all"
              style={{ backgroundColor: 'rgba(139,0,0,0.1)', border: '2px solid #8B000044' }}
            />
          </div>
          <div className="mb-6">
            <ColorPicker selectedColor={selectedColor} takenColors={[]} onChange={setSelectedColor} />
          </div>
          <div className="flex items-center gap-3 mb-6 p-3 rounded-xl border" style={{ borderColor: '#8B000033', backgroundColor: 'rgba(0,0,0,0.3)' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ backgroundColor: selectedColor, boxShadow: `0 0 12px ${selectedColor}88` }}>
              {playerName ? playerName[0].toUpperCase() : '?'}
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{playerName || 'Your Name'}</p>
              <p className="text-xs text-gray-600 spooky-title">HOST</p>
            </div>
          </div>
          {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
          <button
            onClick={handleCreate} disabled={loading || !playerName.trim()}
            className="w-full py-4 rounded-xl font-bold text-lg spooky-title tracking-wider transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105"
            style={{ backgroundColor: '#8B0000', border: '2px solid #DC143C', boxShadow: '0 0 20px rgba(220,20,60,0.4)', color: 'white' }}
          >
            {loading ? '⏳ CREATING...' : '🔫 CREATE ROOM'}
          </button>
          <div className="text-center mt-4">
            <a href="/" className="text-gray-600 text-xs spooky-title tracking-widest hover:text-gray-400 transition">← BACK TO HOME</a>
          </div>
        </div>
      </div>
    </div>
  )
}
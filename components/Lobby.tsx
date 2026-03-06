import { Room } from '@/types/game'
import { io } from 'socket.io-client'
import { useState, useEffect } from 'react'
import React from 'react'

type ClientSocket = ReturnType<typeof io>

interface LobbyProps {
  room: Room
  socket: ClientSocket | null
}

const MIN_PLAYERS = 4
const MAX_PLAYERS = 20

export default function Lobby({ room, socket }: LobbyProps) {
  const [copied, setCopied] = useState(false)
  const [pulse, setPulse] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleStartGame = () => {
    if (!socket) return
    setPulse(true)
    setTimeout(() => setPulse(false), 500)
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

  const isHost = mounted ? localStorage.getItem('isHost') === 'true' : false
  const canStart = room.players.length >= MIN_PLAYERS
  const avatars = ['🕵️', '🧛', '👻', '💀', '🎭', '🦹', '🧟', '👁️', '🔪', '🕯️']

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-6xl mx-auto animate-fadeIn">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex justify-center gap-6 mb-4 text-3xl">
            <span className="candle-flicker">🕯️</span>
            <span className="animate-float">💀</span>
            <span className="candle-flicker" style={{ animationDelay: '1s' }}>🕯️</span>
          </div>
          <h1 className="blood-text spooky-title mb-1" style={{ fontSize: '3.5rem' }}>
            MAFIA LOBBY
          </h1>
          <p className="text-gray-500 tracking-widest text-sm spooky-title">
            -- AWAITING PLAYERS --
          </p>
        </div>

        {/* Room Code */}
        <div className="flex justify-center mb-10">
          <div className="bg-black bg-opacity-60 border-2 border-red-900 rounded-xl p-6 text-center glow-red">
            <p className="text-gray-500 text-xs tracking-widest spooky-title mb-2">ROOM CODE</p>
            <div className="flex items-center gap-4">
              <span
                className="text-4xl font-mono tracking-widest text-red-400 spooky-title"
                style={{ textShadow: '0 0 20px rgba(220,20,60,0.8)' }}
              >
                {room.id}
              </span>
              <button
                onClick={copyRoomCode}
                className="px-3 py-2 bg-red-900 hover:bg-red-800 border border-red-700 rounded-lg text-sm transition-all duration-200 hover:scale-105"
              >
                {copied ? '✓ Copied!' : '📋 Copy'}
              </button>
            </div>
            <p className="text-gray-600 text-xs mt-2">Share this code with your friends</p>
          </div>
        </div>

        {/* Players Grid */}
        <div className="mb-10">
          <h2 className="spooky-title text-center text-xl tracking-widest text-gray-400 mb-6">
            -- PLAYERS ({room.players.length}/{MAX_PLAYERS}) --
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {room.players.map((player, idx) => (
              <div
                key={player.id}
                className="animate-slideUp bg-black bg-opacity-60 border border-red-900 hover:border-red-600 rounded-xl p-4 text-center transition-all duration-300 hover:scale-105"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <div className="text-3xl mb-2">{avatars[idx % avatars.length]}</div>
                <div className="font-semibold text-white truncate">{player.name}</div>
                {player.isHost && (
                  <div
                    className="text-xs mt-2 spooky-title tracking-wider"
                    style={{ color: '#FFD700', textShadow: '0 0 10px rgba(255,215,0,0.6)' }}
                  >
                    👑 HOST
                  </div>
                )}
              </div>
            ))}

            {/* Empty slots */}
            {Array.from({ length: Math.max(0, MIN_PLAYERS - room.players.length) }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="bg-black bg-opacity-30 border border-dashed border-gray-800 rounded-xl p-4 text-center"
              >
                <div className="text-3xl mb-2 opacity-20">👤</div>
                <div className="text-gray-700 text-sm">Waiting...</div>
              </div>
            ))}
          </div>
        </div>

        {/* Start Game / Waiting */}
        {isHost ? (
          <div className="text-center">
            <button
              onClick={handleStartGame}
              disabled={!canStart}
              className={`relative px-12 py-5 rounded-xl font-bold text-2xl spooky-title tracking-wider transition-all duration-300 ${
                canStart
                  ? 'bg-red-900 hover:bg-red-800 border-2 border-red-500 glow-red hover:scale-105 animate-pulse'
                  : 'bg-gray-900 border-2 border-gray-700 cursor-not-allowed opacity-50'
              } ${pulse ? 'animate-shake' : ''}`}
            >
              {canStart ? '🔫 START GAME' : `⏳ NEED ${MIN_PLAYERS - room.players.length} MORE`}
            </button>
            <p className="text-gray-600 text-sm mt-4 tracking-widest spooky-title">
              {canStart
                ? `✅ ${room.players.length} PLAYERS READY`
                : `MINIMUM ${MIN_PLAYERS} PLAYERS REQUIRED`}
            </p>
          </div>
        ) : (
          <div className="text-center">
            <div className="inline-flex items-center gap-3 px-8 py-4 bg-black bg-opacity-50 border border-gray-800 rounded-xl">
              <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
              <p className="text-gray-400 spooky-title tracking-widest">WAITING FOR HOST TO START...</p>
              <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
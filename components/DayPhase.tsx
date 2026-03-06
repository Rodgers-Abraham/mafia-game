import { Room } from '@/types/game'
import { io } from 'socket.io-client'
import { useState, useRef, useEffect } from 'react'
import { playSound, stopSound, stopAllSounds } from '@/utils/sound'
import React from 'react'

type ClientSocket = ReturnType<typeof io>

interface DayPhaseProps {
  room: Room
  socket: ClientSocket | null
}

interface ChatMessage {
  playerId: string
  playerName: string
  message: string
  timestamp: number
}

const avatars = ['🕵️', '🧛', '👻', '💀', '🎭', '🦹', '🧟', '👁️', '🔪', '🕯️']

export default function DayPhase({ room, socket }: DayPhaseProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [timeLeft, setTimeLeft] = useState(180)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    stopAllSounds()
    playSound('day', 0.5)
    return () => stopSound('day')
  }, [])

  useEffect(() => {
    const interval = setInterval(() => setTimeLeft((t: number) => Math.max(0, t - 1)), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!socket) return
    socket.on('chat-message', (message: ChatMessage) => {
      setMessages((prev) => [...prev, message])
      playSound('button', 0.2)
    })
    return () => { socket.off('chat-message') }
  }, [socket])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || !socket) return
    socket.emit('chat-message', { message: inputValue })
    setInputValue('')
    playSound('button', 0.4)
  }

  const lastEliminated = room.players.find((p) => !p.isAlive)
  const isUrgent = timeLeft <= 30
  const minutes = Math.floor(timeLeft / 60)
  const seconds = String(timeLeft % 60).padStart(2, '0')

  return (
    <div className="min-h-screen p-6 md:p-8 day-bg">
      <div className="max-w-6xl mx-auto animate-fadeIn">

        <div className="text-center mb-8">
          <div className="flex justify-center gap-6 mb-4 text-3xl">
            <span className="animate-float">☀️</span>
            <span className="animate-float" style={{ animationDelay: '0.5s' }}>🗣️</span>
            <span className="animate-float" style={{ animationDelay: '1s' }}>☀️</span>
          </div>
          <h1 className="spooky-title mb-1" style={{ fontSize: '3.5rem', color: '#c8a04a', textShadow: '0 0 30px rgba(200,160,74,0.8)' }}>
            DAY PHASE
          </h1>
          <p className="text-gray-500 tracking-widest text-sm spooky-title">
            -- DAY {room.currentDay} -- FIND THE KILLER --
          </p>
        </div>

        {room.players.some((p) => !p.isAlive) && (
          <div className="rounded-xl border p-5 mb-8 animate-slideUp text-center" style={{ borderColor: '#8B000066', backgroundColor: 'rgba(139,0,0,0.15)', boxShadow: '0 0 30px rgba(139,0,0,0.2)' }}>
            <div className="text-4xl mb-2">💀</div>
            <h2 className="spooky-title text-xl tracking-widest text-red-700 mb-1">BODY DISCOVERED</h2>
            <p className="text-gray-300 text-lg">
              {lastEliminated ? `${lastEliminated.name} was found dead this morning.` : 'A body was found during the night.'}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          <div className="lg:col-span-3">
            <div className="rounded-xl border flex flex-col" style={{ height: '520px', borderColor: '#3d002044', backgroundColor: 'rgba(0,0,0,0.6)' }}>
              <div className="px-4 py-3 border-b spooky-title tracking-widest text-xs text-gray-500" style={{ borderColor: '#3d002033' }}>
                -- TOWN DISCUSSION --
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-4xl mb-3 animate-float">👁️</div>
                      <p className="text-gray-600 spooky-title tracking-widest text-sm">SILENCE... WHO WILL SPEAK FIRST?</p>
                    </div>
                  </div>
                )}
                {messages.map((msg, idx) => {
                  const playerIdx = room.players.findIndex(p => p.id === msg.playerId)
                  return (
                    <div key={idx} className="flex items-start gap-3 animate-fadeIn">
                      <span className="text-lg mt-0.5">{avatars[playerIdx % avatars.length]}</span>
                      <div>
                        <span className="font-semibold text-sm spooky-title" style={{ color: '#c8a04a' }}>{msg.playerName}</span>
                        <span className="text-gray-400 text-xs ml-2">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <p className="text-gray-200 mt-0.5 break-words">{msg.message}</p>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={handleSendMessage} className="border-t p-3 flex gap-2" style={{ borderColor: '#3d002033' }}>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Speak your mind... or lie."
                  className="flex-1 px-4 py-2 rounded-lg text-white placeholder-gray-600 focus:outline-none text-sm"
                  style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid #3d002044' }}
                />
                <button type="submit" className="px-4 py-2 rounded-lg font-semibold spooky-title tracking-wider text-sm transition-all hover:scale-105" style={{ backgroundColor: '#8B4513', border: '1px solid #c8a04a44' }}>
                  SPEAK
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-4">
            <div className="rounded-xl border p-5 text-center" style={{ borderColor: isUrgent ? '#8B000066' : '#3d002044', backgroundColor: isUrgent ? 'rgba(139,0,0,0.15)' : 'rgba(0,0,0,0.5)', boxShadow: isUrgent ? '0 0 20px rgba(139,0,0,0.3)' : 'none' }}>
              <p className="spooky-title tracking-widest text-xs text-gray-500 mb-2">TIME REMAINING</p>
              <div className={`text-4xl font-bold spooky-title mb-1 ${isUrgent ? 'animate-pulse' : ''}`} style={{ color: isUrgent ? '#DC143C' : '#c8a04a' }}>
                {minutes}:{seconds}
              </div>
              <p className="text-gray-600 text-xs spooky-title tracking-widest">{isUrgent ? 'VOTING IMMINENT' : 'UNTIL VOTING'}</p>
              <div className="mt-3 h-1 bg-gray-900 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${(timeLeft / 180) * 100}%`, backgroundColor: isUrgent ? '#DC143C' : '#c8a04a' }} />
              </div>
            </div>

            <div className="rounded-xl border p-4" style={{ borderColor: '#3d002044', backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <p className="spooky-title tracking-widest text-xs text-gray-500 mb-3">SURVIVORS ({room.players.filter(p => p.isAlive).length})</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {room.players.filter(p => p.isAlive).map((p, idx) => (
                  <div key={p.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                    <span className="text-sm">{avatars[idx % avatars.length]}</span>
                    <span className="text-sm text-gray-300">{p.name}</span>
                  </div>
                ))}
              </div>
              {room.players.some(p => !p.isAlive) && (
                <div className="mt-3 pt-3 border-t" style={{ borderColor: '#3d002033' }}>
                  <p className="spooky-title tracking-widest text-xs text-gray-700 mb-2">DECEASED ({room.players.filter(p => !p.isAlive).length})</p>
                  {room.players.filter(p => !p.isAlive).map((p) => (
                    <div key={p.id} className="flex items-center gap-2 px-2 py-1">
                      <span className="text-sm">💀</span>
                      <span className="text-xs text-gray-700 line-through">{p.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
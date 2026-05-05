import { Room, LobbyMessage } from '@/types/game'
import { io } from 'socket.io-client'
import { useState, useEffect, useRef } from 'react'
import React from 'react'

type ClientSocket = ReturnType<typeof io>

interface LobbyProps {
  room: Room
  socket: ClientSocket | null
  currentPlayerId: string
}

const MIN_PLAYERS = 4
const MAX_PLAYERS = 20

export default function Lobby({ room, socket, currentPlayerId }: LobbyProps) {
  const [copied, setCopied] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [messages, setMessages] = useState<LobbyMessage[]>(room.lobbyMessages || [])
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!socket) return
    socket.on('lobby-chat-message', (msg: LobbyMessage) => {
      setMessages(prev => [...prev, msg])
    })
    return () => { socket.off('lobby-chat-message') }
  }, [socket])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const [settings, setSettings] = useState(room.settings || { mafiaCount: 2, enabledRoles: ['Godfather', 'Detective', 'Doctor'] })

  const copyRoomCode = () => {
    navigator.clipboard.writeText(room.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || !socket) return
    socket.emit('lobby-chat', { message: inputValue.trim() })
    setInputValue('')
  }

  const isHost = mounted ? localStorage.getItem('isHost') === 'true' : false
  const me = room.players.find(p => p.id === currentPlayerId)
  const canReady = room.players.length >= MIN_PLAYERS
  const readyCount = room.players.filter(p => p.isReady).length

  useEffect(() => {
    setSettings(room.settings || { mafiaCount: 2, enabledRoles: ['Godfather', 'Detective', 'Doctor'] })
  }, [room.settings])

  const toggleReady = () => {
    if (!socket) return
    socket.emit('toggle-ready', { roomId: room.id }, (response: any) => {
      if (!response.success) alert(response.error || 'Failed to update ready state')
    })
  }

  const updateSettings = () => {
    if (!socket) return
    socket.emit('update-room-settings', { roomId: room.id, settings }, (response: any) => {
      if (!response.success) alert(response.error || 'Failed to update settings')
    })
  }

  const toggleRole = (role: string) => {
    setSettings(prev => ({
      ...prev,
      enabledRoles: prev.enabledRoles.includes(role)
        ? prev.enabledRoles.filter(r => r !== role)
        : [...prev.enabledRoles, role],
    }))
  }

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-6xl mx-auto animate-fadeIn">

        <div className="text-center mb-8">
          <div className="flex justify-center gap-6 mb-4 text-3xl">
            <span className="candle-flicker">🕯️</span>
            <span className="animate-float">💀</span>
            <span className="candle-flicker" style={{ animationDelay: '1s' }}>🕯️</span>
          </div>
          <h1 className="blood-text spooky-title mb-1" style={{ fontSize: '3.5rem' }}>MAFIA LOBBY</h1>
          <p className="text-gray-500 tracking-widest text-sm spooky-title">-- AWAITING PLAYERS --</p>
        </div>

        <div className="flex justify-center mb-8">
          <div className="bg-black bg-opacity-60 border-2 border-red-900 rounded-xl p-5 text-center glow-red panel-3d">
            <p className="text-gray-500 text-xs tracking-widest spooky-title mb-2">ROOM CODE</p>
            <div className="flex items-center gap-4">
              <span className="text-4xl font-mono tracking-widest text-red-400 spooky-title" style={{ textShadow: '0 0 20px rgba(220,20,60,0.8)' }}>
                {room.id}
              </span>
              <button onClick={copyRoomCode} className="px-3 py-2 bg-red-900 hover:bg-red-800 border border-red-700 rounded-lg text-sm transition-all duration-200 hover:scale-105">
                {copied ? '✓ Copied!' : '📋 Copy'}
              </button>
            </div>
            <p className="text-gray-600 text-xs mt-2">Share this code with your friends</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">

          <div>
            <h2 className="spooky-title text-center text-lg tracking-widest text-gray-400 mb-4">
              -- PLAYERS ({room.players.length}/{MAX_PLAYERS}) --
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {room.players.map((player, idx) => (
                <div
                  key={player.id}
                  className="animate-slideUp bg-black bg-opacity-60 rounded-xl p-4 text-center transition-all duration-300 hover:scale-105 border-2"
                  style={{
                    animationDelay: `${idx * 0.1}s`,
                    borderColor: player.id === currentPlayerId ? player.color : `${player.color}44`,
                    boxShadow: player.id === currentPlayerId ? `0 0 15px ${player.color}55` : 'none',
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center text-sm font-bold border-2 border-white border-opacity-20"
                    style={{ backgroundColor: player.color, boxShadow: `0 0 10px ${player.color}88` }}
                  >
                    {player.name[0].toUpperCase()}
                  </div>
                  <div className="font-semibold text-white text-sm truncate">{player.name}</div>
                  {player.isHost && <div className="text-xs mt-1 spooky-title" style={{ color: '#FFD700' }}>👑 HOST</div>}
                  {player.isReady && <div className="text-xs mt-1 text-green-400 spooky-title">READY</div>}
                  {player.id === currentPlayerId && <div className="text-xs mt-1 text-gray-600 spooky-title">YOU</div>}
                  {player.disconnected && <div className="text-xs mt-1 text-yellow-600 spooky-title animate-pulse">RECONNECTING...</div>}
                </div>
              ))}
              {Array.from({ length: Math.max(0, MIN_PLAYERS - room.players.length) }).map((_, i) => (
                <div key={`empty-${i}`} className="bg-black bg-opacity-30 border border-dashed border-gray-800 rounded-xl p-4 text-center">
                  <div className="w-10 h-10 rounded-full mx-auto mb-2 bg-gray-900 opacity-20" />
                  <div className="text-gray-700 text-sm">Waiting...</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="spooky-title text-center text-lg tracking-widest text-gray-400 mb-4">-- LOBBY CHAT --</h2>
            <div className="rounded-xl border flex flex-col" style={{ height: '320px', borderColor: '#3d002044', backgroundColor: 'rgba(0,0,0,0.6)' }}>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {messages.length === 0 && (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-gray-700 spooky-title tracking-widest text-xs">SAY HELLO WHILE YOU WAIT...</p>
                  </div>
                )}
                {messages.map((msg, idx) => (
                  <div key={idx} className="flex items-start gap-2 animate-fadeIn">
                    <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5" style={{ backgroundColor: msg.playerColor }}>
                      {msg.playerName[0].toUpperCase()}
                    </div>
                    <div>
                      <span className="text-xs font-semibold spooky-title" style={{ color: msg.playerColor }}>{msg.playerName}</span>
                      <p className="text-gray-300 text-sm break-words">{msg.message}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={sendMessage} className="border-t p-3 flex gap-2" style={{ borderColor: '#3d002033' }}>
                <input
                  type="text"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  placeholder="Chat with the group..."
                  maxLength={200}
                  className="flex-1 px-3 py-2 rounded-lg text-white placeholder-gray-600 focus:outline-none text-sm"
                  style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid #3d002044' }}
                />
                <button type="submit" className="px-4 py-2 rounded-lg font-semibold spooky-title tracking-wider text-xs transition-all hover:scale-105" style={{ backgroundColor: '#3d0020', border: '1px solid #8B000066' }}>
                  SEND
                </button>
              </form>
            </div>
          </div>

        </div>

        {isHost && (
          <div className="mb-6 rounded-xl border p-4" style={{ borderColor: '#8B000044', backgroundColor: 'rgba(0,0,0,0.45)' }}>
            <p className="text-sm spooky-title tracking-widest mb-3 text-gray-400">ROOM SETTINGS</p>
            <div className="flex flex-col md:flex-row md:items-end gap-4">
              <label className="text-xs text-gray-500 spooky-title tracking-widest">
                MAFIA COUNT
                <input
                  type="number"
                  min={1}
                  max={Math.max(1, room.players.length - 1)}
                  value={settings.mafiaCount}
                  onChange={e => setSettings(prev => ({ ...prev, mafiaCount: Number(e.target.value) }))}
                  className="mt-1 block w-24 px-2 py-1 rounded bg-black border border-red-900 text-white"
                />
              </label>
              <div className="flex-1">
                <p className="text-xs text-gray-500 spooky-title tracking-widest mb-2">SPECIAL ROLES</p>
                <div className="flex flex-wrap gap-2">
                  {['Godfather', 'Detective', 'Doctor', 'Bodyguard', 'Vigilante', 'RoleBlocker', 'Jester', 'Mayor'].map(role => (
                    <button key={role} onClick={() => toggleRole(role)} className="px-2 py-1 text-xs rounded border spooky-title tracking-wider" style={{ borderColor: settings.enabledRoles.includes(role) ? '#00A86B66' : '#444', color: settings.enabledRoles.includes(role) ? '#00A86B' : '#777' }}>
                      {role}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={updateSettings} className="px-4 py-2 rounded-lg text-xs spooky-title tracking-wider border border-red-800 hover:bg-red-950">
                APPLY
              </button>
            </div>
          </div>
        )}

        <div className="text-center">
          <button
            onClick={toggleReady}
            disabled={!canReady}
            className={`px-10 py-4 rounded-xl font-bold text-xl spooky-title tracking-wider transition-all duration-300 ${canReady ? 'bg-red-900 hover:bg-red-800 border-2 border-red-500 glow-red hover:scale-105' : 'bg-gray-900 border-2 border-gray-700 cursor-not-allowed opacity-50'}`}
          >
            {me?.isReady ? '✅ UNREADY' : '✅ READY'}
          </button>
          <p className="text-gray-600 text-sm mt-3 tracking-widest spooky-title">
            {canReady ? `${readyCount}/${room.players.length} READY` : `MINIMUM ${MIN_PLAYERS} PLAYERS REQUIRED`}
          </p>
          <p className="text-gray-700 text-xs mt-2 tracking-widest spooky-title">
            GAME STARTS AUTOMATICALLY WHEN ALL PLAYERS ARE READY
          </p>
        </div>

      </div>
    </div>
  )
}

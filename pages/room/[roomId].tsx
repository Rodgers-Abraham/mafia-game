import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { io } from 'socket.io-client'
import { Room, Player } from '@/types/game'
import Lobby from '@/components/Lobby'
import RoleBriefing from '@/components/RoleBriefing'
import NightPhase from '@/components/NightPhase'
import DayPhase from '@/components/DayPhase'
import VotingPhase from '@/components/VotingPhase'
import ResultsPhase from '@/components/ResultsPhase'
import GameEnded from '@/components/GameEnded'
import React from 'react'

type ClientSocket = ReturnType<typeof io>

interface Notification {
  id: string
  type: string
  message: string
}

interface VoteTally {
  voteCounts: { [targetId: string]: number }
  totalVoted: number
  totalAlive: number
}

// ── Private notification toast ───────────────────────────────────────
function NotificationToast({ notifications, onDismiss }: {
  notifications: Notification[]
  onDismiss: (id: string) => void
}) {
  if (notifications.length === 0) return null

  const typeStyles: { [key: string]: { border: string; bg: string; icon: string } } = {
    'investigation': { border: '#1E90FF', bg: 'rgba(30,144,255,0.15)', icon: '🔍' },
    'doctor-saved':  { border: '#00A86B', bg: 'rgba(0,168,107,0.15)',  icon: '💉' },
    'doctor-quiet':  { border: '#00A86B', bg: 'rgba(0,168,107,0.1)',   icon: '💉' },
    'roleblocker':   { border: '#800080', bg: 'rgba(128,0,128,0.15)',  icon: '🚫' },
    'vigilante':     { border: '#FF6600', bg: 'rgba(255,102,0,0.15)',  icon: '⚔️' },
    'default':       { border: '#8B0000', bg: 'rgba(139,0,0,0.15)',    icon: '⚠️' },
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-sm">
      {notifications.map(n => {
        const style = typeStyles[n.type] || typeStyles['default']
        return (
          <div
            key={n.id}
            className="animate-slideUp rounded-xl border p-4 shadow-2xl cursor-pointer"
            style={{
              borderColor: style.border,
              backgroundColor: style.bg,
              backdropFilter: 'blur(10px)',
              boxShadow: `0 0 20px ${style.border}44`,
            }}
            onClick={() => onDismiss(n.id)}
          >
            <div className="flex items-start gap-3">
              <span className="text-xl flex-shrink-0">{style.icon}</span>
              <div className="flex-1">
                <p className="text-xs spooky-title tracking-widest mb-1" style={{ color: style.border }}>
                  PRIVATE MESSAGE
                </p>
                <p className="text-sm text-gray-200 leading-relaxed">{n.message}</p>
                <p className="text-xs text-gray-600 mt-2">Click to dismiss</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Live vote tally ───────────────────────────────────────────────────
function VoteTallyBar({ tally, room }: { tally: VoteTally | null; room: Room }) {
  if (!tally || Object.keys(tally.voteCounts).length === 0) return null

  const sorted = Object.entries(tally.voteCounts).sort((a, b) => b[1] - a[1])
  const maxVotes = sorted[0]?.[1] || 1

  return (
    <div
      className="fixed bottom-4 right-4 z-40 rounded-xl border p-4 w-64"
      style={{
        borderColor: '#8B000044',
        backgroundColor: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div className="flex justify-between items-center mb-3">
        <p className="spooky-title tracking-widest text-xs text-gray-500">LIVE VOTES</p>
        <p className="text-xs text-gray-600">{tally.totalVoted}/{tally.totalAlive}</p>
      </div>
      <div className="space-y-2">
        {sorted.map(([targetId, count]) => {
          const target = room.players.find(p => p.id === targetId)
          const pct = (count / maxVotes) * 100
          return (
            <div key={targetId}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-300">{target?.name || 'Unknown'}</span>
                <span style={{ color: '#DC143C' }}>{count}</span>
              </div>
              <div className="h-1.5 bg-gray-900 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${pct}%`,
                    background: 'linear-gradient(90deg, #8B0000, #DC143C)',
                    boxShadow: '0 0 8px rgba(220,20,60,0.6)',
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main Room Page ────────────────────────────────────────────────────
export default function RoomPage() {
  const router = useRouter()
  const { roomId } = router.query
  const socketRef = useRef<ClientSocket | null>(null)
  const [room, setRoom] = useState<Room | null>(null)
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [voteTally, setVoteTally] = useState<VoteTally | null>(null)

  const addNotification = (type: string, message: string) => {
    const id = Math.random().toString(36).substring(2)
    setNotifications(prev => [...prev, { id, type, message }])
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, 8000)
  }

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  useEffect(() => {
    if (!roomId) return

    const storedData = localStorage.getItem('roomData')
    if (!storedData) {
      setError('No room data found. Please create or join a room.')
      setLoading(false)
      return
    }

    const localData = JSON.parse(storedData)
    const socket = io('http://localhost:3000')
    socketRef.current = socket

    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id)
      socket.emit('rejoin-room', {
        roomId: roomId as string,
        playerId: localData.playerId,
      }, (response: any) => {
        if (response.success) {
          setRoom(response.room)
          const player = response.room.players.find((p: Player) => p.id === localData.playerId)
          setCurrentPlayer(player || null)
        } else {
          setError(response.error || 'Failed to rejoin room')
        }
        setLoading(false)
      })
    })

    socket.on('room-updated', (data: { room: Room }) => {
      setRoom(data.room)
      const player = data.room.players.find((p: Player) => p.id === localData.playerId)
      setCurrentPlayer(player || null)
      if (data.room.phase !== 'voting') setVoteTally(null)
    })

    socket.on('game-started', (data: { room: Room }) => {
      setRoom(data.room)
    })

    socket.on('role-briefing', (data: { role: string }) => {
      setCurrentPlayer((prev: Player | null) => {
        if (!prev) return null
        return { ...prev, role: data.role as Player['role'] }
      })
    })

    // Detective investigation result
    socket.on('investigation-result', (data: { targetName: string; isMafia: boolean; message: string }) => {
      addNotification('investigation', data.message)
    })

    // Night action feedback (doctor, roleblocker, vigilante)
    socket.on('night-result', (data: { type: string; message: string }) => {
      addNotification(data.type, data.message)
    })

    // Live vote tally
    socket.on('vote-updated', (data: VoteTally) => {
      setVoteTally(data)
    })

    // Vote result announcement
    socket.on('vote-result', (data: { eliminated: any; tie: boolean; jesterWin?: boolean }) => {
      if (data.tie) {
        addNotification('default', '⚖️ The vote ended in a tie — no one was eliminated!')
      } else if (data.jesterWin) {
        addNotification('default', `🤡 ${data.eliminated?.name} was the Jester and got voted off — JESTER WINS!`)
      } else if (data.eliminated) {
        addNotification('default', `💀 ${data.eliminated.name} was eliminated. They were a ${data.eliminated.role}.`)
      }
    })

    socket.on('room-closed', () => router.push('/'))

    socket.on('connect_error', () => {
      setError('Could not connect to server.')
      setLoading(false)
    })

    return () => { socket.disconnect() }
  }, [roomId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center animate-pulse">
          <div className="text-6xl mb-4">🕯️</div>
          <p className="spooky-title tracking-widest text-gray-500">ENTERING THE ROOM...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">💀</div>
          <p className="text-red-400 text-lg mb-6 spooky-title">{error}</p>
          <a
            href="/"
            className="px-6 py-3 rounded-xl border border-red-900 text-gray-400 hover:text-white transition spooky-title tracking-widest text-sm"
          >
            BACK TO HOME
          </a>
        </div>
      </div>
    )
  }

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500 spooky-title tracking-widest">ROOM NOT FOUND</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen text-white">

      <NotificationToast notifications={notifications} onDismiss={dismissNotification} />

      {room.phase === 'voting' && (
        <VoteTallyBar tally={voteTally} room={room} />
      )}

      {room.phase === 'lobby' && <Lobby room={room} socket={socketRef.current} />}
      {room.phase === 'briefing' && <RoleBriefing player={currentPlayer} />}
      {room.phase === 'night' && <NightPhase room={room} player={currentPlayer} socket={socketRef.current} />}
      {room.phase === 'day' && <DayPhase room={room} socket={socketRef.current} />}
      {room.phase === 'voting' && <VotingPhase room={room} player={currentPlayer} socket={socketRef.current} />}
      {room.phase === 'results' && <ResultsPhase room={room} />}
      {room.phase === 'ended' && <GameEnded room={room} />}

    </div>
  )
}
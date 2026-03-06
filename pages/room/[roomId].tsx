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

type ClientSocket = ReturnType<typeof io>

export default function RoomPage() {
  const router = useRouter()
  const { roomId } = router.query
  const socketRef = useRef<ClientSocket | null>(null)
  const [room, setRoom] = useState<Room | null>(null)
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
  console.log('🔍 Attempting to rejoin room:', roomId)
  console.log('🔍 Local data:', localData)

  socket.emit('rejoin-room', {
    roomId: roomId as string,
    playerId: localData.playerId,
  }, (response: any) => {
    console.log('📦 Rejoin response:', response)  // <-- this is key
    if (response.success) {
      setRoom(response.room)
      const player = response.room.players.find(
        (p: Player) => p.id === localData.playerId
      )
      setCurrentPlayer(player || null)
    } else {
      setError(response.error || 'Failed to rejoin room')
    }
    setLoading(false)
  })
})

    socket.on('room-updated', (data: { room: Room }) => {
      setRoom(data.room)
      const player = data.room.players.find(
        (p: Player) => p.id === localData.playerId
      )
      setCurrentPlayer(player || null)
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

    socket.on('room-closed', () => {
      router.push('/')
    })

    socket.on('connect_error', () => {
      setError('Could not connect to server.')
      setLoading(false)
    })

    socket.on('disconnect', () => {
      console.log('Disconnected from server')
    })

    return () => {
      socket.disconnect()
    }
  }, [roomId])

  if (loading) {
    return (
      <div className="min-h-screen bg-mafia-dark text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl">⏳</div>
          <p className="mt-4 text-lg">Loading room...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-mafia-dark text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">{error}</p>
          <a href="/" className="text-blue-400 hover:underline">Back to Home</a>
        </div>
      </div>
    )
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-mafia-dark text-white flex items-center justify-center">
        <p>Room not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-mafia-dark text-white">
      {room.phase === 'lobby' && (
        <Lobby room={room} socket={socketRef.current} />
      )}
      {room.phase === 'briefing' && (
        <RoleBriefing player={currentPlayer} />
      )}
      {room.phase === 'night' && (
        <NightPhase room={room} player={currentPlayer} socket={socketRef.current} />
      )}
      {room.phase === 'day' && (
        <DayPhase room={room} socket={socketRef.current} />
      )}
      {room.phase === 'voting' && (
        <VotingPhase room={room} player={currentPlayer} socket={socketRef.current} />
      )}
      {room.phase === 'results' && (
        <ResultsPhase room={room} />
      )}
      {room.phase === 'ended' && (
        <GameEnded room={room} />
      )}
    </div>
  )
}
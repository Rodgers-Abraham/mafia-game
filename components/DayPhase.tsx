import { Room } from '@/types/game'
import { Socket } from 'socket.io-client'
import { useState, useRef, useEffect } from 'react'

interface DayPhaseProps {
  room: Room
  socket: Socket | null
}

interface ChatMessage {
  playerId: string
  playerName: string
  message: string
  timestamp: number
}

export default function DayPhase({ room, socket }: DayPhaseProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [timeLeft, setTimeLeft] = useState(120)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((t: number) => Math.max(0, t - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!socket) return

    socket.on('chat-message', (message: ChatMessage) => {
      setMessages((prev: ChatMessage[]) => [...prev, message])
    })

    return () => {
      socket.off('chat-message')
    }
  }, [socket])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || !socket) return
    socket.emit('chat-message', { message: inputValue })
    setInputValue('')
  }

  const lastEliminated = room.players.find((p) => !p.isAlive)

  return (
    <div className="min-h-screen bg-mafia-dark p-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-2">☀️ DAY PHASE</h1>
          <p className="text-2xl text-gray-400">Day {room.currentDay}</p>
        </div>

        {/* Elimination Announcement */}
        {room.players.some((p) => !p.isAlive) && (
          <div className="bg-red-900 bg-opacity-20 border border-red-600 rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4">Elimination</h2>
            <p className="text-lg">
              {lastEliminated
                ? `${lastEliminated.name} was eliminated during the night.`
                : 'A body was found during the night.'}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

          {/* Chat */}
          <div className="lg:col-span-3">
            <div className="bg-mafia-card border border-mafia-border rounded-lg h-[500px] flex flex-col">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    <p>No messages yet. Start discussing!</p>
                  </div>
                )}
                {messages.map((msg: ChatMessage, idx: number) => (
                  <div key={idx} className="break-words">
                    <span className="font-semibold text-blue-400">{msg.playerName}:</span>
                    <span className="ml-2 text-gray-300">{msg.message}</span>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form
                onSubmit={handleSendMessage}
                className="border-t border-mafia-border p-4 flex gap-2"
              >
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setInputValue(e.target.value)
                  }
                  placeholder="Type your message..."
                  className="flex-1 px-3 py-2 bg-mafia-dark border border-mafia-border rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-semibold transition"
                >
                  Send
                </button>
              </form>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-mafia-card border border-mafia-border rounded-lg p-6 sticky top-8">
              <h3 className="text-xl font-bold mb-4">Discussion Timer</h3>
              <div className="text-4xl font-bold text-yellow-400 mb-4 text-center">
                {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
              </div>
              <p className="text-gray-400 text-sm mb-6">Voting begins soon...</p>

              <h3 className="text-lg font-bold mb-3">
                Players Alive ({room.players.filter((p) => p.isAlive).length})
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {room.players
                  .filter((p) => p.isAlive)
                  .map((p) => (
                    <div
                      key={p.id}
                      className="text-sm py-1 px-2 bg-mafia-dark rounded border border-mafia-border"
                    >
                      {p.name}
                    </div>
                  ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
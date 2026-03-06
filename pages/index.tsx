import React from 'react'

export default function Home() {
  return (
    <div className="min-h-screen bg-mafia-dark text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-5xl font-bold mb-4">🔫 MAFIA GAME</h1>
        <p className="text-xl text-gray-400 mb-8">An interactive party game of deception and deduction</p>
        <div className="flex gap-4 justify-center">
          <a
            href="/create-room"
            className="px-8 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition"
          >
            Create Room
          </a>
          <a
            href="/join-room"
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition"
          >
            Join Room
          </a>
        </div>
      </div>
    </div>
  )
}

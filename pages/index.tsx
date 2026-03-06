import { useEffect, useState } from 'react'
import React from 'react'

export default function Home() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center animate-fadeIn">

        <div className="flex justify-center gap-8 mb-6 text-4xl">
          <span className="animate-float" style={{ animationDelay: '0s' }}>💀</span>
          <span className="animate-float" style={{ animationDelay: '0.5s' }}>🕯️</span>
          <span className="animate-float" style={{ animationDelay: '1s' }}>💀</span>
        </div>

        <h1
          className="blood-text spooky-title mb-2"
          style={{ fontSize: '5rem', lineHeight: 1.1 }}
        >
          MAFIA
        </h1>
        <p className="spooky-title text-red-800 text-2xl tracking-widest mb-2">
          -- THE GAME OF LIES --
        </p>
        <p className="text-gray-400 text-lg mb-10">
          Deceive. Deduce. Eliminate. Only one side survives.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <a
            href="/create-room"
            className="group relative px-10 py-4 bg-red-900 hover:bg-red-800 border-2 border-red-600 rounded-lg font-bold text-xl spooky-title tracking-wider transition-all duration-300 glow-red hover:scale-105"
          >
            <span className="mr-2">🔫</span>
            CREATE ROOM
            <div
              className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ boxShadow: 'inset 0 0 20px rgba(139,0,0,0.4)' }}
            />
          </a>
          <a
            href="/join-room"
            className="group relative px-10 py-4 bg-gray-900 hover:bg-gray-800 border-2 border-gray-600 hover:border-red-800 rounded-lg font-bold text-xl spooky-title tracking-wider transition-all duration-300 hover:scale-105"
          >
            <span className="mr-2">🚪</span>
            JOIN ROOM
          </a>
        </div>

        <div className="max-w-2xl mx-auto">
          <p className="text-gray-600 text-sm spooky-title tracking-widest mb-4">-- ROLES --</p>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { name: 'Mafia', color: '#8B0000' },
              { name: 'Godfather', color: '#DC143C' },
              { name: 'Detective', color: '#1E90FF' },
              { name: 'Doctor', color: '#00A86B' },
              { name: 'Bodyguard', color: '#708090' },
              { name: 'Vigilante', color: '#FF6600' },
              { name: 'Jester', color: '#FFD700' },
              { name: 'Mayor', color: '#DAA520' },
              { name: 'Villager', color: '#aaa' },
            ].map((role) => (
              <span
                key={role.name}
                className="px-3 py-1 rounded-full text-xs font-semibold border spooky-title tracking-wider"
                style={{
                  borderColor: role.color,
                  color: role.color,
                  backgroundColor: `${role.color}15`,
                }}
              >
                {role.name}
              </span>
            ))}
          </div>
        </div>

        <p className="text-gray-700 text-xs mt-12 tracking-widest">
          4-20 PLAYERS · BROWSER BASED · NO ACCOUNT NEEDED
        </p>

      </div>
    </div>
  )
}
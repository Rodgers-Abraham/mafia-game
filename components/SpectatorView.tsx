import { Room, Player } from '@/types/game'
import { io } from 'socket.io-client'
import React from 'react'

type ClientSocket = ReturnType<typeof io>

interface SpectatorViewProps {
  room: Room
  player: Player
  socket: ClientSocket | null
}

const ROLE_COLORS: { [key: string]: string } = {
  Mafia: '#8B0000', Godfather: '#DC143C', Villager: '#aaa',
  Detective: '#1E90FF', Doctor: '#00A86B', Bodyguard: '#708090',
  Vigilante: '#FF6600', RoleBlocker: '#800080', Jester: '#FFD700', Mayor: '#DAA520',
}

const PHASE_LABELS: { [key: string]: string } = {
  lobby: 'LOBBY', briefing: 'ROLE BRIEFING', night: 'NIGHT PHASE',
  day: 'DAY PHASE', voting: 'VOTING PHASE', results: 'RESULTS', ended: 'GAME OVER',
}

export default function SpectatorView({ room, player }: SpectatorViewProps) {
  const alivePlayers = room.players.filter(p => p.isAlive)
  const deadPlayers = room.players.filter(p => !p.isAlive)
  const mafiaAlive = alivePlayers.filter(p => p.role === 'Mafia' || p.role === 'Godfather')
  const townAlive = alivePlayers.filter(p => p.role !== 'Mafia' && p.role !== 'Godfather')

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto animate-fadeIn">

        {/* Spectator banner */}
        <div className="rounded-xl border-2 p-4 mb-8 text-center animate-pulse" style={{ borderColor: '#FFD70066', backgroundColor: 'rgba(255,215,0,0.08)' }}>
          <div className="flex items-center justify-center gap-3">
            <span className="text-2xl">👁️</span>
            <div>
              <p className="spooky-title tracking-widest font-bold" style={{ color: '#FFD700' }}>SPECTATING</p>
              <p className="text-gray-500 text-xs">You have been eliminated — watch the game unfold</p>
            </div>
            <span className="text-2xl">👁️</span>
          </div>
        </div>

        {/* Current phase */}
        <div className="text-center mb-8">
          <div className="inline-block px-6 py-3 rounded-xl border" style={{ borderColor: '#3d002066', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <p className="text-gray-600 spooky-title tracking-widest text-xs mb-1">CURRENT PHASE</p>
            <p className="spooky-title text-2xl font-bold text-white">{PHASE_LABELS[room.phase] || room.phase.toUpperCase()}</p>
            <p className="text-gray-600 text-xs mt-1">Day {room.currentDay}</p>
          </div>
        </div>

        {/* Your eliminated card */}
        <div className="rounded-xl border p-5 mb-8 text-center" style={{ borderColor: `${ROLE_COLORS[player.role || 'Villager'] || '#aaa'}44`, backgroundColor: `${ROLE_COLORS[player.role || 'Villager'] || '#aaa'}11` }}>
          <p className="text-gray-600 spooky-title tracking-widest text-xs mb-2">YOUR ROLE WAS</p>
          <div
            className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-lg font-bold border-2"
            style={{ backgroundColor: player.color, borderColor: ROLE_COLORS[player.role || 'Villager'] || '#aaa' }}
          >
            {player.name[0].toUpperCase()}
          </div>
          <p className="font-bold text-xl spooky-title" style={{ color: ROLE_COLORS[player.role || 'Villager'] || '#aaa' }}>
            {player.role || 'Unknown'}
          </p>
        </div>

        {/* All roles revealed for spectators */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <h2 className="spooky-title tracking-widest text-sm mb-3 text-center" style={{ color: '#00A86B' }}>-- ALIVE ({alivePlayers.length}) --</h2>
            <div className="space-y-2">
              {alivePlayers.map(p => {
                const roleColor = ROLE_COLORS[p.role || 'Villager'] || '#aaa'
                return (
                  <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border" style={{ borderColor: `${roleColor}33`, backgroundColor: `${roleColor}08` }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ backgroundColor: p.color }}>
                      {p.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <span className="text-white font-semibold text-sm">{p.name}</span>
                    </div>
                    <span className="text-xs spooky-title" style={{ color: roleColor }}>{p.role}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div>
            <h2 className="spooky-title tracking-widest text-sm mb-3 text-center" style={{ color: '#8B0000' }}>-- ELIMINATED ({deadPlayers.length}) --</h2>
            <div className="space-y-2">
              {deadPlayers.map(p => {
                const roleColor = ROLE_COLORS[p.role || 'Villager'] || '#aaa'
                return (
                  <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border opacity-50" style={{ borderColor: '#3d002033', backgroundColor: 'rgba(0,0,0,0.3)' }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 grayscale" style={{ backgroundColor: p.color }}>
                      {p.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <span className="text-gray-500 font-semibold text-sm line-through">{p.name}</span>
                    </div>
                    <span className="text-xs spooky-title text-gray-600">{p.role}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Team balance */}
        <div className="rounded-xl border p-5" style={{ borderColor: '#3d002044', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <p className="spooky-title tracking-widest text-xs text-gray-600 text-center mb-4">-- TEAM BALANCE --</p>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="rounded-xl p-4 border" style={{ borderColor: '#8B000033', backgroundColor: 'rgba(139,0,0,0.1)' }}>
              <p className="text-3xl font-bold spooky-title" style={{ color: '#DC143C' }}>{mafiaAlive.length}</p>
              <p className="text-gray-600 text-xs spooky-title tracking-widest mt-1">MAFIA ALIVE</p>
            </div>
            <div className="rounded-xl p-4 border" style={{ borderColor: '#00A86B33', backgroundColor: 'rgba(0,168,107,0.1)' }}>
              <p className="text-3xl font-bold spooky-title" style={{ color: '#00A86B' }}>{townAlive.length}</p>
              <p className="text-gray-600 text-xs spooky-title tracking-widest mt-1">TOWN ALIVE</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
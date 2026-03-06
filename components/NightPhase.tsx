import { Room, Player } from '@/types/game'
import { Socket } from 'socket.io-client'
import { useState } from 'react'
import { isMafia } from '@/utils/gameLogic'

interface NightPhaseProps {
  room: Room
  player: Player | null
  socket: Socket | null
}

export default function NightPhase({ room, player, socket }: NightPhaseProps) {
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null)

  if (!player || !player.role) {
    return <div className="min-h-screen bg-mafia-dark" />
  }

  // ✅ After this point TypeScript knows player.role is not null
  const role = player.role

  const alivePlayers = room.players.filter((p) => p.isAlive && p.id !== player.id)
  const hasNightAction =
    isMafia(role) ||
    role === 'Detective' ||
    role === 'Doctor' ||
    role === 'Bodyguard' ||
    role === 'Vigilante' ||
    role === 'RoleBlocker'

  const handleSubmitAction = () => {
    if (!socket || !hasNightAction) return

    let actionType = ''
    if (isMafia(role)) {
      actionType = 'mafia-kill'
    } else if (role === 'Detective') {
      actionType = 'detective-investigate'
    } else if (role === 'Doctor') {
      actionType = 'doctor-protect'
    } else if (role === 'Bodyguard') {
      actionType = 'bodyguard-guard'
    } else if (role === 'Vigilante') {
      actionType = 'vigilante-kill'
    } else if (role === 'RoleBlocker') {
      actionType = 'block'
    }

    socket.emit('night-action', { targetId: selectedTarget, actionType }, (response: { success: boolean }) => {
      if (!response.success) {
        alert('Failed to submit action')
      }
    })
  }

  const roleActions: { [key: string]: string } = {
    Mafia: 'Eliminate a player',
    Godfather: 'Eliminate a player',
    Detective: 'Investigate a player',
    Doctor: 'Protect a player',
    Bodyguard: 'Guard a player',
    Vigilante: 'Eliminate a player (one-time)',
    RoleBlocker: 'Block a player',
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-mafia-dark p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold mb-2">🌙 NIGHT PHASE</h1>
          <p className="text-2xl text-gray-400">Night {Math.ceil(room.currentDay / 2)}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left: Instructions */}
          <div className="lg:col-span-1">
            <div className="bg-mafia-card border border-mafia-border rounded-lg p-6 sticky top-8">
              <h2 className="text-2xl font-bold mb-4">Your Action</h2>
              <div className="bg-mafia-dark rounded p-4 mb-4">
                <p className="text-sm text-gray-300">{roleActions[role]}</p>
              </div>

              {hasNightAction && (
                <button
                  onClick={handleSubmitAction}
                  disabled={!selectedTarget}
                  className="w-full py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 rounded font-semibold transition"
                >
                  Submit Action
                </button>
              )}

              {!hasNightAction && (
                <p className="text-gray-400 text-sm">No night action for your role</p>
              )}
            </div>
          </div>

          {/* Right: Target Selection */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold mb-6">Select Target</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {alivePlayers.map((target) => (
                <button
                  key={target.id}
                  onClick={() => setSelectedTarget(target.id)}
                  className={`p-4 rounded-lg border-2 transition ${
                    selectedTarget === target.id
                      ? 'border-red-500 bg-red-900 bg-opacity-20'
                      : 'border-mafia-border bg-mafia-card hover:border-red-500'
                  }`}
                >
                  <div className="text-3xl mb-2">👤</div>
                  <div className="font-semibold">{target.name}</div>
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Mafia Chat */}
        {isMafia(role) && (
          <div className="mt-12">
            <div className="bg-mafia-card border border-mafia-border rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4">🔫 Mafia Chat</h3>
              <p className="text-gray-400">
                Coordinate with your fellow Mafia members (other Mafia can see this)
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
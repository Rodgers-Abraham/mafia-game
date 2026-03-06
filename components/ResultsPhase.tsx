import { Room } from '@/types/game'

interface ResultsPhaseProps {
  room: Room
}

export default function ResultsPhase({ room }: ResultsPhaseProps) {
  const gameState = room // We can extract game state from room

  const getRoleEmoji = (role: string) => {
    const emojis: { [key: string]: string } = {
      Mafia: '🔫',
      Godfather: '👑',
      Villager: '👨',
      Detective: '🔍',
      Doctor: '⚕️',
      Bodyguard: '🛡️',
      Vigilante: '⚔️',
      RoleBlocker: '🚫',
      Jester: '🤡',
      Mayor: '🏛️',
    }
    return emojis[role] || '❓'
  }

  // Get last eliminated player (for now, showing placeholder)
  const deadPlayers = room.players.filter((p) => !p.isAlive)
  const lastDead = deadPlayers[deadPlayers.length - 1]

  return (
    <div className="min-h-screen bg-gradient-to-b from-mafia-dark to-mafia-darker p-8 flex items-center justify-center">
      <div className="max-w-2xl w-full">
        <div className="bg-mafia-card border-2 border-red-600 rounded-lg p-8 text-center">
          <h1 className="text-5xl font-bold mb-8">Elimination Results</h1>

          {lastDead ? (
            <>
              <div className="text-7xl mb-6">{getRoleEmoji(lastDead.role || 'Villager')}</div>
              <h2 className="text-4xl font-bold mb-4">{lastDead.name}</h2>
              <div className="bg-mafia-dark rounded-lg p-4 mb-6">
                <p className="text-gray-400 text-sm mb-2">Role Revealed</p>
                <p className="text-2xl font-bold text-red-400">{lastDead.role}</p>
              </div>

              <div className="bg-mafia-darker rounded-lg p-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Players Alive</p>
                  <p className="text-2xl font-bold">{room.players.filter((p) => p.isAlive).length}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Players Dead</p>
                  <p className="text-2xl font-bold">{room.players.filter((p) => !p.isAlive).length}</p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-xl text-gray-400">No one was eliminated this phase.</p>
          )}

          <p className="text-gray-400 mt-8 text-lg">Next phase beginning in 5 seconds...</p>
        </div>
      </div>
    </div>
  )
}

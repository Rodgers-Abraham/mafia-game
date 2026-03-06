import { Room } from '@/types/game'
import { isMafia } from '@/utils/gameLogic'
import { useRouter } from 'next/router'

interface GameEndedProps {
  room: Room
}

export default function GameEnded({ room }: GameEndedProps) {
  const router = useRouter()

  const getRoleEmoji = (role: string | null) => {
    if (!role) return '❓'
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

  const mafiaCount = room.players.filter((p) => isMafia(p.role!)).length
  const villagerCount = room.players.length - mafiaCount
  const jesterAlive = room.players.some((p) => p.role === 'Jester' && p.isAlive)

  let winner = 'town'
  if (mafiaCount >= villagerCount) {
    winner = 'mafia'
  } else if (jesterAlive) {
    winner = 'jester'
  }

  const winnerMessage: { [key: string]: string } = {
    mafia: '🔫 MAFIA WINS! 🔫',
    town: '👨 TOWN WINS! 👨',
    jester: '🤡 JESTER WINS! 🤡',
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-mafia-dark to-mafia-darker p-8">
      <div className="max-w-6xl mx-auto">
        {/* Winner Announcement */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold mb-4">{winnerMessage[winner]}</h1>
          <p className="text-2xl text-gray-400">Game Over</p>
        </div>

        {/* Player Results */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Winners */}
          <div>
            <h2 className="text-3xl font-bold mb-6 text-green-400">Winners</h2>
            <div className="space-y-3">
              {room.players
                .filter((p) => {
                  if (winner === 'mafia') return isMafia(p.role!)
                  if (winner === 'town') return !isMafia(p.role!) && p.role !== 'Jester'
                  if (winner === 'jester') return p.role === 'Jester'
                  return false
                })
                .map((p) => (
                  <div
                    key={p.id}
                    className="bg-mafia-card border border-green-600 rounded-lg p-4 flex items-center gap-4"
                  >
                    <div className="text-3xl">{getRoleEmoji(p.role)}</div>
                    <div className="flex-1">
                      <div className="font-semibold text-lg">{p.name}</div>
                      <div className="text-sm text-gray-400">{p.role}</div>
                    </div>
                    <div className="text-green-400 font-bold">✓ Winner</div>
                  </div>
                ))}
            </div>
          </div>

          {/* Losers */}
          <div>
            <h2 className="text-3xl font-bold mb-6 text-red-400">Losers</h2>
            <div className="space-y-3">
              {room.players
                .filter((p) => {
                  if (winner === 'mafia') return !isMafia(p.role!)
                  if (winner === 'town') return isMafia(p.role!)
                  if (winner === 'jester') return p.role !== 'Jester'
                  return false
                })
                .map((p) => (
                  <div
                    key={p.id}
                    className="bg-mafia-card border border-red-600 rounded-lg p-4 flex items-center gap-4 opacity-75"
                  >
                    <div className="text-3xl">{getRoleEmoji(p.role)}</div>
                    <div className="flex-1">
                      <div className="font-semibold text-lg">{p.name}</div>
                      <div className="text-sm text-gray-400">{p.role}</div>
                    </div>
                    <div className="text-red-400 font-bold">✗ Loser</div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* All Players Roles */}
        <div className="bg-mafia-card border border-mafia-border rounded-lg p-6 mb-12">
          <h2 className="text-2xl font-bold mb-6">Final Standings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {room.players.map((p) => (
              <div
                key={p.id}
                className={`p-4 rounded-lg border text-center ${
                  p.isAlive ? 'border-green-600 bg-green-900 bg-opacity-10' : 'border-gray-600 bg-gray-900 bg-opacity-10'
                }`}
              >
                <div className="text-3xl mb-2">{getRoleEmoji(p.role)}</div>
                <div className="font-semibold">{p.name}</div>
                <div className="text-sm text-gray-400 mt-1">{p.role}</div>
                <div className="text-xs mt-2 text-gray-500">{p.isAlive ? '✓ Alive' : '✗ Dead'}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="text-center space-y-4">
          <button
            onClick={() => router.push('/')}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition"
          >
            Return to Home
          </button>
        </div>
      </div>
    </div>
  )
}

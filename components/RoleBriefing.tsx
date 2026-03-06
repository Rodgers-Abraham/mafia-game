import { Player } from '@/types/game'
import { getRoleDescription, getPlayerWinCondition } from '@/utils/gameLogic'
import { useEffect, useState } from 'react'

interface RoleBriefingProps {
  player: Player | null
}

export default function RoleBriefing({ player }: RoleBriefingProps) {
  const [timeLeft, setTimeLeft] = useState(10)

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 1))
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  if (!player || !player.role) {
    return (
      <div className="min-h-screen bg-mafia-dark text-white flex items-center justify-center">
        <p>Loading your role...</p>
      </div>
    )
  }

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-mafia-dark to-mafia-darker text-white flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-mafia-card border-2 border-red-600 rounded-lg p-8 text-center animate-fadeIn">
        <h1 className="text-5xl font-bold mb-4">Your Role</h1>

        <div className="text-7xl mb-6">{getRoleEmoji(player.role)}</div>

        <h2 className="text-4xl font-bold mb-4 text-red-500">{player.role}</h2>

        <div className="bg-mafia-dark rounded-lg p-6 mb-6">
          <p className="text-lg text-gray-300 mb-4">{getRoleDescription(player.role)}</p>

          <hr className="border-mafia-border my-4" />

          <h3 className="text-sm font-semibold text-gray-400 mb-2">WIN CONDITION</h3>
          <p className="text-lg font-semibold text-yellow-400">{getPlayerWinCondition(player.role)}</p>
        </div>

        <div className="text-5xl font-bold text-red-500 mb-4">{timeLeft}s</div>
        <p className="text-gray-400">Game starting in {timeLeft} seconds...</p>
      </div>
    </div>
  )
}

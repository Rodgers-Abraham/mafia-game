import { Room } from '@/types/game'
import React from 'react'

interface RoleSummaryProps {
  room: Room
}

const ROLE_EMOJIS: { [key: string]: string } = {
  Mafia: '🔫', Godfather: '👑', Villager: '👤',
  Detective: '🔍', Doctor: '💉', Bodyguard: '🛡️',
  Vigilante: '⚔️', RoleBlocker: '🚫', Jester: '🤡', Mayor: '🏛️',
}

export default function RoleSummary({ room }: RoleSummaryProps) {
  const counts = room.players
    .filter(p => p.isAlive && p.role)
    .reduce((acc: { [role: string]: number }, p) => {
      const role = p.role as string
      acc[role] = (acc[role] || 0) + 1
      return acc
    }, {})

  const roleEntries = Object.entries(counts).sort((a, b) => b[1] - a[1])
  if (roleEntries.length === 0) return null

  return (
    <div className="rounded-xl border p-3 md:p-4" style={{ borderColor: '#3d002044', backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <p className="spooky-title tracking-widest text-[10px] md:text-xs text-gray-500 mb-2">ROLES REMAINING (HIDDEN OWNERS)</p>
      <div className="grid grid-cols-2 gap-2">
        {roleEntries.map(([role, count]) => (
          <div key={role} className="rounded-lg px-2 py-1.5 flex items-center justify-between" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
            <span className="text-xs text-gray-300 truncate">{ROLE_EMOJIS[role] || '❓'} {role}</span>
            <span className="text-xs font-bold text-gray-200">x{count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

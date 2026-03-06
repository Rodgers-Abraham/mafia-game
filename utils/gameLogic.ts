import { Role } from '@/types/game'

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export function assignRoles(playerCount: number): Role[] {
  const roles: Role[] = []

  if (playerCount <= 10) {
    // 2 Mafia, 1 Detective, 1 Doctor, Rest Villagers
    roles.push('Mafia', 'Mafia', 'Detective', 'Doctor')
    for (let i = 4; i < playerCount; i++) {
      roles.push('Villager')
    }
  } else {
    // 5 Mafia (1 Godfather), 1 Detective, 1 Doctor, 1 Bodyguard, 1 Vigilante, 1 RoleBlocker, 1 Jester, 1 Mayor, Rest Villagers
    roles.push('Godfather', 'Mafia', 'Mafia', 'Mafia', 'Mafia')
    roles.push('Detective', 'Doctor', 'Bodyguard', 'Vigilante', 'RoleBlocker', 'Jester', 'Mayor')
    for (let i = 12; i < playerCount; i++) {
      roles.push('Villager')
    }
  }

  // Shuffle roles
  return roles.sort(() => Math.random() - 0.5)
}

export function isMafia(role: Role): boolean {
  return role === 'Mafia' || role === 'Godfather'
}

export function getPlayerWinCondition(role: Role): string {
  const conditions: { [key in Role]: string } = {
    Mafia: 'Eliminate all Town members',
    Godfather: 'Eliminate all Town members (appears innocent to Detective)',
    Villager: 'Eliminate all Mafia members',
    Detective: 'Eliminate all Mafia members',
    Doctor: 'Eliminate all Mafia members',
    Bodyguard: 'Eliminate all Mafia members',
    Vigilante: 'Eliminate all Mafia members',
    RoleBlocker: 'Eliminate all Mafia members',
    Jester: 'Get voted off by the Town',
    Mayor: 'Eliminate all Mafia members (your vote counts as 2)',
  }
  return conditions[role]
}

export function getRoleDescription(role: Role): string {
  const descriptions: { [key in Role]: string } = {
    Mafia: 'Kill a Town member each night',
    Godfather: 'Lead the Mafia kills (appears innocent when investigated)',
    Villager: 'Vote to eliminate suspects',
    Detective: 'Investigate a player each night to learn if they are Mafia',
    Doctor: 'Protect a player from Mafia kills each night',
    Bodyguard: 'Protect a player; if they are attacked, you die instead',
    Vigilante: 'Eliminate a player during the night (one-time use)',
    RoleBlocker: 'Block a player from using their ability for one night',
    Jester: 'Get voted off to win alone',
    Mayor: 'Your vote counts as 2 during the day phase',
  }
  return descriptions[role]
}

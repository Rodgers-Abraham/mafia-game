export type Role =
  | 'Mafia'
  | 'Godfather'
  | 'Villager'
  | 'Detective'
  | 'Doctor'
  | 'Bodyguard'
  | 'Vigilante'
  | 'RoleBlocker'
  | 'Jester'
  | 'Mayor'

export type GamePhase = 'lobby' | 'briefing' | 'night' | 'day' | 'voting' | 'results' | 'ended'

export interface Player {
  id: string
  name: string
  role: Role | null
  isAlive: boolean
  isHost: boolean
  socketId: string
  color: string
  isSpectating?: boolean
  disconnected?: boolean
  disconnectedAt?: number
  isReady?: boolean
}

export interface LobbyMessage {
  playerId: string
  playerName: string
  playerColor: string
  message: string
  timestamp: number
}

export interface Room {
  id: string
  players: Player[]
  phase: GamePhase
  maxPlayers: number
  minPlayers: number
  currentDay: number
  currentNight?: number
  conversationTimer: number
  voteTimer: number
  nightActions: { [playerId: string]: { targetId: string | null; actionType: string } }
  votes: { [playerId: string]: { targetId: string; weight: number; voterName: string } }
  winner?: 'mafia' | 'town' | 'jester'
  lobbyMessages: LobbyMessage[]
  settings?: {
    mafiaCount: number
    enabledRoles: string[]
  }
  phaseDurationSeconds?: number
}

export interface GameAction {
  playerId: string
  action: 'mafia-kill' | 'detective-investigate' | 'doctor-protect' | 'bodyguard-guard' | 'vigilante-kill' | 'block'
  targetId: string | null
  role: Role
}

export interface VoteAction {
  playerId: string
  targetId: string
}

export interface GameResult {
  eliminatedPlayerId: string
  role: Role
  cause: 'mafia-kill' | 'vote' | 'disconnect'
  day: number
  night: boolean
}

export interface GameState {
  roomId: string
  phase: GamePhase
  currentDay: number
  alivePlayers: string[]
  deadPlayers: string[]
  mafiaCount: number
  villagerCount: number
  lastEliminated?: GameResult
  votes?: { [playerId: string]: string }
  winningTeam?: 'mafia' | 'town' | 'jester'
}

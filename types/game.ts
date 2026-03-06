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
}

export interface Room {
  id: string
  code: string
  host: string
  players: Player[]
  phase: GamePhase
  maxPlayers: number
  createdAt: number
  gameStartTime?: number
  currentDay: number
  conversationTimer: number
  voteTimer: number
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

export interface DetectiveResult {
  targetId: string
  targetName: string
  isMafia: boolean
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

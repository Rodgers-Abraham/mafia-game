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
  conversationTimer: number
  voteTimer: number
  nightActions: { [playerId: string]: { targetId: string | null; actionType: string } }
  votes: { [playerId: string]: { targetId: string; weight: number; voterName: string } }
  winner?: 'mafia' | 'town' | 'jester'
  lobbyMessages: LobbyMessage[]
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
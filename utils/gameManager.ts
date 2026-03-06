import { Room, Player, GamePhase, GameResult, GameState, GameAction } from '@/types/game'
import { assignRoles, isMafia, generateRoomCode } from './gameLogic'
import { v4 as uuidv4 } from 'uuid'

const NIGHT_PHASE_DURATION = 45000 // 45 seconds
const DISCUSSION_PHASE_DURATION = 120000 // 2 minutes
const VOTING_PHASE_DURATION = 60000 // 1 minute
const BRIEFING_PHASE_DURATION = 10000 // 10 seconds

export class GameManager {
  private rooms: Map<string, Room> = new Map()
  private gameStates: Map<string, GameState> = new Map()
  private nightActions: Map<string, GameAction[]> = new Map()
  private voteActions: Map<string, { [playerId: string]: string }> = new Map()
  private phaseTimers: Map<string, NodeJS.Timeout> = new Map()

  createRoom(hostId: string, hostName: string): Room {
    const roomId = uuidv4()
    const code = generateRoomCode()

    const room: Room = {
      id: roomId,
      code,
      host: hostId,
      players: [
        {
          id: hostId,
          name: hostName,
          role: null,
          isAlive: true,
          isHost: true,
          socketId: hostId,
        },
      ],
      phase: 'lobby',
      maxPlayers: 20,
      createdAt: Date.now(),
      currentDay: 0,
      conversationTimer: 0,
      voteTimer: 0,
    }

    this.rooms.set(roomId, room)
    return room
  }

  addPlayerToRoom(roomCode: string, playerId: string, playerName: string): Room | null {
    const room = Array.from(this.rooms.values()).find((r) => r.code === roomCode)

    if (!room || room.players.length >= room.maxPlayers || room.phase !== 'lobby') {
      return null
    }

    room.players.push({
      id: playerId,
      name: playerName,
      role: null,
      isAlive: true,
      isHost: false,
      socketId: playerId,
    })

    return room
  }

  getRoomById(roomId: string): Room | undefined {
    return this.rooms.get(roomId)
  }

  getRoomByCode(code: string): Room | undefined {
    return Array.from(this.rooms.values()).find((r) => r.code === code)
  }

  startGame(roomId: string): boolean {
    const room = this.rooms.get(roomId)
    if (!room || room.players.length < 3) return false

    room.phase = 'briefing'
    room.gameStartTime = Date.now()
    room.currentDay = 1

    // Assign roles
    const roles = assignRoles(room.players.length)
    room.players.forEach((player, index) => {
      player.role = roles[index]
    })

    // Initialize game state
    const gameState: GameState = {
      roomId,
      phase: 'briefing',
      currentDay: 1,
      alivePlayers: room.players.map((p) => p.id),
      deadPlayers: [],
      mafiaCount: room.players.filter((p) => isMafia(p.role!)).length,
      villagerCount: room.players.length - this.getMafiaCount(room),
    }

    this.gameStates.set(roomId, gameState)

    // Set briefing timer
    this.phaseTimers.set(
      roomId,
      setTimeout(() => {
        this.transitionToNight(roomId)
      }, BRIEFING_PHASE_DURATION)
    )

    return true
  }

  transitionToNight(roomId: string): void {
    const room = this.rooms.get(roomId)
    if (!room) return

    room.phase = 'night'
    this.nightActions.set(roomId, [])

    this.phaseTimers.set(
      roomId,
      setTimeout(() => {
        this.resolveNightActions(roomId)
      }, NIGHT_PHASE_DURATION)
    )
  }

  transitionToDay(roomId: string): void {
    const room = this.rooms.get(roomId)
    if (!room) return

    room.phase = 'day'
    room.currentDay++
    this.voteActions.set(roomId, {})

    this.phaseTimers.set(
      roomId,
      setTimeout(() => {
        this.transitionToVoting(roomId)
      }, DISCUSSION_PHASE_DURATION)
    )
  }

  transitionToVoting(roomId: string): void {
    const room = this.rooms.get(roomId)
    if (!room) return

    room.phase = 'voting'

    this.phaseTimers.set(
      roomId,
      setTimeout(() => {
        this.resolveVotes(roomId)
      }, VOTING_PHASE_DURATION)
    )
  }

  recordNightAction(roomId: string, action: GameAction): void {
    const actions = this.nightActions.get(roomId) || []
    actions.push(action)
    this.nightActions.set(roomId, actions)
  }

  recordVote(roomId: string, voterId: string, targetId: string): void {
    const votes = this.voteActions.get(roomId) || {}
    votes[voterId] = targetId
    this.voteActions.set(roomId, votes)
  }

  private resolveNightActions(roomId: string): void {
    const room = this.rooms.get(roomId)
    const actions = this.nightActions.get(roomId) || []

    if (!room) return

    // Resolve protections and blocks first
    const protectedPlayers = new Set<string>()
    const blockedPlayers = new Set<string>()

    actions.forEach((action) => {
      if (action.action === 'doctor-protect' && action.targetId) {
        protectedPlayers.add(action.targetId)
      }
      if (action.action === 'block' && action.targetId) {
        blockedPlayers.add(action.targetId)
      }
    })

    // Resolve Mafia kills
    const mafiaKills = actions.filter((a) => a.action === 'mafia-kill')
    const targetToKill = mafiaKills.length > 0 ? mafiaKills[0].targetId : null

    let eliminatedId: string | null = null

    if (targetToKill && !protectedPlayers.has(targetToKill)) {
      eliminatedId = targetToKill
    } else if (targetToKill && protectedPlayers.has(targetToKill)) {
      // Doctor saved, check for Bodyguard
      const bodyguardGuards = actions.filter((a) => a.action === 'bodyguard-guard' && a.targetId === targetToKill)
      // If bodyguard guarded, they take the hit instead
      if (bodyguardGuards.length > 0) {
        eliminatedId = bodyguardGuards[0].playerId
      }
    }

    // Resolve Vigilante kill (if not blocked)
    if (!eliminatedId) {
      const vigilantKill = actions.find((a) => a.action === 'vigilante-kill' && !blockedPlayers.has(a.playerId) && a.targetId)
      if (vigilantKill && vigilantKill.targetId) {
        eliminatedId = vigilantKill.targetId
      }
    }

    // Apply elimination
    if (eliminatedId) {
      const player = room.players.find((p) => p.id === eliminatedId)
      if (player) {
        player.isAlive = false
        const gameState = this.gameStates.get(roomId)
        if (gameState) {
          gameState.deadPlayers.push(eliminatedId)
          gameState.alivePlayers = gameState.alivePlayers.filter((id) => id !== eliminatedId)
          gameState.lastEliminated = {
            eliminatedPlayerId: eliminatedId,
            role: player.role!,
            cause: 'mafia-kill',
            day: room.currentDay,
            night: true,
          }
        }
      }
    }

    // Check win conditions
    const winner = this.checkWinCondition(roomId)
    if (winner) {
      room.phase = 'ended'
      const gameState = this.gameStates.get(roomId)
      if (gameState) gameState.winningTeam = winner
      return
    }

    this.transitionToDay(roomId)
  }

  private resolveVotes(roomId: string): void {
    const room = this.rooms.get(roomId)
    const votes = this.voteActions.get(roomId) || {}

    if (!room) return

    // Count votes, considering Mayor's 2x vote
    const voteCount: { [targetId: string]: number } = {}
    let maxVotes = 0
    let topTarget: string | null = null

    Object.entries(votes).forEach(([voterId, targetId]) => {
      const voter = room.players.find((p) => p.id === voterId)
      const voteWeight = voter?.role === 'Mayor' ? 2 : 1

      voteCount[targetId] = (voteCount[targetId] || 0) + voteWeight

      if (voteCount[targetId] > maxVotes) {
        maxVotes = voteCount[targetId]
        topTarget = targetId
      }
    })

    // Check for tie
    const topVoteCount = Object.values(voteCount).reduce((a, b) => Math.max(a, b), 0)
    const topTargets = Object.entries(voteCount)
      .filter(([, count]) => count === topVoteCount)
      .map(([id]) => id)

    const gameState = this.gameStates.get(roomId)

    if (topTargets.length > 1) {
      // Tie - no elimination
      if (gameState) {
        gameState.lastEliminated = undefined
      }
    } else if (topTarget) {
      const player = room.players.find((p) => p.id === topTarget)
      if (player) {
        // Check for Jester
        if (player.role === 'Jester') {
          room.phase = 'ended'
          if (gameState) gameState.winningTeam = 'jester'
          return
        }

        player.isAlive = false
        if (gameState) {
          gameState.deadPlayers.push(topTarget)
          gameState.alivePlayers = gameState.alivePlayers.filter((id) => id !== topTarget)
          gameState.lastEliminated = {
            eliminatedPlayerId: topTarget,
            role: player.role!,
            cause: 'vote',
            day: room.currentDay,
            night: false,
          }
        }
      }
    }

    room.phase = 'results'

    // Set timer to transition to next phase
    this.phaseTimers.set(
      roomId,
      setTimeout(() => {
        const winner = this.checkWinCondition(roomId)
        if (winner) {
          room.phase = 'ended'
          if (gameState) gameState.winningTeam = winner
        } else {
          this.transitionToNight(roomId)
        }
      }, 5000)
    )
  }

  private checkWinCondition(roomId: string): 'mafia' | 'town' | 'jester' | null {
    const room = this.rooms.get(roomId)
    if (!room) return null

    const alivePlayers = room.players.filter((p) => p.isAlive)
    const aliveMafia = alivePlayers.filter((p) => isMafia(p.role!))
    const aliveVillagers = alivePlayers.filter((p) => !isMafia(p.role!))

    // Mafia wins if they equal or outnumber Town
    if (aliveMafia.length >= aliveVillagers.length) {
      return 'mafia'
    }

    // Town wins if all Mafia are eliminated
    if (aliveMafia.length === 0) {
      return 'town'
    }

    return null
  }

  private getMafiaCount(room: Room): number {
    return room.players.filter((p) => isMafia(p.role!)).length
  }

  removePlayerFromRoom(roomId: string, playerId: string): void {
    const room = this.rooms.get(roomId)
    if (!room) return

    const playerIndex = room.players.findIndex((p) => p.id === playerId)
    if (playerIndex === -1) return

    const player = room.players[playerIndex]

    // If in-game, mark as eliminated
    if (room.phase !== 'lobby') {
      player.isAlive = false
      const gameState = this.gameStates.get(roomId)
      if (gameState) {
        gameState.deadPlayers.push(playerId)
        gameState.alivePlayers = gameState.alivePlayers.filter((id) => id !== playerId)
      }
    } else {
      // If in lobby, remove completely
      room.players.splice(playerIndex, 1)

      // If room is empty, delete it
      if (room.players.length === 0) {
        this.rooms.delete(roomId)
        this.gameStates.delete(roomId)
        const timer = this.phaseTimers.get(roomId)
        if (timer) clearTimeout(timer)
        this.phaseTimers.delete(roomId)
      }
    }
  }

  cleanup(roomId: string): void {
    const timer = this.phaseTimers.get(roomId)
    if (timer) clearTimeout(timer)
    this.phaseTimers.delete(roomId)
    this.rooms.delete(roomId)
    this.gameStates.delete(roomId)
    this.nightActions.delete(roomId)
    this.voteActions.delete(roomId)
  }
}

export const gameManager = new GameManager()

const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')
const { v4: uuidv4 } = require('uuid')

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

const rooms = {}
const phaseTimers = {}

const BRIEFING_DURATION = 10000  // 10s
const NIGHT_DURATION    = 45000  // 45s
const DAY_DURATION      = 180000 // 3min
const VOTING_DURATION   = 60000  // 1min
const RESULTS_DURATION  = 5000   // 5s

// ─── Helpers ─────────────────────────────────────────────────────────

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

function assignRoles(players) {
  const count = players.length
  const roles = []

  if (count <= 10) {
    roles.push('Mafia', 'Mafia', 'Detective', 'Doctor')
    while (roles.length < count) roles.push('Villager')
  } else {
    roles.push('Godfather', 'Mafia', 'Mafia', 'Mafia', 'Mafia')
    roles.push('Detective', 'Doctor', 'Bodyguard', 'Vigilante', 'RoleBlocker', 'Jester', 'Mayor')
    while (roles.length < count) roles.push('Villager')
  }

  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]]
  }

  return players.map((player, i) => ({ ...player, role: roles[i] }))
}

function isMafia(role) {
  return role === 'Mafia' || role === 'Godfather'
}

function checkWinCondition(room) {
  const alive = room.players.filter(p => p.isAlive)
  const mafia = alive.filter(p => isMafia(p.role))
  const town  = alive.filter(p => !isMafia(p.role))
  if (mafia.length === 0) return 'town'
  if (mafia.length >= town.length) return 'mafia'
  return null
}

function getVoteCounts(room) {
  const counts = {}
  Object.values(room.votes).forEach(({ targetId, weight }) => {
    counts[targetId] = (counts[targetId] || 0) + weight
  })
  return counts
}

function clearPhaseTimer(roomId) {
  if (phaseTimers[roomId]) {
    clearTimeout(phaseTimers[roomId])
    delete phaseTimers[roomId]
  }
}

function setPhaseTimer(roomId, fn, delay) {
  clearPhaseTimer(roomId)
  phaseTimers[roomId] = setTimeout(fn, delay)
}

function getPlayerSocket(io, socketId) {
  return io.sockets.sockets.get(socketId)
}

function getPlayerName(room, id) {
  return room.players.find(p => p.id === id)?.name || 'Unknown'
}

// ─── Phase Transitions ────────────────────────────────────────────────

function startNightPhase(io, roomId) {
  const room = rooms[roomId]
  if (!room) return
  room.phase = 'night'
  room.nightActions = {}
  console.log(`🌙 Night phase - room ${roomId}`)
  io.to(roomId).emit('room-updated', { room })
  setPhaseTimer(roomId, () => resolveNight(io, roomId), NIGHT_DURATION)
}

function startDayPhase(io, roomId) {
  const room = rooms[roomId]
  if (!room) return
  room.phase = 'day'
  room.currentDay += 1
  room.votes = {}
  console.log(`☀️ Day ${room.currentDay} - room ${roomId}`)
  io.to(roomId).emit('room-updated', { room })
  setPhaseTimer(roomId, () => startVotingPhase(io, roomId), DAY_DURATION)
}

function startVotingPhase(io, roomId) {
  const room = rooms[roomId]
  if (!room) return
  room.phase = 'voting'
  room.votes = {}
  console.log(`🗳️ Voting phase - room ${roomId}`)
  io.to(roomId).emit('room-updated', { room })
  setPhaseTimer(roomId, () => resolveVoting(io, roomId), VOTING_DURATION)
}

// ─── Night Resolution ─────────────────────────────────────────────────

function resolveNight(io, roomId) {
  const room = rooms[roomId]
  if (!room) return

  const actions = room.nightActions
  let killed = null
  let protectedTarget = null
  const blocked = new Set()

  console.log(`🔍 Resolving night for room ${roomId}`)

  // Step 1 — collect blocks
  Object.entries(actions).forEach(([playerId, action]) => {
    if (action.actionType === 'block' && action.targetId) {
      blocked.add(action.targetId)
      const rbPlayer = room.players.find(p => p.id === playerId)
      const s = getPlayerSocket(io, rbPlayer?.socketId)
      if (s) s.emit('night-result', {
        type: 'roleblocker',
        message: `🚫 You successfully blocked ${getPlayerName(room, action.targetId)} — they could not use their ability tonight.`
      })
    }
  })

  // Step 2 — doctor protection (if doctor not blocked)
  Object.entries(actions).forEach(([playerId, action]) => {
    if (action.actionType === 'doctor-protect' && action.targetId && !blocked.has(playerId)) {
      protectedTarget = action.targetId
    }
  })

  // Step 3 — mafia kill (if mafia member not blocked)
  const mafiaKills = {}
  Object.entries(actions).forEach(([playerId, action]) => {
    if (action.actionType === 'mafia-kill' && action.targetId && !blocked.has(playerId)) {
      mafiaKills[action.targetId] = (mafiaKills[action.targetId] || 0) + 1
    }
  })

  const mafiaTarget = Object.entries(mafiaKills).sort((a, b) => b[1] - a[1])[0]

  if (mafiaTarget) {
    const targetId = mafiaTarget[0]

    if (targetId === protectedTarget) {
      // Doctor saved the target
      console.log(`💉 Doctor saved ${getPlayerName(room, targetId)}`)

      const doctorEntry = Object.entries(actions).find(([pid, a]) =>
        a.actionType === 'doctor-protect' && !blocked.has(pid)
      )
      if (doctorEntry) {
        const doctorPlayer = room.players.find(p => p.id === doctorEntry[0])
        const s = getPlayerSocket(io, doctorPlayer?.socketId)
        if (s) s.emit('night-result', {
          type: 'doctor-saved',
          message: `💉 Your protection worked! You saved ${getPlayerName(room, targetId)} from death tonight!`
        })
      }

      // Bodyguard dies if they were guarding the saved target
      const bgEntry = Object.entries(actions).find(([pid, a]) =>
        a.actionType === 'bodyguard-guard' && a.targetId === targetId && !blocked.has(pid)
      )
      if (bgEntry) {
        killed = bgEntry[0]
        console.log(`🛡️ Bodyguard ${getPlayerName(room, killed)} died protecting ${getPlayerName(room, targetId)}`)
      }
    } else {
      killed = targetId
    }
  } else if (protectedTarget) {
    // Quiet night — notify doctor
    const doctorEntry = Object.entries(actions).find(([, a]) => a.actionType === 'doctor-protect')
    if (doctorEntry) {
      const doctorPlayer = room.players.find(p => p.id === doctorEntry[0])
      const s = getPlayerSocket(io, doctorPlayer?.socketId)
      if (s) s.emit('night-result', {
        type: 'doctor-quiet',
        message: `💉 You protected ${getPlayerName(room, protectedTarget)} — it was a quiet night, no attack came.`
      })
    }
  }

  // Step 4 — vigilante kill (if not blocked)
  Object.entries(actions).forEach(([playerId, action]) => {
    if (action.actionType === 'vigilante-kill' && action.targetId && !blocked.has(playerId)) {
      const target = room.players.find(p => p.id === action.targetId)
      if (target && target.isAlive) {
        target.isAlive = false
        console.log(`⚔️ Vigilante killed ${target.name}`)
        const s = getPlayerSocket(io, room.players.find(p => p.id === playerId)?.socketId)
        if (s) s.emit('night-result', {
          type: 'vigilante',
          message: `⚔️ You eliminated ${target.name}. They were a ${target.role}.`
        })
      }
    }
  })

  // Step 5 — apply mafia kill
  if (killed) {
    const target = room.players.find(p => p.id === killed)
    if (target) {
      target.isAlive = false
      console.log(`💀 ${target.name} (${target.role}) was killed`)
    }
  }

  // Step 6 — check win condition
  const winner = checkWinCondition(room)
  if (winner) {
    room.phase = 'ended'
    room.winner = winner
    io.to(roomId).emit('room-updated', { room })
    return
  }

  startDayPhase(io, roomId)
}

// ─── Voting Resolution ────────────────────────────────────────────────

function resolveVoting(io, roomId) {
  const room = rooms[roomId]
  if (!room) return

  const counts = getVoteCounts(room)
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])

  let eliminated = null
  let tie = false

  if (sorted.length >= 2 && sorted[0][1] === sorted[1][1]) {
    tie = true
    console.log(`⚖️ Vote tied in room ${roomId}`)
  } else if (sorted.length > 0) {
    const target = room.players.find(p => p.id === sorted[0][0])
    if (target) {
      if (target.role === 'Jester') {
        target.isAlive = false
        room.phase = 'ended'
        room.winner = 'jester'
        console.log(`🤡 Jester ${target.name} wins!`)
        io.to(roomId).emit('vote-result', { eliminated: target, tie: false, jesterWin: true })
        io.to(roomId).emit('room-updated', { room })
        return
      }
      target.isAlive = false
      eliminated = target
      console.log(`🗳️ ${target.name} (${target.role}) voted off`)
    }
  }

  io.to(roomId).emit('vote-result', { eliminated, tie })

  room.votes = {}
  room.phase = 'results'

  const winner = checkWinCondition(room)
  if (winner) {
    room.phase = 'ended'
    room.winner = winner
  }

  io.to(roomId).emit('room-updated', { room })

  if (room.phase === 'results') {
    setPhaseTimer(roomId, () => startNightPhase(io, roomId), RESULTS_DURATION)
  }
}

// ─── Server ───────────────────────────────────────────────────────────

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true)
    handle(req, res, parsedUrl)
  })

  const io = new Server(httpServer, {
    cors: { origin: '*' }
  })

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id)

    socket.on('create-room', ({ playerName }, callback) => {
      const roomId = generateRoomCode()
      const playerId = uuidv4()

      const room = {
        id: roomId,
        players: [{
          id: playerId,
          socketId: socket.id,
          name: playerName,
          role: null,
          isAlive: true,
          isHost: true,
        }],
        phase: 'lobby',
        currentDay: 1,
        nightActions: {},
        votes: {},
        maxPlayers: 20,
        minPlayers: 4,
      }

      rooms[roomId] = room
      socket.join(roomId)
      socket.data.roomId = roomId
      socket.data.playerId = playerId

      console.log(`✅ Room created: ${roomId} by ${playerName}`)
      callback({ success: true, room, playerId })
      io.to(roomId).emit('room-updated', { room })
    })

    socket.on('rejoin-room', ({ roomId, playerId }, callback) => {
      const room = rooms[roomId]
      if (!room) return callback({ success: false, error: 'Room not found' })

      const player = room.players.find(p => p.id === playerId)
      if (!player) return callback({ success: false, error: 'Player not found' })

      player.socketId = socket.id
      player.disconnected = false
      socket.join(roomId)
      socket.data.roomId = roomId
      socket.data.playerId = playerId

      console.log(`✅ ${player.name} rejoined room ${roomId}`)
      callback({ success: true, room })
      io.to(roomId).emit('room-updated', { room })
    })

    socket.on('join-room', ({ roomId, playerName }, callback) => {
      const room = rooms[roomId]
      if (!room) return callback({ success: false, error: 'Room not found' })
      if (room.phase !== 'lobby') return callback({ success: false, error: 'Game already in progress' })
      if (room.players.length >= 20) return callback({ success: false, error: 'Room is full' })

      const playerId = uuidv4()
      const player = {
        id: playerId,
        socketId: socket.id,
        name: playerName,
        role: null,
        isAlive: true,
        isHost: false,
      }

      room.players.push(player)
      socket.join(roomId)
      socket.data.roomId = roomId
      socket.data.playerId = playerId

      console.log(`✅ ${playerName} joined room: ${roomId}`)
      callback({ success: true, room, playerId })
      io.to(roomId).emit('room-updated', { room })
    })

    socket.on('start-game', ({ roomId }, callback) => {
      const room = rooms[roomId]
      if (!room) return callback({ success: false, error: 'Room not found' })
      if (room.players.length < room.minPlayers) {
        return callback({ success: false, error: `Need at least ${room.minPlayers} players` })
      }

      room.players = assignRoles(room.players)
      room.phase = 'briefing'

      io.to(roomId).emit('game-started', { room })

      room.players.forEach(player => {
        const s = getPlayerSocket(io, player.socketId)
        if (s) s.emit('role-briefing', { role: player.role })
      })

      setPhaseTimer(roomId, () => startNightPhase(io, roomId), BRIEFING_DURATION)
      callback({ success: true })
    })

    socket.on('night-action', ({ targetId, actionType }, callback) => {
      const roomId = socket.data.roomId
      const playerId = socket.data.playerId
      const room = rooms[roomId]
      if (!room || room.phase !== 'night') return callback({ success: false })

      room.nightActions[playerId] = { targetId, actionType }
      console.log(`🌙 ${actionType} by ${getPlayerName(room, playerId)} -> ${getPlayerName(room, targetId)}`)

      // Detective gets immediate private result
      if (actionType === 'detective-investigate' && targetId) {
        const target = room.players.find(p => p.id === targetId)
        if (target) {
          const appearsAsMafia = isMafia(target.role) && target.role !== 'Godfather'
          socket.emit('investigation-result', {
            targetName: target.name,
            isMafia: appearsAsMafia,
            message: appearsAsMafia
              ? `🔍 Investigation complete: ${target.name} IS MAFIA! Eliminate them tomorrow.`
              : `🔍 Investigation complete: ${target.name} appears INNOCENT.`
          })
        }
      }

      // Resolve early if all active players have acted
      const activePlayers = room.players.filter(p =>
        p.isAlive &&
        ['Mafia', 'Godfather', 'Detective', 'Doctor', 'Bodyguard', 'Vigilante', 'RoleBlocker'].includes(p.role)
      )
      const allActed = activePlayers.every(p => room.nightActions[p.id])
      if (allActed) {
        console.log(`✅ All active players acted in ${roomId} — resolving night early`)
        clearPhaseTimer(roomId)
        resolveNight(io, roomId)
      }

      callback({ success: true })
    })

    socket.on('chat-message', ({ message }) => {
      const roomId = socket.data.roomId
      const playerId = socket.data.playerId
      const room = rooms[roomId]
      if (!room) return

      const player = room.players.find(p => p.id === playerId)
      if (!player || !player.isAlive) return

      io.to(roomId).emit('chat-message', {
        playerId,
        playerName: player.name,
        message,
        timestamp: Date.now(),
      })
    })

    socket.on('vote', ({ targetId }, callback) => {
      const roomId = socket.data.roomId
      const playerId = socket.data.playerId
      const room = rooms[roomId]
      if (!room || room.phase !== 'voting') return callback({ success: false })

      const voter = room.players.find(p => p.id === playerId)
      if (!voter || !voter.isAlive) return callback({ success: false })

      room.votes[playerId] = {
        targetId,
        weight: voter.role === 'Mayor' ? 2 : 1,
        voterName: voter.name,
      }

      console.log(`🗳️ ${voter.name} voted for ${getPlayerName(room, targetId)}`)

      // Broadcast live vote tally
      const voteCounts = getVoteCounts(room)
      io.to(roomId).emit('vote-updated', {
        votes: room.votes,
        voteCounts,
        totalVoted: Object.keys(room.votes).length,
        totalAlive: room.players.filter(p => p.isAlive).length,
      })

      // Resolve early if all alive players voted
      const alivePlayers = room.players.filter(p => p.isAlive)
      const allVoted = alivePlayers.every(p => room.votes[p.id])
      if (allVoted) {
        console.log(`✅ All players voted in ${roomId} — resolving early`)
        clearPhaseTimer(roomId)
        resolveVoting(io, roomId)
      }

      callback({ success: true })
    })

    socket.on('disconnect', () => {
      const roomId = socket.data.roomId
      const playerId = socket.data.playerId
      if (!roomId || !rooms[roomId]) return

      const room = rooms[roomId]
      const player = room.players.find(p => p.id === playerId)
      if (player) {
        player.disconnected = true
        console.log(`⚠️ ${player.name} disconnected from ${roomId}`)
      }

      const allDisconnected = room.players.every(p => p.disconnected)
      if (allDisconnected) {
        setTimeout(() => {
          if (rooms[roomId] && rooms[roomId].players.every(p => p.disconnected)) {
            clearPhaseTimer(roomId)
            delete rooms[roomId]
            console.log(`🗑️ Room ${roomId} deleted`)
          }
        }, 30000)
      } else {
        if (player?.isHost) {
          const next = room.players.find(p => !p.disconnected)
          if (next) next.isHost = true
        }
        io.to(roomId).emit('room-updated', { room })
      }
    })
  })

  httpServer.listen(3000, () => {
    console.log('> Ready on http://localhost:3000')
  })
})
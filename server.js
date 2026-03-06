const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')
const { v4: uuidv4 } = require('uuid')

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

const rooms = {}

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

function checkWinCondition(room) {
  const alivePlayers = room.players.filter(p => p.isAlive)
  const aliveMafia = alivePlayers.filter(p => ['Mafia', 'Godfather'].includes(p.role))
  const aliveTown = alivePlayers.filter(p => !['Mafia', 'Godfather'].includes(p.role))

  if (aliveMafia.length === 0) return 'town'
  if (aliveMafia.length >= aliveTown.length) return 'mafia'
  return null
}

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

    // ─── Create Room ───────────────────────────────────────────────
    socket.on('create-room', ({ playerName }, callback) => {
      const roomId = generateRoomCode()
      const playerId = uuidv4()

      const player = {
        id: playerId,
        socketId: socket.id,
        name: playerName,
        role: null,
        isAlive: true,
        isHost: true,
      }

      const room = {
        id: roomId,
        players: [player],
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
      console.log(`📦 Rooms available:`, Object.keys(rooms))

      callback({ success: true, room, playerId })
      io.to(roomId).emit('room-updated', { room })
    })

    // ─── Rejoin Room ───────────────────────────────────────────────
    socket.on('rejoin-room', ({ roomId, playerId }, callback) => {
      console.log(`🔄 Rejoin attempt - roomId: ${roomId}, playerId: ${playerId}`)
      console.log(`🏠 Available rooms:`, Object.keys(rooms))

      const room = rooms[roomId]

      if (!room) {
        console.log(`❌ Room not found: ${roomId}`)
        return callback({ success: false, error: 'Room not found' })
      }

      const player = room.players.find(p => p.id === playerId)

      if (!player) {
        console.log(`❌ Player not found: ${playerId}`)
        return callback({ success: false, error: 'Player not found in room' })
      }

      // ✅ Update socket ID since it changed after page navigation
      player.socketId = socket.id
      socket.join(roomId)
      socket.data.roomId = roomId
      socket.data.playerId = playerId

      console.log(`✅ Player ${player.name} rejoined room ${roomId}`)
      callback({ success: true, room })
      io.to(roomId).emit('room-updated', { room })
    })

    // ─── Join Room ─────────────────────────────────────────────────
    socket.on('join-room', ({ roomId, playerName }, callback) => {
      const room = rooms[roomId]

      if (!room) return callback({ success: false, error: 'Room not found' })
      if (room.phase !== 'lobby') return callback({ success: false, error: 'Game already in progress' })
      if (room.players.length >= 20) return callback({ success: false, error: 'Room is full (max 20 players)' })

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

    // ─── Start Game ────────────────────────────────────────────────
    socket.on('start-game', ({ roomId }, callback) => {
      const room = rooms[roomId]

      if (!room) return callback({ success: false, error: 'Room not found' })
      if (room.players.length < room.minPlayers) {
        return callback({ success: false, error: `Need at least ${room.minPlayers} players to start` })
      }

      room.players = assignRoles(room.players)
      room.phase = 'briefing'

      io.to(roomId).emit('game-started', { room })

      room.players.forEach(player => {
        const playerSocket = io.sockets.sockets.get(player.socketId)
        if (playerSocket) {
          playerSocket.emit('role-briefing', { role: player.role })
        }
      })

      setTimeout(() => {
        if (rooms[roomId]) {
          rooms[roomId].phase = 'night'
          io.to(roomId).emit('room-updated', { room: rooms[roomId] })
        }
      }, 10000)

      callback({ success: true })
    })

    // ─── Night Action ──────────────────────────────────────────────
    socket.on('night-action', ({ targetId, actionType }, callback) => {
      const roomId = socket.data.roomId
      const playerId = socket.data.playerId
      const room = rooms[roomId]

      if (!room) return callback({ success: false, error: 'Room not found' })

      room.nightActions[playerId] = { targetId, actionType }

      const activePlayers = room.players.filter(p =>
        p.isAlive &&
        p.role !== 'Villager' &&
        p.role !== 'Jester' &&
        p.role !== 'Mayor'
      )
      const allActed = activePlayers.every(p => room.nightActions[p.id])

      if (allActed) resolveNight(io, room, roomId)

      callback({ success: true })
    })

    // ─── Chat Message ──────────────────────────────────────────────
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

    // ─── Vote ──────────────────────────────────────────────────────
    socket.on('vote', ({ targetId }, callback) => {
      const roomId = socket.data.roomId
      const playerId = socket.data.playerId
      const room = rooms[roomId]

      if (!room) return callback({ success: false, error: 'Room not found' })

      const voter = room.players.find(p => p.id === playerId)
      room.votes[playerId] = { targetId, weight: voter?.role === 'Mayor' ? 2 : 1 }

      const alivePlayers = room.players.filter(p => p.isAlive)
      const allVoted = alivePlayers.every(p => room.votes[p.id])

      io.to(roomId).emit('vote-updated', { votes: room.votes })

      if (allVoted) resolveVoting(io, room, roomId)

      callback({ success: true })
    })

    // ─── Disconnect ────────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id)
      const roomId = socket.data.roomId
      const playerId = socket.data.playerId
      if (!roomId || !rooms[roomId]) return

      const room = rooms[roomId]

      // ✅ Mark as disconnected instead of removing
      // so they can rejoin after page navigation
      const player = room.players.find(p => p.id === playerId)
      if (player) {
        player.disconnected = true
      }

      // ✅ Only delete room if ALL players have been disconnected for a while
      const allDisconnected = room.players.every(p => p.disconnected)
      if (allDisconnected) {
        setTimeout(() => {
          // Double check they haven't reconnected
          if (rooms[roomId] && rooms[roomId].players.every(p => p.disconnected)) {
            delete rooms[roomId]
            console.log(`🗑️ Room ${roomId} deleted (all players disconnected)`)
          }
        }, 30000) // 30 second grace period
      } else {
        if (!room.players.find(p => p.isHost && !p.disconnected)) {
          const nextHost = room.players.find(p => !p.disconnected)
          if (nextHost) nextHost.isHost = true
        }
        io.to(roomId).emit('room-updated', { room })
      }
    })
  })

  httpServer.listen(3000, () => {
    console.log('> Ready on http://localhost:3000')
  })
})

// ─── Night Resolution ────────────────────────────────────────────────
function resolveNight(io, room, roomId) {
  const actions = room.nightActions
  let killed = null
  let protected_ = null
  let blocked = []

  Object.entries(actions).forEach(([playerId, action]) => {
    if (action.actionType === 'block') blocked.push(action.targetId)
  })

  Object.entries(actions).forEach(([playerId, action]) => {
    if (action.actionType === 'doctor-protect' && !blocked.includes(playerId)) {
      protected_ = action.targetId
    }
  })

  const mafiaKills = {}
  Object.entries(actions).forEach(([playerId, action]) => {
    if (action.actionType === 'mafia-kill' && !blocked.includes(playerId)) {
      mafiaKills[action.targetId] = (mafiaKills[action.targetId] || 0) + 1
    }
  })

  const mafiaTarget = Object.entries(mafiaKills).sort((a, b) => b[1] - a[1])[0]
  if (mafiaTarget && mafiaTarget[0] !== protected_) {
    killed = mafiaTarget[0]
  }

  Object.entries(actions).forEach(([playerId, action]) => {
    if (action.actionType === 'vigilante-kill' && !blocked.includes(playerId)) {
      const target = room.players.find(p => p.id === action.targetId)
      if (target) target.isAlive = false
    }
  })

  if (killed) {
    const target = room.players.find(p => p.id === killed)
    if (target) target.isAlive = false
  }

  room.nightActions = {}
  room.currentDay += 1
  room.phase = 'day'

  const winner = checkWinCondition(room)
  if (winner) {
    room.phase = 'ended'
    room.winner = winner
  }

  io.to(roomId).emit('room-updated', { room })

  if (room.phase === 'day') {
    setTimeout(() => {
      if (rooms[roomId] && rooms[roomId].phase === 'day') {
        rooms[roomId].phase = 'voting'
        rooms[roomId].votes = {}
        io.to(roomId).emit('room-updated', { room: rooms[roomId] })
      }
    }, 180000)
  }
}

// ─── Voting Resolution ───────────────────────────────────────────────
function resolveVoting(io, room, roomId) {
  const voteCounts = {}

  Object.values(room.votes).forEach(({ targetId, weight }) => {
    voteCounts[targetId] = (voteCounts[targetId] || 0) + weight
  })

  const sorted = Object.entries(voteCounts).sort((a, b) => b[1] - a[1])
  const topVotes = sorted[0]
  const secondVotes = sorted[1]

  if (secondVotes && topVotes[1] === secondVotes[1]) {
    io.to(roomId).emit('vote-result', { eliminated: null, tie: true })
  } else if (topVotes) {
    const eliminated = room.players.find(p => p.id === topVotes[0])
    if (eliminated) {
      if (eliminated.role === 'Jester') {
        io.to(roomId).emit('jester-wins', { player: eliminated })
      }
      eliminated.isAlive = false
      io.to(roomId).emit('vote-result', { eliminated, tie: false })
    }
  }

  room.votes = {}
  room.phase = 'results'

  const winner = checkWinCondition(room)
  if (winner) {
    room.phase = 'ended'
    room.winner = winner
  }

  io.to(roomId).emit('room-updated', { room })

  if (room.phase === 'results') {
    setTimeout(() => {
      if (rooms[roomId] && rooms[roomId].phase === 'results') {
        rooms[roomId].phase = 'night'
        io.to(roomId).emit('room-updated', { room: rooms[roomId] })
      }
    }, 5000)
  }
}
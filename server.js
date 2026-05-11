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
const reconnectTimers = {}

const BRIEFING_DURATION = 10000
const NIGHT_DURATION = 45000
const DAY_DURATION = 60000
const SHORT_DAY_DURATION = 30000
const VOTING_DURATION = 60000
const RESULTS_DURATION = 5000
const RECONNECT_GRACE = 120000

const ALL_SPECIAL_ROLES = ['Godfather', 'Detective', 'Doctor', 'Bodyguard', 'Vigilante', 'RoleBlocker', 'Jester', 'Mayor']

const AVAILABLE_COLORS = [
  '#e74c3c','#e67e22','#f1c40f','#2ecc71','#1abc9c',
  '#3498db','#9b59b6','#e91e63','#00bcd4','#ff5722',
  '#8bc34a','#607d8b',
]

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

function isMafia(role) {
  return role === 'Mafia' || role === 'Godfather'
}

function buildRolePool(playerCount, settings) {
  const pool = []
  const mafiaCount = Math.max(1, Math.min(settings.mafiaCount || 2, playerCount - 1))

  if (settings.enabledRoles.includes('Godfather') && mafiaCount > 0) {
    pool.push('Godfather')
    for (let i = 1; i < mafiaCount; i++) pool.push('Mafia')
  } else {
    for (let i = 0; i < mafiaCount; i++) pool.push('Mafia')
  }

  for (const role of ALL_SPECIAL_ROLES) {
    if (role !== 'Godfather' && settings.enabledRoles.includes(role)) {
      pool.push(role)
    }
  }

  while (pool.length < playerCount) pool.push('Villager')
  return pool.slice(0, playerCount)
}

function assignRoles(players, settings) {
  const roles = buildRolePool(players.length, settings)
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[roles[i], roles[j]] = [roles[j], roles[i]]
  }
  return players.map((player, i) => ({ ...player, role: roles[i], isReady: false }))
}

function checkWinCondition(room) {
  const alive = room.players.filter(p => p.isAlive)
  const mafia = alive.filter(p => isMafia(p.role))
  const town = alive.filter(p => !isMafia(p.role))
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
  if (phaseTimers[roomId]) { clearTimeout(phaseTimers[roomId]); delete phaseTimers[roomId] }
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

function getUsedColors(room) {
  return room.players.map(p => p.color).filter(Boolean)
}

function sanitizeRoom(room) {
  return { ...room, players: room.players.map(p => ({ ...p, socketId: undefined })) }
}

function emitMafiaTeam(io, roomId) {
  const room = rooms[roomId]
  if (!room) return
  const mafiaPlayers = room.players.filter(p => isMafia(p.role))
  mafiaPlayers.forEach(mp => {
    const s = getPlayerSocket(io, mp.socketId)
    if (s) {
      s.emit('mafia-team', {
        teammates: mafiaPlayers.filter(p => p.id !== mp.id).map(p => ({ id: p.id, name: p.name, role: p.role, color: p.color, isAlive: p.isAlive }))
      })
    }
  })
}

function maybeStartFromReady(io, roomId) {
  const room = rooms[roomId]
  if (!room || room.phase !== 'lobby') return
  const activePlayers = room.players.filter(p => !p.disconnected)
  if (activePlayers.length < room.minPlayers) return
  if (!activePlayers.every(p => p.isReady)) return

  room.players = assignRoles(room.players, room.settings)
  room.phase = 'briefing'
  io.to(roomId).emit('game-started', { room: sanitizeRoom(room) })
  room.players.forEach(player => {
    const s = getPlayerSocket(io, player.socketId)
    if (s) s.emit('role-briefing', { role: player.role })
  })
  emitMafiaTeam(io, roomId)
  setPhaseTimer(roomId, () => startNightPhase(io, roomId), BRIEFING_DURATION)
}

function startNightPhase(io, roomId) {
  const room = rooms[roomId]
  if (!room) return
  room.phase = 'night'
  room.currentNight += 1
  room.phaseDurationSeconds = NIGHT_DURATION / 1000
  room.nightActions = {}
  io.to(roomId).emit('room-updated', { room: sanitizeRoom(room) })
  emitMafiaTeam(io, roomId)
  setPhaseTimer(roomId, () => resolveNight(io, roomId), NIGHT_DURATION)
}

function startDayPhase(io, roomId) {
  const room = rooms[roomId]
  if (!room) return
  const alivePlayers = room.players.filter(p => p.isAlive).length
  const dayDuration = alivePlayers < 3 ? SHORT_DAY_DURATION : DAY_DURATION
  room.phase = 'day'
  room.currentDay += 1
  room.phaseDurationSeconds = dayDuration / 1000
  room.votes = {}
  io.to(roomId).emit('room-updated', { room: sanitizeRoom(room) })
  emitMafiaTeam(io, roomId)
  setPhaseTimer(roomId, () => startVotingPhase(io, roomId), dayDuration)
}

function startVotingPhase(io, roomId) {
  const room = rooms[roomId]
  if (!room) return
  room.phase = 'voting'
  room.phaseDurationSeconds = VOTING_DURATION / 1000
  room.votes = {}
  io.to(roomId).emit('room-updated', { room: sanitizeRoom(room) })
  emitMafiaTeam(io, roomId)
  setPhaseTimer(roomId, () => resolveVoting(io, roomId), VOTING_DURATION)
}

function resolveNight(io, roomId) {
  const room = rooms[roomId]
  if (!room) return
  const actions = room.nightActions
  let killed = null
  let protectedTarget = null
  let doctorTarget = null
  const blocked = new Set()

  Object.entries(actions).forEach(([playerId, action]) => {
    if (action.actionType === 'block' && action.targetId) {
      blocked.add(action.targetId)
      const rbPlayer = room.players.find(p => p.id === playerId)
      const s = getPlayerSocket(io, rbPlayer?.socketId)
      if (s) s.emit('night-result', { type: 'roleblocker', message: `🚫 You blocked ${getPlayerName(room, action.targetId)} — they could not act tonight.` })
    }
  })

  Object.entries(actions).forEach(([playerId, action]) => {
    if (action.actionType === 'doctor-protect' && action.targetId && !blocked.has(playerId)) {
      protectedTarget = action.targetId
      doctorTarget = action.targetId
      if (action.targetId === playerId) {
        room.doctorSelfHealBlockedUntilNight[playerId] = room.currentNight + 1
      } else {
        delete room.doctorSelfHealBlockedUntilNight[playerId]
      }
    }
  })

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
      const doctorEntry = Object.entries(actions).find(([pid, a]) => a.actionType === 'doctor-protect' && !blocked.has(pid))
      if (doctorEntry) {
        const s = getPlayerSocket(io, room.players.find(p => p.id === doctorEntry[0])?.socketId)
        if (s) s.emit('night-result', { type: 'doctor-saved', message: `💉 You saved ${getPlayerName(room, targetId)} from death!` })
      }
      const bgEntry = Object.entries(actions).find(([pid, a]) => a.actionType === 'bodyguard-guard' && a.targetId === targetId && !blocked.has(pid))
      if (bgEntry) killed = bgEntry[0]
    } else {
      killed = targetId
    }
  } else if (protectedTarget) {
    const doctorEntry = Object.entries(actions).find(([, a]) => a.actionType === 'doctor-protect')
    if (doctorEntry) {
      const s = getPlayerSocket(io, room.players.find(p => p.id === doctorEntry[0])?.socketId)
      if (s) s.emit('night-result', { type: 'doctor-quiet', message: `💉 You protected ${getPlayerName(room, protectedTarget)} — quiet night.` })
    }
  }

  Object.entries(actions).forEach(([playerId, action]) => {
    if (action.actionType === 'vigilante-kill' && action.targetId && !blocked.has(playerId)) {
      const target = room.players.find(p => p.id === action.targetId)
      if (target && target.isAlive) {
        target.isAlive = false
        target.isSpectating = true
        const s = getPlayerSocket(io, room.players.find(p => p.id === playerId)?.socketId)
        if (s) s.emit('night-result', { type: 'vigilante', message: `⚔️ You eliminated ${target.name}. They were a ${target.role}.` })
      }
    }
  })

  if (killed) {
    const target = room.players.find(p => p.id === killed)
    if (target) { target.isAlive = false; target.isSpectating = true }
  }

  const winner = checkWinCondition(room)
  if (winner) {
    room.phase = 'ended'; room.winner = winner
    io.to(roomId).emit('room-updated', { room: sanitizeRoom(room) })
    emitMafiaTeam(io, roomId)
    return
  }
  startDayPhase(io, roomId)
}

function resolveVoting(io, roomId) {
  const room = rooms[roomId]
  if (!room) return
  const counts = getVoteCounts(room)
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
  let eliminated = null
  let tie = false

  if (sorted.length >= 2 && sorted[0][1] === sorted[1][1]) {
    tie = true
  } else if (sorted.length > 0) {
    const target = room.players.find(p => p.id === sorted[0][0])
    if (target) {
      if (target.role === 'Jester') {
        target.isAlive = false; target.isSpectating = true
        room.phase = 'ended'; room.winner = 'jester'
        io.to(roomId).emit('vote-result', { eliminated: target, tie: false, jesterWin: true })
        io.to(roomId).emit('room-updated', { room: sanitizeRoom(room) })
        emitMafiaTeam(io, roomId)
        return
      }
      target.isAlive = false; target.isSpectating = true
      eliminated = target
    }
  }

  io.to(roomId).emit('vote-result', { eliminated, tie })
  room.votes = {}; room.phase = 'results'
  const winner = checkWinCondition(room)
  if (winner) { room.phase = 'ended'; room.winner = winner }
  io.to(roomId).emit('room-updated', { room: sanitizeRoom(room) })
  emitMafiaTeam(io, roomId)
  if (room.phase === 'results') {
    setPhaseTimer(roomId, () => startNightPhase(io, roomId), RESULTS_DURATION)
  }
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true)
    if (parsedUrl.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }))
      return
    }
    handle(req, res, parse(req.url, true))
  })

  const io = new Server(httpServer, { cors: { origin: '*' } })

  io.on('connection', (socket) => {
    socket.on('get-available-colors', ({ roomId }, callback) => {
      const room = rooms[roomId]
      const used = room ? getUsedColors(room) : []
      callback({ colors: AVAILABLE_COLORS.filter(c => !used.includes(c)), allColors: AVAILABLE_COLORS })
    })

    socket.on('create-room', ({ playerName, color }, callback) => {
      const roomId = generateRoomCode()
      const playerId = uuidv4()
      const room = {
        id: roomId,
        players: [{ id: playerId, socketId: socket.id, name: playerName, role: null, isAlive: true, isHost: true, color: color || AVAILABLE_COLORS[0], isSpectating: false, isReady: false }],
        phase: 'lobby', currentDay: 1, currentNight: 0, nightActions: {}, votes: {}, maxPlayers: 20, minPlayers: 4, lobbyMessages: [],
        winner: null,
        phaseDurationSeconds: 0,
        doctorSelfHealBlockedUntilNight: {},
        settings: { mafiaCount: 2, enabledRoles: [...ALL_SPECIAL_ROLES] },
      }
      rooms[roomId] = room
      socket.join(roomId)
      socket.data.roomId = roomId
      socket.data.playerId = playerId
      callback({ success: true, room: sanitizeRoom(room), playerId })
      io.to(roomId).emit('room-updated', { room: sanitizeRoom(room) })
    })

    socket.on('join-room', ({ roomId, playerName, color }, callback) => {
      const room = rooms[roomId]
      if (!room) return callback({ success: false, error: 'Room not found' })
      if (room.phase !== 'lobby') return callback({ success: false, error: 'Game already in progress' })
      if (room.players.length >= 20) return callback({ success: false, error: 'Room is full' })
      const usedColors = getUsedColors(room)
      if (color && usedColors.includes(color)) return callback({ success: false, error: 'Color already taken' })
      const playerId = uuidv4()
      const player = {
        id: playerId, socketId: socket.id, name: playerName, role: null, isAlive: true, isHost: false,
        color: color || AVAILABLE_COLORS.find(c => !usedColors.includes(c)) || '#607d8b', isSpectating: false, isReady: false,
      }
      room.players.push(player)
      socket.join(roomId)
      socket.data.roomId = roomId
      socket.data.playerId = playerId
      callback({ success: true, room: sanitizeRoom(room), playerId })
      io.to(roomId).emit('room-updated', { room: sanitizeRoom(room) })
    })

    socket.on('rejoin-room', ({ roomId, playerId }, callback) => {
      const room = rooms[roomId]
      if (!room) return callback({ success: false, error: 'Room not found' })
      const player = room.players.find(p => p.id === playerId)
      if (!player) return callback({ success: false, error: 'Player not found' })
      if (reconnectTimers[playerId]) { clearTimeout(reconnectTimers[playerId]); delete reconnectTimers[playerId] }
      player.socketId = socket.id
      player.disconnected = false
      socket.join(roomId)
      socket.data.roomId = roomId
      socket.data.playerId = playerId
      callback({ success: true, room: sanitizeRoom(room) })
      io.to(roomId).emit('player-reconnected', { playerId, playerName: player.name })
      io.to(roomId).emit('room-updated', { room: sanitizeRoom(room) })
      emitMafiaTeam(io, roomId)
    })

    socket.on('update-room-settings', ({ roomId, settings }, callback) => {
      const room = rooms[roomId]
      if (!room || room.phase !== 'lobby') return callback({ success: false, error: 'Room is not in lobby' })
      const playerId = socket.data.playerId
      const player = room.players.find(p => p.id === playerId)
      if (!player || !player.isHost) return callback({ success: false, error: 'Only host can edit settings' })

      const mafiaCount = Number(settings?.mafiaCount || room.settings.mafiaCount)
      const enabledRoles = Array.isArray(settings?.enabledRoles)
        ? settings.enabledRoles.filter(r => ALL_SPECIAL_ROLES.includes(r))
        : room.settings.enabledRoles

      room.settings = {
        mafiaCount: Math.max(1, Math.min(mafiaCount, room.players.length - 1)),
        enabledRoles: enabledRoles.length > 0 ? enabledRoles : ['Doctor', 'Detective'],
      }
      room.players.forEach(p => { p.isReady = false })
      io.to(roomId).emit('room-updated', { room: sanitizeRoom(room) })
      callback({ success: true })
    })

    socket.on('toggle-ready', ({ roomId }, callback) => {
      const room = rooms[roomId]
      if (!room || room.phase !== 'lobby') return callback({ success: false, error: 'Room is not in lobby' })
      const playerId = socket.data.playerId
      const player = room.players.find(p => p.id === playerId)
      if (!player) return callback({ success: false, error: 'Player not found' })
      player.isReady = !player.isReady
      io.to(roomId).emit('room-updated', { room: sanitizeRoom(room) })
      maybeStartFromReady(io, roomId)
      callback({ success: true, isReady: player.isReady })
    })

    socket.on('play-again', ({ roomId }, callback) => {
      const room = rooms[roomId]
      if (!room || room.phase !== 'ended') return callback({ success: false, error: 'Room not ended' })
      const playerId = socket.data.playerId
      const player = room.players.find(p => p.id === playerId)
      if (!player || !player.isHost) return callback({ success: false, error: 'Only host can reset room' })

      clearPhaseTimer(roomId)
      room.phase = 'lobby'
      room.currentDay = 1
      room.currentNight = 0
      room.nightActions = {}
      room.votes = {}
      room.winner = null
      room.phaseDurationSeconds = 0
      room.doctorSelfHealBlockedUntilNight = {}
      room.players = room.players.map(p => ({ ...p, role: null, isAlive: true, isSpectating: false, isReady: false }))
      io.to(roomId).emit('room-updated', { room: sanitizeRoom(room) })
      callback({ success: true })
    })

    socket.on('change-name', ({ roomId, name }, callback) => {
      const room = rooms[roomId]
      if (!room) return callback({ success: false, error: 'Room not found' })
      if (!['lobby', 'ended'].includes(room.phase)) {
        return callback({ success: false, error: 'You can only change your name before or after a game.' })
      }

      const playerId = socket.data.playerId
      const player = room.players.find(p => p.id === playerId)
      if (!player) return callback({ success: false, error: 'Player not found' })

      const nextName = String(name || '').trim().slice(0, 20)
      if (!nextName) return callback({ success: false, error: 'Name is required' })

      player.name = nextName
      io.to(roomId).emit('room-updated', { room: sanitizeRoom(room) })
      callback({ success: true, name: nextName })
    })

    socket.on('night-action', ({ targetId, actionType, playerId: pid, roomId: rid }, callback) => {
      const roomId = socket.data.roomId || rid
      const playerId = socket.data.playerId || pid
      const room = rooms[roomId]
      if (!room || room.phase !== 'night') return callback({ success: false })

      const actor = room.players.find(p => p.id === playerId)
      if (!actor || !actor.isAlive) return callback({ success: false, error: 'Invalid actor' })

      if (actionType === 'doctor-protect' && targetId === playerId) {
        const blockedUntil = room.doctorSelfHealBlockedUntilNight[playerId] || 0
        if (room.currentNight <= blockedUntil) {
          return callback({ success: false, error: 'You cannot self-heal this night.' })
        }
      }

      room.nightActions[playerId] = { targetId, actionType }
      if (actionType === 'detective-investigate' && targetId) {
        const target = room.players.find(p => p.id === targetId)
        if (target) {
          const appearsAsMafia = isMafia(target.role) && target.role !== 'Godfather'
          socket.emit('investigation-result', {
            targetName: target.name, isMafia: appearsAsMafia,
            message: appearsAsMafia ? `🔍 ${target.name} IS MAFIA!` : `🔍 ${target.name} appears INNOCENT.`
          })
        }
      }
      const activePlayers = room.players.filter(p => p.isAlive && ['Mafia','Godfather','Detective','Doctor','Bodyguard','Vigilante','RoleBlocker'].includes(p.role))
      if (activePlayers.every(p => room.nightActions[p.id])) { clearPhaseTimer(roomId); resolveNight(io, roomId) }
      callback({ success: true })
    })

    socket.on('mafia-chat', ({ message, playerId: pid, roomId: rid }) => {
      const roomId = socket.data.roomId || rid
      const playerId = socket.data.playerId || pid
      const room = rooms[roomId]
      if (!room || room.phase !== 'night') return
      const player = room.players.find(p => p.id === playerId)
      if (!player || !isMafia(player.role)) return
      const msg = { playerId, playerName: player.name, playerColor: player.color, message, timestamp: Date.now() }
      room.players.filter(p => isMafia(p.role)).forEach(mp => {
        const s = getPlayerSocket(io, mp.socketId)
        if (s) s.emit('mafia-chat-message', msg)
      })
    })

    socket.on('lobby-chat', ({ message, playerId: pid, roomId: rid }) => {
      const roomId = socket.data.roomId || rid
      const playerId = socket.data.playerId || pid
      const room = rooms[roomId]
      if (!room || room.phase !== 'lobby') return
      const player = room.players.find(p => p.id === playerId)
      if (!player) return
      const msg = { playerId, playerName: player.name, playerColor: player.color, message, timestamp: Date.now() }
      room.lobbyMessages.push(msg)
      if (room.lobbyMessages.length > 100) room.lobbyMessages.shift()
      io.to(roomId).emit('lobby-chat-message', msg)
    })

    socket.on('chat-message', ({ message, playerId: pid, roomId: rid }) => {
      const roomId = socket.data.roomId || rid
      const playerId = socket.data.playerId || pid
      const room = rooms[roomId]
      if (!room) return
      const player = room.players.find(p => p.id === playerId)
      if (!player || !player.isAlive) return
      io.to(roomId).emit('chat-message', { playerId, playerName: player.name, playerColor: player.color, message, timestamp: Date.now() })
    })

    socket.on('vote', ({ targetId, playerId: pid, roomId: rid }, callback) => {
      const roomId = socket.data.roomId || rid
      const playerId = socket.data.playerId || pid
      const room = rooms[roomId]
      if (!room || room.phase !== 'voting') return callback({ success: false })
      const voter = room.players.find(p => p.id === playerId)
      if (!voter || !voter.isAlive) return callback({ success: false })
      room.votes[playerId] = { targetId, weight: voter.role === 'Mayor' ? 2 : 1, voterName: voter.name }
      const voteCounts = getVoteCounts(room)
      io.to(roomId).emit('vote-updated', { votes: room.votes, voteCounts, totalVoted: Object.keys(room.votes).length, totalAlive: room.players.filter(p => p.isAlive).length })
      if (room.players.filter(p => p.isAlive).every(p => room.votes[p.id])) { clearPhaseTimer(roomId); resolveVoting(io, roomId) }
      callback({ success: true })
    })

    socket.on('disconnect', () => {
      const roomId = socket.data.roomId
      const playerId = socket.data.playerId
      if (!roomId || !rooms[roomId]) return
      const room = rooms[roomId]
      const player = room.players.find(p => p.id === playerId)
      if (!player) return
      player.disconnected = true
      player.disconnectedAt = Date.now()
      io.to(roomId).emit('player-disconnected', { playerId, playerName: player.name, gracePeriod: RECONNECT_GRACE / 1000 })
      io.to(roomId).emit('room-updated', { room: sanitizeRoom(room) })

      reconnectTimers[playerId] = setTimeout(() => {
        const r = rooms[roomId]
        if (!r) return
        const p = r.players.find(x => x.id === playerId)
        if (!p || !p.disconnected) return
        r.players = r.players.filter(x => x.id !== playerId)
        delete reconnectTimers[playerId]
        if (p.isHost && r.players.length > 0) r.players[0].isHost = true
        if (r.players.length === 0) { clearPhaseTimer(roomId); delete rooms[roomId] }
        else {
          io.to(roomId).emit('player-kicked', { playerId, playerName: player.name })
          io.to(roomId).emit('room-updated', { room: sanitizeRoom(r) })
        }
      }, RECONNECT_GRACE)

      if (room.players.every(p => p.disconnected)) {
        setTimeout(() => {
          if (rooms[roomId] && rooms[roomId].players.every(p => p.disconnected)) {
            clearPhaseTimer(roomId)
            delete rooms[roomId]
          }
        }, 30000)
      }
    })
  })

  const PORT = process.env.PORT || 3000
  httpServer.listen(PORT, () => console.log(`> Ready on port ${PORT}`))
})

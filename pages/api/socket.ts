import { NextApiRequest, NextApiResponse } from 'next'
import { Server as HTTPServer } from 'http'
import { Socket as ServerSocket, Server as SocketIOServer } from 'socket.io'
import { gameManager } from '@/utils/gameManager'
import { GameAction } from '@/types/game'

type NextApiResponseWithSocket = NextApiResponse & {
  socket: any
}

// Store socket to room mapping globally
const socketToRoom: { [socketId: string]: string } = {}
const socketToUserId: { [socketId: string]: string } = {}

const SocketHandler = (req: NextApiRequest, res: NextApiResponseWithSocket) => {
  if (res.socket.server.io) {
    // Socket.io is already initialized
    res.status(200).json({ success: true })
    return
  }

  const httpServer: HTTPServer = res.socket.server as any
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  })

  io.on('connection', (socket: ServerSocket) => {
    console.log('Player connected:', socket.id)

    // Create room
    socket.on('create-room', (data: { playerName: string }, callback: Function) => {
      try {
        const room = gameManager.createRoom(socket.id, data.playerName)
        socketToRoom[socket.id] = room.id
        socketToUserId[socket.id] = socket.id
        socket.join(room.id)

        callback({
          success: true,
          room: {
            ...room,
            players: room.players.map((p) => ({
              ...p,
              socketId: undefined,
            })),
          },
        })

        io.to(room.id).emit('room-updated', {
          room: {
            ...room,
            players: room.players.map((p) => ({
              ...p,
              socketId: undefined,
            })),
          },
        })
      } catch (error) {
        callback({ success: false, error: 'Failed to create room' })
      }
    })

    // Join room
    socket.on('join-room', (data: { roomCode: string; playerName: string }, callback: Function) => {
      try {
        const room = gameManager.getRoomByCode(data.roomCode)

        if (!room) {
          callback({ success: false, error: 'Room not found' })
          return
        }

        const updatedRoom = gameManager.addPlayerToRoom(data.roomCode, socket.id, data.playerName)

        if (!updatedRoom) {
          callback({ success: false, error: 'Cannot join room (full, game started, or invalid code)' })
          return
        }

        socketToRoom[socket.id] = room.id
        socketToUserId[socket.id] = socket.id
        socket.join(room.id)

        callback({
          success: true,
          room: {
            ...updatedRoom,
            players: updatedRoom.players.map((p) => ({
              ...p,
              socketId: undefined,
            })),
          },
        })

        io.to(room.id).emit('room-updated', {
          room: {
            ...updatedRoom,
            players: updatedRoom.players.map((p) => ({
              ...p,
              socketId: undefined,
            })),
          },
        })
      } catch (error) {
        callback({ success: false, error: 'Failed to join room' })
      }
    })

    // Start game
    socket.on('start-game', (callback: Function) => {
      try {
        const roomId = socketToRoom[socket.id]
        const room = gameManager.getRoomById(roomId)

        if (!room || room.host !== socket.id) {
          callback({ success: false, error: 'Not authorized' })
          return
        }

        const success = gameManager.startGame(roomId)

        if (!success) {
          callback({ success: false, error: 'Could not start game' })
          return
        }

        callback({ success: true })

        const updatedRoom = gameManager.getRoomById(roomId)!
        io.to(roomId).emit('game-started', {
          room: {
            ...updatedRoom,
            players: updatedRoom.players.map((p) => ({
              ...p,
              socketId: undefined,
            })),
          },
        })

        // Send role briefings
        updatedRoom.players.forEach((player) => {
          const playerSocket = io.sockets.sockets.get(player.socketId)
          if (playerSocket) {
            playerSocket.emit('role-briefing', {
              role: player.role,
            })
          }
        })
      } catch (error) {
        callback({ success: false, error: 'Failed to start game' })
      }
    })

    // Record night action
    socket.on('night-action', (data: { targetId: string | null; actionType: string }, callback: Function) => {
      try {
        const roomId = socketToRoom[socket.id]
        const room = gameManager.getRoomById(roomId)

        if (!room || room.phase !== 'night') {
          callback({ success: false })
          return
        }

        const player = room.players.find((p) => p.socketId === socket.id)
        if (!player || !player.role) {
          callback({ success: false })
          return
        }

        const action: GameAction = {
          playerId: player.id,
          action: data.actionType as any,
          targetId: data.targetId,
          role: player.role,
        }

        gameManager.recordNightAction(roomId, action)
        callback({ success: true })
      } catch (error) {
        callback({ success: false })
      }
    })

    // Record vote
    socket.on('vote', (data: { targetId: string }, callback: Function) => {
      try {
        const roomId = socketToRoom[socket.id]
        const room = gameManager.getRoomById(roomId)

        if (!room || room.phase !== 'voting') {
          callback({ success: false })
          return
        }

        const player = room.players.find((p) => p.socketId === socket.id)
        if (!player) {
          callback({ success: false })
          return
        }

        gameManager.recordVote(roomId, player.id, data.targetId)
        callback({ success: true })

        io.to(roomId).emit('vote-recorded', {
          playerId: player.id,
        })
      } catch (error) {
        callback({ success: false })
      }
    })

    // Chat message
    socket.on('chat-message', (data: { message: string }) => {
      try {
        const roomId = socketToRoom[socket.id]
        const room = gameManager.getRoomById(roomId)

        if (!room) return

        const player = room.players.find((p) => p.socketId === socket.id)
        if (!player) return

        const message = {
          playerId: player.id,
          playerName: player.name,
          message: data.message,
          timestamp: Date.now(),
        }

        // If night phase, only send to Mafia
        if (room.phase === 'night') {
          const isMafia = player.role === 'Mafia' || player.role === 'Godfather'
          if (!isMafia) return

          const mafiaSocketIds = room.players
            .filter((p) => p.role === 'Mafia' || p.role === 'Godfather')
            .map((p) => p.socketId)

          mafiaSocketIds.forEach((socketId) => {
            io.to(socketId).emit('mafia-chat-message', message)
          })
        } else if (room.phase === 'day') {
          // Day phase - broadcast to all
          io.to(roomId).emit('chat-message', message)
        }
      } catch (error) {
        console.error('Chat message error:', error)
      }
    })

    // Disconnect
    socket.on('disconnect', () => {
      const roomId = socketToRoom[socket.id]
      delete socketToRoom[socket.id]
      delete socketToUserId[socket.id]

      if (roomId) {
        gameManager.removePlayerFromRoom(roomId, socket.id)
        const room = gameManager.getRoomById(roomId)

        if (room && room.players.length > 0) {
          io.to(roomId).emit('room-updated', {
            room: {
              ...room,
              players: room.players.map((p) => ({
                ...p,
                socketId: undefined,
              })),
            },
          })
        } else if (room) {
          gameManager.cleanup(roomId)
          io.to(roomId).emit('room-closed')
        }
      }

      console.log('Player disconnected:', socket.id)
    })
  })

  res.socket.server.io = io
  res.status(200).json({ success: true })
}

export default SocketHandler

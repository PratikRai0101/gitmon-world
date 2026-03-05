import http from 'http'
import express from 'express'
import { Server as IOServer, Socket } from 'socket.io'

type PlayerState = {
  id: string
  x: number
  y: number
  dir?: string
  timestamp: number
}

const app = express()
const server = http.createServer(app)
const io = new IOServer(server, {
  cors: { origin: '*' },
})

const players = new Map<string, PlayerState>()

io.on('connection', (socket: Socket) => {
  const id = socket.id
  console.log('connect', id)

  // send current players to the newly connected client
  socket.emit('players:init', Array.from(players.values()))

  socket.broadcast.emit('player:joined', { id })

  socket.on('player:update', (state: Omit<PlayerState, 'id'>) => {
    const playerState: PlayerState = { id, ...state }
    players.set(id, playerState)
    socket.broadcast.emit('player:update', playerState)
  })

  socket.on('disconnect', () => {
    console.log('disconnect', id)
    players.delete(id)
    io.emit('player:left', { id })
  })
})

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000
server.listen(PORT, () => console.log(`PlayerSync server listening on ${PORT}`))

import http from 'http'
import express from 'express'
import { Server as IOServer, Socket } from 'socket.io'
import { fetchGitStats } from './github'

type PlayerState = {
  id: string
  x: number
  y: number
  tileX?: number
  tileY?: number
  dir?: string
  timestamp: number
  username?: string
  stats?: { totalCommits: number; topLanguage?: string; stars: number }
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
    players.set(id, { ...(players.get(id) || {}), ...playerState })
    socket.broadcast.emit('player:update', playerState)
  })

  socket.on('player:move', (data: { tileX: number; tileY: number; x?: number; y?: number; timestamp: number }) => {
    const x = typeof data.x === 'number' ? data.x : data.tileX * 32
    const y = typeof data.y === 'number' ? data.y : data.tileY * 32
    const playerState: PlayerState = { id, x, y, tileX: data.tileX, tileY: data.tileY, timestamp: data.timestamp }
    players.set(id, { ...(players.get(id) || {}), ...playerState })
    socket.broadcast.emit('player:move', playerState)
  })

  socket.on('disconnect', () => {
    console.log('disconnect', id)
    players.delete(id)
    io.emit('player:left', { id })
  })

  // Handle identification: client sends GitHub username to fetch stats
  socket.on('player:identify', async ({ username }: { username: string }) => {
    try {
      const stats = await fetchGitStats(username)
      const existing = players.get(id) || ({} as PlayerState)
      const playerState: PlayerState = { id, x: existing.x || 0, y: existing.y || 0, timestamp: Date.now(), username, stats }
      players.set(id, { ...existing, ...playerState })
      // broadcast the stats to all clients
      io.emit('player:stats', { id, username, stats })
      console.log('identified', id, username, stats)
    } catch (err: any) {
      console.error('identify error', err)
      socket.emit('player:stats:error', { message: String(err) })
    }
  })

  // TEST: allow emitting a test-identify event to bypass GitHub API for quick local testing
  socket.on('test-identify', async () => {
    try {
      const username = 'raijinnn0101'
      const stats = { totalCommits: 750, topLanguage: 'Python', stars: 0 }
      const existing = players.get(id) || ({} as PlayerState)
      const playerState: PlayerState = { id, x: existing.x || 0, y: existing.y || 0, timestamp: Date.now(), username, stats }
      players.set(id, { ...existing, ...playerState })
      io.emit('player:stats', { id, username, stats })
      console.log('test-identify broadcast for', id, username, stats)
    } catch (err: any) {
      console.error('test-identify error', err)
      socket.emit('player:stats:error', { message: String(err) })
    }
  })
})

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000
server.listen(PORT, () => console.log(`PlayerSync server listening on ${PORT}`))

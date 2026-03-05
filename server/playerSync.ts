import http from 'http'
import express from 'express'
import { Server as IOServer, Socket } from 'socket.io'
import { Pool } from 'pg'

// Database pool (configure using env var DATABASE_URL)
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function findPlotByOwner(username: string) {
  const res = await pool.query('SELECT * FROM plots WHERE owner_username = $1 LIMIT 1', [username])
  return res.rows[0]
}

async function savePlot(username: string, x: number, y: number, building_type: string, top_language?: string) {
  const res = await pool.query(
    `INSERT INTO plots (owner_username, x, y, building_type, top_language, last_updated)
     VALUES ($1,$2,$3,$4,$5,now())
     ON CONFLICT (owner_username) DO UPDATE SET x=EXCLUDED.x, y=EXCLUDED.y, building_type=EXCLUDED.building_type, top_language=EXCLUDED.top_language, last_updated=now()
     RETURNING *`,
    [username, x, y, building_type, top_language]
  )
  return res.rows[0]
}

async function findNearestEmptyPlot(size = 3, maxRadius = 50) {
  // naive search spiraling out from 0,0 looking for free area (no existing plots overlap)
  for (let r = 0; r <= maxRadius; r++) {
    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        const x = dx * size
        const y = dy * size
        // check overlap
        const q = await pool.query('SELECT 1 FROM plots WHERE x BETWEEN $1-$3 AND $1+$3 AND y BETWEEN $2-$3 AND $2+$3 LIMIT 1', [x, y, size - 1])
        if (q.rowCount === 0) return { x, y }
      }
    }
  }
  return null
}

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
      // attempt to require the CJS helper synchronously (avoids ESM resolution issues)
      let fetchGitStats: any = null
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mod = require('./github.cjs')
        fetchGitStats = mod.fetchGitStats || mod.default || null
      } catch (e) {
        console.warn('could not require github.cjs helper:', String(e))
      }
      const stats = fetchGitStats ? await fetchGitStats(username) : { totalCommits: 0, topLanguage: undefined, stars: 0 }
      // check the DB for existing plot
      const saved = await findPlotByOwner(username)
      let plotX = saved?.x
      let plotY = saved?.y
      const building_type = saved?.building_type || (stats.totalCommits > 500 ? 'mansion' : stats.totalCommits >= 100 ? 'house' : 'cottage')
      // saved.x or saved.y may be 0 (origin) — check for null/undefined instead of falsy
      if (plotX == null || plotY == null) {
        // assign nearest empty plot sized by building_type
        const size = building_type === 'mansion' ? 3 : building_type === 'house' ? 2 : 1
        const spot = await findNearestEmptyPlot(size)
        if (spot) {
          plotX = spot.x
          plotY = spot.y
          await savePlot(username, plotX, plotY, building_type, stats.topLanguage)
        } else {
          // fallback spawn near origin
          plotX = 0
          plotY = 0
        }
      }

        const existing = players.get(id) || ({} as PlayerState)
        const xPos = typeof plotX === 'number' ? plotX : (existing.x ?? 0)
        const yPos = typeof plotY === 'number' ? plotY : (existing.y ?? 0)
        const playerState: PlayerState = { id, x: xPos, y: yPos, timestamp: Date.now(), username, stats }
        players.set(id, { ...existing, ...playerState })
        // broadcast the stats and assigned plot to all clients
        io.emit('player:stats', { id, username, stats, x: playerState.x, y: playerState.y })
        console.log('identified', id, username, stats, 'plot:', playerState.x, playerState.y)
      } catch (err: any) {
        console.error('identify error', err)
        socket.emit('player:stats:error', { message: String(err) })
    }
  })

  // Admin: request the full plots table for inspector view
  socket.on('admin:requestPlots', async () => {
    try {
      const res = await pool.query('SELECT id, owner_username, x, y, building_type, top_language, last_updated FROM plots')
      // send rows back to requester
      socket.emit('admin:allPlots', res.rows)
    } catch (err: any) {
      console.error('admin:requestPlots error', err)
      socket.emit('admin:allPlots:error', { message: String(err) })
    }
  })
  // NOTE: test-identify hook removed — use 'player:identify' with a mock or GitHub username for testing
})

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000
server.listen(PORT, () => console.log(`PlayerSync server listening on ${PORT}`))

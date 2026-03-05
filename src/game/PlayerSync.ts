import { io, Socket } from 'socket.io-client'
import Phaser from 'phaser'

export type RemotePlayer = {
  id: string
  sprite: Phaser.GameObjects.Sprite
  targetX: number
  targetY: number
  lastUpdate: number
}

export class PlayerSync {
  private socket: Socket
  private scene: Phaser.Scene
  private localId?: string
  private remotePlayers = new Map<string, RemotePlayer>()
  private sendInterval = 1000 / 15
  private sendTimer = 0

  constructor(scene: Phaser.Scene, serverUrl = 'http://localhost:4000') {
    this.scene = scene
    this.socket = io(serverUrl, { transports: ['websocket'] })

    this.socket.on('connect', () => {
      this.localId = this.socket.id
    })

    this.socket.on('players:init', (states: Array<{ id: string; x: number; y: number; timestamp: number }>) => {
      states.forEach((s) => this.createOrUpdateRemote(s.id, s.x, s.y, s.timestamp))
      // inform the scene about initial players
      try { this.scene.events.emit('players:init', states) } catch (e) {}
    })

    this.socket.on('player:joined', ({ id }: { id: string }) => {
      this.createOrUpdateRemote(id, 0, 0, Date.now())
      try { this.scene.events.emit('player:joined', { id }) } catch (e) {}
    })

    // other clients may announce a move intent
    this.socket.on('player:move', (state: { id: string; x: number; y: number; tileX?: number; tileY?: number; timestamp: number }) => {
      if (state.id === this.localId) return
      // create or update remote with target tiles
      this.createOrUpdateRemote(state.id, state.x, state.y, state.timestamp)
      const rp = this.remotePlayers.get(state.id)
      if (rp && typeof state.tileX === 'number' && typeof state.tileY === 'number') {
        rp.targetX = state.tileX * 32
        rp.targetY = state.tileY * 32
      }
    })

    this.socket.on('player:update', (state: { id: string; x: number; y: number; timestamp: number }) => {
      if (state.id === this.localId) return
      this.createOrUpdateRemote(state.id, state.x, state.y, state.timestamp)
    })

    this.socket.on('player:left', ({ id }: { id: string }) => {
      const rp = this.remotePlayers.get(id)
      if (rp) {
        rp.sprite.destroy()
        this.remotePlayers.delete(id)
      }
    })
  }

  // return a snapshot of known players with tile coords
  getKnownPlayers() {
    const out: Array<{ id: string; tileX: number; tileY: number; x: number; y: number }> = []
    this.remotePlayers.forEach((rp, id) => {
      const x = rp.sprite.x
      const y = rp.sprite.y
      const tileX = Math.round(x / 32)
      const tileY = Math.round(y / 32)
      out.push({ id, tileX, tileY, x, y })
    })
    return out
  }

  private createOrUpdateRemote(id: string, x: number, y: number, ts: number) {
    let rp = this.remotePlayers.get(id)
    if (!rp) {
      const sprite = this.scene.add.sprite(x, y, 'player-32')
      sprite.setOrigin(0.5, 0.5)
      rp = { id, sprite, targetX: x, targetY: y, lastUpdate: ts }
      this.remotePlayers.set(id, rp)
    } else {
      rp.targetX = x
      rp.targetY = y
      rp.lastUpdate = ts
    }
  }

  update(localX: number, localY: number, time: number, delta: number) {
    this.sendTimer += delta
    if (this.sendTimer >= this.sendInterval) {
      this.sendTimer = 0
      const state = { x: Math.round(localX), y: Math.round(localY), timestamp: Date.now() }
      this.socket.emit('player:update', state)
    }

    const smoothing = 0.12
    this.remotePlayers.forEach((rp) => {
      rp.sprite.x += (rp.targetX - rp.sprite.x) * smoothing
      rp.sprite.y += (rp.targetY - rp.sprite.y) * smoothing
    })
  }

  // Emit a move intent/target to the server so other clients can interpolate
  emitMove(tileX: number, tileY: number, x?: number, y?: number) {
    const payload: any = { tileX, tileY, timestamp: Date.now() }
    if (typeof x === 'number') payload.x = x
    if (typeof y === 'number') payload.y = y
    this.socket.emit('player:move', payload)
  }

  destroy() {
    this.socket.disconnect()
    this.remotePlayers.forEach((rp) => rp.sprite.destroy())
    this.remotePlayers.clear()
  }
}

import Phaser from 'phaser/dist/phaser.js'
import { PlayerSync } from '../PlayerSync'

export default class TownScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite
  private sync!: PlayerSync
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys

  constructor() {
    super({ key: 'TownScene' })
  }

  preload() {
    this.load.image('player-32', '/assets/placeholder-player-32.png')
    // tileset for buildings and map (placeholder single-tile)
    this.load.image('tiles', '/assets/tiles.png')
  }

  create() {
    // simple obstacle grid for collision checks (tracks occupied tiles as "x,y")
    ;(this as any).obstacleGrid = new Set<string>()

    // classic GBA grass background
    this.cameras.main.setBackgroundColor('#4d8a32')

    // debug grid overlay (32x32) subtle alpha for tile visibility
    const grid = this.add.graphics()
    grid.lineStyle(1, 0x000000, 0.1)
    const tileSize = 32
    const gridCols = 50
    const gridRows = 50
    for (let gx = 0; gx < gridCols; gx++) {
      for (let gy = 0; gy < gridRows; gy++) {
        grid.strokeRect(gx * tileSize, gy * tileSize, tileSize, tileSize)
      }
    }
    grid.setDepth(0)

    // create player sprite with 1px black outline effect via a graphics-backed rectangle under the sprite
    this.player = this.add.sprite(100, 100, 'player-32')
    this.player.setDepth(10)
    // floating label for local player
    const playerLabel = this.add.text(this.player.x, this.player.y - 10, 'You', { font: '12px monospace', color: '#ffffff', backgroundColor: 'rgba(0,0,0,0.6)', padding: { x: 6, y: 3 } })
    playerLabel.setOrigin(0.5, 1)
    playerLabel.setDepth(11)
    ;(this as any).localPlayerLabel = playerLabel
    this.cursors = this.input.keyboard.createCursorKeys()
    this.sync = new PlayerSync(this, 'http://localhost:4000')
    // spawn houses when players init or join
    this.sync.scene.events.on('players:init', (states: any[]) => this.spawnPlayerHouses(states))
    this.sync.scene.events.on('player:joined', ({ id }: { id: string }) => this.spawnPlayerHouses(this.sync.getKnownPlayers()))
    this.sync.scene.events.on('player:stats', (payload: any) => {
      // when stats arrive for a player, rebuild houses
      this.spawnPlayerHouses(this.sync.getKnownPlayers())
      // also update local player label position
      const lbl = (this as any).localPlayerLabel
      if (lbl && this.player) {
        lbl.setPosition(this.player.x, this.player.y - 10)
      }
    })
    this.sync.scene.events.on('player:stats:error', (err: any) => console.warn('player stats error', err))
    // initial spawn from known players
    this.spawnPlayerHouses(this.sync.getKnownPlayers())
    // wire a PlayerController for grid movement
    // @ts-ignore
    this.playerController = new (require('../PlayerController').default)(this, this.player, this.sync)
  }

  // Place buildings based on connected players and mark occupied tiles on obstacles layer
  spawnPlayerHouses(players: Array<any>) {
    if (!players) return
    // clear previous building occupancy and remove any existing graphics/labels
    ;(this as any).obstacleGrid.clear()
    if ((this as any).buildingGraphics) {
      (this as any).buildingGraphics.forEach((g: any) => g.destroy())
    }
    (this as any).buildingGraphics = []

    players.forEach((p, idx) => {
      // determine stats: prefer p.stats if present (emitted by server), else fallback
      const stats = p.stats || p.stats === 0 ? p.stats : { totalCommits: (idx + 1) * 120, topLanguage: idx % 2 === 0 ? 'JavaScript' : 'Python', stars: 0 }
      // lazy import to avoid circular
      // @ts-ignore
      const gitMonLogic = require('../../utils/gitMonLogic').default
      const cfg = gitMonLogic(stats)
      const tileX = p.tileX || Math.round((p.x || 0) / 32)
      const tileY = p.tileY || Math.round((p.y || 0) / 32)

      // mark occupied tiles in obstacleGrid set
      for (let ox = 0; ox < cfg.width; ox++) {
        for (let oy = 0; oy < cfg.height; oy++) {
          ;(this as any).obstacleGrid.add(`${tileX + ox},${tileY + oy}`)
        }
      }

      // world coordinates
      const worldX = tileX * 32
      const worldY = tileY * 32

      // draw building body with tinted color and 1px black outline (GBA sticker style)
      const g = this.add.graphics()
      const colorHex = cfg.roofColor || '#888'
      const colorNum = Phaser.Display.Color.HexStringToColor(colorHex).color
      g.fillStyle(colorNum, 1)
      g.fillRect(worldX, worldY, cfg.width * 32, cfg.height * 32)
      g.lineStyle(1, 0x000000, 1)
      g.strokeRect(worldX, worldY, cfg.width * 32, cfg.height * 32)
      g.setDepth(5)
      ;(this as any).buildingGraphics.push(g)

      // username label for building
      const ownerName = p.owner_username || p.username || `player-${p.id?.slice(0, 4)}`
      const label = this.add.text(worldX + (cfg.width * 16), worldY - 8, ownerName, {
        font: '12px monospace', color: '#ffffff', backgroundColor: 'rgba(0,0,0,0.6)', padding: { x: 6, y: 3 }
      })
      label.setOrigin(0.5, 1)
      label.setDepth(6)
      ;(this as any).buildingGraphics.push(label)
    })
  }

  update(time: number, delta: number) {
    const speed = 100
    let vx = 0, vy = 0
    if (this.cursors.left?.isDown) vx = -speed
    if (this.cursors.right?.isDown) vx = speed
    if (this.cursors.up?.isDown) vy = -speed
    if (this.cursors.down?.isDown) vy = speed

    this.player.x += vx * (delta / 1000)
    this.player.y += vy * (delta / 1000)

    this.sync.update(this.player.x, this.player.y, time, delta)
    // update player controller if present
    // @ts-ignore
    if (this.playerController) this.playerController.update(time, delta)
  }
}

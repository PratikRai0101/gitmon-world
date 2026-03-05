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

    this.player = this.add.sprite(100, 100, 'player-32')
    this.cursors = this.input.keyboard.createCursorKeys()
    this.sync = new PlayerSync(this, 'http://localhost:4000')
    // spawn houses when players init or join
    this.sync.scene.events.on('players:init', (states: any[]) => this.spawnPlayerHouses(states))
    this.sync.scene.events.on('player:joined', ({ id }: { id: string }) => this.spawnPlayerHouses(this.sync.getKnownPlayers()))
    this.sync.scene.events.on('player:stats', (payload: any) => {
      // when stats arrive for a player, rebuild houses
      this.spawnPlayerHouses(this.sync.getKnownPlayers())
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

      // draw roof with colored fill and 1px black border
      const g = this.add.graphics()
      g.fillStyle(Phaser.Display.Color.HexStringToColor(cfg.roofColor).color, 1)
      g.fillRect(worldX, worldY, cfg.width * 32, cfg.height * 32)
      g.lineStyle(1, 0x000000, 1)
      g.strokeRect(worldX, worldY, cfg.width * 32, cfg.height * 32)
      g.setDepth(5)
      ;(this as any).buildingGraphics.push(g)

      // username label
      const username = p.username || `player-${p.id?.slice(0, 4)}`
      const label = this.add.text(worldX + (cfg.width * 16), worldY - 6, username, {
        font: '12px monospace', color: '#ffffff', backgroundColor: 'rgba(0,0,0,0.5)', padding: { x: 4, y: 2 }
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

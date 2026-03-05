import Phaser from 'phaser'
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
    // create a simple tilemap 50x50, tileSize 32
    const map = this.make.tilemap({ tileWidth: 32, tileHeight: 32, width: 50, height: 50 })
    const tileset = map.addTilesetImage('tiles')
    const ground = map.createBlankLayer('Ground', tileset)
    const obstacles = map.createBlankLayer('Obstacles', tileset)
    // store map reference for controller collision checks
    ;(this as any).map = map

    this.player = this.add.sprite(100, 100, 'player-32')
    this.cursors = this.input.keyboard.createCursorKeys()
    this.sync = new PlayerSync(this, 'http://localhost:4000')
    // spawn houses when players init or join
    this.sync.scene.events.on('players:init', (states: any[]) => this.spawnPlayerHouses(states, obstacles))
    this.sync.scene.events.on('player:joined', ({ id }: { id: string }) => this.spawnPlayerHouses(this.sync.getKnownPlayers(), obstacles))
    // initial spawn from known players
    this.spawnPlayerHouses(this.sync.getKnownPlayers(), obstacles)
    // wire a PlayerController for grid movement
    // @ts-ignore
    this.playerController = new (require('../PlayerController').default)(this, this.player, this.sync)
  }

  // Place buildings based on connected players and mark occupied tiles on obstacles layer
  spawnPlayerHouses(players: Array<any>, obstaclesLayer: any) {
    if (!players || !obstaclesLayer) return
    // clear previous building tiles in obstacles
    obstaclesLayer.fill(-1)
    players.forEach((p, idx) => {
      // for demo, create fake stats; in real use fetch per-player stats
      const stats = { totalCommits: (idx + 1) * 120, topLanguage: idx % 2 === 0 ? 'JavaScript' : 'Python', stars: 0 }
      // lazy import to avoid circular
      // @ts-ignore
      const gitMonLogic = require('../../utils/gitMonLogic').default
      const cfg = gitMonLogic(stats)
      const tileX = p.tileX || Math.round(p.x / 32)
      const tileY = p.tileY || Math.round(p.y / 32)
      // render building as filled tiles in ground layer (for now, use obstacles layer)
      for (let ox = 0; ox < cfg.width; ox++) {
        for (let oy = 0; oy < cfg.height; oy++) {
          obstaclesLayer.putTileAt(1, tileX + ox, tileY + oy)
        }
      }
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

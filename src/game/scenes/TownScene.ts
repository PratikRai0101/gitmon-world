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
    ;(this as any).plotByTile = new Map<string, any>()

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

    // create player as a filled rectangle (blue tint) with 1px black outline to match GBA sticker style
    const playerGraphics = this.add.graphics()
    const playerColor = Phaser.Display.Color.HexStringToColor('#3498db').color
    playerGraphics.fillStyle(playerColor, 1)
    playerGraphics.fillRect(100 - 12, 100 - 12, 24, 24)
    playerGraphics.lineStyle(1, 0x000000, 1)
    playerGraphics.strokeRect(100 - 12, 100 - 12, 24, 24)
    playerGraphics.setDepth(10)
    this.player = this.add.sprite(100, 100, 'player-32')
    this.player.setVisible(false)
    // attach graphics as an interactive display object for positioning
    ;(this as any).playerGraphic = playerGraphics
    // floating label for local player (monospace, semi-transparent bg)
    const playerLabel = this.add.text(100, 100 - 14, 'You', { font: '12px monospace', color: '#ffffff', backgroundColor: 'rgba(0,0,0,0.6)', padding: { x: 6, y: 3 } })
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
      const pg = (this as any).playerGraphic
      if (lbl && this.player) {
        lbl.setPosition(this.player.x, this.player.y - 14)
      }
      if (pg && this.player) {
        pg.setPosition(this.player.x, this.player.y)
      }
    })
    this.sync.scene.events.on('player:stats:error', (err: any) => console.warn('player stats error', err))
    // listen for proximity checks to show/hide interaction prompt
    this.events.on('player:checkProximity', ({ hasPlot, plot }: any) => {
      if (hasPlot) {
        // show a small 'Press E to Inspect' prompt
        if (!(this as any).inspectPrompt) {
          const txt = this.add.text(400, 40, 'Press E to Inspect', { font: '14px monospace', color: '#fff', backgroundColor: 'rgba(0,0,0,0.7)', padding: { x: 6, y: 4 } })
          txt.setOrigin(0.5, 0)
          txt.setDepth(50)
          ;(this as any).inspectPrompt = txt
        }
      } else {
        if ((this as any).inspectPrompt) {
          ;(this as any).inspectPrompt.destroy()
          ;(this as any).inspectPrompt = null
        }
      }
      ;(this as any).nearestPlot = plot
    })
    // initial spawn from known players
    this.spawnPlayerHouses(this.sync.getKnownPlayers())
    // wire a PlayerController for grid movement
    // @ts-ignore
    this.playerController = new (require('../PlayerController').default)(this, this.player, this.sync)

    // react overlay integration: show trainer card when inspection happens
    this.events.on('player:inspect', async (plot: any) => {
      try {
        // emit a window-level custom event so React can listen and show HUD
        const ev = new CustomEvent('gitmon:inspect', { detail: plot })
        window.dispatchEvent(ev)
      } catch (e) {}
    })
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

      // add door (dark brown) centered at bottom
      const doorW = Math.max(8, Math.floor((cfg.width * 32) / 4))
      const doorH = Math.max(10, Math.floor((cfg.height * 32) / 6))
      const doorX = worldX + (cfg.width * 32) / 2 - doorW / 2
      const doorY = worldY + cfg.height * 32 - doorH - 4
      g.fillStyle(Phaser.Display.Color.HexStringToColor('#5c3a21').color, 1)
      g.fillRect(doorX, doorY, doorW, doorH)
      g.lineStyle(1, 0x000000, 1)
      g.strokeRect(doorX, doorY, doorW, doorH)

      // add window (light blue) top-left area
      const winSize = Math.min(12, Math.floor((cfg.width * 32) / 4))
      const winX = worldX + 6
      const winY = worldY + 6
      g.fillStyle(Phaser.Display.Color.HexStringToColor('#bfe9ff').color, 1)
      g.fillRect(winX, winY, winSize, winSize)
      g.lineStyle(1, 0x000000, 1)
      g.strokeRect(winX, winY, winSize, winSize)

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

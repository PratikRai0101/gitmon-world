import Phaser from 'phaser/dist/phaser.js'
import { PlayerSync } from './PlayerSync'

export default class PlayerController {
  scene: Phaser.Scene
  sprite: Phaser.GameObjects.Sprite
  cursors: Phaser.Types.Input.Keyboard.CursorKeys
  moving = false
  targetX = 0
  targetY = 0
  speed = 160 // pixels per second
  sync: PlayerSync

  constructor(scene: Phaser.Scene, sprite: Phaser.GameObjects.Sprite, sync: PlayerSync) {
    this.scene = scene
    this.sprite = sprite
    this.cursors = scene.input.keyboard.createCursorKeys()
    this.sync = sync
    // initialize tile-aligned position
    this.sprite.x = Math.round(this.sprite.x / 32) * 32
    this.sprite.y = Math.round(this.sprite.y / 32) * 32
    this.targetX = this.sprite.x
    this.targetY = this.sprite.y
  }

  update(time: number, delta: number) {
    // if currently moving, interpolate towards target
    if (this.moving) {
      const dx = this.targetX - this.sprite.x
      const dy = this.targetY - this.sprite.y
      const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 1) {
        // snap to target
        this.sprite.x = this.targetX
        this.sprite.y = this.targetY
        this.moving = false
        // send final tile position
        const tileX = Math.round(this.sprite.x / 32)
        const tileY = Math.round(this.sprite.y / 32)
        this.sync.emitMove(tileX, tileY, this.sprite.x, this.sprite.y)
        } else {
        const step = (this.speed * delta) / 1000
        this.sprite.x += (dx / dist) * Math.min(step, dist)
        this.sprite.y += (dy / dist) * Math.min(step, dist)
      }
      return
    }

    // If not moving, check input for new movement and start slide to next tile
    let dirX = 0
    let dirY = 0
    if (this.cursors.left?.isDown) dirX = -1
    else if (this.cursors.right?.isDown) dirX = 1
    else if (this.cursors.up?.isDown) dirY = -1
    else if (this.cursors.down?.isDown) dirY = 1

    if ((dirX !== 0 || dirY !== 0)) {
      // compute next tile aligned target
      const currentTileX = Math.round(this.sprite.x / 32)
      const currentTileY = Math.round(this.sprite.y / 32)
      const nextTileX = currentTileX + dirX
      const nextTileY = currentTileY + dirY
      // check collision via tile layer (if provided by scene)
    const obstacleGrid: Set<string> = (this.scene as any).obstacleGrid
    if (obstacleGrid && obstacleGrid.has(`${nextTileX},${nextTileY}`)) {
      // bump into wall — play a short bump animation or sound later
      this.moving = false
      return
    }
      this.targetX = nextTileX * 32
      this.targetY = nextTileY * 32
      this.moving = true
      // send intention/target so others see the smooth movement
      this.sync.emitMove(nextTileX, nextTileY, this.targetX, this.targetY)
      // after starting movement, check adjacency for interaction hint
      setTimeout(() => {
        try {
          const scene: any = this.scene
          const plotMap: Map<string, any> = scene.plotByTile
          const facingTileKey = `${nextTileX + dirX},${nextTileY + dirY}`
          const adjacentKey = `${nextTileX},${nextTileY}`
          // player is now on nextTileX,nextTileY; check adjacent tiles in facing direction
          const plot = plotMap ? plotMap.get(facingTileKey) || plotMap.get(adjacentKey) : null
          scene.events.emit('player:checkProximity', { hasPlot: !!plot, plot })
        } catch (e) {}
      }, 220)
    }
    // handle Inspect key (E)
    const inspectKey = this.scene.input.keyboard.addKey('E')
    if (Phaser.Input.Keyboard.JustDown(inspectKey)) {
      try {
        const scene: any = this.scene
        const nearest = scene.nearestPlot
        if (nearest) {
          // trigger an event that React overlay can listen to (scene.events)
          scene.events.emit('player:inspect', nearest)
        }
      } catch (e) {}
    }
  }
}

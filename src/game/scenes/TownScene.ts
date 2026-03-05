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
  }

  create() {
    this.player = this.add.sprite(100, 100, 'player-32')
    this.cursors = this.input.keyboard.createCursorKeys()
    this.sync = new PlayerSync(this, 'http://localhost:4000')
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
  }
}

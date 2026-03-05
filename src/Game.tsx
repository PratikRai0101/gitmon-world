import React, { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import TownScene from './game/scenes/TownScene'

export default function Game() {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!ref.current) return
    // prompt for GitHub username before initializing Phaser so we can identify
    let username: string | null = null
    try {
      username = window.prompt('Enter your GitHub username (optional, for home generation):')
    } catch (e) {
      username = null
    }
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: ref.current,
      physics: { default: 'arcade', arcade: { gravity: { y: 0 } } },
      scene: [TownScene],
    }

    const game = new Phaser.Game(config)
    // once scene starts, send identify via PlayerSync if username provided
    game.events.on('ready', () => {
      try {
        // PlayerSync is created in TownScene; wait a tick and emit an identify via scene event
        if (username) setTimeout(() => game.events.emit('client:identify', username), 300)
      } catch (e) {}
    })
    return () => {
      game.destroy(true)
    }
  }, [])

  return <div ref={ref} />
}

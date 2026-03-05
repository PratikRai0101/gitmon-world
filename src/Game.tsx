import React, { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import TownScene from './game/scenes/TownScene'

export default function Game() {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!ref.current) return

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: ref.current,
      physics: { default: 'arcade', arcade: { gravity: { y: 0 } } },
      scene: [TownScene],
    }

    const game = new Phaser.Game(config)
    return () => {
      game.destroy(true)
    }
  }, [])

  return <div ref={ref} />
}

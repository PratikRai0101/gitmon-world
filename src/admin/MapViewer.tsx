import React, { useRef, useEffect, useState } from 'react'

type Plot = {
  id: number
  owner_username: string
  x: number
  y: number
  building_type: string
  top_language: string | null
  totalCommits?: number | null
}

const languageToColor: Record<string, string> = {
  javascript: '#FFD43B',
  python: '#2ECC71',
  rust: '#DE6A31',
}

export default function MapViewer({ plots }: { plots: Plot[] }) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  const [hover, setHover] = useState<{ x: number; y: number; info: string } | null>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const tileSize = 16
    const width = canvas.width
    const height = canvas.height
    ctx.clearRect(0, 0, width, height)
    // draw grid
    ctx.strokeStyle = '#222'
    for (let gx = 0; gx < width; gx += tileSize) ctx.strokeRect(gx, 0, tileSize, height)
    for (let gy = 0; gy < height; gy += tileSize) ctx.strokeRect(0, gy, width, tileSize)

    // draw plots
    plots.forEach((p) => {
      const size = p.building_type === 'mansion' ? 3 : p.building_type === 'house' ? 2 : 1
      const color = p.top_language ? languageToColor[p.top_language.toLowerCase()] || '#888' : '#888'
      const px = (p.x + 100) * tileSize // offset + scale
      const py = (p.y + 100) * tileSize
      ctx.fillStyle = color
      ctx.fillRect(px, py, size * tileSize, size * tileSize)
      ctx.strokeStyle = '#000'
      ctx.lineWidth = 1
      ctx.strokeRect(px, py, size * tileSize, size * tileSize)
    })
  }, [plots])

  function onMove(e: React.MouseEvent) {
    const canvas = ref.current!
    const rect = canvas.getBoundingClientRect()
    const tx = Math.floor((e.clientX - rect.left) / 16) - 100
    const ty = Math.floor((e.clientY - rect.top) / 16) - 100
    const found = (plots as Plot[]).find((p) => {
      const size = p.building_type === 'mansion' ? 3 : p.building_type === 'house' ? 2 : 1
      return tx >= p.x && tx < p.x + size && ty >= p.y && ty < p.y + size
    })
    if (found) setHover({ x: e.clientX, y: e.clientY, info: `${found.owner_username} — commits:${found.totalCommits ?? 'N/A'}` })
    else setHover(null)
  }

  return (
    <div style={{ position: 'relative' }}>
      <canvas ref={ref} width={1600} height={700} onMouseMove={onMove} style={{ width: '100%', height: '700px' }} />
      {hover && (
        <div style={{ position: 'fixed', left: hover.x + 12, top: hover.y + 12, background: 'rgba(0,0,0,0.8)', color: '#fff', padding: 6, borderRadius: 4 }}>
          {hover.info}
        </div>
      )}
    </div>
  )
}

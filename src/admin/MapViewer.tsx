"use client"

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
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [scale, setScale] = useState(1)
  const [tx, setTx] = useState(0)
  const [ty, setTy] = useState(0)
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef<{ x: number; y: number } | null>(null)
  const [hoverInfo, setHoverInfo] = useState<{ x: number; y: number; info: string } | null>(null)
  const tileSize = 32

  // initialize center so (0,0) is centered
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const w = svg.clientWidth
    const h = svg.clientHeight
    setTx(w / 2)
    setTy(h / 2)
  }, [])

  // wheel to zoom
  function onWheel(e: React.WheelEvent) {
    e.preventDefault()
    const delta = -e.deltaY
    const factor = delta > 0 ? 1.1 : 0.9
    const newScale = Math.max(0.25, Math.min(4, scale * factor))
    setScale(newScale)
  }

  function onMouseDown(e: React.MouseEvent) {
    setIsPanning(true)
    panStart.current = { x: e.clientX, y: e.clientY }
  }

  function onMouseMove(e: React.MouseEvent) {
    if (isPanning && panStart.current) {
      const dx = e.clientX - panStart.current.x
      const dy = e.clientY - panStart.current.y
      setTx((t) => t + dx)
      setTy((t) => t + dy)
      panStart.current = { x: e.clientX, y: e.clientY }
      return
    }
    // hover detection
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const cx = (e.clientX - rect.left - tx) / scale
    const cy = (e.clientY - rect.top - ty) / scale
    const txile = Math.floor(cx / tileSize)
    const tyile = Math.floor(cy / tileSize)
    const found = plots.find((p) => {
      const size = p.building_type === 'mansion' ? 3 : p.building_type === 'house' ? 2 : 1
      return txile >= p.x && txile < p.x + size && tyile >= p.y && tyile < p.y + size
    })
    if (found) setHoverInfo({ x: e.clientX, y: e.clientY, info: `${found.owner_username} — commits:${found.totalCommits ?? 'N/A'}` })
    else setHoverInfo(null)
  }

  function onMouseUp() {
    setIsPanning(false)
    panStart.current = null
  }

  // flyTo animation
  const flyRef = useRef<any>(null)
  function flyToPlot(plot: Plot) {
    const svg = svgRef.current
    if (!svg) return
    const w = svg.clientWidth
    const h = svg.clientHeight
    const targetX = w / 2 - (plot.x + (plot.building_type === 'mansion' ? 1 : plot.building_type === 'house' ? 0.5 : 0)) * tileSize * scale
    const targetY = h / 2 - (plot.y + (plot.building_type === 'mansion' ? 1 : plot.building_type === 'house' ? 0.5 : 0)) * tileSize * scale
    const startX = tx
    const startY = ty
    const duration = 500
    const start = performance.now()
    if (flyRef.current) cancelAnimationFrame(flyRef.current)
    function step(now: number) {
      const t = Math.min(1, (now - start) / duration)
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
      setTx(startX + (targetX - startX) * ease)
      setTy(startY + (targetY - startY) * ease)
      if (t < 1) flyRef.current = requestAnimationFrame(step)
    }
    flyRef.current = requestAnimationFrame(step)
  }

  const latest = [...plots].sort((a, b) => (new Date(b.last_updated ?? 0).getTime() - new Date(a.last_updated ?? 0).getTime())).slice(0, 10)

  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <div style={{ flex: 1, border: '1px solid #333', height: 700, position: 'relative' }}>
        <svg ref={svgRef} width="100%" height="100%" onWheel={onWheel} onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp} style={{ touchAction: 'none', background: '#0b6a2c' }}>
          <g transform={`translate(${tx},${ty}) scale(${scale})`}>
            {/* grid - render a limited area around origin */}
            {Array.from({ length: 101 }, (_, i) => i - 50).map((gx) =>
              Array.from({ length: 101 }, (_, j) => j - 50).map((gy) => (
                <rect key={`g-${gx}-${gy}`} x={gx * tileSize} y={gy * tileSize} width={tileSize} height={tileSize} fill="transparent" stroke="#0a4f1d" strokeWidth={0.5} />
              ))
            )}

            {/* plots */}
            {plots.map((p) => {
              const size = p.building_type === 'mansion' ? 3 : p.building_type === 'house' ? 2 : 1
              const color = p.top_language ? languageToColor[p.top_language.toLowerCase()] || '#888' : '#888'
              const px = p.x * tileSize
              const py = p.y * tileSize
              return (
                <g key={p.id} transform={`translate(${px},${py})`}>
                  <rect x={0} y={0} width={size * tileSize} height={size * tileSize} fill={color} stroke="#000" strokeWidth={1} />
                </g>
              )
            })}
          </g>
        </svg>
        {hoverInfo && <div style={{ position: 'fixed', left: hoverInfo.x + 12, top: hoverInfo.y + 12, background: 'rgba(0,0,0,0.8)', color: '#fff', padding: 6, borderRadius: 4 }}>{hoverInfo.info}</div>}
      </div>

      <aside style={{ width: 300, border: '1px solid #333', padding: 8, height: 700, overflowY: 'auto' }}>
        <h3>Latest Residents</h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {latest.map((p) => (
            <li key={p.id} style={{ padding: '6px 4px', borderBottom: '1px solid #222', cursor: 'pointer' }} onClick={() => flyToPlot(p)}>
              <strong>{p.owner_username}</strong>
              <div style={{ fontSize: 12, color: '#ccc' }}>{p.building_type} — commits: {p.totalCommits ?? 'N/A'}</div>
            </li>
          ))}
        </ul>
      </aside>
    </div>
  )
}

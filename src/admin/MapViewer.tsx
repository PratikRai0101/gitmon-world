"use client"

import React, { useRef, useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'

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
  const socketRef = useRef<Socket | null>(null)
  const [scale, setScale] = useState(1)
  const [tx, setTx] = useState(0)
  const [ty, setTy] = useState(0)
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef<{ x: number; y: number } | null>(null)
  const [hoverInfo, setHoverInfo] = useState<{ x: number; y: number; info: string } | null>(null)
  const [plotsState, setPlotsState] = useState<Plot[]>(plots || [])
  const [animating, setAnimating] = useState<Record<number, boolean>>({})
  const [feed, setFeed] = useState<string[]>([])
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

  // setup socket connection for live updates
  useEffect(() => {
    const socket = io((typeof window !== 'undefined' && window.location.hostname) ? `http://${window.location.hostname}:4000` : 'http://localhost:4000', { transports: ['websocket'] })
    socketRef.current = socket

    function pushFeed(msg: string) {
      setFeed((f) => [msg, ...f].slice(0, 50))
    }

    socket.on('connect', () => {
      pushFeed(`Admin connected to live updates (socket ${socket.id})`)
    })

    // when a player identifies / server assigns a plot it emits player:stats
    socket.on('player:stats', (payload: any) => {
      try {
        const username = payload.username || payload.owner_username || 'unknown'
        const stats = payload.stats || {}
        const x = typeof payload.x === 'number' ? payload.x : (payload.plotX ?? payload.x ?? 0)
        const y = typeof payload.y === 'number' ? payload.y : (payload.plotY ?? payload.y ?? 0)
        // determine building type from commits (mirror server logic)
        const commits = stats.totalCommits ?? 0
        const building_type = commits > 500 ? 'mansion' : commits >= 100 ? 'house' : 'cottage'
        const top_language = stats.topLanguage ?? stats.top_language ?? null

        // update or add plot
        setPlotsState((prev) => {
          const found = prev.find((p) => p.owner_username === username)
          if (found) {
            const updated = prev.map((p) => p.owner_username === username ? { ...p, x, y, building_type, top_language } : p)
            return updated
          }
          const nextId = (prev.reduce((m, r) => Math.max(m, r.id || 0), 0) || 0) + 1
          const newPlot: Plot = { id: nextId, owner_username: username, x, y, building_type, top_language, totalCommits: commits }
          return [newPlot, ...prev]
        })

        // animate the plot briefly
        setAnimating((a) => ({ ...a, [username?.toString().length ?? Math.random() * 1000]: true }))
        pushFeed(`${username} spawned a ${top_language ?? 'Unknown'} ${building_type} at [${x}, ${y}]`)
      } catch (e) {
        console.warn('player:stats handler error', e)
      }
    })

    socket.on('player:identify', (payload: any) => {
      const username = payload?.username || 'unknown'
      pushFeed(`${username} started identify flow`)
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
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

  const latest = [...plotsState].slice(0, 10)

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
            {plotsState.map((p) => {
              const size = p.building_type === 'mansion' ? 3 : p.building_type === 'house' ? 2 : 1
              const color = p.top_language ? languageToColor[p.top_language.toLowerCase()] || '#888' : '#888'
              const px = p.x * tileSize
              const py = p.y * tileSize
              return (
                <g key={p.id} transform={`translate(${px},${py})`}>
                  <g style={{ transformOrigin: '0 0', transition: 'transform 400ms ease, opacity 400ms ease', transform: animating[p.id] ? 'scale(0.85)' : 'scale(1)', opacity: animating[p.id] ? 0.0 : 1 }}>
                    <rect x={0} y={0} width={size * tileSize} height={size * tileSize} fill={color} stroke="#000" strokeWidth={1} />
                  </g>
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
        <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8 }}>
          <h4 style={{ margin: '6px 0 4px' }}>Live Feed</h4>
          <div style={{ maxHeight: 160, overflow: 'hidden', display: 'flex', flexDirection: 'column-reverse', gap: 6 }}>
            {feed.map((f, i) => (
              <div key={i} style={{ fontSize: 12, color: '#9ae6b4', background: 'rgba(0,0,0,0.4)', padding: '6px', borderRadius: 4, opacity: 0.95 }}>{f}</div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  )
}

"use client"

import React, { useEffect, useState } from 'react'
import TrainerCard from '../components/TrainerCard'

export default function TrainerCardHost() {
  const [open, setOpen] = useState(false)
  const [payload, setPayload] = useState<any>(null)
  const [onlineMap, setOnlineMap] = useState<Record<string, boolean>>({})

  useEffect(() => {
    function onInspect(e: any) {
      setPayload(e.detail)
      setOpen(true)
    }
    window.addEventListener('gitmon:inspect', onInspect as EventListener)
    // also listen for live player presence events from socket
    function onPlayersUpdate(e: any) {
      const lst = (e.detail || []).map((p: any) => p.username || p.owner_username || p.id)
      const map: Record<string, boolean> = {}
      lst.forEach((k: string) => (map[k] = true))
      setOnlineMap(map)
    }
    window.addEventListener('gitmon:players', onPlayersUpdate as EventListener)
    return () => window.removeEventListener('gitmon:inspect', onInspect as EventListener)
  }, [])

  if (!open || !payload) return null
  const username = payload.owner_username || payload.username || 'unknown'
  // attempt to lookup cached stats from server side via window.__INITIAL_PLOTS or rely on payload
  const avatar = payload.avatarUrl || payload.avatar_url || payload.avatar || null
  const topLang = payload.top_language ?? payload.topLanguage ?? payload.stats?.topLanguage ?? null
  const stars = payload.stars ?? payload.stats?.stars ?? 0
  return (
    <div style={{ position: 'fixed', left: 24, bottom: 24, zIndex: 9999 }}>
      <TrainerCard username={username} avatarUrl={avatar} topLanguage={topLang} stars={stars} onClose={() => setOpen(false)} online={!!onlineMap[username]} linkedinUrl={payload?.linkedin || null} />
    </div>
  )
}

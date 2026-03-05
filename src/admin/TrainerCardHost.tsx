"use client"

import React, { useEffect, useState } from 'react'
import TrainerCard from '../components/TrainerCard'

export default function TrainerCardHost() {
  const [open, setOpen] = useState(false)
  const [payload, setPayload] = useState<any>(null)

  useEffect(() => {
    function onInspect(e: any) {
      setPayload(e.detail)
      setOpen(true)
    }
    window.addEventListener('gitmon:inspect', onInspect as EventListener)
    return () => window.removeEventListener('gitmon:inspect', onInspect as EventListener)
  }, [])

  if (!open || !payload) return null
  const username = payload.owner_username || payload.username || 'unknown'
  return (
    <div style={{ position: 'fixed', left: 24, bottom: 24, zIndex: 9999 }}>
      <TrainerCard username={username} topLanguage={payload.top_language ?? payload.topLanguage} stars={payload.stars ?? 0} onClose={() => setOpen(false)} />
    </div>
  )
}

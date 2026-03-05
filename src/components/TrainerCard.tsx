"use client"

import React from 'react'

type Props = {
  username: string
  avatarUrl?: string
  topLanguage?: string
  stars?: number
  onClose?: () => void
}

export default function TrainerCard({ username, avatarUrl, topLanguage, stars, onClose }: Props) {
  return (
    <div className="trainer-card" style={{ width: 320, padding: 12, background: '#0b1220', border: '4px solid #222', boxShadow: 'inset 0 0 0 2px #9ca3af', color: '#fff', fontFamily: 'monospace' }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ width: 80, height: 80, background: '#111', border: '2px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {avatarUrl ? <img src={avatarUrl} style={{ width: 72, height: 72 }} /> : <div style={{ width: 56, height: 56, background: '#333' }} />}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 'bold' }}>{username}</div>
          <div style={{ marginTop: 8 }}>
            <span style={{ padding: '4px 8px', background: '#111', border: '1px solid #333', borderRadius: 4 }}>{topLanguage ?? 'Unknown'}</span>
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: '#cbd5e1' }}>Stars: {stars ?? 0}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button style={{ padding: '8px 12px', background: '#1f2937', border: '1px solid #000', color: '#fff' }} onClick={onClose}>Close</button>
        <a href={`https://github.com/${username}`} target="_blank" rel="noreferrer" style={{ padding: '8px 12px', background: '#065f46', border: '1px solid #000', color: '#fff', textDecoration: 'none' }}>View Profile</a>
      </div>
    </div>
  )
}

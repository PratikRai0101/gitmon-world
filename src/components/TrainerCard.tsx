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
  const langColor = topLanguage ? (topLanguage.toLowerCase().includes('python') ? '#2ECC71' : topLanguage.toLowerCase().includes('javascript') ? '#FFD43B' : topLanguage.toLowerCase().includes('rust') ? '#DE6A31' : '#888') : '#888'
  return (
    <div className="trainer-card tw-trainer" style={{ width: 340 }}>
      <div className="tw-card" style={{ padding: 12, borderRadius: 12, backdropFilter: 'blur(6px)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', fontFamily: 'monospace', color: '#e6eef8' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 88, height: 88, borderRadius: 12, background: 'rgba(0,0,0,0.4)', border: '2px solid rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {avatarUrl ? <img src={avatarUrl} style={{ width: 84, height: 84, objectFit: 'cover' }} /> : <div style={{ width: 72, height: 72, background: '#333' }} />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: '700' }}>{username}</div>
            <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ padding: '4px 8px', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(0,0,0,0.5)', borderRadius: 999, color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, background: langColor, display: 'inline-block', borderRadius: 3 }} />
                <span style={{ fontSize: 12 }}>{topLanguage ?? 'Unknown'}</span>
              </span>
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: '#9ca3af' }}>Stars: {stars ?? 0}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button style={{ padding: '8px 12px', background: '#111827', border: '1px solid rgba(0,0,0,0.6)', color: '#fff' }} onClick={onClose}>Close</button>
          <a href={`https://github.com/${username}`} target="_blank" rel="noreferrer" style={{ padding: '8px 12px', background: '#065f46', border: '1px solid rgba(0,0,0,0.6)', color: '#fff', textDecoration: 'none' }}>View Profile</a>
        </div>
      </div>
    </div>
  )
}

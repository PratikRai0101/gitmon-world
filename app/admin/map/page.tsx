import React from 'react'
import MapViewer from '../../../src/admin/MapViewer'
import { Pool } from 'pg'
import { fetchGitStats } from '../../../server/github'

type PlotRow = {
  id: number
  owner_username: string
  x: number
  y: number
  building_type: string
  top_language: string | null
  last_updated: string
}

async function loadPlots(): Promise<Array<any>> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  try {
    const res = await pool.query('SELECT id, owner_username, x, y, building_type, top_language, last_updated FROM plots')
    const rows: PlotRow[] = res.rows
    // enrich with totalCommits where possible (use fetchGitStats cache)
    const out = []
    for (const r of rows) {
      let totalCommits: number | null = null
      try {
        const stats = await fetchGitStats(r.owner_username)
        totalCommits = stats.totalCommits
      } catch (e) {
        totalCommits = null
      }
      out.push({ ...r, totalCommits })
    }
    return out
  } finally {
    await pool.end()
  }
}

export default async function Page() {
  const plots = await loadPlots()
  return (
    <main style={{ padding: 20 }}>
      <h1>Admin Map Inspector</h1>
      <p>Plots: {plots.length}</p>
      <div style={{ width: '100%', height: '700px', border: '1px solid #333' }}>
        {/* @ts-ignore server -> client prop */}
        <MapViewer plots={plots} />
      </div>
    </main>
  )
}

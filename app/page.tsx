import dynamic from 'next/dynamic'
import Link from 'next/link'

const Game = dynamic(() => import('../src/Game').then(m => m.default), { ssr: false })

export default function Page() {
  return (
    <main>
      <h1>Git-Mon World</h1>
      <p>16-bit multiplayer world — demo Town Square</p>
      <div style={{ width: 800, height: 600 }}>
        <Game />
      </div>
    </main>
  )
}

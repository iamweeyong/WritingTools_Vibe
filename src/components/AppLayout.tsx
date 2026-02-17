import { Link, Outlet } from '@tanstack/react-router'
import { useEffect } from 'react'
import { initDb } from '../lib/db'

const links = [
  { to: '/', label: 'Home' },
  { to: '/projects', label: 'Projects' },
  { to: '/notes', label: 'Notes' },
  { to: '/research', label: 'Research' }
] as const

export function AppLayout() {
  useEffect(() => {
    initDb().catch((error) => {
      console.error('Failed to initialize SQLite database', error)
    })
  }, [])

  return (
    <div style={{ fontFamily: 'sans-serif', margin: '0 auto', maxWidth: 960, padding: '1.5rem' }}>
      <h1>WritingTools Vibe</h1>
      <nav style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
        {links.map((item) => (
          <Link key={item.to} to={item.to} activeProps={{ style: { fontWeight: 700 } }}>
            {item.label}
          </Link>
        ))}
      </nav>
      <main style={{ border: '1px solid #ddd', borderRadius: 8, padding: '1rem' }}>
        <Outlet />
      </main>
    </div>
  )
}

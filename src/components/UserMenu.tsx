'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  initial: string
  name: string
  pts?: number | null
  rank?: number | null
}

export function UserMenu({ initial, name, pts, rank }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [open])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Abrir menú de usuario"
        className="w-9 h-9 rounded-full grid place-items-center font-bold text-[13px] transition-transform duration-150 hover:scale-105"
        style={{
          background: 'linear-gradient(135deg, #5B2D8E, #1565C0)',
          border: '2px solid #2a2a2a',
        }}
      >
        {initial}
      </button>

      {/* Dropdown */}
      <div
        className="absolute right-0 z-[60]"
        style={{
          top: 'calc(100% + 12px)',
          width: 'min(320px, calc(100vw - 32px))',
          background: '#141414',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px',
          padding: '6px',
          boxShadow: '0 30px 60px -20px rgba(0,0,0,.7)',
          opacity: open ? 1 : 0,
          transform: open ? 'translateY(0) scale(1)' : 'translateY(-6px) scale(.98)',
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.15s, transform 0.15s',
        }}
        role="menu"
      >
        {/* Head: avatar + nombre */}
        <div
          className="flex items-center gap-3 px-[18px] py-[14px]"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div
            className="w-11 h-11 rounded-full grid place-items-center font-display text-[16px] shrink-0"
            style={{
              background: 'linear-gradient(135deg, #5B2D8E, #1565C0)',
              border: '2px solid #2a2a2a',
            }}
          >
            {initial}
          </div>
          <div>
            <div className="text-[10px] font-extrabold tracking-[0.22em] uppercase text-muted">
              Información general
            </div>
            <div className="font-display text-[18px] tracking-[-0.02em] leading-none mt-1">
              {name}
            </div>
          </div>
        </div>

        {/* Stats: Puntos / Ranking / Aciertos */}
        <div
          className="grid grid-cols-3 px-2 py-[14px]"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div
            className="text-center px-1.5 py-1"
            style={{ borderRight: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="font-display text-[22px] leading-none tracking-[-0.03em] tabular-nums">
              {pts ?? '—'}
            </div>
            <div className="text-[9px] font-extrabold tracking-[0.18em] uppercase text-muted mt-1.5">
              Puntos
            </div>
          </div>
          <div
            className="text-center px-1.5 py-1"
            style={{ borderRight: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div
              className="font-display text-[22px] leading-none tracking-[-0.03em] tabular-nums"
              style={{ color: '#A8F0D8' }}
            >
              {rank ? `#${rank}` : '—'}
            </div>
            <div className="text-[9px] font-extrabold tracking-[0.18em] uppercase text-muted mt-1.5">
              Ranking
            </div>
          </div>
          <div className="text-center px-1.5 py-1">
            <div className="font-display text-[22px] leading-none tracking-[-0.03em] tabular-nums">
              —
            </div>
            <div className="text-[9px] font-extrabold tracking-[0.18em] uppercase text-muted mt-1.5">
              Aciertos
            </div>
          </div>
        </div>

        {/* Footer: logout */}
        <div className="p-1.5">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] font-bold text-[14px] text-left transition-colors duration-150"
            style={{ color: '#FF8585' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,90,90,.08)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            role="menuitem"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  )
}

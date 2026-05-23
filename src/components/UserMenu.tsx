'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { rankMedal } from '@/lib/ranking-display'

interface Props {
  initial: string
  name: string
  pts?: number | null
  rank?: number | null
  sharedRank?: boolean
  exact?: number | null
  isAdmin?: boolean
}

export function UserMenu({ initial, name, pts, rank, sharedRank = false, exact, isAdmin = false }: Props) {
  const [open, setOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState<string | null>(null)
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
    setLoggingOut(true)
    setLogoutError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      setLogoutError('No pudimos cerrar la sesión. Intentá nuevamente.')
      setLoggingOut(false)
      return
    }

    router.push('/login?message=signed_out')
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

        <div
          className="grid grid-cols-3 px-2 py-[14px]"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div
            className="text-center px-1.5 py-1"
            style={{ borderRight: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="font-display text-[22px] leading-none tracking-[-0.03em] tabular-nums">
              {pts ?? '-'}
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
              {rank ? `${rankMedal(rank) ? `${rankMedal(rank)} ` : ''}${sharedRank ? 'T' : '#'}${rank}` : '-'}
            </div>
            <div className="text-[9px] font-extrabold tracking-[0.18em] uppercase text-muted mt-1.5">
              Ranking
            </div>
          </div>
          <div className="text-center px-1.5 py-1">
            <div className="font-display text-[22px] leading-none tracking-[-0.03em] tabular-nums">
              {exact ?? '-'}
            </div>
            <div className="text-[9px] font-extrabold tracking-[0.18em] uppercase text-muted mt-1.5">
              Exactas
            </div>
          </div>
        </div>

        {isAdmin && (
          <div
            className="p-1.5"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
          >
            <Link
              href="/admin"
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] font-bold text-[14px] text-left transition-colors duration-150"
              style={{ color: '#A8F0D8' }}
              onClick={() => setOpen(false)}
              role="menuitem"
            >
              Modo Admin
            </Link>
          </div>
        )}

        <div className="p-1.5">
          {logoutError && (
            <p className="px-3 pb-2 text-[12px] font-bold leading-relaxed text-[#FF8585]">
              {logoutError}
            </p>
          )}
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] font-bold text-[14px] text-left transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-70"
            style={{ color: '#FF8585' }}
            onMouseEnter={(e) => {
              if (!loggingOut) e.currentTarget.style.background = 'rgba(255,90,90,.08)'
            }}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            role="menuitem"
          >
            {loggingOut && (
              <span
                className="inline-block h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
                aria-hidden="true"
              />
            )}
            {loggingOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
          </button>
        </div>
      </div>
    </div>
  )
}

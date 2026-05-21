'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import clsx from 'clsx'

const PUBLIC_LINKS = [
  { href: '/', label: 'Inicio', exact: true, anchor: false },
  { href: '/premios', label: 'Premios', exact: false, anchor: false },
  { href: '/reglas', label: 'Reglas', exact: false, anchor: false },
]

const AUTH_LINKS = [
  { href: '/mi-prode', label: 'Mi Prode', exact: false, anchor: false },
  { href: '/ranking', label: 'Ranking', exact: false, anchor: false },
]

interface Props {
  isLoggedIn?: boolean
}

export function NavLinks({ isLoggedIn }: Props) {
  const pathname = usePathname()
  const links = isLoggedIn ? [...PUBLIC_LINKS, ...AUTH_LINKS] : PUBLIC_LINKS
  const [activeAnchor, setActiveAnchor] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  // Close menu on navigation
  useEffect(() => {
    setActiveAnchor(null)
    setMenuOpen(false)
  }, [pathname])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  // Close on Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      {/* ── Desktop nav ─────────────────────────────────── */}
      <nav className="hidden min-[880px]:flex gap-7 text-[14px] font-semibold tracking-[0.01em]">
        {links.map(({ href, label, exact, anchor }) => {
          const active = anchor
            ? activeAnchor === href
            : exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              onClick={anchor ? () => setActiveAnchor(href) : undefined}
              className={clsx(
                'relative py-1.5 transition-colors duration-150',
                active
                  ? 'text-white after:absolute after:left-0 after:right-0 after:bottom-[-18px] after:h-[3px] after:bg-orange after:rounded-t-sm'
                  : 'text-[#cfcfcf] hover:text-white',
              )}
            >
              {label}
            </Link>
          )
        })}
      </nav>

      {/* ── Mobile hamburger button ──────────────────────── */}
      <button
        className="min-[880px]:hidden flex items-center justify-center w-9 h-9 rounded-[10px] transition-all duration-150"
        style={
          menuOpen
            ? { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.14)' }
            : { background: 'transparent', border: '1px solid transparent' }
        }
        onClick={() => setMenuOpen((v) => !v)}
        aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={menuOpen}
        aria-controls="mobile-nav"
      >
        {menuOpen ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="8" x2="21" y2="8" />
            <line x1="3" y1="16" x2="21" y2="16" />
          </svg>
        )}
      </button>

      {/* ── Backdrop overlay ─────────────────────────────── */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 min-[880px]:hidden"
          style={{ background: 'rgba(0,0,0,0.52)' }}
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile dropdown panel ────────────────────────── */}
      <nav
        id="mobile-nav"
        className={clsx(
          'fixed left-0 right-0 z-50 min-[880px]:hidden transition-all duration-200 ease-out',
          menuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none',
        )}
        style={{
          top: '60px',
          background: 'rgba(10,10,10,0.97)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        <div className="max-w-[1280px] mx-auto px-4 py-3 flex flex-col gap-0.5">
          {links.map(({ href, label, exact, anchor }) => {
            const active = anchor
              ? activeAnchor === href
              : exact ? pathname === href : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={() => {
                  if (anchor) setActiveAnchor(href)
                  setMenuOpen(false)
                }}
                className={clsx(
                  'flex items-center gap-3 px-4 py-[13px] rounded-[12px] text-[15px] font-semibold transition-all duration-150',
                  active
                    ? 'text-white'
                    : 'text-[#b0b0b0] hover:text-white hover:bg-white/5',
                )}
                style={active ? { background: 'rgba(255,107,0,0.1)' } : undefined}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: active ? '#FF6B00' : 'transparent' }}
                />
                {label}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}

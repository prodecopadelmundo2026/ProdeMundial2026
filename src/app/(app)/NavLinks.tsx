'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import clsx from 'clsx'

const PUBLIC_LINKS = [
  { href: '/', label: 'Inicio', exact: true, anchor: false },
  { href: '/premios', label: 'Premios', exact: false, anchor: false },
  { href: '/reglas', label: 'Reglas', exact: false, anchor: false },
  { href: '/ranking', label: 'Ranking', exact: false, anchor: false },
]

const AUTH_LINKS = [
  { href: '/mi-prode', label: 'Mi Prode', exact: false, anchor: false },
]

interface Props {
  isLoggedIn?: boolean
}

export function NavLinks({ isLoggedIn }: Props) {
  const pathname = usePathname()
  const links = isLoggedIn ? [...PUBLIC_LINKS, ...AUTH_LINKS] : PUBLIC_LINKS
  const [activeAnchor, setActiveAnchor] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setActiveAnchor(null)
    setMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      {/* Brand: botón en mobile (abre menú), link en desktop */}
      <button
        className="min-[880px]:hidden flex items-center font-display text-[18px] tracking-[-0.02em] shrink-0 select-none"
        onClick={() => setMenuOpen((v) => !v)}
        aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={menuOpen}
        aria-controls="mobile-nav"
      >
        PRODE{' '}
        <b
          className="ml-[6px] transition-colors duration-150"
          style={{ color: menuOpen ? 'rgba(255,107,0,0.4)' : '#FF6B00' }}
        >
          26'
        </b>
      </button>

      <Link
        href="/"
        className="hidden min-[880px]:flex items-center font-display text-[18px] tracking-[-0.02em] shrink-0"
      >
        PRODE <b className="text-orange ml-[6px]">26'</b>
      </Link>

      {/* Desktop nav */}
      <nav className="hidden h-full min-[880px]:flex gap-7 text-[14px] font-semibold tracking-[0.01em]">
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
                'relative flex h-full items-center transition-colors duration-150',
                active
                  ? 'text-white after:absolute after:left-0 after:right-0 after:bottom-0 after:h-[3px] after:bg-orange after:rounded-t-sm'
                  : 'text-[#cfcfcf] hover:text-white',
              )}
            >
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Backdrop overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 min-[880px]:hidden"
          style={{ background: 'rgba(0,0,0,0.52)' }}
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile dropdown panel */}
      <nav
        id="mobile-nav"
        className={clsx(
          'fixed left-0 right-0 z-50 min-[880px]:hidden transition-all duration-200 ease-out',
          menuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none',
        )}
        style={{
          top: '56px',
          background: 'rgba(10,10,10,0.97)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        <div className="max-w-[1280px] mx-auto px-4 py-2 flex flex-col gap-0.5">
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
                  'flex items-center gap-3 px-4 py-[11px] rounded-[12px] text-[15px] font-semibold transition-all duration-150',
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

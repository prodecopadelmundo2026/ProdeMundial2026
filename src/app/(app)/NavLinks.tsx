'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { Menu } from 'lucide-react'

type NavLink = {
  href: string
  label: string
  exact: boolean
  anchor: boolean
  requiresAuth?: boolean
}

const NAV_LINKS: NavLink[] = [
  { href: '/', label: 'Inicio', exact: true, anchor: false },
  { href: '/mi-prode', label: 'Mi Prode', exact: false, anchor: false, requiresAuth: true },
  { href: '/ranking', label: 'Ranking', exact: false, anchor: false },
  { href: '/estadisticas', label: 'Estadísticas', exact: false, anchor: false },
  { href: '/fixture', label: 'Fixture', exact: false, anchor: false },
  { href: '/mundial-en-vivo', label: 'Mundial en vivo', exact: false, anchor: false },
  { href: '/pronosticos', label: 'Pronósticos', exact: false, anchor: false },
  { href: '/premios', label: 'Premios', exact: false, anchor: false },
  { href: '/reglas', label: 'Reglas', exact: false, anchor: false },
]

interface Props {
  isLoggedIn?: boolean
}

export function NavLinks({ isLoggedIn }: Props) {
  const pathname = usePathname()
  const links = NAV_LINKS.filter((link) => !link.requiresAuth || isLoggedIn)
  const [activeAnchor, setActiveAnchor] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const id = window.setTimeout(() => {
      setActiveAnchor(null)
      setMenuOpen(false)
    }, 0)
    return () => window.clearTimeout(id)
  }, [pathname])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
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
      <button
        className="tap-card flex shrink-0 select-none items-center gap-2 font-display text-[18px] tracking-[-0.02em] min-[880px]:hidden"
        onClick={() => setMenuOpen((v) => !v)}
        aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={menuOpen}
        aria-controls="mobile-nav"
      >
        <span>
          PRODE{' '}
          <b
            className="ml-[6px] transition-colors duration-150"
            style={{ color: menuOpen ? 'rgba(255,107,0,0.4)' : '#FF6B00' }}
          >
            26&apos;
          </b>
        </span>
        <span
          className="grid h-8 w-8 place-items-center rounded-[10px] transition-colors duration-150"
          style={{
            background: menuOpen ? 'rgba(255,107,0,0.16)' : 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
          }}
          aria-hidden="true"
        >
          <Menu size={18} strokeWidth={2.8} />
        </span>
      </button>

      <Link
        href="/"
        className="hidden shrink-0 items-center font-display text-[18px] tracking-[-0.02em] active:scale-[0.98] min-[880px]:flex"
      >
        PRODE <b className="ml-[6px] text-orange">26&apos;</b>
      </Link>

      <nav className="hidden h-full gap-7 text-[14px] font-semibold tracking-[0.01em] min-[880px]:flex">
        {links.map(({ href, label, exact, anchor }) => {
          const active = anchor ? activeAnchor === href : exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              onClick={anchor ? () => setActiveAnchor(href) : undefined}
              className={clsx(
                'relative flex h-full items-center transition-colors duration-150 active:scale-[0.98]',
                active
                  ? 'text-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[3px] after:rounded-t-sm after:bg-orange'
                  : 'text-[#cfcfcf] hover:text-white'
              )}
            >
              {label}
            </Link>
          )
        })}
      </nav>

      {menuOpen && (
        <div
          className="fixed inset-0 z-40 min-[880px]:hidden"
          style={{ background: 'rgba(0,0,0,0.52)' }}
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <nav
        id="mobile-nav"
        className={clsx(
          'fixed left-0 right-0 z-50 transition-all duration-200 ease-out min-[880px]:hidden',
          menuOpen ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0'
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
        <div className="mx-auto flex max-w-[1280px] flex-col gap-0.5 px-4 py-2">
          {links.map(({ href, label, exact, anchor }) => {
            const active = anchor ? activeAnchor === href : exact ? pathname === href : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={() => {
                  if (anchor) setActiveAnchor(href)
                  setMenuOpen(false)
                }}
                className={clsx(
                  'flex items-center gap-3 rounded-[12px] px-4 py-[11px] text-[15px] font-semibold transition-all duration-150 active:scale-[0.99]',
                  active ? 'text-white' : 'text-[#b0b0b0] hover:bg-white/5 hover:text-white'
                )}
                style={active ? { background: 'rgba(255,107,0,0.1)' } : undefined}
              >
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
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

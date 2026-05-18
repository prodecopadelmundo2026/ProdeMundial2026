'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

const PUBLIC_LINKS = [
  { href: '/', label: 'Inicio', exact: true, anchor: false },
  { href: '/#premios', label: 'Premios', exact: false, anchor: true },
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

  return (
    <nav className="hidden min-[880px]:flex gap-7 text-[14px] font-semibold tracking-[0.01em]">
      {links.map(({ href, label, exact, anchor }) => {
        const active = anchor ? false : exact ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
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
  )
}

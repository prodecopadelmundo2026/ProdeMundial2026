'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

const links = [
  { href: '/', label: 'Inicio', exact: true },
  { href: '/mi-prode', label: 'Mi Prode' },
  { href: '/ranking', label: 'Ranking' },
]

export function NavLinks() {
  const pathname = usePathname()

  return (
    <nav className="hidden min-[880px]:flex gap-7 text-[14px] font-semibold tracking-[0.01em]">
      {links.map(({ href, label, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href)
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

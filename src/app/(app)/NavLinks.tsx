'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

const links = [
  { href: '/fixture', label: 'Fixture' },
  { href: '/mi-prode', label: 'Mi Prode' },
  { href: '/ranking', label: 'Ranking' },
  { href: '/reglas', label: 'Reglas' },
]

export function NavLinks() {
  const pathname = usePathname()

  return (
    <>
      {links.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={clsx(
            'text-sm font-medium transition',
            pathname.startsWith(href)
              ? 'text-yellow-400'
              : 'text-green-200 hover:text-yellow-400'
          )}
        >
          {label}
        </Link>
      ))}
    </>
  )
}

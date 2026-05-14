import Link from 'next/link'
import { Trophy } from 'lucide-react'
import { NavLinks } from './NavLinks'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-full flex flex-col">
      <nav
        className="text-white shadow-lg sticky top-0 z-10"
        style={{ backgroundColor: '#0a3d1f' }}
      >
        <div className="max-w-5xl mx-auto px-4 min-h-14 py-2 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-lg shrink-0"
          >
            <Trophy size={20} className="text-yellow-400" />
            <span>Prode 2026</span>
          </Link>

          <div className="flex items-center gap-4 overflow-x-auto">
            <NavLinks />
          </div>

          <Link
            href="/login"
            className="shrink-0 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-green-100 hover:bg-white/15"
          >
            Entrar
          </Link>
        </div>
      </nav>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}

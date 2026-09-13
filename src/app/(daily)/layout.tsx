import Link from 'next/link'
import { CalendarDays, History } from 'lucide-react'
export default function DailyLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-full">
    <header className="border-b border-white/15 bg-bg">
      <nav aria-label="Navegacion principal" className="mx-auto flex min-h-14 max-w-[1200px] flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-base font-black"><CalendarDays size={20} className="text-orange" /> PRODE DIARIO</Link>
        <div className="flex items-center gap-5 text-sm"><Link href="/#salas">Salas</Link><Link href="/historial" className="flex items-center gap-1"><History size={16} /> Historial</Link></div>
      </nav>
    </header>
    <main>{children}</main>
  </div>
}

import Link from 'next/link'
import { Archive, ArrowRight, BarChart3, ClipboardList, Settings, Trophy } from 'lucide-react'

const historyLinks = [
  { href: '/historial/mundial', label: 'Portada y cierre del Mundial 2026', icon: Archive },
  { href: '/fixture', label: 'Fixture y resultados', icon: Archive },
  { href: '/historial/mundial/ranking', label: 'Ranking auditado', icon: Trophy },
  { href: '/pronosticos', label: 'Pronosticos publicos', icon: ClipboardList },
  { href: '/estadisticas', label: 'Estadisticas', icon: BarChart3 },
  { href: '/premios', label: 'Premios del Mundial', icon: Trophy },
  { href: '/historial/mundial/mi-prode', label: 'Mi Prode del Mundial', icon: ClipboardList },
  { href: '/mundial-en-vivo', label: 'Seguimiento del Mundial', icon: Archive },
  { href: '/historial/mundial/reglas', label: 'Reglas del Mundial', icon: ClipboardList },
  { href: '/admin', label: 'Administracion del Mundial', icon: Settings },
]
export default function HistorialPage() {
  return <div className="mx-auto max-w-[1200px] px-4 py-8 pb-28">
    <h1 className="text-3xl font-black">Historial</h1>
    <section className="mt-8 border-t border-white/15 pt-6">
      <h2 className="text-xl font-extrabold">Mundial 2026</h2>
      <div className="mt-4 grid gap-3 min-[700px]:grid-cols-2">
        {historyLinks.map(({ href, label, icon: Icon }) => <Link key={href} href={href} prefetch={false} className="flex min-h-16 min-w-0 items-center justify-between gap-4 rounded-lg border border-white/15 bg-panel p-4">
          <span className="min-w-0 break-words text-sm font-bold">{label}</span><Icon size={20} className="shrink-0 text-orange" aria-hidden="true" />
        </Link>)}
      </div>
    </section>
    <section className="mt-8 border-t border-white/15 pt-6">
      <h2 className="text-xl font-extrabold">Jornadas diarias cerradas</h2>
      <p className="mt-3 text-sm text-muted">Todavia no hay jornadas reales archivadas.</p>
      <Link href="/mi-prode" className="mt-4 inline-flex items-center gap-2 text-sm text-mint">12 sep 2026 / Jornada cerrada demo <ArrowRight size={16} /></Link>
    </section>
    <section className="mt-8 border-t border-white/15 pt-6"><h2 className="text-xl font-extrabold">Otras ediciones</h2><p className="mt-3 text-sm text-muted">No hay otras ediciones disponibles.</p></section>
  </div>
}

import { createClient } from '@/lib/supabase/server'
import type { Match } from '@/types'
import { FixtureList } from './FixtureList'

export default async function FixturePage() {
  const supabase = await createClient()

  const matchesResult = await supabase
    .from('matches')
    .select('*')
    .order('scheduled_at', { ascending: true })

  if (matchesResult.error) {
    return (
      <div className="max-w-[860px] mx-auto px-5 py-12">
        <div
          className="rounded-[20px] p-6"
          style={{ background: 'rgba(255,90,90,0.07)', border: '1px solid rgba(255,90,90,0.2)' }}
        >
          <p className="font-bold text-[#FF5A5A] mb-1">Error al cargar los partidos</p>
          <p className="text-sm text-muted font-mono break-all">{matchesResult.error.message}</p>
        </div>
      </div>
    )
  }

  const matches = (matchesResult.data ?? []) as Match[]

  return (
    <div style={{ padding: '40px 20px 80px' }}>
      <div className="max-w-[1280px] mx-auto">
        <div className="mb-8">
          <p className="text-[11px] font-extrabold tracking-[0.22em] uppercase text-muted mb-2">
            FIFA · USA · Canadá · México
          </p>
          <h1
            className="font-display uppercase leading-[0.9] tracking-[-0.03em]"
            style={{ fontSize: 'clamp(36px, 6vw, 64px)' }}
          >
            Fixture <em className="italic text-orange">completo</em>
          </h1>
          <p className="text-muted text-[14px] mt-3">
            {matches.length} partidos · resultados en tiempo real
          </p>
          <p className="mt-3 max-w-[620px] text-[13px] font-medium leading-relaxed text-[#cfcfcf]">
            El fixture es público para que puedas mirar el calendario completo antes de participar. Para cargar pronósticos sí necesitás tener tu correo habilitado.
          </p>
        </div>

        <FixtureList matches={matches} />
      </div>
    </div>
  )
}

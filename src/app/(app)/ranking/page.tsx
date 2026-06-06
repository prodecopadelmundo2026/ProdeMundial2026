import { createClient } from '@/lib/supabase/server'
import { RankingClient } from './RankingClient'
import type { RankingEntry } from '@/types'

export const dynamic = 'force-dynamic'

type PublicRankingRow = RankingEntry & {
  participant_status: 'confirmed' | 'trial'
  prode_status: 'empty' | 'in_progress' | 'complete'
}

type PublicHomeMetrics = {
  finished_matches_count: number
}

export default async function RankingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const [{ data, error }, { data: metricsData, error: metricsError }] = await Promise.all([
    supabase.rpc('get_public_ranking'),
    supabase.rpc('get_public_home_metrics'),
  ])

  if (error) throw error
  if (metricsError) throw metricsError

  const entries = ((data ?? []) as PublicRankingRow[]).map((entry) => ({
    ...entry,
    participant_status: entry.participant_status,
    prode_status: entry.prode_status,
  }))
  const metrics = metricsData as PublicHomeMetrics | null
  const rankingStarted = (metrics?.finished_matches_count ?? 0) > 0

  return (
    <div style={{ padding: 'clamp(40px,8vw,64px) 20px clamp(60px,12vw,100px)' }}>
      <div className="max-w-[880px] mx-auto">
        <div style={{ marginBottom: '32px' }}>
          <span
            className="inline-block font-sans text-[12px] font-extrabold tracking-[0.22em] uppercase text-muted"
            style={{ marginBottom: '18px' }}
          >
            Tabla en vivo
          </span>
          <h1
            className="font-display uppercase leading-[.9] tracking-[-0.04em]"
            style={{ fontSize: 'clamp(48px, 9vw, 108px)' }}
          >
            <em className="not-italic italic" style={{ color: '#FF6B00' }}>Ranking</em>
          </h1>
          <p className="font-mono text-[13px] font-bold text-muted tracking-[0.04em] mt-[14px]">
            Mundial 2026 · USA · Canadá · México
          </p>
          <p className="mt-4 max-w-[620px] text-[13px] font-medium leading-relaxed text-muted">
            Tocá cualquier Prode para ver pronósticos, aciertos, errores y puntos partido por partido.
          </p>
          <p className="mt-3 max-w-[620px] text-[13px] font-medium leading-relaxed text-[#cfcfcf]">
            Esta tabla muestra competidores e invitados con Prodes cargados. Los invitados aparecen identificados y no participan oficialmente por premios.
          </p>
        </div>

        <aside
          className="flex items-center gap-3 rounded-[16px] px-[18px] py-[14px] text-[13px] mb-6"
          style={{
            background: 'linear-gradient(90deg, rgba(168,240,216,0.07), rgba(168,240,216,0.02))',
            border: '1px solid rgba(168,240,216,0.22)',
            color: '#cfcfcf',
          }}
        >
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: '#A8F0D8', animation: 'pulse-dot 1.6s infinite' }}
          />
          <span>
            {rankingStarted
              ? 'Ranking actualizado con los resultados oficiales cargados.'
              : 'El conteo de puntos empieza cuando se carguen los primeros resultados oficiales. Hasta entonces podes revisar los Prodes cargados por competidores e invitados.'}
          </span>
        </aside>

        <RankingClient entries={entries} userId={user?.id} rankingStarted={rankingStarted} />
      </div>
    </div>
  )
}

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildAuditedRankingEntries } from '@/lib/ranking-audit'
import type { Match, Prediction } from '@/types'
import { RankingClient } from './RankingClient'

export const dynamic = 'force-dynamic'

export default async function RankingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const admin = createAdminClient()

  const [{ data: participants }, { data: matches }, { data: predictions }] = await Promise.all([
    supabase
      .from('ranking_entries')
      .select('user_id, name, avatar_url'),
    supabase
      .from('matches')
      .select('*')
      .order('scheduled_at', { ascending: true }),
    admin
      .from('predictions')
      .select('*'),
  ])

  const predictionCounts = new Map<string, number>()
  for (const prediction of (predictions ?? []) as Prediction[]) {
    predictionCounts.set(prediction.user_id, (predictionCounts.get(prediction.user_id) ?? 0) + 1)
  }

  const entries = buildAuditedRankingEntries(
    (matches ?? []) as Match[],
    (predictions ?? []) as Prediction[],
    (participants ?? []).map((participant) => ({
      user_id: participant.user_id,
      name: participant.name,
      avatar_url: participant.avatar_url,
    }))
  ).map((entry) => ({
    ...entry,
    predictions_count: predictionCounts.get(entry.user_id) ?? 0,
  }))

  return (
    <div style={{ padding: 'clamp(40px,8vw,64px) 20px clamp(60px,12vw,100px)' }}>
      <div className="max-w-[880px] mx-auto">

        {/* Page head */}
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
            Tocá cualquier jugador para ver su Prode completo: pronósticos, aciertos, errores y puntos partido por partido.
          </p>
        </div>

        {/* Info banner */}
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
            El ranking arranca cuando se carguen los primeros resultados oficiales.
          </span>
        </aside>

        <RankingClient entries={entries} userId={user?.id} />
      </div>
    </div>
  )
}

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { RankingClient } from './RankingClient'
import type { Match, RankingEntry } from '@/types'
import { getRankingMode, isLiveRankingMode, type RankingMode } from '@/lib/ranking-mode'
import { formatMatchKickoffArgentina } from '@/lib/match-datetime'

export const dynamic = 'force-dynamic'

type PublicRankingRow = RankingEntry & {
  participant_status: 'confirmed' | 'trial'
  prode_status: 'not_started' | 'in_progress' | 'almost_done' | 'completed'
  loaded_count?: number
  expected_count?: number
  progress_percentage?: number
  missing_sections?: string[]
}

type PublicHomeMetrics = {
  competitors_count: number
  prodes_completed_count: number
  prodes_pending_count: number
  prize_pool_ars: number
  finished_matches_count: number
  ranking_mode?: RankingMode
}

type PodiumPredictionRow = {
  user_id: string
  match_id: string
  home_score: number
  away_score: number
  updated_at: string | null
  created_at: string | null
}

function predictionTimestamp(row: PodiumPredictionRow) {
  return new Date(row.updated_at ?? row.created_at ?? 0).getTime()
}

function dedupeLatestPredictionByUser(rows: PodiumPredictionRow[]) {
  const latestByUser = new Map<string, PodiumPredictionRow>()

  for (const row of rows) {
    const current = latestByUser.get(row.user_id)
    if (!current || predictionTimestamp(row) > predictionTimestamp(current)) {
      latestByUser.set(row.user_id, row)
    }
  }

  return [...latestByUser.values()].map((prediction) => ({
    user_id: prediction.user_id,
    home_score: Number(prediction.home_score),
    away_score: Number(prediction.away_score),
  }))
}

export default async function RankingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const [{ data, error }, { data: metricsData, error: metricsError }, { data: nextMatchRows }] = await Promise.all([
    supabase.rpc('get_public_ranking'),
    supabase.rpc('get_public_home_metrics'),
    supabase
      .from('matches')
      .select('*')
      .neq('status', 'finished')
      .order('scheduled_at', { ascending: true })
      .limit(1),
  ])

  if (error) throw error
  if (metricsError) throw metricsError

  const entries = ((data ?? []) as PublicRankingRow[]).map((entry) => ({
    ...entry,
    participant_status: entry.participant_status,
    prode_status: entry.prode_status,
  }))
  const metricsRows = metricsData as PublicHomeMetrics[] | null
  const metrics = Array.isArray(metricsRows) ? metricsRows[0] : metricsRows
  const rankingMode = metrics?.ranking_mode ?? getRankingMode(metrics?.finished_matches_count)
  const rankingStarted = isLiveRankingMode(rankingMode)
  const nextMatch = ((nextMatchRows ?? []) as Match[])[0] ?? null
  const podiumUserIds = rankingStarted
    ? entries
        .filter((entry) => entry.participant_status === 'confirmed' && entry.user_id && entry.rank >= 1 && entry.rank <= 3 && entry.total_points > 0)
        .map((entry) => entry.user_id!)
    : []
  const podiumPredictionRows = nextMatch && podiumUserIds.length > 0
    ? await createAdminClient()
        .from('predictions')
        .select('user_id, match_id, home_score, away_score, updated_at, created_at')
        .eq('match_id', nextMatch.id)
        .in('user_id', podiumUserIds)
        .order('updated_at', { ascending: false })
        .order('created_at', { ascending: false })
    : { data: [], error: null }

  if (podiumPredictionRows.error) throw podiumPredictionRows.error

  const nextMatchPredictions = dedupeLatestPredictionByUser((podiumPredictionRows.data ?? []) as PodiumPredictionRow[])

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

        <RankingClient
          entries={entries}
          userId={user?.id}
          rankingStarted={rankingStarted}
          summary={{
            confirmedPlayers: metrics?.competitors_count ?? 0,
            prizePoolArs: metrics?.prize_pool_ars ?? 0,
            completedProdes: metrics?.prodes_completed_count ?? 0,
            pendingProdes: metrics?.prodes_pending_count ?? 0,
          }}
          podiumPredictionPreview={nextMatch ? {
            match: {
              id: nextMatch.id,
              home_team: nextMatch.home_team,
              away_team: nextMatch.away_team,
              kickoffLabel: `${formatMatchKickoffArgentina(nextMatch.scheduled_at)} ART`,
            },
            predictions: nextMatchPredictions,
          } : null}
        />
      </div>
    </div>
  )
}

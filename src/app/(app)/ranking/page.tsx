import { createClient } from '@/lib/supabase/server'
import { RankingClient } from './RankingClient'
import type { Match, Prediction, RankingEntry } from '@/types'
import { getRankingMode, isLiveRankingMode, type RankingMode } from '@/lib/ranking-mode'
import {
  compareMatchesByProductScheduleAsc,
  formatMatchKickoffArgentina,
  getMatchProductOrderKey,
} from '@/lib/match-datetime'
import { addConfirmedTrajectoryToRanking } from '@/lib/public-prediction-data'
import { buildProjectedKnockoutMatches, knockoutPNum } from '@/lib/bracket'
import { buildMatchAuditRows } from '@/lib/ranking-audit'
import { getMatchPredictionHref } from '@/lib/match-links'

export const dynamic = 'force-dynamic'

type PublicRankingRow = RankingEntry & {
  participant_status: 'confirmed' | 'trial'
  prode_status: 'not_started' | 'in_progress' | 'almost_done' | 'completed'
  loaded_count?: number
  expected_count?: number
  progress_percentage?: number
  missing_sections?: string[]
  base_points?: number
  trajectory_bonus?: number
}

type PublicHomeMetrics = {
  competitors_count: number
  prodes_completed_count: number
  prodes_pending_count: number
  prize_pool_ars: number
  finished_matches_count: number
  ranking_mode?: RankingMode
}

type VirtualPredictionRow = {
  id: string
  user_id: string
  virtual_match_id: string
  home_score: number
  away_score: number
  tiebreaker_team: string | null
  created_at: string
  updated_at: string
}

type PublicPredictionDetail = {
  predictions?: Prediction[]
  virtual_predictions?: VirtualPredictionRow[]
}

function virtualPredictionToPrediction(row: VirtualPredictionRow): Prediction {
  return {
    id: row.id,
    user_id: row.user_id,
    match_id: row.virtual_match_id,
    home_score: row.home_score,
    away_score: row.away_score,
    points: null,
    tiebreaker_team: row.tiebreaker_team,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

type PodiumPredictionPreview = {
  match: {
    id: string
    home_team: string
    away_team: string
    kickoffLabel: string
    stage: Match['stage']
    detailHref: string
  }
  predictions: Array<{
    user_id: string
    home_score: number
    away_score: number
    predicted_home: string
    predicted_away: string
    cross_matches: boolean
  }>
}

function safeKickoffLabel(value: string | null | undefined) {
  if (!value) return 'Horario a confirmar'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Horario a confirmar'
  return `${formatMatchKickoffArgentina(value)} ART`
}

async function getPodiumPredictionPreview({
  supabase,
  nextMatches,
  allMatches,
  podiumUserIds,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>
  nextMatches: Match[]
  allMatches: Match[]
  podiumUserIds: string[]
}): Promise<PodiumPredictionPreview[]> {
  if (nextMatches.length === 0 || podiumUserIds.length === 0) return []

  const settled = await Promise.allSettled(
    podiumUserIds.map(async (userId) => {
      try {
        const { data, error } = await supabase.rpc('get_public_prediction_detail', { p_user_id: userId })
        if (error) return { ok: false as const, error }

        const detail = data as PublicPredictionDetail | null
        const predictions = [
          ...(detail?.predictions ?? []),
          ...(detail?.virtual_predictions ?? []).map(virtualPredictionToPrediction),
        ].filter((prediction) => prediction.user_id === userId)
        return {
          ok: true as const,
          userId,
          predictions,
        }
      } catch (error) {
        return { ok: false as const, error }
      }
    })
  )

  const failures = settled.filter(
    (result) => result.status === 'rejected' || (result.status === 'fulfilled' && !result.value.ok)
  )
  if (failures.length > 0) {
    console.warn('[ranking] No se pudo cargar la card Pronóstico del podio', failures)
    return []
  }

  const projectedMatches = [
    ...allMatches.filter((match) => match.stage === 'group'),
    ...buildProjectedKnockoutMatches(allMatches.filter((match) => match.stage !== 'group')),
  ]

  return nextMatches.flatMap((nextMatch) => {
    const detailHref = getMatchPredictionHref(nextMatch.id)
    if (!detailHref) return []
    return [{
    match: {
      id: nextMatch.id,
      home_team: nextMatch.home_team,
      away_team: nextMatch.away_team,
      kickoffLabel: safeKickoffLabel(nextMatch.scheduled_at),
      stage: nextMatch.stage,
      detailHref,
    },
    predictions: settled
      .map((result) => {
        if (result.status !== 'fulfilled' || !result.value.ok) return null
        const pNum = knockoutPNum(nextMatch)
        const auditMatchId = nextMatch.stage === 'group' || pNum == null ? nextMatch.id : `virtual-p${pNum}`
        const auditRow = buildMatchAuditRows(projectedMatches, result.value.predictions)
          .find((row) => row.match.id === auditMatchId)
        const prediction = auditRow?.prediction
        return prediction && auditRow
          ? {
              user_id: result.value.userId,
              home_score: Number(prediction.home_score),
              away_score: Number(prediction.away_score),
              predicted_home: auditRow.predictedHome,
              predicted_away: auditRow.predictedAway,
              cross_matches: auditRow.crossMatches !== false,
            }
          : null
      })
      .filter((prediction): prediction is NonNullable<typeof prediction> => Boolean(prediction)),
    }]
  })
}

export default async function RankingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const [rankingResult, { data: metricsData, error: metricsError }, nextMatchResult] = await Promise.all([
    user
      ? supabase.rpc('get_public_ranking')
      : supabase
          .from('ranking_entries')
          .select('user_id, name, avatar_url, total_points, exact_predictions, correct_result_predictions, rank')
          .order('rank', { ascending: true })
          .order('name', { ascending: true }),
    supabase.rpc('get_public_home_metrics'),
    supabase
      .from('matches')
      .select('*')
      .order('scheduled_at', { ascending: true }),
  ])

  if (rankingResult.error) throw rankingResult.error
  if (metricsError) throw metricsError

  const baseEntries = ((rankingResult.data ?? []) as PublicRankingRow[]).map((entry) => ({
    ...entry,
    participant_status: entry.participant_status ?? 'confirmed',
    prode_status: entry.prode_status ?? 'not_started',
  }))
  // Anonymous visitors stay entirely on the public ranking view. Enriching the
  // signed-in experience uses private prediction data and must not be required
  // for the public, read-only page.
  const entries = user
    ? await addConfirmedTrajectoryToRanking(
        baseEntries,
        (nextMatchResult.data ?? []) as Match[]
      )
    : baseEntries
  const metricsRows = metricsData as PublicHomeMetrics[] | null
  const metrics = Array.isArray(metricsRows) ? metricsRows[0] : metricsRows
  const rankingMode = metrics?.ranking_mode ?? getRankingMode(metrics?.finished_matches_count)
  const rankingStarted = isLiveRankingMode(rankingMode)
  if (nextMatchResult.error) {
    console.warn('[ranking] No se pudo cargar el próximo partido para Pronóstico del podio', nextMatchResult.error)
  }
  const orderedMatches = nextMatchResult.error
    ? []
    : ((nextMatchResult.data ?? []) as Match[])
        .filter((match) => match.status !== 'finished')
        .sort(compareMatchesByProductScheduleAsc)
  const nextSlotKey = orderedMatches[0] ? getMatchProductOrderKey(orderedMatches[0].scheduled_at) : null
  const nextMatches = nextSlotKey == null
    ? []
    : orderedMatches.filter((match) => getMatchProductOrderKey(match.scheduled_at) === nextSlotKey)
  const podiumUserIds = rankingStarted
    ? entries
        .filter((entry) => entry.participant_status === 'confirmed' && entry.user_id && entry.rank >= 1 && entry.rank <= 3 && entry.total_points > 0)
        .map((entry) => entry.user_id!)
    : []
  const podiumPredictionPreviews = await getPodiumPredictionPreview({
    supabase,
    nextMatches,
    allMatches: (nextMatchResult.data ?? []) as Match[],
    podiumUserIds,
  })

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
          podiumPredictionPreviews={podiumPredictionPreviews}
        />
      </div>
    </div>
  )
}

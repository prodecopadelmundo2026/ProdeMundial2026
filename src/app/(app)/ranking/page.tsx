import { createClient } from '@/lib/supabase/server'
import { RankingClient } from './RankingClient'
import type { Match, Prediction, RankingEntry } from '@/types'
import { getRankingMode, isLiveRankingMode, type RankingMode } from '@/lib/ranking-mode'
import {
  compareMatchesByProductScheduleAsc,
  formatMatchKickoffArgentina,
  getMatchProductOrderKey,
} from '@/lib/match-datetime'
import { buildRoundOf32BonusLedger, summarizeKnockoutBonus } from '@/lib/knockout-bonus'
import { getOfficialRoundOf32State } from '@/lib/tournament-state'

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

type PublicPredictionDetail = {
  predictions?: Prediction[]
  tiebreakers?: Array<{ user_id: string; tiebreaker_key: string; team: string }>
}

async function applyRoundOf32Bonuses(
  supabase: Awaited<ReturnType<typeof createClient>>,
  entries: PublicRankingRow[],
  matches: Match[]
) {
  if (!getOfficialRoundOf32State(matches).officialBracketReady) return entries
  const details = await Promise.all(entries.map(async (entry) => {
    if (!entry.user_id) return { entry, bonus: 0 }
    const { data, error } = await supabase.rpc('get_public_prediction_detail', { p_user_id: entry.user_id })
    if (error) return { entry, bonus: 0 }
    const detail = (data ?? {}) as PublicPredictionDetail
    const predictionMap = Object.fromEntries(
      (detail.predictions ?? []).map((prediction) => [
        prediction.match_id,
        { home_score: prediction.home_score, away_score: prediction.away_score },
      ])
    )
    const tiebreakers = Object.fromEntries(
      (detail.tiebreakers ?? [])
        .filter((row) => row.user_id === entry.user_id && (row.tiebreaker_key.startsWith('Grupo ') || row.tiebreaker_key.startsWith('3rd-')))
        .map((row) => [row.tiebreaker_key, row.team])
    )
    const bonus = summarizeKnockoutBonus(buildRoundOf32BonusLedger({
      userId: entry.user_id,
      matches,
      predictionMap,
      historicalTiebreakers: tiebreakers,
    })).points
    return { entry, bonus }
  }))
  const enriched = details.map(({ entry, bonus }) => ({
    ...entry,
    base_points: entry.total_points,
    trajectory_bonus: bonus,
    total_points: entry.total_points + bonus,
  }))
  for (const status of ['confirmed', 'trial'] as const) {
    const scoped = enriched
      .filter((entry) => entry.participant_status === status)
      .sort((a, b) => b.total_points - a.total_points || (b.exact_predictions ?? 0) - (a.exact_predictions ?? 0))
    scoped.forEach((entry, index) => {
      entry.rank = index > 0 && entry.total_points === scoped[index - 1].total_points
        ? scoped[index - 1].rank
        : index + 1
    })
  }
  return enriched
}

type PodiumPredictionPreview = {
  match: {
    id: string
    home_team: string
    away_team: string
    kickoffLabel: string
  }
  predictions: Array<{
    user_id: string
    home_score: number
    away_score: number
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
  podiumUserIds,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>
  nextMatches: Match[]
  podiumUserIds: string[]
}): Promise<PodiumPredictionPreview[]> {
  if (nextMatches.length === 0 || podiumUserIds.length === 0) return []

  const settled = await Promise.allSettled(
    podiumUserIds.map(async (userId) => {
      try {
        const { data, error } = await supabase.rpc('get_public_prediction_detail', { p_user_id: userId })
        if (error) return { ok: false as const, error }

        const predictions = ((data as PublicPredictionDetail | null)?.predictions ?? []) as Prediction[]
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

  return nextMatches.map((nextMatch) => ({
    match: {
      id: nextMatch.id,
      home_team: nextMatch.home_team,
      away_team: nextMatch.away_team,
      kickoffLabel: safeKickoffLabel(nextMatch.scheduled_at),
    },
    predictions: settled
      .map((result) => {
        if (result.status !== 'fulfilled' || !result.value.ok) return null
        const prediction = result.value.predictions.find(
          (item) => item.user_id === result.value.userId && item.match_id === nextMatch.id
        )
        return prediction
          ? {
              user_id: result.value.userId,
              home_score: Number(prediction.home_score),
              away_score: Number(prediction.away_score),
            }
          : null
      })
      .filter((prediction): prediction is NonNullable<typeof prediction> => Boolean(prediction)),
  }))
}

export default async function RankingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const [{ data, error }, { data: metricsData, error: metricsError }, nextMatchResult, allMatchesResult] = await Promise.all([
    supabase.rpc('get_public_ranking'),
    supabase.rpc('get_public_home_metrics'),
    supabase
      .from('matches')
      .select('*')
      .neq('status', 'finished')
      .order('scheduled_at', { ascending: true }),
    supabase.from('matches').select('*'),
  ])

  if (error) throw error
  if (metricsError) throw metricsError

  const baseEntries = ((data ?? []) as PublicRankingRow[]).map((entry) => ({
    ...entry,
    participant_status: entry.participant_status,
    prode_status: entry.prode_status,
  }))
  const entries = await applyRoundOf32Bonuses(
    supabase,
    baseEntries,
    (allMatchesResult.data ?? []) as Match[]
  )
  const metricsRows = metricsData as PublicHomeMetrics[] | null
  const metrics = Array.isArray(metricsRows) ? metricsRows[0] : metricsRows
  const rankingMode = metrics?.ranking_mode ?? getRankingMode(metrics?.finished_matches_count)
  const rankingStarted = isLiveRankingMode(rankingMode)
  if (nextMatchResult.error) {
    console.warn('[ranking] No se pudo cargar el próximo partido para Pronóstico del podio', nextMatchResult.error)
  }
  const orderedMatches = nextMatchResult.error
    ? []
    : ((nextMatchResult.data ?? []) as Match[]).sort(compareMatchesByProductScheduleAsc)
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

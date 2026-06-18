import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { Match } from '@/types'
import { formatMatchKickoffArgentina } from '@/lib/match-datetime'
import {
  emptyPredictionInsights,
  formatAverageScore,
  formatPickedResult,
  percent,
  statusLabel,
  type PredictionInsights,
  type ResultDistributionRow,
} from '@/lib/prediction-insights'
import { ResultUsersTable } from './ResultUsersTable'

export const dynamic = 'force-dynamic'

function PredictionBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const width = percent(value, total)

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[12px] font-extrabold text-[#d7d7d7]">{label}</span>
        <span className="font-display text-[26px] leading-none tabular-nums" style={{ color }}>
          {width}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full" style={{ width: `${width}%`, background: color }} />
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] bg-[#0A0A0A] p-4" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
      <p className="font-mono text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-2 text-[15px] font-extrabold leading-snug text-white">{value}</p>
    </div>
  )
}

type RankingParticipantRow = {
  user_id: string | null
  name: string | null
  participant_status: string | null
}

type PredictionRow = {
  user_id: string
  home_score: number | null
  away_score: number | null
  updated_at: string | null
}

function predictionKey(homeScore: number, awayScore: number) {
  return `${homeScore}-${awayScore}`
}

function normalizeName(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : 'Participante'
}

function buildPredictionStats(
  predictionRows: PredictionRow[],
  participantRows: RankingParticipantRow[]
): {
  insights: PredictionInsights
  distribution: ResultDistributionRow[]
  usersByScore: Record<string, string[]>
} {
  const confirmedParticipants = participantRows.filter(
    (participant) => participant.user_id && participant.participant_status === 'confirmed'
  )
  const validUserIds = new Set(confirmedParticipants.map((participant) => participant.user_id as string))
  const nameByUserId = new Map(
    confirmedParticipants.map((participant) => [participant.user_id as string, normalizeName(participant.name)])
  )
  const latestByUserId = new Map<string, PredictionRow>()

  for (const prediction of predictionRows) {
    if (!validUserIds.has(prediction.user_id)) continue
    if (prediction.home_score == null || prediction.away_score == null) continue
    if (!latestByUserId.has(prediction.user_id)) {
      latestByUserId.set(prediction.user_id, prediction)
    }
  }

  const validPredictions = [...latestByUserId.values()] as Array<PredictionRow & { home_score: number; away_score: number }>
  const insights = emptyPredictionInsights()
  const resultCounts = new Map<string, ResultDistributionRow>()
  const usersByScore: Record<string, string[]> = {}

  insights.total_count = validPredictions.length

  for (const prediction of validPredictions) {
    if (prediction.home_score > prediction.away_score) insights.home_count += 1
    if (prediction.home_score === prediction.away_score) insights.draw_count += 1
    if (prediction.home_score < prediction.away_score) insights.away_count += 1
    if (prediction.away_score >= 1) insights.away_goal_count += 1
    if (prediction.away_score === 0) insights.clean_sheet_home_count += 1

    insights.avg_home_score += prediction.home_score
    insights.avg_away_score += prediction.away_score

    const key = predictionKey(prediction.home_score, prediction.away_score)
    const current = resultCounts.get(key)
    if (current) {
      current.picked_count += 1
    } else {
      resultCounts.set(key, {
        home_score: prediction.home_score,
        away_score: prediction.away_score,
        picked_count: 1,
      })
    }

    if (!usersByScore[key]) usersByScore[key] = []
    usersByScore[key].push(nameByUserId.get(prediction.user_id) ?? 'Participante')
  }

  if (insights.total_count > 0) {
    insights.avg_home_score = Number((insights.avg_home_score / insights.total_count).toFixed(1))
    insights.avg_away_score = Number((insights.avg_away_score / insights.total_count).toFixed(1))
  }

  const distribution = [...resultCounts.values()].sort((a, b) => {
    if (b.picked_count !== a.picked_count) return b.picked_count - a.picked_count
    if (a.home_score !== b.home_score) return a.home_score - b.home_score
    return a.away_score - b.away_score
  })

  insights.distinct_results_count = distribution.length
  const mostPicked = distribution[0]
  if (mostPicked) {
    insights.most_picked_home_score = mostPicked.home_score
    insights.most_picked_away_score = mostPicked.away_score
    insights.most_picked_count = mostPicked.picked_count
  }

  const leastPicked = [...distribution].sort((a, b) => {
    if (a.picked_count !== b.picked_count) return a.picked_count - b.picked_count
    if (a.home_score !== b.home_score) return a.home_score - b.home_score
    return a.away_score - b.away_score
  })[0]
  if (leastPicked) {
    insights.least_picked_home_score = leastPicked.home_score
    insights.least_picked_away_score = leastPicked.away_score
    insights.least_picked_count = leastPicked.picked_count
  }

  for (const names of Object.values(usersByScore)) {
    names.sort((a, b) => a.localeCompare(b))
  }

  return { insights, distribution, usersByScore }
}

export default async function PronosticoDetallePage({
  params,
}: {
  params: Promise<{ matchId: string }>
}) {
  const { matchId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: matchData }, { data: rankingRows }, { data: predictionRows }, { data: currentUserPrediction }] = await Promise.all([
    supabase.from('matches').select('*').eq('id', matchId).maybeSingle(),
    supabase.rpc('get_public_ranking'),
    supabase
      .from('predictions')
      .select('user_id, home_score, away_score, updated_at')
      .eq('match_id', matchId)
      .order('updated_at', { ascending: false }),
    user
      ? supabase
          .from('predictions')
          .select('home_score, away_score')
          .eq('match_id', matchId)
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1)
      : Promise.resolve({ data: null }),
  ])

  if (!matchData) notFound()

  const match = matchData as Match
  const { insights, distribution, usersByScore } = buildPredictionStats(
    (predictionRows ?? []) as PredictionRow[],
    (rankingRows ?? []) as RankingParticipantRow[]
  )
  const currentUserPredictionRow = Array.isArray(currentUserPrediction) ? currentUserPrediction[0] : currentUserPrediction
  const myPrediction = currentUserPredictionRow?.home_score != null && currentUserPredictionRow.away_score != null
    ? {
        home_score: Number(currentUserPredictionRow.home_score),
        away_score: Number(currentUserPredictionRow.away_score),
      }
    : null
  const isScored = match.status === 'live' || match.status === 'finished'

  return (
    <div style={{ padding: '34px 20px 80px' }}>
      <div className="mx-auto max-w-[1180px]">
        <Link
          href="/pronosticos"
          className="mb-7 inline-flex items-center gap-2 rounded-full bg-panel px-4 py-2 text-[12px] font-extrabold text-white"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <ArrowLeft size={15} strokeWidth={3} />
          Pronósticos
        </Link>

        <section
          className="mb-5 overflow-hidden rounded-[26px] bg-panel p-5 min-[760px]:p-7"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-orange px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-bg">
              {statusLabel(match.status)}
            </span>
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
              {match.stage === 'group' && match.group ? `Grupo ${match.group}` : match.stage}
            </span>
          </div>

          <div className="mt-5 grid gap-5 min-[880px]:grid-cols-[1fr_auto] min-[880px]:items-end">
            <div>
              <h1
                className="font-display uppercase leading-[0.88] tracking-[-0.03em]"
                style={{ fontSize: 'clamp(40px, 7vw, 82px)' }}
              >
                {match.home_team} <em className="italic text-orange">vs</em> {match.away_team}
              </h1>
                <p className="mt-4 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-muted">
                  {formatMatchKickoffArgentina(match.scheduled_at)} ART
                </p>
                {myPrediction && (
                  <p className="mt-3 text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#FFB15C]">
                    Tu apuesta: {myPrediction.home_score}-{myPrediction.away_score}
                  </p>
                )}
              </div>
            {isScored && match.home_score != null && match.away_score != null && (
              <div className="rounded-[20px] bg-[#0A0A0A] px-5 py-4 text-center" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="font-mono text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted">
                  Resultado oficial
                </p>
                <p className="mt-2 font-display text-[48px] leading-none">
                  {match.home_score}-{match.away_score}
                </p>
              </div>
            )}
          </div>
        </section>

        {insights.total_count > 0 ? (
          <div className="grid gap-5 min-[980px]:grid-cols-[0.9fr_1.1fr]">
            <section className="rounded-[24px] bg-panel p-5" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <p className="font-mono text-[11px] font-extrabold uppercase tracking-[0.18em] text-orange">
                    Tendencia
                  </p>
                  <h2 className="mt-2 font-display text-[32px] uppercase leading-none">Resultado</h2>
                </div>
                <div className="text-right">
                  <p className="font-display text-[34px] leading-none">{insights.total_count}</p>
                  <p className="font-mono text-[9px] font-extrabold uppercase tracking-[0.16em] text-muted">
                    cargados
                  </p>
                </div>
              </div>
              <div className="grid gap-4">
                <PredictionBar label={`Gana ${match.home_team}`} value={insights.home_count} total={insights.total_count} color="#A8F0D8" />
                <PredictionBar label="Empate" value={insights.draw_count} total={insights.total_count} color="#FFE040" />
                <PredictionBar label={`Gana ${match.away_team}`} value={insights.away_count} total={insights.total_count} color="#FF6B00" />
              </div>
            </section>

            <section className="rounded-[24px] bg-panel p-5" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="font-mono text-[11px] font-extrabold uppercase tracking-[0.18em] text-orange">
                Estadísticas completas
              </p>
              <div className="mt-5 grid gap-3 min-[620px]:grid-cols-2">
                <StatCard
                  label="Resultado más elegido"
                  value={formatPickedResult(insights.most_picked_home_score, insights.most_picked_away_score, insights.most_picked_count)}
                />
                <StatCard
                  label="Resultado menos elegido"
                  value={formatPickedResult(insights.least_picked_home_score, insights.least_picked_away_score, insights.least_picked_count)}
                />
                <StatCard
                  label="Promedio esperado"
                  value={formatAverageScore(match.home_team, match.away_team, insights)}
                />
                <StatCard
                  label="Resultados distintos"
                  value={`${insights.distinct_results_count} ${insights.distinct_results_count === 1 ? 'combinación' : 'combinaciones'}`}
                />
                <StatCard
                  label="Gol visitante"
                  value={`${insights.away_goal_count} ${insights.away_goal_count === 1 ? 'persona puso' : 'personas pusieron'} gol de ${match.away_team}`}
                />
                <StatCard
                  label="Visitante en cero"
                  value={`${insights.clean_sheet_home_count} ${insights.clean_sheet_home_count === 1 ? 'persona' : 'personas'}`}
                />
              </div>
            </section>

            <section className="rounded-[24px] bg-panel p-5 min-[980px]:col-span-2" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="font-mono text-[11px] font-extrabold uppercase tracking-[0.18em] text-orange">
                    Tabla
                  </p>
                  <h2 className="mt-2 font-display text-[32px] uppercase leading-none">Resultados elegidos</h2>
                </div>
                <p className="text-[12px] font-semibold text-muted">Ordenado por cantidad</p>
              </div>
              <ResultUsersTable
                rows={distribution}
                totalCount={insights.total_count}
                myPrediction={myPrediction}
                usersByScore={usersByScore}
              />
            </section>
          </div>
        ) : (
          <section className="rounded-[24px] bg-panel p-10 text-center" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="font-display text-[28px] uppercase leading-none">Sin pronósticos cargados</p>
            <p className="mt-3 text-[14px] font-semibold text-muted">
              Todavía no hay pronósticos cargados para este partido.
            </p>
          </section>
        )}
      </div>
    </div>
  )
}

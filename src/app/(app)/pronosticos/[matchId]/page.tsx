import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import type { Match } from '@/types'
import { formatMatchKickoffArgentina } from '@/lib/match-datetime'
import {
  formatAverageScore,
  formatPickedResult,
  normalizePredictionInsights,
  percent,
  statusLabel,
  stageLabel,
  type PredictionInsights,
  type ResultDistributionRow,
} from '@/lib/prediction-insights'
import { MatchPointsSection, type MatchPointsBreakdownRow } from './MatchPointsSection'
import { ResultUsersTable } from './ResultUsersTable'
import { getTournamentVisibleMatches } from '@/lib/tournament-state'
import {
  getOfficialMatchTrajectoryBonusInsights,
  getVirtualMatchTrajectoryInsights,
} from '@/lib/public-prediction-data'
import { VirtualTrajectoryInsights } from '@/components/VirtualTrajectoryInsights'

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

export default async function PronosticoDetallePage({
  params,
}: {
  params: Promise<{ matchId: string }>
}) {
  const { matchId } = await params
  const isVirtual = matchId.startsWith('virtual-p')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: matchRows },
    { data: insightsRows },
    { data: distributionRows },
    { data: pointsBreakdownRows },
    { data: currentUserPrediction },
  ] = await Promise.all([
    supabase.from('matches').select('*').order('scheduled_at', { ascending: true }),
    isVirtual ? Promise.resolve({ data: null }) : supabase.rpc('get_match_prediction_insights', { p_match_id: matchId }),
    isVirtual ? Promise.resolve({ data: null }) : supabase.rpc('get_match_prediction_result_distribution', { p_match_id: matchId }),
    isVirtual ? Promise.resolve({ data: null }) : supabase.rpc('get_match_points_breakdown', { p_match_id: matchId }),
    user && !isVirtual
      ? supabase
          .from('predictions')
          .select('home_score, away_score')
          .eq('match_id', matchId)
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1)
      : Promise.resolve({ data: null }),
  ])

  const visibleMatches = getTournamentVisibleMatches((matchRows ?? []) as Match[])
  const matchData = visibleMatches.find((match) => match.id === matchId)
  if (!matchData) notFound()

  const match = matchData as Match
  const trajectory = isVirtual
    ? await getVirtualMatchTrajectoryInsights(visibleMatches, matchId)
    : null
  const officialTrajectoryBonus = !isVirtual
    ? await getOfficialMatchTrajectoryBonusInsights(visibleMatches, matchId)
    : null
  const insights = normalizePredictionInsights(
    (Array.isArray(insightsRows) ? insightsRows[0] : null) as Partial<PredictionInsights> | null
  )
  const distribution = ((distributionRows ?? []) as ResultDistributionRow[]).map((row) => ({
    home_score: Number(row.home_score),
    away_score: Number(row.away_score),
    picked_count: Number(row.picked_count),
  }))
  const currentUserPredictionRow = Array.isArray(currentUserPrediction) ? currentUserPrediction[0] : currentUserPrediction
  const myPrediction = currentUserPredictionRow?.home_score != null && currentUserPredictionRow.away_score != null
    ? {
        home_score: Number(currentUserPredictionRow.home_score),
        away_score: Number(currentUserPredictionRow.away_score),
      }
    : null
  const isScored = match.status === 'live' || match.status === 'finished'
  const hasOfficialResult = match.status === 'finished' && match.home_score != null && match.away_score != null
  const pointsBreakdown = ((pointsBreakdownRows ?? []) as MatchPointsBreakdownRow[]).map((row) => ({
    user_id: row.user_id,
    name: row.name,
    home_score: Number(row.home_score),
    away_score: Number(row.away_score),
    points: Number(row.points),
  }))
  const exactPointsRows = pointsBreakdown.filter((row) => row.points === 3)
  const partialPointsRows = pointsBreakdown.filter((row) => row.points === 1)
  const zeroPointsRows = pointsBreakdown.filter((row) => row.points === 0)

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
              {stageLabel(match.stage, match.group)}
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
            </div>
            {isScored && match.home_score != null && match.away_score != null && (
              <div className="rounded-[20px] bg-[#0A0A0A] px-5 py-4 text-center" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="font-mono text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted">
                  {match.status === 'live' ? 'Marcador parcial · 90 min' : 'Resultado · 90 min'}
                </p>
                <p className="mt-2 font-display text-[48px] leading-none">
                  {match.home_score}-{match.away_score}
                </p>
                {match.status === 'finished' && match.qualified_team && (
                  <p className="mt-2 text-[11px] font-extrabold uppercase text-mint">
                    Clasifica {match.qualified_team}
                  </p>
                )}
              </div>
            )}
          </div>
        </section>

        {hasOfficialResult && (
          <MatchPointsSection
            match={match}
            exactPointsRows={exactPointsRows}
            partialPointsRows={partialPointsRows}
            zeroPointsRows={zeroPointsRows}
            currentUserId={user?.id ?? null}
          />
        )}

        {officialTrajectoryBonus && (
          <section
            className="mb-5 rounded-[24px] bg-panel p-4 min-[760px]:p-5"
            style={{ border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] font-extrabold uppercase tracking-[0.18em] text-orange">
                  Bonus de trayectoria
                </p>
                <h2 className="mt-2 font-display text-[32px] uppercase leading-none">
                  {officialTrajectoryBonus.team} a {officialTrajectoryBonus.roundLabel}
                </h2>
              </div>
              <p className="rounded-full bg-mint/10 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-mint">
                +{officialTrajectoryBonus.points} puntos
              </p>
            </div>

            <p className="mb-4 max-w-[860px] text-[13px] font-semibold leading-relaxed text-muted">
              {officialTrajectoryBonus.team} clasificó a {officialTrajectoryBonus.roundLabel}. Sumaron +{officialTrajectoryBonus.points}
              {' '}quienes habían pronosticado que {officialTrajectoryBonus.team} llegaba a esa instancia, aunque no hayan acertado este cruce exacto.
            </p>

            {officialTrajectoryBonus.participants.length > 0 ? (
              <div className="grid gap-2 min-[760px]:grid-cols-2">
                {officialTrajectoryBonus.participants.map((participant) => {
                  const isCurrentUser = participant.userId === user?.id
                  return (
                    <div
                      key={participant.userId}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-[14px] px-4 py-3"
                      style={{
                        background: isCurrentUser ? 'rgba(255,107,0,0.12)' : '#0A0A0A',
                        border: isCurrentUser ? '1px solid rgba(255,107,0,0.42)' : '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <span className="flex min-w-0 flex-wrap items-center gap-2 text-[14px] font-extrabold text-white">
                        <span className="min-w-0">{participant.name}</span>
                        {isCurrentUser && (
                          <span
                            className="rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.1em]"
                            style={{ background: 'rgba(255,107,0,0.18)', border: '1px solid rgba(255,107,0,0.35)', color: '#FFB15C' }}
                          >
                            Vos
                          </span>
                        )}
                      </span>
                      <span className="font-mono text-[11px] font-extrabold uppercase tracking-[0.12em] text-mint">
                        +{participant.points}
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="rounded-[14px] bg-[#0A0A0A] px-4 py-3 text-[13px] font-semibold text-muted">
                Nadie sumó bonus de trayectoria por este clasificado.
              </p>
            )}
          </section>
        )}

        {trajectory ? (
          <section className="rounded-[24px] bg-panel p-5" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            <h2 className="mb-4 font-display text-[30px] uppercase leading-none">Trayectoria a dieciseisavos</h2>
            <VirtualTrajectoryInsights homeTeam={match.home_team} awayTeam={match.away_team} data={trajectory} />
          </section>
        ) : insights.total_count > 0 ? (
          <div className="grid gap-5">
            <section className="rounded-[24px] bg-panel p-5" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
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
                matchId={match.id}
                rows={distribution}
                totalCount={insights.total_count}
                myPrediction={myPrediction}
              />
            </section>

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
            </div>
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
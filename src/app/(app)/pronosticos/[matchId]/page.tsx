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

export default async function PronosticoDetallePage({
  params,
}: {
  params: Promise<{ matchId: string }>
}) {
  const { matchId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: matchData }, { data: insightsRows }, { data: distributionRows }, { data: currentUserPrediction }] = await Promise.all([
    supabase.from('matches').select('*').eq('id', matchId).maybeSingle(),
    supabase.rpc('get_match_prediction_insights', { p_match_id: matchId }),
    supabase.rpc('get_match_prediction_result_distribution', { p_match_id: matchId }),
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
                matchId={match.id}
                rows={distribution}
                totalCount={insights.total_count}
                myPrediction={myPrediction}
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

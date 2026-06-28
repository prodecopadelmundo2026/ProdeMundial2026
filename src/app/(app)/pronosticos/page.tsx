import { createClient } from '@/lib/supabase/server'
import type { Match } from '@/types'
import { emptyPredictionInsights, type PredictionMatchCardData } from '@/lib/prediction-insights'
import { formatMatchKickoffArgentina } from '@/lib/match-datetime'
import { PronosticosList } from './PronosticosList'
import { getTournamentVisibleMatches } from '@/lib/tournament-state'
import { getPredictionInsightsByMatch, getVirtualMatchTrajectoryInsights } from '@/lib/public-prediction-data'

export const dynamic = 'force-dynamic'

export default async function PronosticosPage() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .order('scheduled_at', { ascending: true })

  if (error) {
    return (
      <div className="mx-auto max-w-[860px] px-5 py-12">
        <div
          className="rounded-[20px] p-6"
          style={{ background: 'rgba(255,90,90,0.07)', border: '1px solid rgba(255,90,90,0.2)' }}
        >
          <p className="mb-1 font-bold text-[#FF5A5A]">Error al cargar los partidos</p>
          <p className="break-all font-mono text-sm text-muted">{error.message}</p>
        </div>
      </div>
    )
  }

  const matches = getTournamentVisibleMatches((data ?? []) as Match[])
  const insightsByMatch = await getPredictionInsightsByMatch()
  const trajectoryEntries = await Promise.all(
    matches
      .filter((match) => match.id.startsWith('virtual-p') && match.stage === 'round_of_32')
      .map(async (match) => [match.id, await getVirtualMatchTrajectoryInsights(matches, match.id)] as const)
  )
  const trajectoryByMatch = Object.fromEntries(trajectoryEntries)
  const cards: PredictionMatchCardData[] = matches.map((match) => ({
      id: match.id,
      home_team: match.home_team,
      away_team: match.away_team,
      home_score: match.home_score,
      away_score: match.away_score,
      scheduled_at: match.scheduled_at,
      kickoff_label: formatMatchKickoffArgentina(match.scheduled_at),
      status: match.status,
      stage: match.stage,
      group: match.group,
      insights: insightsByMatch[match.id] ?? emptyPredictionInsights(),
      trajectory: trajectoryByMatch[match.id] ?? null,
    }))

  return (
    <div style={{ padding: '40px 20px 80px' }}>
      <div className="mx-auto max-w-[1280px]">
        <div className="mb-8">
          <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.22em] text-orange">
            Estadísticas públicas
          </p>
          <h1
            className="font-display uppercase leading-[0.9] tracking-[-0.03em]"
            style={{ fontSize: 'clamp(42px, 7vw, 78px)' }}
          >
            Pronósticos <em className="italic text-orange">del torneo</em>
          </h1>
          <p className="mt-4 max-w-[620px] text-[15px] font-medium leading-relaxed text-muted">
            Mirá cómo jugaron los participantes partido por partido.
          </p>
        </div>

        <PronosticosList matches={cards} />
      </div>
    </div>
  )
}

import type { MatchStatus } from '@/types'

export type PredictionInsights = {
  home_count: number
  draw_count: number
  away_count: number
  total_count: number
  most_picked_home_score: number | null
  most_picked_away_score: number | null
  most_picked_count: number
  least_picked_home_score: number | null
  least_picked_away_score: number | null
  least_picked_count: number
  distinct_results_count: number
  avg_home_score: number
  avg_away_score: number
  away_goal_count: number
  clean_sheet_home_count: number
}

export type ResultDistributionRow = {
  home_score: number
  away_score: number
  picked_count: number
}

export type PredictionMatchCardData = {
  id: string
  home_team: string
  away_team: string
  home_score: number | null
  away_score: number | null
  scheduled_at: string
  kickoff_label: string
  status: MatchStatus
  stage: string
  group: string | null
  insights: PredictionInsights
  trajectory?: import('@/lib/public-prediction-data').VirtualMatchTrajectoryInsights | null
}

export function stageLabel(stage: string, group: string | null = null) {
  if (stage === 'group') return group ? `Grupo ${group}` : 'Fase de grupos'
  if (stage === 'round_of_32') return 'Dieciseisavos'
  if (stage === 'round_of_16') return 'Octavos'
  if (stage === 'quarter') return 'Cuartos'
  if (stage === 'semi') return 'Semifinales'
  if (stage === 'third_place') return 'Tercer puesto'
  if (stage === 'final') return 'Final'
  return stage
}

export function emptyPredictionInsights(): PredictionInsights {
  return {
    home_count: 0,
    draw_count: 0,
    away_count: 0,
    total_count: 0,
    most_picked_home_score: null,
    most_picked_away_score: null,
    most_picked_count: 0,
    least_picked_home_score: null,
    least_picked_away_score: null,
    least_picked_count: 0,
    distinct_results_count: 0,
    avg_home_score: 0,
    avg_away_score: 0,
    away_goal_count: 0,
    clean_sheet_home_count: 0,
  }
}

export function normalizePredictionInsights(row: Partial<PredictionInsights> | null | undefined): PredictionInsights {
  const fallback = emptyPredictionInsights()

  if (!row) return fallback

  return {
    home_count: Number(row.home_count ?? fallback.home_count),
    draw_count: Number(row.draw_count ?? fallback.draw_count),
    away_count: Number(row.away_count ?? fallback.away_count),
    total_count: Number(row.total_count ?? fallback.total_count),
    most_picked_home_score:
      row.most_picked_home_score == null ? null : Number(row.most_picked_home_score),
    most_picked_away_score:
      row.most_picked_away_score == null ? null : Number(row.most_picked_away_score),
    most_picked_count: Number(row.most_picked_count ?? fallback.most_picked_count),
    least_picked_home_score:
      row.least_picked_home_score == null ? null : Number(row.least_picked_home_score),
    least_picked_away_score:
      row.least_picked_away_score == null ? null : Number(row.least_picked_away_score),
    least_picked_count: Number(row.least_picked_count ?? fallback.least_picked_count),
    distinct_results_count: Number(row.distinct_results_count ?? fallback.distinct_results_count),
    avg_home_score: Number(row.avg_home_score ?? fallback.avg_home_score),
    avg_away_score: Number(row.avg_away_score ?? fallback.avg_away_score),
    away_goal_count: Number(row.away_goal_count ?? fallback.away_goal_count),
    clean_sheet_home_count: Number(row.clean_sheet_home_count ?? fallback.clean_sheet_home_count),
  }
}

export function percent(value: number, total: number) {
  if (total <= 0) return 0
  return Math.round((value / total) * 100)
}

export function formatPickedResult(homeScore: number | null, awayScore: number | null, count: number) {
  if (homeScore == null || awayScore == null || count <= 0) return 'Sin datos'
  return `${homeScore}-${awayScore} · ${count} ${count === 1 ? 'persona' : 'personas'}`
}

export function formatAverageScore(homeTeam: string, awayTeam: string, insights: PredictionInsights) {
  return `${homeTeam} ${insights.avg_home_score.toFixed(1)} · ${awayTeam} ${insights.avg_away_score.toFixed(1)}`
}

export function statusLabel(status: MatchStatus) {
  if (status === 'live') return 'En vivo'
  if (status === 'finished') return 'Finalizado'
  return 'Próximo'
}

import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  emptyPredictionInsights,
  type PredictionInsights,
} from '@/lib/prediction-insights'
import type { Match } from '@/types'
import {
  buildRoundOf32CrossingAudit,
  getHistoricalPredictedRoundOf32Teams,
} from '@/lib/knockout-bonus'

type ScoreRow = {
  user_id?: string
  match_id: string
  home_score: number
  away_score: number
}

type TiebreakerRow = { user_id: string; tiebreaker_key: string; team: string }
type ProfileRow = { id: string; name: string }
type VirtualPredictionRow = {
  user_id: string
  virtual_match_id: string
  home_score: number
  away_score: number
  tiebreaker_team: string | null
}

export type VirtualTrajectoryParticipant = {
  userId: string
  name: string
  prediction: {
    homeScore: number
    awayScore: number
    tiebreakerTeam: string | null
    classifiedTeam: string | null
  } | null
}

export type VirtualMatchTrajectoryInsights = {
  exactCrossing: VirtualTrajectoryParticipant[]
  bothTeamsOtherCrossing: VirtualTrajectoryParticipant[]
  homeTeamOnly: VirtualTrajectoryParticipant[]
  awayTeamOnly: VirtualTrajectoryParticipant[]
}

const loadPhysicalPredictionRows = unstable_cache(
  async () => {
    const admin = createAdminClient()
    const rows: Required<ScoreRow>[] = []
    const pageSize = 1000
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await admin
        .from('predictions')
        .select('user_id, match_id, home_score, away_score')
        .range(from, from + pageSize - 1)
      if (error) throw error
      const page = (data ?? []) as Required<ScoreRow>[]
      rows.push(...page)
      if (page.length < pageSize) break
    }
    return rows
  },
  ['public-physical-prediction-rows'],
  { revalidate: 60 }
)

export async function getPredictionInsightsByMatch(): Promise<Record<string, PredictionInsights>> {
  const rows = await loadPhysicalPredictionRows()
  const grouped = new Map<string, ScoreRow[]>()
  for (const row of rows) {
    const bucket = grouped.get(row.match_id) ?? []
    bucket.push(row)
    grouped.set(row.match_id, bucket)
  }

  return Object.fromEntries([...grouped].map(([matchId, predictions]) => {
    const insights = emptyPredictionInsights()
    const scores = new Map<string, number>()
    for (const prediction of predictions) {
      if (prediction.home_score > prediction.away_score) insights.home_count++
      else if (prediction.home_score < prediction.away_score) insights.away_count++
      else insights.draw_count++
      insights.avg_home_score += prediction.home_score
      insights.avg_away_score += prediction.away_score
      if (prediction.away_score > 0) insights.away_goal_count++
      if (prediction.away_score === 0) insights.clean_sheet_home_count++
      const key = `${prediction.home_score}-${prediction.away_score}`
      scores.set(key, (scores.get(key) ?? 0) + 1)
    }
    insights.total_count = predictions.length
    insights.distinct_results_count = scores.size
    if (predictions.length) {
      insights.avg_home_score /= predictions.length
      insights.avg_away_score /= predictions.length
    }
    const orderedScores = [...scores.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    const most = orderedScores[0]
    const least = [...orderedScores].sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))[0]
    if (most) {
      const [home, away] = most[0].split('-').map(Number)
      insights.most_picked_home_score = home
      insights.most_picked_away_score = away
      insights.most_picked_count = most[1]
    }
    if (least) {
      const [home, away] = least[0].split('-').map(Number)
      insights.least_picked_home_score = home
      insights.least_picked_away_score = away
      insights.least_picked_count = least[1]
    }
    return [matchId, insights]
  }))
}

const loadTrajectoryRows = unstable_cache(
  async () => {
    const admin = createAdminClient()
    const [predictions, tiebreakers, profiles, virtualPredictions] = await Promise.all([
      loadPhysicalPredictionRows(),
      admin.from('user_prediction_tiebreakers').select('user_id, tiebreaker_key, team'),
      admin.from('profiles').select('id, name'),
      (async () => {
        const rows: VirtualPredictionRow[] = []
        const pageSize = 1000
        for (let from = 0; ; from += pageSize) {
          const { data, error } = await admin
            .from('virtual_knockout_predictions')
            .select('user_id, virtual_match_id, home_score, away_score, tiebreaker_team')
            .range(from, from + pageSize - 1)
          // El bloque sigue funcionando sin marcador virtual mientras el grant
          // nuevo todavía no haya sido aplicado en un entorno existente.
          if (error?.code === '42501') return []
          if (error) throw error
          const page = (data ?? []) as VirtualPredictionRow[]
          rows.push(...page)
          if (page.length < pageSize) break
        }
        return rows
      })(),
    ])
    if (tiebreakers.error) throw tiebreakers.error
    if (profiles.error) throw profiles.error
    return {
      predictions,
      tiebreakers: (tiebreakers.data ?? []) as TiebreakerRow[],
      profiles: (profiles.data ?? []) as ProfileRow[],
      virtualPredictions,
    }
  },
  ['public-round-of-32-trajectory-rows'],
  { revalidate: 60 }
)

export async function getVirtualMatchTrajectoryInsights(
  matches: Match[],
  matchId: string
): Promise<VirtualMatchTrajectoryInsights | null> {
  const pNum = Number(matchId.match(/^virtual-p(\d+)$/)?.[1])
  if (!Number.isFinite(pNum) || pNum < 73 || pNum > 88) return null
  const official = matches.find((match) => match.id === matchId)
  if (!official) return null

  const rows = await loadTrajectoryRows()
  const nameById = new Map(rows.profiles.map((profile) => [profile.id, profile.name]))
  const predictionsByUser = new Map<string, Required<ScoreRow>[]>()
  for (const prediction of rows.predictions) {
    const bucket = predictionsByUser.get(prediction.user_id) ?? []
    bucket.push(prediction)
    predictionsByUser.set(prediction.user_id, bucket)
  }
  const tiebreakersByUser = new Map<string, TiebreakerRow[]>()
  for (const tiebreaker of rows.tiebreakers) {
    const bucket = tiebreakersByUser.get(tiebreaker.user_id) ?? []
    bucket.push(tiebreaker)
    tiebreakersByUser.set(tiebreaker.user_id, bucket)
  }

  const virtualPredictionByUser = new Map(
    rows.virtualPredictions
      .filter((prediction) => prediction.virtual_match_id === matchId)
      .map((prediction) => [prediction.user_id, prediction])
  )
  const exactCrossing: VirtualTrajectoryParticipant[] = []
  const bothTeamsOtherCrossing: VirtualTrajectoryParticipant[] = []
  const homeTeamOnly: VirtualTrajectoryParticipant[] = []
  const awayTeamOnly: VirtualTrajectoryParticipant[] = []
  for (const [userId, predictions] of predictionsByUser) {
    const predictionMap = Object.fromEntries(predictions.map((prediction) => [
      prediction.match_id,
      { home_score: prediction.home_score, away_score: prediction.away_score },
    ]))
    const tiebreakerMap = Object.fromEntries(
      (tiebreakersByUser.get(userId) ?? []).map((row) => [row.tiebreaker_key, row.team])
    )
    const predictedTeams = getHistoricalPredictedRoundOf32Teams(
      matches.filter((match) => match.stage === 'group'),
      predictionMap,
      tiebreakerMap
    )
    const homeHit = predictedTeams.has(official.home_team)
    const awayHit = predictedTeams.has(official.away_team)
    const userName = nameById.get(userId) ?? 'Participante'
    const crossing = buildRoundOf32CrossingAudit({
      matches,
      predictionMap,
      historicalTiebreakers: tiebreakerMap,
    }).find((item) => item.pNum === pNum)
    const savedPrediction = virtualPredictionByUser.get(userId)
    const classifiedTeam = savedPrediction
      ? savedPrediction.home_score > savedPrediction.away_score
        ? official.home_team
        : savedPrediction.away_score > savedPrediction.home_score
        ? official.away_team
        : savedPrediction.tiebreaker_team
      : null
    const participant: VirtualTrajectoryParticipant = {
      userId,
      name: userName,
      prediction: savedPrediction
        ? {
            homeScore: savedPrediction.home_score,
            awayScore: savedPrediction.away_score,
            tiebreakerTeam: savedPrediction.tiebreaker_team,
            classifiedTeam,
          }
        : null,
    }
    if (crossing?.correct) exactCrossing.push(participant)
    else if (homeHit && awayHit) bothTeamsOtherCrossing.push(participant)
    else if (homeHit) homeTeamOnly.push(participant)
    else if (awayHit) awayTeamOnly.push(participant)
  }

  const sort = (items: VirtualTrajectoryParticipant[]) =>
    items.sort((a, b) => a.name.localeCompare(b.name, 'es'))
  return {
    exactCrossing: sort(exactCrossing),
    bothTeamsOtherCrossing: sort(bothTeamsOtherCrossing),
    homeTeamOnly: sort(homeTeamOnly),
    awayTeamOnly: sort(awayTeamOnly),
  }
}

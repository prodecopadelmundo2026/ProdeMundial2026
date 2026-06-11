import type { Match, Prediction, RankingEntry } from '@/types'
import {
  assignBestThirdsToSlots,
  buildKnockoutMap,
  computeAllStandings,
  computeBestThirdsGroups,
  KNOCKOUT_FIXTURES,
} from '@/lib/bracket'

type ScoreMap = Record<string, { home_score: number; away_score: number }>
type TiebreakerMap = Record<string, string>

export type AuditStatus = 'exact' | 'partial' | 'incorrect' | 'pending' | 'missing'

export type MatchAuditRow = {
  match: Match
  prediction?: Prediction
  stage: Match['stage']
  predictedHome: string
  predictedAway: string
  officialHome: string
  officialAway: string
  predictedScore: string
  officialScore: string
  status: AuditStatus
  points: number | null
  crossMatches: boolean | null
  hasOfficialTeams: boolean
}

export type RankingAuditSummary = {
  total_points: number
  exact_predictions: number
  correct_result_predictions: number
  incorrect_predictions: number
}

function sign(value: number) {
  if (value > 0) return 1
  if (value < 0) return -1
  return 0
}

function scorePoints(prediction: Prediction, match: Match) {
  if (match.status !== 'finished' || match.home_score == null || match.away_score == null) return null
  if (prediction.home_score === match.home_score && prediction.away_score === match.away_score) return 3
  if (sign(prediction.home_score - prediction.away_score) === sign(match.home_score - match.away_score)) return 1
  return 0
}

function formatScore(home: number | null | undefined, away: number | null | undefined) {
  return home == null || away == null ? 'Pendiente de resultado' : `${home} - ${away}`
}

function buildScoreMap(matches: Match[]): ScoreMap {
  return Object.fromEntries(
    matches
      .filter((match) => match.home_score != null && match.away_score != null)
      .map((match) => [match.id, { home_score: match.home_score!, away_score: match.away_score! }])
  )
}

function areAllMatchesScored(matches: Match[], predMap: ScoreMap) {
  return matches.length > 0 && matches.every((match) => Boolean(predMap[match.id]))
}

function completeGroupMatchesForResolution(groupMatches: Match[], predMap: ScoreMap) {
  const byGroup: Record<string, Match[]> = {}
  for (const match of groupMatches) {
    if (!match.group) continue
    if (!byGroup[match.group]) byGroup[match.group] = []
    byGroup[match.group].push(match)
  }

  return Object.values(byGroup).flatMap((matches) =>
    areAllMatchesScored(matches, predMap) ? matches : []
  )
}

function isUnresolvedTeam(team: string) {
  return (
    /^(\d)(?:Â°|°)\s+Grupo\s+[A-L]/.test(team) ||
    /^3(?:Â°|°)\s+Grupo\s+[A-L]/.test(team) ||
    team.startsWith('Ganador') ||
    team.startsWith('Perdedor') ||
    team.includes('Mejor 3')
  )
}

function resolveSlot(
  placeholder: string,
  standings: Record<string, string[]>,
  pMap: Record<number, Match>,
  predMap: ScoreMap,
  tiebreakerMap: TiebreakerMap,
  bestThirdsGroups: Set<string>,
  thirdSlotAssignment: Record<string, string>,
  mode: 'official' | 'prediction',
  depth = 0
): string {
  if (depth > 8) return placeholder

  const direct = placeholder.match(/^(\d)(?:Â°|°)\s+Grupo\s+([A-L])$/)
  if (direct) {
    const pos = Number(direct[1]) - 1
    return standings[direct[2]]?.[pos] ?? placeholder
  }

  const third = placeholder.match(/^3(?:Â°|°)\s+Grupo\s+([A-L](?:\/[A-L])*)$/)
  if (third) {
    const groups = third[1]
    const assigned = thirdSlotAssignment[groups]
    if (assigned) return standings[assigned]?.[2] ?? 'Mejor 3°'
    const candidates = groups.split('/').filter((group) => bestThirdsGroups.has(group))
    if (candidates.length === 1) return standings[candidates[0]]?.[2] ?? 'Mejor 3°'
    return 'Mejor 3°'
  }

  const knockout = placeholder.match(/^(Ganador|Perdedor)\s+P(\d+)$/)
  if (!knockout) return placeholder

  const pNum = Number(knockout[2])
  const fixture = KNOCKOUT_FIXTURES[pNum]
  const match = pMap[pNum]
  if (!fixture || !match) return placeholder

  const home = resolveSlot(fixture[0], standings, pMap, predMap, tiebreakerMap, bestThirdsGroups, thirdSlotAssignment, mode, depth + 1)
  const away = resolveSlot(fixture[1], standings, pMap, predMap, tiebreakerMap, bestThirdsGroups, thirdSlotAssignment, mode, depth + 1)
  const score = predMap[match.id]
  const fallback = `${knockout[1]} P${pNum}`

  if (!score) return fallback
  if (score.home_score === score.away_score) {
    if (mode === 'official') return fallback
    const tiebreaker = tiebreakerMap[match.id]
    if (!tiebreaker) return fallback
    const homeWins = tiebreaker === home
    return knockout[1] === 'Ganador'
      ? (homeWins ? home : away)
      : (homeWins ? away : home)
  }

  const homeWins = score.home_score > score.away_score
  return knockout[1] === 'Ganador'
    ? (homeWins ? home : away)
    : (homeWins ? away : home)
}

function buildResolvedTeams(
  match: Match,
  allMatches: Match[],
  predMap: ScoreMap,
  tiebreakerMap: TiebreakerMap,
  mode: 'official' | 'prediction'
) {
  if (match.stage === 'group') {
    return { home: match.home_team, away: match.away_team }
  }

  const groupMatches = allMatches.filter((item) => item.stage === 'group')
  const knockoutMatches = allMatches.filter((item) => item.stage !== 'group')
  const scopedGroupMatches = mode === 'official'
    ? completeGroupMatchesForResolution(groupMatches, predMap)
    : groupMatches
  const standings = computeAllStandings(scopedGroupMatches, predMap, tiebreakerMap)
  const canResolveThirds = mode === 'official'
    ? areAllMatchesScored(groupMatches, predMap)
    : groupMatches.length > 0
  const bestThirdsGroups = canResolveThirds
    ? computeBestThirdsGroups(groupMatches, predMap, tiebreakerMap)
    : new Set<string>()
  const thirdSlotAssignment = bestThirdsGroups.size > 0 ? assignBestThirdsToSlots(bestThirdsGroups) : {}
  const pMap = buildKnockoutMap(knockoutMatches)

  return {
    home: resolveSlot(match.home_team, standings, pMap, predMap, tiebreakerMap, bestThirdsGroups, thirdSlotAssignment, mode),
    away: resolveSlot(match.away_team, standings, pMap, predMap, tiebreakerMap, bestThirdsGroups, thirdSlotAssignment, mode),
  }
}

export function buildMatchAuditRows(
  matches: Match[],
  predictions: Prediction[],
  extraTiebreakers: TiebreakerMap = {}
): MatchAuditRow[] {
  const officialScoreMap = buildScoreMap(matches.filter((match) => match.status === 'finished'))
  const predictionByMatch = new Map(predictions.map((prediction) => [prediction.match_id, prediction]))
  const predMap: ScoreMap = Object.fromEntries(
    predictions.map((prediction) => [
      prediction.match_id,
      { home_score: prediction.home_score, away_score: prediction.away_score },
    ])
  )
  const tiebreakerMap: TiebreakerMap = {
    ...Object.fromEntries(
      predictions
        .filter((prediction) => prediction.tiebreaker_team)
        .map((prediction) => [prediction.match_id, prediction.tiebreaker_team!])
    ),
    ...extraTiebreakers,
  }

  return matches.map((match) => {
    const prediction = predictionByMatch.get(match.id)
    const officialTeams = buildResolvedTeams(match, matches, officialScoreMap, {}, 'official')
    const predictedTeams = prediction
      ? buildResolvedTeams(match, matches, predMap, tiebreakerMap, 'prediction')
      : { home: match.home_team, away: match.away_team }
    const hasOfficialResult = match.status === 'finished' && match.home_score != null && match.away_score != null
    const hasOfficialTeams =
      match.stage === 'group' ||
      (!isUnresolvedTeam(officialTeams.home) && !isUnresolvedTeam(officialTeams.away))
    const crossMatches = match.stage === 'group'
      ? true
      : hasOfficialTeams &&
        !isUnresolvedTeam(predictedTeams.home) &&
        !isUnresolvedTeam(predictedTeams.away) &&
        predictedTeams.home === officialTeams.home &&
        predictedTeams.away === officialTeams.away
    const rawPoints = prediction ? scorePoints(prediction, match) : null
    const points = !prediction || !hasOfficialResult
      ? null
      : match.stage === 'group' || crossMatches
      ? rawPoints
      : 0
    const status: AuditStatus = !prediction
      ? 'missing'
      : !hasOfficialResult
      ? 'pending'
      : points === 3
      ? 'exact'
      : points === 1
      ? 'partial'
      : 'incorrect'

    return {
      match,
      prediction,
      stage: match.stage,
      predictedHome: predictedTeams.home,
      predictedAway: predictedTeams.away,
      officialHome: officialTeams.home,
      officialAway: officialTeams.away,
      predictedScore: prediction ? formatScore(prediction.home_score, prediction.away_score) : 'Sin cargar',
      officialScore: formatScore(match.home_score, match.away_score),
      status,
      points,
      crossMatches: match.stage === 'group' || !prediction || !hasOfficialTeams ? null : crossMatches,
      hasOfficialTeams,
    }
  })
}

export function calculateAuditedPredictionPoints(match: Match, allMatches: Match[], userPredictions: Prediction[]) {
  const row = buildMatchAuditRows(allMatches, userPredictions).find((item) => item.match.id === match.id)
  return row?.points ?? null
}

export function summarizeAuditRows(rows: MatchAuditRow[]): RankingAuditSummary {
  return {
    total_points: rows.reduce((total, row) => total + (row.points ?? 0), 0),
    exact_predictions: rows.filter((row) => row.status === 'exact').length,
    correct_result_predictions: rows.filter((row) => row.status === 'partial').length,
    incorrect_predictions: rows.filter((row) => row.status === 'incorrect').length,
  }
}

export function buildAuditedRankingEntries(
  matches: Match[],
  predictions: Prediction[],
  participants: Array<{ user_id: string; name: string; avatar_url: string | null }>,
  tiebreakersByUser: Map<string, TiebreakerMap> = new Map()
): RankingEntry[] {
  const predictionsByUser = new Map<string, Prediction[]>()
  for (const prediction of predictions) {
    if (!predictionsByUser.has(prediction.user_id)) predictionsByUser.set(prediction.user_id, [])
    predictionsByUser.get(prediction.user_id)!.push(prediction)
  }

  const sortedEntries = participants
    .map((participant) => {
      const rows = buildMatchAuditRows(
        matches,
        predictionsByUser.get(participant.user_id) ?? [],
        tiebreakersByUser.get(participant.user_id) ?? {}
      )
      const summary = summarizeAuditRows(rows)
      return {
        user_id: participant.user_id,
        name: participant.name,
        avatar_url: participant.avatar_url,
        ...summary,
        rank: 0,
      }
    })
    .sort((a, b) => {
      if (b.total_points !== a.total_points) return b.total_points - a.total_points
      if (b.exact_predictions !== a.exact_predictions) return b.exact_predictions - a.exact_predictions
      if (b.correct_result_predictions !== a.correct_result_predictions) return b.correct_result_predictions - a.correct_result_predictions
      if (a.incorrect_predictions !== b.incorrect_predictions) return a.incorrect_predictions - b.incorrect_predictions
      return a.name.localeCompare(b.name)
    })

  let currentRank = 0
  return sortedEntries.map((entry, index, sorted) => {
    const previous = sorted[index - 1]
    if (
      !previous ||
      previous.total_points !== entry.total_points ||
      previous.exact_predictions !== entry.exact_predictions ||
      previous.correct_result_predictions !== entry.correct_result_predictions ||
      previous.incorrect_predictions !== entry.incorrect_predictions
    ) {
      currentRank = index + 1
    }
    return { ...entry, rank: currentRank }
  })
}

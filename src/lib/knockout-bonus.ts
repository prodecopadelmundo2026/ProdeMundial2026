import type { Match } from '@/types'
import {
  computeAllStandings,
  computeBestThirdsGroups,
} from '@/lib/bracket'
import { computeFifaAllStandings, computeFifaBestThirds } from '@/lib/fifa-standings'
import { buildFinishedGroupScoreMap, getOfficialRoundOf32State } from '@/lib/tournament-state'

export type KnockoutBonusRound =
  | 'round_of_32'
  | 'round_of_16'
  | 'quarterfinal'
  | 'semifinal'
  | 'final'
  | 'champion'

export type KnockoutBonusLedgerItem = {
  userId: string
  team: string
  round: KnockoutBonusRound
  roundLabel: string
  points: number
  predicted: boolean
  actual: boolean
  awarded: boolean
  reason: string
}

export const KNOCKOUT_BONUS_POINTS: Record<KnockoutBonusRound, number> = {
  round_of_32: 1,
  round_of_16: 2,
  quarterfinal: 3,
  semifinal: 4,
  final: 5,
  champion: 10,
}

type ScoreMap = Record<string, { home_score: number; away_score: number }>
type TiebreakerMap = Record<string, string>

export function getHistoricalPredictedRoundOf32Teams(
  groupMatches: Match[],
  predictionMap: ScoreMap,
  historicalTiebreakers: TiebreakerMap
) {
  if (!groupMatches.length || !groupMatches.every((match) => predictionMap[match.id])) return new Set<string>()
  const standings = computeAllStandings(groupMatches, predictionMap, historicalTiebreakers)
  const bestThirdGroups = computeBestThirdsGroups(groupMatches, predictionMap, historicalTiebreakers)
  const teams = new Set<string>()
  for (const [group, orderedTeams] of Object.entries(standings)) {
    orderedTeams.slice(0, 2).forEach((team) => teams.add(team))
    if (bestThirdGroups.has(group)) {
      const third = orderedTeams[2]
      if (third) teams.add(third)
    }
  }
  return teams
}

export function getOfficialRoundOf32Teams(matches: Match[]) {
  if (!getOfficialRoundOf32State(matches).officialBracketReady) return new Set<string>()
  const groupMatches = matches.filter((match) => match.stage === 'group')
  const scoreMap = buildFinishedGroupScoreMap(groupMatches)
  const standings = computeFifaAllStandings(groupMatches, scoreMap)
  const thirds = computeFifaBestThirds(groupMatches, scoreMap)
  const teams = new Set<string>()
  Object.values(standings).forEach((result) =>
    result.standings.slice(0, 2).forEach((team) => teams.add(team.name))
  )
  thirds.standings.filter((team) => team.qualified).forEach((team) => teams.add(team.name))
  return teams
}

export function buildRoundOf32BonusLedger({
  userId,
  matches,
  predictionMap,
  historicalTiebreakers,
}: {
  userId: string
  matches: Match[]
  predictionMap: ScoreMap
  historicalTiebreakers: TiebreakerMap
}) {
  const groupMatches = matches.filter((match) => match.stage === 'group')
  const predictedTeams = getHistoricalPredictedRoundOf32Teams(groupMatches, predictionMap, historicalTiebreakers)
  const actualTeams = getOfficialRoundOf32Teams(matches)
  if (predictedTeams.size !== 32 || actualTeams.size !== 32) return []

  return [...predictedTeams].sort().map<KnockoutBonusLedgerItem>((team) => {
    const awarded = actualTeams.has(team)
    return {
      userId,
      team,
      round: 'round_of_32',
      roundLabel: '16avos',
      points: awarded ? KNOCKOUT_BONUS_POINTS.round_of_32 : 0,
      predicted: true,
      actual: awarded,
      awarded,
      reason: awarded ? 'Pronosticado y clasificado a 16avos.' : 'Pronosticado, pero no clasificó a 16avos.',
    }
  })
}

export function summarizeKnockoutBonus(items: KnockoutBonusLedgerItem[]) {
  return {
    awardedTeams: items.filter((item) => item.awarded).map((item) => item.team),
    missedTeams: items.filter((item) => !item.awarded).map((item) => item.team),
    points: items.reduce((total, item) => total + item.points, 0),
  }
}

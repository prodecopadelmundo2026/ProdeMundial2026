import type { Match } from '@/types'
import {
  KNOCKOUT_FIXTURES,
  assignBestThirdsToSlots,
  buildKnockoutMap,
  buildProjectedKnockoutMatches,
  computeAllStandings,
  computeBestThirdsGroups,
  resolveTeamFull,
  knockoutPNum,
} from '@/lib/bracket'
import { computeFifaAllStandings, computeFifaBestThirds } from '@/lib/fifa-standings'
import {
  buildFinishedGroupScoreMap,
  getOfficialRoundOf32State,
  getTournamentVisibleMatches,
} from '@/lib/tournament-state'

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

export function getQualifiedTeamPointsForStage(stage: Match['stage']) {
  if (stage === 'round_of_32') return KNOCKOUT_BONUS_POINTS.round_of_16
  if (stage === 'round_of_16') return KNOCKOUT_BONUS_POINTS.quarterfinal
  if (stage === 'quarter') return KNOCKOUT_BONUS_POINTS.semifinal
  if (stage === 'semi') return KNOCKOUT_BONUS_POINTS.final
  if (stage === 'final') return KNOCKOUT_BONUS_POINTS.champion
  return 0
}

type ScoreMap = Record<string, { home_score: number; away_score: number }>
type TiebreakerMap = Record<string, string>

export type RoundOf32CrossingAudit = {
  pNum: number
  predictedHome: string
  predictedAway: string
  officialHome: string
  officialAway: string
  correct: boolean
}

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

function bonusRoundForQualifiedStage(stage: Match['stage']): KnockoutBonusRound | null {
  if (stage === 'round_of_32') return 'round_of_16'
  if (stage === 'round_of_16') return 'quarterfinal'
  if (stage === 'quarter') return 'semifinal'
  if (stage === 'semi') return 'final'
  if (stage === 'final') return 'champion'
  return null
}

function bonusRoundLabel(round: KnockoutBonusRound) {
  if (round === 'round_of_32') return '16avos'
  if (round === 'round_of_16') return 'Octavos'
  if (round === 'quarterfinal') return 'Cuartos'
  if (round === 'semifinal') return 'Semis'
  if (round === 'final') return 'Final'
  return 'Campeón'
}

function getPredictedWinnerForVirtualMatch({
  virtualMatchId,
  predictedHome,
  predictedAway,
  predictionMap,
  historicalTiebreakers,
}: {
  virtualMatchId: string
  predictedHome: string
  predictedAway: string
  predictionMap: ScoreMap
  historicalTiebreakers: TiebreakerMap
}) {
  const prediction = predictionMap[virtualMatchId]
  if (!prediction) return null

  if (prediction.home_score > prediction.away_score) return predictedHome
  if (prediction.away_score > prediction.home_score) return predictedAway

  const tiebreakerTeam = historicalTiebreakers[virtualMatchId]
  if (tiebreakerTeam === predictedHome || tiebreakerTeam === predictedAway) {
    return tiebreakerTeam
  }

  return null
}

function getActualQualifiedTeam(match: Match) {
  if (match.status !== 'finished') return null
  if (match.qualified_team) return match.qualified_team
  if (match.home_score == null || match.away_score == null) return null
  if (match.home_score > match.away_score) return match.home_team
  if (match.away_score > match.home_score) return match.away_team
  return null
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
  const ledger: KnockoutBonusLedgerItem[] = []
  const groupMatches = matches.filter((match) => match.stage === 'group')

  const predictedTeams = getHistoricalPredictedRoundOf32Teams(groupMatches, predictionMap, historicalTiebreakers)
  const actualTeams = getOfficialRoundOf32Teams(matches)

  if (predictedTeams.size === 32 && actualTeams.size === 32) {
    for (const team of [...predictedTeams].sort()) {
      const awarded = actualTeams.has(team)
      ledger.push({
        userId,
        team,
        round: 'round_of_32',
        roundLabel: '16avos',
        points: awarded ? KNOCKOUT_BONUS_POINTS.round_of_32 : 0,
        predicted: true,
        actual: awarded,
        awarded,
        reason: awarded ? 'Pronosticado y clasificado a 16avos.' : 'Pronosticado, pero no clasificó a 16avos.',
      })
    }
  }

  if (!groupMatches.length || !groupMatches.every((match) => predictionMap[match.id])) {
    return ledger
  }

  const predictedStandings = computeAllStandings(groupMatches, predictionMap, historicalTiebreakers)
  const predictedThirdGroups = computeBestThirdsGroups(groupMatches, predictionMap, historicalTiebreakers)
  const predictedThirdSlots = assignBestThirdsToSlots(predictedThirdGroups)

  const predictionOnlyKnockoutMatches = buildProjectedKnockoutMatches(
    matches.filter((match) => match.stage !== 'group')
  ).map((match) => ({
    ...match,
    home_score: null,
    away_score: null,
    status: 'upcoming' as const,
    qualified_team: null,
  }))

  const knockoutMap = buildKnockoutMap(predictionOnlyKnockoutMatches)

  for (const match of getTournamentVisibleMatches(matches)) {
    if (match.stage === 'group' || match.stage === 'third_place') continue
    if (match.status !== 'finished') continue

    const actualQualifiedTeam = getActualQualifiedTeam(match)
    if (!actualQualifiedTeam) continue

    const pNum = knockoutPNum(match)
    if (pNum == null) continue

    const fixture = KNOCKOUT_FIXTURES[pNum]
    if (!fixture) continue

    const bonusRound = bonusRoundForQualifiedStage(match.stage)
    if (!bonusRound) continue

    const points = getQualifiedTeamPointsForStage(match.stage)
    if (points <= 0) continue

    const virtualMatchId = `virtual-p${pNum}`
    const predictedHome = resolveTeamFull(
      fixture[0],
      predictedStandings,
      knockoutMap,
      predictionMap,
      historicalTiebreakers,
      0,
      predictedThirdGroups,
      predictedThirdSlots
    )
    const predictedAway = resolveTeamFull(
      fixture[1],
      predictedStandings,
      knockoutMap,
      predictionMap,
      historicalTiebreakers,
      0,
      predictedThirdGroups,
      predictedThirdSlots
    )

    const predictedWinner = getPredictedWinnerForVirtualMatch({
      virtualMatchId,
      predictedHome,
      predictedAway,
      predictionMap,
      historicalTiebreakers,
    })

    const awarded = predictedWinner === actualQualifiedTeam

    ledger.push({
      userId,
      team: actualQualifiedTeam,
      round: bonusRound,
      roundLabel: bonusRoundLabel(bonusRound),
      points: awarded ? points : 0,
      predicted: Boolean(predictedWinner),
      actual: true,
      awarded,
      reason: awarded
        ? `Pronosticó que ${actualQualifiedTeam} avanzaba y el equipo clasificó.`
        : predictedWinner
          ? `Pronosticó que avanzaba ${predictedWinner}, pero clasificó ${actualQualifiedTeam}.`
          : `No tenía un clasificado válido para el partido que ganó ${actualQualifiedTeam}.`,
    })
  }

  return ledger
}

export function buildRoundOf32CrossingAudit({
  matches,
  predictionMap,
  historicalTiebreakers,
}: {
  matches: Match[]
  predictionMap: ScoreMap
  historicalTiebreakers: TiebreakerMap
}): RoundOf32CrossingAudit[] {
  if (!getOfficialRoundOf32State(matches).officialBracketReady) return []

  const groupMatches = matches.filter((match) => match.stage === 'group')
  if (!groupMatches.length || !groupMatches.every((match) => predictionMap[match.id])) return []

  const projectedKnockout = buildProjectedKnockoutMatches(
    matches.filter((match) => match.stage !== 'group')
  )
  const predictedStandings = computeAllStandings(groupMatches, predictionMap, historicalTiebreakers)
  const predictedThirdGroups = computeBestThirdsGroups(groupMatches, predictionMap, historicalTiebreakers)
  const predictedThirdSlots = assignBestThirdsToSlots(predictedThirdGroups)
  const knockoutMap = buildKnockoutMap(projectedKnockout)
  const officialByPNum = new Map(
    getTournamentVisibleMatches(matches)
      .filter((match) => match.stage === 'round_of_32')
      .flatMap((match) => {
        const pNum = knockoutPNum(match)
        return pNum == null ? [] : [[pNum, match] as const]
      })
  )

  return Object.entries(KNOCKOUT_FIXTURES)
    .filter(([pNum]) => Number(pNum) >= 73 && Number(pNum) <= 88)
    .flatMap(([pNumString, fixture]) => {
      const pNum = Number(pNumString)
      const official = officialByPNum.get(pNum)
      if (!official) return []
      const predictedHome = resolveTeamFull(
        fixture[0],
        predictedStandings,
        knockoutMap,
        predictionMap,
        historicalTiebreakers,
        0,
        predictedThirdGroups,
        predictedThirdSlots
      )
      const predictedAway = resolveTeamFull(
        fixture[1],
        predictedStandings,
        knockoutMap,
        predictionMap,
        historicalTiebreakers,
        0,
        predictedThirdGroups,
        predictedThirdSlots
      )
      return [{
        pNum,
        predictedHome,
        predictedAway,
        officialHome: official.home_team,
        officialAway: official.away_team,
        correct: predictedHome === official.home_team && predictedAway === official.away_team,
      }]
    })
}

export function summarizeKnockoutBonus(items: KnockoutBonusLedgerItem[]) {
  return {
    awardedTeams: items.filter((item) => item.awarded).map((item) => item.team),
    missedTeams: items.filter((item) => !item.awarded).map((item) => item.team),
    points: items.reduce((total, item) => total + item.points, 0),
  }
}

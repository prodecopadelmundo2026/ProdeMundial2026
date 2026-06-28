import type { Match } from '@/types'
import {
  computeFifaAllStandings,
  computeFifaBestThirds,
  type FifaScoreMap,
} from '@/lib/fifa-standings'
import {
  KNOCKOUT_FIXTURES,
  assignBestThirdsToSlots,
  buildKnockoutMap,
  buildProjectedKnockoutMatches,
  resolveTeamFull,
} from '@/lib/bracket'

export function hasFinishedOfficialScore(match: Match) {
  return match.status === 'finished' && match.home_score != null && match.away_score != null
}

export function isGroupStageComplete(matches: Match[]) {
  const groupMatches = matches.filter((match) => match.stage === 'group')
  return groupMatches.length > 0 && groupMatches.every(hasFinishedOfficialScore)
}

export function buildFinishedGroupScoreMap(matches: Match[]): FifaScoreMap {
  return Object.fromEntries(
    matches
      .filter((match) => match.stage === 'group' && hasFinishedOfficialScore(match))
      .map((match) => [
        match.id,
        { home_score: match.home_score!, away_score: match.away_score! },
      ])
  )
}

export function getOfficialRoundOf32State(matches: Match[]) {
  const groupMatches = matches.filter((match) => match.stage === 'group')
  const groupStageComplete = isGroupStageComplete(groupMatches)
  if (!groupStageComplete) {
    return {
      groupStageComplete: false,
      officialBracketReady: false,
      pendingReason: 'GROUP_STAGE_INCOMPLETE' as const,
    }
  }

  const scoreMap = buildFinishedGroupScoreMap(groupMatches)
  const groupResults = computeFifaAllStandings(groupMatches, scoreMap)
  if (Object.values(groupResults).some((result) => result.status === 'NO_RESOLUBLE_WITH_AVAILABLE_DATA')) {
    return {
      groupStageComplete: true,
      officialBracketReady: false,
      pendingReason: 'GROUP_TIE_PENDING' as const,
    }
  }

  const bestThirds = computeFifaBestThirds(groupMatches, scoreMap)
  const qualifiedThirds = bestThirds.standings.filter((team) => team.qualified)
  if (bestThirds.status !== 'RESOLVED' || qualifiedThirds.length !== 8) {
    return {
      groupStageComplete: true,
      officialBracketReady: false,
      pendingReason: 'BEST_THIRDS_PENDING' as const,
    }
  }
  const thirdSlotAssignment = assignBestThirdsToSlots(new Set(qualifiedThirds.map((team) => team.group)))
  if (Object.keys(thirdSlotAssignment).length !== 8) {
    return {
      groupStageComplete: true,
      officialBracketReady: false,
      pendingReason: 'ANNEX_C_PENDING' as const,
    }
  }

  return {
    groupStageComplete: true,
    officialBracketReady: true,
    pendingReason: null,
  }
}

function parseVirtualKnockoutPNum(matchId: string): number | null {
  const parsed = matchId.match(/^virtual-p(\d+)$/)
  return parsed ? Number(parsed[1]) : null
}

/**
 * Devuelve el calendario completo para el fixture público: los partidos de
 * fase de grupos tal cual están en la base, más los 32 partidos de la fase
 * eliminatoria. Mientras la llave oficial no esté definida, los cruces se
 * muestran con sus placeholders ("2° Grupo A", "Ganador P74", etc.) y fecha.
 * Cuando la fase de grupos termina y la llave oficial queda resuelta, los
 * cruces de 16avos se completan con los equipos reales usando exactamente la
 * misma resolución FIFA (incluye head-to-head y mejores terceros) que la
 * "Llave oficial" del resto de la app, para que nunca diverjan.
 */
export function buildOfficialFixtureMatches(matches: Match[]): Match[] {
  const groupMatches = matches.filter((match) => match.stage === 'group')
  const databaseKnockoutMatches = matches.filter((match) => match.stage !== 'group')
  const projectedKnockoutMatches = buildProjectedKnockoutMatches(databaseKnockoutMatches)

  if (!getOfficialRoundOf32State(matches).officialBracketReady) {
    return [...groupMatches, ...projectedKnockoutMatches]
  }

  const scoreMap = buildFinishedGroupScoreMap(groupMatches)
  const fifaStandings = computeFifaAllStandings(groupMatches, scoreMap)
  const orderedStandings: Record<string, string[]> = Object.fromEntries(
    Object.entries(fifaStandings).map(([group, result]) => [group, result.standings.map((team) => team.name)])
  )
  const qualifiedThirdGroups = new Set(
    computeFifaBestThirds(groupMatches, scoreMap).standings
      .filter((team) => team.qualified)
      .map((team) => team.group)
  )
  const thirdSlotAssignment = assignBestThirdsToSlots(qualifiedThirdGroups)
  const knockoutMap = buildKnockoutMap(projectedKnockoutMatches)

  const resolvedKnockoutMatches = projectedKnockoutMatches.map((match) => {
    const pNum = parseVirtualKnockoutPNum(match.id)
    if (pNum == null) return match
    const fixture = KNOCKOUT_FIXTURES[pNum]
    if (!fixture) return match
    return {
      ...match,
      home_team: resolveTeamFull(fixture[0], orderedStandings, knockoutMap, {}, {}, 0, qualifiedThirdGroups, thirdSlotAssignment),
      away_team: resolveTeamFull(fixture[1], orderedStandings, knockoutMap, {}, {}, 0, qualifiedThirdGroups, thirdSlotAssignment),
    }
  })

  return [...groupMatches, ...resolvedKnockoutMatches]
}

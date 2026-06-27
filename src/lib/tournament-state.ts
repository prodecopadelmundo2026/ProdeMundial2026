import type { Match } from '@/types'
import {
  computeFifaAllStandings,
  computeFifaBestThirds,
  type FifaScoreMap,
} from '@/lib/fifa-standings'
import { assignBestThirdsToSlots } from '@/lib/bracket'

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

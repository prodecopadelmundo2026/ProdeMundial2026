import type { Match } from '@/types'
import { officialBestThirdOrder } from '@/lib/official-tournament-overrides'

export type FifaScoreMap = Record<string, { home_score: number; away_score: number }>
export type FifaTiebreakCriterion =
  | 'points'
  | 'head_to_head_points'
  | 'head_to_head_goal_difference'
  | 'head_to_head_goals_for'
  | 'overall_goal_difference'
  | 'overall_goals_for'
  | 'manual_historical'
  | 'NO_RESOLUBLE_WITH_AVAILABLE_DATA'

export type FifaStanding = {
  name: string
  played: number
  wins: number
  draws: number
  losses: number
  pts: number
  gf: number
  ga: number
  gd: number
  resolvedAutomatically: boolean
  requiresManualOrAdmin: boolean
  criterion: FifaTiebreakCriterion
}

export type FifaStandingsResult = {
  standings: FifaStanding[]
  status: 'RESOLVED' | 'NO_RESOLUBLE_WITH_AVAILABLE_DATA'
  unresolvedTies: string[][]
}

export type FifaBestThirdStanding = FifaStanding & {
  group: string
  qualified: boolean
  qualificationStatus: 'qualified' | 'eliminated' | 'pending'
  officialOrderOverride: boolean
}

export type FifaBestThirdsResult = {
  standings: FifaBestThirdStanding[]
  status: 'RESOLVED' | 'NO_RESOLUBLE_WITH_AVAILABLE_DATA'
  unresolvedTies: string[][]
}

type MutableStanding = Omit<FifaStanding, 'gd' | 'resolvedAutomatically' | 'requiresManualOrAdmin' | 'criterion'>
type RankedBucket = { teams: MutableStanding[]; criterion: FifaTiebreakCriterion; unresolved: boolean }

function createStanding(name: string): MutableStanding {
  return { name, played: 0, wins: 0, draws: 0, losses: 0, pts: 0, gf: 0, ga: 0 }
}

function computeStats(matches: Match[], scoreMap: FifaScoreMap, allowedTeams?: Set<string>) {
  const stats = new Map<string, MutableStanding>()
  const ensure = (name: string) => {
    if (!stats.has(name)) stats.set(name, createStanding(name))
    return stats.get(name)!
  }

  for (const match of matches) {
    if (allowedTeams && (!allowedTeams.has(match.home_team) || !allowedTeams.has(match.away_team))) continue
    const home = ensure(match.home_team)
    const away = ensure(match.away_team)
    const score = scoreMap[match.id]
    if (!score) continue
    home.played++
    away.played++
    home.gf += score.home_score
    home.ga += score.away_score
    away.gf += score.away_score
    away.ga += score.home_score
    if (score.home_score > score.away_score) {
      home.wins++
      away.losses++
      home.pts += 3
    } else if (score.home_score < score.away_score) {
      away.wins++
      home.losses++
      away.pts += 3
    } else {
      home.draws++
      away.draws++
      home.pts++
      away.pts++
    }
  }
  return stats
}

function partitionByMetric(
  teams: MutableStanding[],
  value: (team: MutableStanding) => number,
  criterion: FifaTiebreakCriterion
): RankedBucket[] {
  const sorted = [...teams].sort((a, b) => value(b) - value(a))
  const buckets: RankedBucket[] = []
  for (const team of sorted) {
    const previous = buckets.at(-1)
    if (!previous || value(previous.teams[0]) !== value(team)) {
      buckets.push({ teams: [team], criterion, unresolved: false })
    } else {
      previous.teams.push(team)
    }
  }
  return buckets
}

function applySequentialCriteria(
  initial: RankedBucket[],
  criteria: Array<{ criterion: FifaTiebreakCriterion; value: (team: MutableStanding) => number }>
) {
  let buckets = initial
  for (const { criterion, value } of criteria) {
    buckets = buckets.flatMap((bucket) =>
      bucket.teams.length === 1 ? [bucket] : partitionByMetric(bucket.teams, value, criterion)
    )
  }
  return buckets
}

function rankEqualPoints(
  teams: MutableStanding[],
  matches: Match[],
  scoreMap: FifaScoreMap,
  overall: Map<string, MutableStanding>
): RankedBucket[] {
  const mini = computeStats(matches, scoreMap, new Set(teams.map((team) => team.name)))
  const miniValue = (team: MutableStanding) => mini.get(team.name) ?? createStanding(team.name)
  const headToHead = applySequentialCriteria(
    [{ teams, criterion: 'points', unresolved: false }],
    [
      { criterion: 'head_to_head_points', value: (team) => miniValue(team).pts },
      { criterion: 'head_to_head_goal_difference', value: (team) => miniValue(team).gf - miniValue(team).ga },
      { criterion: 'head_to_head_goals_for', value: (team) => miniValue(team).gf },
    ]
  )
  const reapplied = headToHead.length > 1
    ? headToHead.flatMap((bucket) =>
        bucket.teams.length > 1 ? rankEqualPoints(bucket.teams, matches, scoreMap, overall) : [bucket]
      )
    : headToHead

  return applySequentialCriteria(reapplied, [
    { criterion: 'overall_goal_difference', value: (team) => overall.get(team.name)!.gf - overall.get(team.name)!.ga },
    { criterion: 'overall_goals_for', value: (team) => overall.get(team.name)!.gf },
  ]).map((bucket) =>
    bucket.teams.length > 1
      ? { ...bucket, criterion: 'NO_RESOLUBLE_WITH_AVAILABLE_DATA', unresolved: true }
      : bucket
  )
}

export function computeFifaGroupStandings(groupMatches: Match[], scoreMap: FifaScoreMap): FifaStandingsResult {
  const overall = computeStats(groupMatches, scoreMap)
  const pointsBuckets = partitionByMetric([...overall.values()], (team) => team.pts, 'points')
  const ranked = pointsBuckets.flatMap((bucket) =>
    bucket.teams.length > 1 ? rankEqualPoints(bucket.teams, groupMatches, scoreMap, overall) : [bucket]
  )
  const unresolvedTies = ranked.filter((bucket) => bucket.unresolved).map((bucket) => bucket.teams.map((team) => team.name))
  return {
    standings: ranked.flatMap((bucket) =>
      bucket.teams.map((team) => ({
        ...team,
        gd: team.gf - team.ga,
        resolvedAutomatically: !bucket.unresolved,
        requiresManualOrAdmin: bucket.unresolved,
        criterion: bucket.criterion,
      }))
    ),
    status: unresolvedTies.length ? 'NO_RESOLUBLE_WITH_AVAILABLE_DATA' : 'RESOLVED',
    unresolvedTies,
  }
}

export function computeFifaAllStandings(allGroupMatches: Match[], scoreMap: FifaScoreMap) {
  const groups = new Map<string, Match[]>()
  for (const match of allGroupMatches) {
    if (!match.group) continue
    if (!groups.has(match.group)) groups.set(match.group, [])
    groups.get(match.group)!.push(match)
  }
  return Object.fromEntries(
    [...groups].map(([group, matches]) => [group, computeFifaGroupStandings(matches, scoreMap)])
  ) as Record<string, FifaStandingsResult>
}

export function computeFifaBestThirds(
  allGroupMatches: Match[],
  scoreMap: FifaScoreMap
): FifaBestThirdsResult {
  const groupResults = computeFifaAllStandings(allGroupMatches, scoreMap)
  const unresolvedGroupTies = Object.values(groupResults).flatMap((result) => result.unresolvedTies)
  const thirds = Object.entries(groupResults).flatMap(([group, result]) => {
    const third = result.standings[2]
    return third ? [{ ...third, group }] : []
  })
  const ranked = applySequentialCriteria(
    [{ teams: thirds, criterion: 'points', unresolved: false }],
    [
      { criterion: 'points', value: (team) => team.pts },
      { criterion: 'overall_goal_difference', value: (team) => team.gf - team.ga },
      { criterion: 'overall_goals_for', value: (team) => team.gf },
    ]
  ).map((bucket) => {
    if (bucket.teams.length <= 1) return bucket
    const officialOrder = officialBestThirdOrder(bucket.teams.map((team) => team.name))
    if (officialOrder) {
      const orderIndex = new Map(officialOrder.map((name, index) => [name, index]))
      return {
        ...bucket,
        teams: [...bucket.teams].sort(
          (a, b) => (orderIndex.get(a.name) ?? Number.MAX_SAFE_INTEGER) - (orderIndex.get(b.name) ?? Number.MAX_SAFE_INTEGER)
        ),
        criterion: 'manual_historical' as const,
        unresolved: false,
      }
    }
    return { ...bucket, criterion: 'NO_RESOLUBLE_WITH_AVAILABLE_DATA' as const, unresolved: true }
  })
  const unresolvedTies = [
    ...unresolvedGroupTies,
    ...ranked.filter((bucket) => bucket.unresolved).map((bucket) => bucket.teams.map((team) => team.name)),
  ]
  let position = 0
  const standings = ranked.flatMap((bucket) => {
    const bucketStart = position
    const bucketEnd = position + bucket.teams.length
    const qualificationStatus = bucket.unresolved && bucketStart < 8 && bucketEnd > 8
      ? 'pending'
      : bucketEnd <= 8
      ? 'qualified'
      : 'eliminated'
    return bucket.teams.map((team) => {
      const result: FifaBestThirdStanding = {
        ...team,
        gd: team.gf - team.ga,
        resolvedAutomatically: !bucket.unresolved,
        requiresManualOrAdmin: bucket.unresolved,
        criterion: bucket.criterion,
        group: thirds.find((third) => third.name === team.name)?.group ?? '',
        qualified: qualificationStatus === 'qualified',
        qualificationStatus,
        officialOrderOverride: bucket.criterion === 'manual_historical',
      }
      position++
      return result
    })
  })
  const qualificationPending = standings.some((team) => team.qualificationStatus === 'pending')
  return {
    standings,
    // An unresolved technical tie only blocks this result when it crosses the
    // qualification cut. Ties wholly inside or outside the top eight do not
    // change which groups advance and therefore must not block the bracket.
    status: qualificationPending ? 'NO_RESOLUBLE_WITH_AVAILABLE_DATA' : 'RESOLVED',
    unresolvedTies,
  }
}

import type { Match } from '@/types'
import { computeGroupStandingsDetailed } from '@/lib/bracket'

export type GroupScoreMap = Record<string, { home_score: number; away_score: number }>
export type GroupTiebreakerMap = Record<string, string>

export type GroupTableRow = {
  name: string
  played: number
  wins: number
  draws: number
  losses: number
  gf: number
  gc: number
  gd: number
  pts: number
}

export type GroupStandingRowStyle = {
  label: string
  color: string
  background: string
  border: string
}

export const GROUP_STANDING_ROW_STYLES: readonly GroupStandingRowStyle[] = [
  {
    label: '1',
    color: '#FFE040',
    background: 'rgba(255,224,64,0.12)',
    border: '1px solid rgba(255,224,64,0.32)',
  },
  {
    label: '2',
    color: '#D7DEE8',
    background: 'rgba(215,222,232,0.11)',
    border: '1px solid rgba(215,222,232,0.24)',
  },
  {
    label: '3',
    color: '#E8A87C',
    background: 'rgba(232,168,124,0.10)',
    border: '1px solid rgba(232,168,124,0.22)',
  },
  {
    label: '4',
    color: '#8A8A8A',
    background: 'rgba(255,255,255,0.025)',
    border: '1px solid rgba(255,255,255,0.04)',
  },
] as const

export function getGroupStandingRowStyle(positionIndex: number): GroupStandingRowStyle {
  return GROUP_STANDING_ROW_STYLES[positionIndex] ?? GROUP_STANDING_ROW_STYLES[3]
}

function emptyRow(name: string): GroupTableRow {
  return {
    name,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    gf: 0,
    gc: 0,
    gd: 0,
    pts: 0,
  }
}

export function buildOfficialGroupScoreMap(matches: Match[]): GroupScoreMap {
  return Object.fromEntries(
    matches
      .filter((match) => {
        const hasCompleteScore = match.home_score != null && match.away_score != null
        return hasCompleteScore && (match.status === 'finished' || match.status === 'live')
      })
      .map((match) => [
        match.id,
        { home_score: match.home_score!, away_score: match.away_score! },
      ] as const)
  )
}

export function buildGroupTableRows(
  groupMatches: Match[],
  scoreMap: GroupScoreMap,
  tiebreakerMap: GroupTiebreakerMap = {},
  groupKey?: string
): GroupTableRow[] {
  const rows: Record<string, GroupTableRow> = {}

  for (const match of groupMatches) {
    if (!rows[match.home_team]) rows[match.home_team] = emptyRow(match.home_team)
    if (!rows[match.away_team]) rows[match.away_team] = emptyRow(match.away_team)

    const score = scoreMap[match.id]
    if (!score) continue

    const home = rows[match.home_team]
    const away = rows[match.away_team]
    home.played += 1
    away.played += 1
    home.gf += score.home_score
    home.gc += score.away_score
    away.gf += score.away_score
    away.gc += score.home_score

    if (score.home_score > score.away_score) {
      home.wins += 1
      away.losses += 1
      home.pts += 3
    } else if (score.home_score < score.away_score) {
      away.wins += 1
      home.losses += 1
      away.pts += 3
    } else {
      home.draws += 1
      away.draws += 1
      home.pts += 1
      away.pts += 1
    }
  }

  for (const row of Object.values(rows)) row.gd = row.gf - row.gc

  const ordered = computeGroupStandingsDetailed(groupMatches, scoreMap, tiebreakerMap, groupKey)
  return ordered.map((standing) => rows[standing.name] ?? emptyRow(standing.name))
}

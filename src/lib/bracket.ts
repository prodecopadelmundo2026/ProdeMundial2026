import type { Match } from '@/types'
import { THIRD_PLACE_SLOT_ASSIGNMENTS } from './world-cup-2026-third-place'

type PredMap = Record<string, { home_score: number; away_score: number }>
type TiebreakerMap = Record<string, string>

interface TeamStats {
  name: string
  pts: number
  gf: number
  ga: number
  played: number
}

export type TeamStanding = TeamStats & {
  gd: number
}

export type BestThirdStanding = TeamStanding & {
  group: string
  qualified: boolean
}

// Maps each P-number to its original [home_placeholder, away_placeholder] as stored in DB
const KNOCKOUT_FIXTURES: Record<number, [string, string]> = {
  73:  ['2° Grupo A',  '2° Grupo B'],
  74:  ['1° Grupo E',  '3° Grupo A/B/C/D/F'],
  75:  ['1° Grupo F',  '2° Grupo C'],
  76:  ['1° Grupo C',  '2° Grupo F'],
  77:  ['1° Grupo I',  '3° Grupo C/D/F/G/H'],
  78:  ['2° Grupo E',  '2° Grupo I'],
  79:  ['1° Grupo A',  '3° Grupo C/E/F/H/I'],
  80:  ['1° Grupo L',  '3° Grupo E/H/I/J/K'],
  81:  ['1° Grupo D',  '3° Grupo B/E/F/I/J'],
  82:  ['1° Grupo G',  '3° Grupo A/E/H/I/J'],
  83:  ['2° Grupo K',  '2° Grupo L'],
  84:  ['1° Grupo H',  '2° Grupo J'],
  85:  ['1° Grupo B',  '3° Grupo E/F/G/I/J'],
  86:  ['1° Grupo J',  '2° Grupo H'],
  87:  ['1° Grupo K',  '3° Grupo D/E/I/J/L'],
  88:  ['2° Grupo D',  '2° Grupo G'],
  89:  ['Ganador P74', 'Ganador P77'],
  90:  ['Ganador P73', 'Ganador P75'],
  91:  ['Ganador P76', 'Ganador P78'],
  92:  ['Ganador P79', 'Ganador P80'],
  93:  ['Ganador P83', 'Ganador P84'],
  94:  ['Ganador P81', 'Ganador P82'],
  95:  ['Ganador P86', 'Ganador P88'],
  96:  ['Ganador P85', 'Ganador P87'],
  97:  ['Ganador P89', 'Ganador P90'],
  98:  ['Ganador P93', 'Ganador P94'],
  99:  ['Ganador P91', 'Ganador P92'],
  100: ['Ganador P95', 'Ganador P96'],
  101: ['Ganador P97', 'Ganador P98'],
  102: ['Ganador P99', 'Ganador P100'],
  103: ['Perdedor P101', 'Perdedor P102'],
  104: ['Ganador P101', 'Ganador P102'],
}

function areStatsTied(a: TeamStats, b: TeamStats) {
  return a.pts === b.pts && (a.gf - a.ga) === (b.gf - b.ga) && a.gf === b.gf
}

function applyGroupTiebreakers(
  standings: TeamStats[],
  tiebreakerMap: TiebreakerMap,
  groupKey?: string
): TeamStats[] {
  if (!groupKey) return standings

  const result = [...standings]
  let i = 0
  while (i < result.length) {
    let j = i + 1
    while (j < result.length && areStatsTied(result[j], result[i])) j++

    if (j > i + 1) {
      const tiedSlice = result.slice(i, j)
      const picked: TeamStats[] = []
      for (let pos = i; pos < j - 1; pos++) {
        const choice = tiebreakerMap[`${groupKey}_pos_${pos}`]
        if (!choice) break
        const team = tiedSlice.find((t) => t.name === choice && !picked.some((p) => p.name === t.name))
        if (!team) break
        picked.push(team)
      }
      const remaining = tiedSlice.filter((t) => !picked.some((p) => p.name === t.name))
      const reordered = [...picked, ...remaining]
      for (let k = 0; k < reordered.length; k++) result[i + k] = reordered[k]
    }

    i = j
  }
  return result
}

export function computeGroupStandings(
  groupMatches: Match[],
  predMap: PredMap,
  tiebreakerMap: TiebreakerMap = {},
  groupKey?: string
): string[] {
  const stats: Record<string, TeamStats> = {}

  for (const m of groupMatches) {
    if (!stats[m.home_team]) stats[m.home_team] = { name: m.home_team, pts: 0, gf: 0, ga: 0, played: 0 }
    if (!stats[m.away_team]) stats[m.away_team] = { name: m.away_team, pts: 0, gf: 0, ga: 0, played: 0 }
  }

  for (const m of groupMatches) {
    const pred = predMap[m.id]
    if (!pred) continue
    const h = stats[m.home_team]
    const a = stats[m.away_team]
    h.played++
    a.played++
    h.gf += pred.home_score
    h.ga += pred.away_score
    a.gf += pred.away_score
    a.ga += pred.home_score
    if (pred.home_score > pred.away_score) {
      h.pts += 3
    } else if (pred.home_score === pred.away_score) {
      h.pts += 1
      a.pts += 1
    } else {
      a.pts += 3
    }
  }

  const sorted = Object.values(stats)
    .sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts
      const gdB = b.gf - b.ga
      const gdA = a.gf - a.ga
      if (gdB !== gdA) return gdB - gdA
      if (b.gf !== a.gf) return b.gf - a.gf
      return a.name.localeCompare(b.name)
    })

  return applyGroupTiebreakers(sorted, tiebreakerMap, groupKey).map((t) => t.name)
}

export function computeAllStandings(
  allGroupMatches: Match[],
  predMap: PredMap,
  tiebreakerMap: TiebreakerMap = {}
): Record<string, string[]> {
  const byGroup: Record<string, Match[]> = {}
  for (const m of allGroupMatches) {
    if (!m.group) continue
    if (!byGroup[m.group]) byGroup[m.group] = []
    byGroup[m.group].push(m)
  }
  const result: Record<string, string[]> = {}
  for (const [group, matches] of Object.entries(byGroup)) {
    result[group] = computeGroupStandings(matches, predMap, tiebreakerMap, `Grupo ${group}`)
  }
  return result
}

// Builds a map from P-number → actual Match object (matched by placeholder team names in DB)
export function buildKnockoutMap(knockoutMatches: Match[]): Record<number, Match> {
  const result: Record<number, Match> = {}
  for (const [pNumStr, [home, away]] of Object.entries(KNOCKOUT_FIXTURES)) {
    const match = knockoutMatches.find((m) => m.home_team === home && m.away_team === away)
    if (match) result[Number(pNumStr)] = match
  }
  return result
}

function resolveKnockout(
  pNum: number,
  type: 'winner' | 'loser',
  pMap: Record<number, Match>,
  standings: Record<string, string[]>,
  predMap: PredMap,
  tiebreakerMap: TiebreakerMap,
  depth: number,
  bestThirdsGroups?: Set<string>,
  thirdSlotAssignment?: Record<string, string>
): string {
  const fallback = type === 'winner' ? `Ganador P${pNum}` : `Perdedor P${pNum}`
  if (depth > 8) return fallback

  const match = pMap[pNum]
  if (!match) return fallback

  const fixture = KNOCKOUT_FIXTURES[pNum]
  if (!fixture) return fallback

  const homeResolved = resolveTeamFull(fixture[0], standings, pMap, predMap, tiebreakerMap, depth + 1, bestThirdsGroups, thirdSlotAssignment)
  const awayResolved = resolveTeamFull(fixture[1], standings, pMap, predMap, tiebreakerMap, depth + 1, bestThirdsGroups, thirdSlotAssignment)

  // Use actual result if available
  if (match.home_score != null && match.away_score != null) {
    const homeWins = match.home_score > match.away_score
    return type === 'winner'
      ? (homeWins ? homeResolved : awayResolved)
      : (homeWins ? awayResolved : homeResolved)
  }

  // Fall back to user's prediction
  const pred = predMap[match.id]
  if (pred && pred.home_score !== pred.away_score) {
    const homeWins = pred.home_score > pred.away_score
    return type === 'winner'
      ? (homeWins ? homeResolved : awayResolved)
      : (homeWins ? awayResolved : homeResolved)
  }

  // Draw prediction → use tiebreaker choice if set
  if (pred && pred.home_score === pred.away_score) {
    const tb = tiebreakerMap[match.id]
    if (tb) {
      const homeWins = tb === homeResolved
      return type === 'winner'
        ? (homeWins ? homeResolved : awayResolved)
        : (homeWins ? awayResolved : homeResolved)
    }
  }

  return fallback
}

// Full recursive resolver: handles group stage positions AND knockout winners/losers
export function resolveTeamFull(
  placeholder: string,
  standings: Record<string, string[]>,
  pMap: Record<number, Match>,
  predMap: PredMap,
  tiebreakerMap: TiebreakerMap = {},
  depth = 0,
  bestThirdsGroups?: Set<string>,
  thirdSlotAssignment?: Record<string, string>
): string {
  // "1° Grupo A", "2° Grupo B"
  const direct = placeholder.match(/^(\d)°\s+Grupo\s+([A-L])$/)
  if (direct) {
    const pos = parseInt(direct[1]) - 1
    const group = direct[2]
    return standings[group]?.[pos] ?? placeholder
  }

  // "3° Grupo X/Y/Z/..." — use slot assignment if available, otherwise fallback
  const thirdMatch = placeholder.match(/^3°\s+Grupo\s+([A-L](?:\/[A-L])*)$/)
  if (thirdMatch) {
    const groupsStr = thirdMatch[1]
    if (thirdSlotAssignment && thirdSlotAssignment[groupsStr]) {
      return standings[thirdSlotAssignment[groupsStr]]?.[2] ?? 'Mejor 3°'
    }
    if (bestThirdsGroups && bestThirdsGroups.size > 0) {
      const qualifying = groupsStr.split('/').filter((g) => bestThirdsGroups.has(g))
      if (qualifying.length === 1) {
        return standings[qualifying[0]]?.[2] ?? 'Mejor 3°'
      }
    }
    return 'Mejor 3°'
  }

  // "Ganador P74" / "Perdedor P101"
  const m = placeholder.match(/^(Ganador|Perdedor)\s+P(\d+)$/)
  if (m) {
    const type = m[1] === 'Ganador' ? 'winner' : 'loser'
    const pNum = Number(m[2])
    return resolveKnockout(pNum, type, pMap, standings, predMap, tiebreakerMap, depth, bestThirdsGroups, thirdSlotAssignment)
  }

  return placeholder
}

// Computes which 8 group letters have the best third-place teams based on predictions.
// tiebreakerMap keys: "3rd-{teamA}-vs-{teamB}" → picked team name
export function computeBestThirdsGroups(
  allGroupMatches: Match[],
  predMap: PredMap,
  tiebreakerMap: Record<string, string> = {}
): Set<string> {
  const byGroup: Record<string, Match[]> = {}
  for (const m of allGroupMatches) {
    if (!m.group) continue
    if (!byGroup[m.group]) byGroup[m.group] = []
    byGroup[m.group].push(m)
  }

  const thirds: { group: string; team: string; pts: number; gd: number; gf: number }[] = []
  for (const [group, matches] of Object.entries(byGroup)) {
    const stats: Record<string, { pts: number; gf: number; ga: number; played: number }> = {}
    for (const m of matches) {
      if (!stats[m.home_team]) stats[m.home_team] = { pts: 0, gf: 0, ga: 0, played: 0 }
      if (!stats[m.away_team]) stats[m.away_team] = { pts: 0, gf: 0, ga: 0, played: 0 }
    }
    for (const m of matches) {
      const pred = predMap[m.id]
      if (!pred) continue
      stats[m.home_team].gf += pred.home_score
      stats[m.home_team].ga += pred.away_score
      stats[m.home_team].played++
      stats[m.away_team].gf += pred.away_score
      stats[m.away_team].ga += pred.home_score
      stats[m.away_team].played++
      if (pred.home_score > pred.away_score) {
        stats[m.home_team].pts += 3
      } else if (pred.home_score === pred.away_score) {
        stats[m.home_team].pts += 1
        stats[m.away_team].pts += 1
      } else {
        stats[m.away_team].pts += 3
      }
    }
    const sorted = applyGroupTiebreakers(Object.entries(stats)
      .map(([name, s]) => ({ name, ...s }))
      .sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts
        const gdB = b.gf - b.ga, gdA = a.gf - a.ga
        if (gdB !== gdA) return gdB - gdA
        if (b.gf !== a.gf) return b.gf - a.gf
        return a.name.localeCompare(b.name)
      }), tiebreakerMap, `Grupo ${group}`)
    const third = sorted[2]
    if (third && third.played > 0) {
      thirds.push({ group, team: third.name, pts: third.pts, gd: third.gf - third.ga, gf: third.gf })
    }
  }

  thirds.sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts
    if (b.gd !== a.gd) return b.gd - a.gd
    if (b.gf !== a.gf) return b.gf - a.gf

    // N-team rank key: "3rd-rank-TeamA-TeamB-TeamC" → "TeamA,TeamB,TeamC" (comma-separated, best first)
    const rankKey = Object.keys(tiebreakerMap).find((k) => {
      if (!k.startsWith('3rd-rank-')) return false
      // Names joined with '-'; team names shouldn't contain hyphens so split is safe
      const names = k.slice('3rd-rank-'.length).split('-')
      return names.includes(a.team) && names.includes(b.team)
    })
    if (rankKey) {
      const ranked = tiebreakerMap[rankKey].split(',')
      const ai = ranked.indexOf(a.team)
      const bi = ranked.indexOf(b.team)
      if (ai !== -1 && bi !== -1) return ai - bi
    }

    // 2-team pairwise key fallback
    const key1 = `3rd-${a.team}-vs-${b.team}`
    const key2 = `3rd-${b.team}-vs-${a.team}`
    const picked = tiebreakerMap[key1] || tiebreakerMap[key2]
    if (picked === a.team) return -1
    if (picked === b.team) return 1
    return a.group.localeCompare(b.group)
  })

  return new Set(thirds.slice(0, 8).map((t) => t.group))
}

// Maps the "3° Grupo X/Y/Z" key string → allowed group letters for backtracking assignment
const THIRD_SLOTS: Record<string, string[]> = {
  'A/B/C/D/F': ['A', 'B', 'C', 'D', 'F'],
  'C/D/F/G/H': ['C', 'D', 'F', 'G', 'H'],
  'C/E/F/H/I': ['C', 'E', 'F', 'H', 'I'],
  'E/H/I/J/K': ['E', 'H', 'I', 'J', 'K'],
  'B/E/F/I/J': ['B', 'E', 'F', 'I', 'J'],
  'A/E/H/I/J': ['A', 'E', 'H', 'I', 'J'],
  'E/F/G/I/J': ['E', 'F', 'G', 'I', 'J'],
  'D/E/I/J/L': ['D', 'E', 'I', 'J', 'L'],
}

function computeGroupStats(groupMatches: Match[], predMap: PredMap): TeamStats[] {
  const stats: Record<string, TeamStats> = {}
  for (const m of groupMatches) {
    if (!stats[m.home_team]) stats[m.home_team] = { name: m.home_team, pts: 0, gf: 0, ga: 0, played: 0 }
    if (!stats[m.away_team]) stats[m.away_team] = { name: m.away_team, pts: 0, gf: 0, ga: 0, played: 0 }
    const pred = predMap[m.id]
    if (!pred) continue
    stats[m.home_team].played++
    stats[m.away_team].played++
    stats[m.home_team].gf += pred.home_score
    stats[m.home_team].ga += pred.away_score
    stats[m.away_team].gf += pred.away_score
    stats[m.away_team].ga += pred.home_score
    if (pred.home_score > pred.away_score) stats[m.home_team].pts += 3
    else if (pred.home_score === pred.away_score) {
      stats[m.home_team].pts += 1
      stats[m.away_team].pts += 1
    } else stats[m.away_team].pts += 3
  }
  return Object.values(stats).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts
    const gdB = b.gf - b.ga
    const gdA = a.gf - a.ga
    if (gdB !== gdA) return gdB - gdA
    if (b.gf !== a.gf) return b.gf - a.gf
    return a.name.localeCompare(b.name)
  })
}

export function computeGroupStandingsDetailed(
  groupMatches: Match[],
  predMap: PredMap,
  tiebreakerMap: TiebreakerMap = {},
  groupKey?: string
): TeamStanding[] {
  return applyGroupTiebreakers(computeGroupStats(groupMatches, predMap), tiebreakerMap, groupKey)
    .map((team) => ({ ...team, gd: team.gf - team.ga }))
}

function getThirdPlaceStats(
  allGroupMatches: Match[],
  predMap: PredMap,
  tiebreakerMap: TiebreakerMap = {}
): Array<TeamStats & { group: string }> {
  const byGroup: Record<string, Match[]> = {}
  for (const m of allGroupMatches) {
    if (!m.group) continue
    if (!byGroup[m.group]) byGroup[m.group] = []
    byGroup[m.group].push(m)
  }

  return Object.entries(byGroup).flatMap(([group, matches]) => {
    const standings = applyGroupTiebreakers(computeGroupStats(matches, predMap), tiebreakerMap, `Grupo ${group}`)
    const third = standings[2]
    if (!third || third.played === 0) return []
    return [{ ...third, group }]
  })
}

function sortThirds<T extends TeamStats & { group: string }>(thirds: T[], tiebreakerMap: TiebreakerMap): T[] {
  return [...thirds].sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts
    const gdB = b.gf - b.ga
    const gdA = a.gf - a.ga
    if (gdB !== gdA) return gdB - gdA
    if (b.gf !== a.gf) return b.gf - a.gf

    const rankKey = Object.keys(tiebreakerMap).find((k) => {
      if (!k.startsWith('3rd-rank-')) return false
      const names = k.slice('3rd-rank-'.length).split('-')
      return names.includes(a.name) && names.includes(b.name)
    })
    if (rankKey) {
      const ranked = tiebreakerMap[rankKey].split(',')
      const ai = ranked.indexOf(a.name)
      const bi = ranked.indexOf(b.name)
      if (ai !== -1 && bi !== -1) return ai - bi
    }

    const key1 = `3rd-${a.name}-vs-${b.name}`
    const key2 = `3rd-${b.name}-vs-${a.name}`
    const picked = tiebreakerMap[key1] || tiebreakerMap[key2]
    if (picked === a.name) return -1
    if (picked === b.name) return 1
    return a.group.localeCompare(b.group)
  })
}

export function computeBestThirdsTable(
  allGroupMatches: Match[],
  predMap: PredMap,
  tiebreakerMap: TiebreakerMap = {}
): BestThirdStanding[] {
  const thirds = sortThirds(getThirdPlaceStats(allGroupMatches, predMap, tiebreakerMap), tiebreakerMap)
  return thirds.map((team, index) => ({
    ...team,
    gd: team.gf - team.ga,
    qualified: index < 8,
  }))
}

// Given the 8 qualifying best-thirds groups, find which group fills each slot via backtracking.
// Returns { 'A/B/C/D/F': 'A', ... }
export function assignBestThirdsToSlots(
  bestThirdsGroups: Set<string>
): Record<string, string> {
  const officialKey = [...bestThirdsGroups].sort().join('')
  const official = THIRD_PLACE_SLOT_ASSIGNMENTS[officialKey]
  if (official) return official

  const slotKeys = Object.keys(THIRD_SLOTS)
  // Most constrained first
  const sorted = [...slotKeys].sort((a, b) => {
    const ac = THIRD_SLOTS[a].filter(g => bestThirdsGroups.has(g)).length
    const bc = THIRD_SLOTS[b].filter(g => bestThirdsGroups.has(g)).length
    return ac - bc
  })
  const result: Record<string, string> = {}
  const used = new Set<string>()

  function bt(idx: number): boolean {
    if (idx === sorted.length) return true
    const key = sorted[idx]
    for (const group of THIRD_SLOTS[key]) {
      if (!bestThirdsGroups.has(group) || used.has(group)) continue
      result[key] = group
      used.add(group)
      if (bt(idx + 1)) return true
      delete result[key]
      used.delete(group)
    }
    return false
  }

  bt(0)
  return result
}

export function getPendingGroupTiebreakers(
  allGroupMatches: Match[],
  predMap: PredMap,
  tiebreakerMap: TiebreakerMap = {}
): string[] {
  if (!allGroupMatches.length || !allGroupMatches.every((m) => Boolean(predMap[m.id]))) {
    return []
  }

  const byGroup: Record<string, Match[]> = {}
  for (const m of allGroupMatches) {
    if (!m.group) continue
    if (!byGroup[m.group]) byGroup[m.group] = []
    byGroup[m.group].push(m)
  }

  const pending = new Set<string>()
  for (const [group, matches] of Object.entries(byGroup)) {
    const standings = computeGroupStats(matches, predMap)
    let i = 0
    while (i < standings.length) {
      let j = i + 1
      while (j < standings.length && areStatsTied(standings[j], standings[i])) j++
      if (j > i + 1 && Array.from({ length: j - i }, (_, k) => i + k).some((idx) => idx <= 2)) {
        for (let pos = i; pos < j - 1; pos++) {
          if (!tiebreakerMap[`Grupo ${group}_pos_${pos}`]) pending.add(`Grupo ${group}`)
        }
      }
      i = j
    }
  }

  const thirds = getThirdPlaceStats(allGroupMatches, predMap, tiebreakerMap)
  const sortedThirds = sortThirds(thirds, tiebreakerMap)
  let i = 0
  while (i < sortedThirds.length) {
    let j = i + 1
    while (j < sortedThirds.length && areStatsTied(sortedThirds[j], sortedThirds[i])) j++
    const crossesTop8 = j > i + 1 && Array.from({ length: j - i }, (_, k) => i + k).some((idx) => idx <= 7) && Array.from({ length: j - i }, (_, k) => i + k).some((idx) => idx >= 8)
    if (crossesTop8) {
      const teams = sortedThirds.slice(i, j)
      if (teams.length === 2) {
        const [a, b] = teams
        if (!tiebreakerMap[`3rd-${a.name}-vs-${b.name}`] && !tiebreakerMap[`3rd-${b.name}-vs-${a.name}`]) {
          pending.add('Mejores terceros')
        }
      } else {
        const rankKey = `3rd-rank-${teams.map((t) => t.name).sort().join('-')}`
        const picks = tiebreakerMap[rankKey]?.split(',').filter(Boolean) ?? []
        if (picks.length < teams.length - 1) pending.add('Mejores terceros')
      }
    }
    i = j
  }

  return [...pending]
}

// Legacy shim — kept for any callers that use only group stage resolution
export function resolveTeam(
  placeholder: string,
  standings: Record<string, string[]>
): string {
  const direct = placeholder.match(/^(\d)°\s+Grupo\s+([A-L])$/)
  if (direct) {
    const pos = parseInt(direct[1]) - 1
    const group = direct[2]
    return standings[group]?.[pos] ?? placeholder
  }
  if (/^3°\s+Grupo\s+[A-L]/.test(placeholder)) return 'Mejor 3°'
  return placeholder
}

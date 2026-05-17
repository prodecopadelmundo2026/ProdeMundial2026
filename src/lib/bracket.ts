import type { Match } from '@/types'

type PredMap = Record<string, { home_score: number; away_score: number }>

interface TeamStats {
  name: string
  pts: number
  gf: number
  ga: number
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

export function computeGroupStandings(
  groupMatches: Match[],
  predMap: PredMap
): string[] {
  const stats: Record<string, TeamStats> = {}

  for (const m of groupMatches) {
    if (!stats[m.home_team]) stats[m.home_team] = { name: m.home_team, pts: 0, gf: 0, ga: 0 }
    if (!stats[m.away_team]) stats[m.away_team] = { name: m.away_team, pts: 0, gf: 0, ga: 0 }
  }

  for (const m of groupMatches) {
    const pred = predMap[m.id]
    if (!pred) continue
    const h = stats[m.home_team]
    const a = stats[m.away_team]
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

  return Object.values(stats)
    .sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts
      const gdB = b.gf - b.ga
      const gdA = a.gf - a.ga
      if (gdB !== gdA) return gdB - gdA
      return b.gf - a.gf
    })
    .map((t) => t.name)
}

export function computeAllStandings(
  allGroupMatches: Match[],
  predMap: PredMap
): Record<string, string[]> {
  const byGroup: Record<string, Match[]> = {}
  for (const m of allGroupMatches) {
    if (!m.group) continue
    if (!byGroup[m.group]) byGroup[m.group] = []
    byGroup[m.group].push(m)
  }
  const result: Record<string, string[]> = {}
  for (const [group, matches] of Object.entries(byGroup)) {
    result[group] = computeGroupStandings(matches, predMap)
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
  depth: number
): string {
  const fallback = type === 'winner' ? `Ganador P${pNum}` : `Perdedor P${pNum}`
  if (depth > 8) return fallback

  const match = pMap[pNum]
  if (!match) return fallback

  const fixture = KNOCKOUT_FIXTURES[pNum]
  if (!fixture) return fallback

  const homeResolved = resolveTeamFull(fixture[0], standings, pMap, predMap, depth + 1)
  const awayResolved = resolveTeamFull(fixture[1], standings, pMap, predMap, depth + 1)

  // Use actual result if available
  if (match.home_score != null && match.away_score != null) {
    const homeWins = match.home_score > match.away_score
    return type === 'winner'
      ? (homeWins ? homeResolved : awayResolved)
      : (homeWins ? awayResolved : homeResolved)
  }

  // Fall back to user's prediction
  const pred = predMap[match.id]
  if (!pred || pred.home_score === pred.away_score) return fallback

  const homeWins = pred.home_score > pred.away_score
  return type === 'winner'
    ? (homeWins ? homeResolved : awayResolved)
    : (homeWins ? awayResolved : homeResolved)
}

// Full recursive resolver: handles group stage positions AND knockout winners/losers
export function resolveTeamFull(
  placeholder: string,
  standings: Record<string, string[]>,
  pMap: Record<number, Match>,
  predMap: PredMap,
  depth = 0
): string {
  // "1° Grupo A", "2° Grupo B"
  const direct = placeholder.match(/^(\d)°\s+Grupo\s+([A-L])$/)
  if (direct) {
    const pos = parseInt(direct[1]) - 1
    const group = direct[2]
    return standings[group]?.[pos] ?? placeholder
  }

  // "3° Grupo X/Y/Z/..." — best third, can't resolve to one team
  if (/^3°\s+Grupo\s+[A-L]/.test(placeholder)) return 'Mejor 3°'

  // "Ganador P74" / "Perdedor P101"
  const m = placeholder.match(/^(Ganador|Perdedor)\s+P(\d+)$/)
  if (m) {
    const type = m[1] === 'Ganador' ? 'winner' : 'loser'
    const pNum = Number(m[2])
    return resolveKnockout(pNum, type, pMap, standings, predMap, depth)
  }

  return placeholder
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

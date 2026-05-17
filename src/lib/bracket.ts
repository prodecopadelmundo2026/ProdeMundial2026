import type { Match } from '@/types'

type PredMap = Record<string, { home_score: number; away_score: number }>

interface TeamStats {
  name: string
  pts: number
  gf: number
  ga: number
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

// Resolves a knockout match placeholder to an actual team name.
// Examples: "1° Grupo A" → "Argentina", "3° Grupo A/B/C/D/F" → "Mejor 3°", "Ganador P74" → "Ganador P74"
export function resolveTeam(
  placeholder: string,
  standings: Record<string, string[]>
): string {
  // "N° Grupo X" — direct group position
  const direct = placeholder.match(/^(\d)°\s+Grupo\s+([A-L])$/)
  if (direct) {
    const pos = parseInt(direct[1]) - 1
    const group = direct[2]
    return standings[group]?.[pos] ?? placeholder
  }
  // "3° Grupo X/Y/Z/..." — best third-place, can't determine precisely
  if (/^3°\s+Grupo\s+[A-L]/.test(placeholder)) {
    return 'Mejor 3°'
  }
  // "Ganador PXX", "Perdedor PXX" — depends on prior rounds
  return placeholder
}

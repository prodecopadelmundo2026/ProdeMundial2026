'use client'

import type { Match } from '@/types'
import { getTeam, flagUrl } from '@/lib/teams'
import { buildOfficialGroupScoreMap } from '@/lib/group-standings'
import {
  computeAllStandings,
  buildKnockoutMap,
  computeBestThirdsGroups,
  assignBestThirdsToSlots,
  KNOCKOUT_FIXTURES,
} from '@/lib/bracket'
import { computeFifaAllStandings, computeFifaBestThirds } from '@/lib/fifa-standings'

export type BracketMode = 'official' | 'prode' | 'audit'
type PredMap = Record<string, { home_score: number; away_score: number }>
type TbMap = Record<string, string>
type BracketSource = 'prediction' | 'official'
type BracketTeamStatus = 'confirmed_first' | 'confirmed_second' | 'confirmed_third' | 'provisional'

function bracketTeamStatusStyle(status?: BracketTeamStatus) {
  if (status === 'confirmed_first') {
    return { background: 'rgba(255,224,64,0.12)', border: 'rgba(255,224,64,0.72)' }
  }
  if (status === 'confirmed_second') {
    return { background: 'rgba(203,213,225,0.11)', border: 'rgba(203,213,225,0.62)' }
  }
  if (status === 'confirmed_third') {
    return { background: 'rgba(208,138,69,0.12)', border: 'rgba(208,138,69,0.66)' }
  }
  if (status === 'provisional') {
    return { background: 'rgba(177,140,255,0.10)', border: 'rgba(177,140,255,0.58)' }
  }
  return { background: 'transparent', border: 'transparent' }
}


export interface TournamentBracketProps {
  mode: BracketMode
  groupMatches: Match[]
  knockoutMatches: Match[]
  predMap?: PredMap
  tiebreakerMap?: TbMap
  officialGroupResolution?: 'complete' | 'current'
}

// Visual bracket order: D32 positions 0-15 (top to bottom)
// Each adjacent pair feeds into one R16 match
const D32_ORDER  = [73, 75, 74, 77, 83, 84, 81, 82, 76, 78, 79, 80, 86, 88, 85, 87]
const OCT_ORDER  = [90, 89, 93, 94, 91, 92, 95, 96]
const QF_ORDER   = [97, 98, 99, 100]
const SEMI_ORDER = [101, 102]
const FINAL_P    = 104
const THIRD_P    = 103

// Layout constants (px)
const CARD_W   = 152
const CARD_H   = 52
const MATCH_GAP = 10
const UNIT     = CARD_H + MATCH_GAP
const COL_GAP  = 22
const COL_STEP = CARD_W + COL_GAP   // 174

const BRACKET_H   = 16 * UNIT
const HEADER_H    = 28
const CHAMPION_W  = 120
const THIRD_BELOW = 24               // gap between main bracket and 3rd-place row

const COL_X = {
  d32:      0,
  oct:      COL_STEP,
  qf:       COL_STEP * 2,
  semi:     COL_STEP * 3,
  final:    COL_STEP * 4,
  champion: COL_STEP * 5,
}

const TOTAL_W = COL_X.champion + CHAMPION_W  // 870 + 120 = 990

function cardCenterY(pos: number, round: 'd32' | 'oct' | 'qf' | 'semi' | 'final'): number {
  const mul = round === 'd32' ? 1 : round === 'oct' ? 2 : round === 'qf' ? 4 : round === 'semi' ? 8 : 8
  if (round === 'final') return 8 * UNIT
  return (pos * mul + mul / 2) * UNIT
}

function buildScoreMap(matches: Match[], statuses?: Array<Match['status']>): PredMap {
  const map: PredMap = {}
  for (const m of matches) {
    if (statuses && !statuses.includes(m.status)) continue
    if (m.home_score != null && m.away_score != null) {
      map[m.id] = { home_score: m.home_score, away_score: m.away_score }
    }
  }
  return map
}

function hasScore(map: PredMap, match?: Match): boolean {
  return Boolean(match && map[match.id])
}

function normalizeTiebreakerTeam(value?: string | null) {
  const trimmed = value?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : null
}

function buildScopedStandings(
  groupMatches: Match[],
  scoreMap: PredMap,
  tiebreakerMap: TbMap,
  resolution: 'complete' | 'current' = 'complete',
  useFifaRules = false
) {
  const byGroup: Record<string, Match[]> = {}
  for (const match of groupMatches) {
    if (!match.group) continue
    if (!byGroup[match.group]) byGroup[match.group] = []
    byGroup[match.group].push(match)
  }

  const scopedMatches = Object.values(byGroup).flatMap((matches) =>
    resolution === 'current'
      ? matches.some((match) => hasScore(scoreMap, match)) ? matches : []
      : matches.every((match) => hasScore(scoreMap, match)) ? matches : []
  )

  if (!useFifaRules) return computeAllStandings(scopedMatches, scoreMap, tiebreakerMap)
  return Object.fromEntries(
    Object.entries(computeFifaAllStandings(scopedMatches, scoreMap))
      .map(([group, result]) => [
        group,
        result.status === 'RESOLVED' ? result.standings.map((team) => team.name) : [],
      ])
  )
}

function buildThirdSlotData(
  groupMatches: Match[],
  scoreMap: PredMap,
  tiebreakerMap: TbMap,
  resolution: 'complete' | 'current' = 'complete',
  useFifaRules = false
) {
  const byGroup: Record<string, Match[]> = {}
  for (const match of groupMatches) {
    if (!match.group) continue
    if (!byGroup[match.group]) byGroup[match.group] = []
    byGroup[match.group].push(match)
  }

  const scopedMatches = Object.values(byGroup).flatMap((matches) =>
    resolution === 'current'
      ? matches.some((match) => hasScore(scoreMap, match)) ? matches : []
      : matches.every((match) => hasScore(scoreMap, match)) ? matches : []
  )

  if (!scopedMatches.length) {
    return { bestThirdsGroups: new Set<string>(), thirdSlotAssignment: {} as Record<string, string> }
  }

  const fifaThirds = useFifaRules ? computeFifaBestThirds(scopedMatches, scoreMap) : null
  if (fifaThirds?.status === 'NO_RESOLUBLE_WITH_AVAILABLE_DATA') {
    return { bestThirdsGroups: new Set<string>(), thirdSlotAssignment: {} as Record<string, string> }
  }
  const bestThirdsGroups = fifaThirds
    ? new Set(fifaThirds.standings.filter((team) => team.qualified).map((team) => team.group))
    : computeBestThirdsGroups(scopedMatches, scoreMap, tiebreakerMap)
  return {
    bestThirdsGroups,
    thirdSlotAssignment: bestThirdsGroups.size >= 8 ? assignBestThirdsToSlots(bestThirdsGroups) : {},
  }
}

function getWinner(
  homeTeam: string,
  awayTeam: string,
  pred?: { home_score: number; away_score: number },
  tb?: string | null,
): string | null {
  if (!pred) return null
  if (pred.home_score > pred.away_score) return homeTeam
  if (pred.away_score > pred.home_score) return awayTeam
  const tiebreaker = normalizeTiebreakerTeam(tb)
  if (!tiebreaker) return null
  if (tiebreaker === homeTeam) return homeTeam
  if (tiebreaker === awayTeam) return awayTeam
  return null
}

function isPlaceholderName(name: string): boolean {
  const normalized = normalizePlaceholderName(name)
  return (
    normalized.includes('°') ||
    normalized.startsWith('Ganador') ||
    normalized.startsWith('Perdedor') ||
    normalized.startsWith('Ganador Grupo') ||
    normalized.startsWith('Segundo Grupo') ||
    normalized.startsWith('Mejor tercero') ||
    normalized === 'Mejor 3°' ||
    /^P\d+[HA]$/.test(normalized)
  )
}

function normalizePlaceholderName(name: string): string {
  return name.replace(/Ã‚Â°|Â°/g, '°')
}

function longFixtureLabel(raw: string): string {
  const normalized = normalizePlaceholderName(raw)
  const direct = normalized.match(/^([12])°\s+Grupo\s+([A-L])$/)
  if (direct) return `${direct[1] === '1' ? 'Ganador' : 'Segundo'} Grupo ${direct[2]}`

  const third = normalized.match(/^3°\s+Grupo\s+([A-L](?:\/[A-L])*)$/)
  if (third) return `Mejor tercero de ${third[1]}`

  const win = normalized.match(/^Ganador\s+P(\d+)$/)
  if (win) return `Ganador partido ${win[1]}`

  const los = normalized.match(/^Perdedor\s+P(\d+)$/)
  if (los) return `Perdedor partido ${los[1]}`

  return normalized
}

function fallbackSlotLabel(pNum: number, side: 0 | 1): string {
  const fixture = KNOCKOUT_FIXTURES[pNum]
  if (!fixture) return `Ganador partido ${pNum}`
  return longFixtureLabel(fixture[side])
}

function shortName(raw: string): string {
  const normalized = normalizePlaceholderName(raw)
  if (normalized === 'Mejor 3°') return 'Mejor 3°'
  const internal = normalized.match(/^P(\d+)([HA])$/)
  if (internal) return fallbackSlotLabel(Number(internal[1]), internal[2] === 'H' ? 0 : 1)
  const m = normalized.match(/^([12])°\s+Grupo\s+([A-L])$/)
  if (m) return `${m[1]}° Grp ${m[2]}`
  const third = normalized.match(/^3°\s+Grupo\s+([A-L](?:\/[A-L])*)$/)
  if (third) return `Mejor 3° de ${third[1]}`
  const win = normalized.match(/^Ganador\s+P(\d+)$/)
  if (win) return `Ganador partido ${win[1]}`
  const los = normalized.match(/^Perdedor\s+P(\d+)$/)
  if (los) return `Perdedor partido ${los[1]}`
  if (
    normalized.startsWith('Ganador partido') ||
    normalized.startsWith('Perdedor partido') ||
    normalized.startsWith('Ganador Grupo') ||
    normalized.startsWith('Segundo Grupo') ||
    normalized.startsWith('Mejor tercero')
  ) return normalized
  return normalized.slice(0, 13)
}

// ── Compact match card ────────────────────────────────────────────────────────

function TeamRow({
  name,
  score,
  won,
  isPH,
  status,
}: {
  name: string
  score?: number
  won: boolean
  isPH: boolean
  status?: BracketTeamStatus
}) {
  const meta = !isPH ? getTeam(name) : null
  const statusStyle = bracketTeamStatusStyle(status)
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      padding: '0 6px',
      height: '50%',
      background: won ? 'rgba(255,107,0,0.18)' : 'transparent',
      minWidth: 0,
    }}>
      {/* flag */}
      <div style={{ width: 16, height: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {!isPH && meta?.iso2 ? (
          <img src={flagUrl(meta.iso2)} alt={name} style={{ width: 16, height: 11, objectFit: 'contain' }} />
        ) : (
          <span style={{ fontSize: 9, color: '#2e2926' }}>?</span>
        )}
      </div>
      {/* name */}
      <span style={{
        flex: 1,
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        fontSize: 11,
        fontWeight: won ? 800 : 500,
        color: isPH ? '#333' : won ? '#ffffff' : '#8a8a8a',
      }}>
        {isPH ? shortName(name) : name}
      </span>
      {/* score */}
      {score !== undefined && (
        <span style={{
          flexShrink: 0,
          fontSize: 12,
          fontWeight: 800,
          color: won ? '#FF6B00' : '#4a4a4a',
          minWidth: 12,
          textAlign: 'right',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {score}
        </span>
      )}
    </div>
  )
}

function BracketCard({
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  winner,
  auditStatus,
  homeStatus,
  awayStatus,
}: {
  homeTeam: string
  awayTeam: string
  homeScore?: number
  awayScore?: number
  winner?: string | null
  auditStatus?: 'correct' | 'wrong' | 'pending'
  homeStatus?: BracketTeamStatus
  awayStatus?: BracketTeamStatus
}) {
  const isPHHome = isPlaceholderName(homeTeam)
  const isPHAway = isPlaceholderName(awayTeam)
  const homeWon  = !isPHHome && winner === homeTeam
  const awayWon  = !isPHAway && winner === awayTeam

  const borderColor =
    auditStatus === 'correct' ? 'rgba(168,240,216,0.35)' :
    auditStatus === 'wrong'   ? 'rgba(255,59,59,0.35)'   :
    'rgba(255,255,255,0.09)'

  return (
    <div style={{
      width: CARD_W,
      height: CARD_H,
      border: `1px solid ${borderColor}`,
      borderRadius: 7,
      background: '#0c0c0c',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <TeamRow name={homeTeam} score={homeScore} won={homeWon} isPH={isPHHome} status={homeStatus} />
      <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', flexShrink: 0 }} />
      <TeamRow name={awayTeam} score={awayScore} won={awayWon} isPH={isPHAway} status={awayStatus} />
    </div>
  )
}

// ── Champion card ─────────────────────────────────────────────────────────────

function ChampionCard({ team }: { team: string | null }) {
  const isPH = !team || isPlaceholderName(team)
  const meta = !isPH ? getTeam(team!) : null
  return (
    <div style={{
      position: 'relative',
      width: CHAMPION_W,
      height: 64,
      border: `1px solid ${isPH ? 'rgba(255,255,255,0.07)' : 'rgba(255,224,64,0.4)'}`,
      borderRadius: 10,
      background: isPH ? '#090909' : 'rgba(255,224,64,0.06)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
    }}>
      {!isPH && (
        <>
          <span style={{ position: 'absolute', top: 8, left: 16, width: 4, height: 4, borderRadius: 999, background: '#FFE040', animation: 'championSpark 1.8s ease-in-out infinite' }} />
          <span style={{ position: 'absolute', top: 13, right: 18, width: 3, height: 3, borderRadius: 999, background: '#A8F0D8', animation: 'championSpark 1.8s ease-in-out 0.35s infinite' }} />
          <span style={{ position: 'absolute', bottom: 12, right: 28, width: 4, height: 4, borderRadius: 999, background: '#FF6B00', animation: 'championSpark 1.8s ease-in-out 0.7s infinite' }} />
          <style>{`
            @keyframes championSpark {
              0%, 100% { opacity: 0.2; transform: translateY(0) scale(0.7); }
              45% { opacity: 1; transform: translateY(-3px) scale(1); }
            }
          `}</style>
        </>
      )}
      {!isPH && meta?.iso2 ? (
        <img src={flagUrl(meta.iso2)} alt={team!} style={{ width: 28, height: 20, objectFit: 'contain' }} />
      ) : (
        <span style={{ fontSize: 18, opacity: 0.18 }}>🏆</span>
      )}
      <span style={{
        fontSize: 11,
        fontWeight: 800,
        color: isPH ? '#2e2e2e' : '#FFE040',
        textAlign: 'center',
        maxWidth: 100,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        lineHeight: 1.2,
      }}>
        {isPH ? 'Campeón' : team}
      </span>
    </div>
  )
}

// ── SVG connectors ────────────────────────────────────────────────────────────

function Connectors() {
  const lineProps = { stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1, fill: 'none' }

  const paths: string[] = []

  function addPair(
    colFrom: number,
    colTo: number,
    count: number,
    getFromCY: (i: number) => number,
    getMidCY: (j: number) => number,
  ) {
    const xFrom  = colFrom + CARD_W
    const xTo    = colTo
    const xJunc  = xFrom + Math.floor(COL_GAP / 2)

    for (let j = 0; j < count; j++) {
      const ya = getFromCY(j * 2)
      const yb = getFromCY(j * 2 + 1)
      const ym = getMidCY(j)
      // stub-right from ya + vertical ya→yb + stub-left back from yb + horizontal ym→next col
      paths.push(`M${xFrom},${ya} H${xJunc} V${yb} H${xFrom}`)
      paths.push(`M${xJunc},${ym} H${xTo}`)
    }
  }

  // D32 (16 cards) → Oct (8 cards): 8 pairs
  addPair(
    COL_X.d32, COL_X.oct, 8,
    (i) => cardCenterY(i, 'd32'),
    (j) => cardCenterY(j, 'oct'),
  )

  // Oct (8 cards) → QF (4 cards): 4 pairs
  addPair(
    COL_X.oct, COL_X.qf, 4,
    (i) => cardCenterY(i, 'oct'),
    (j) => cardCenterY(j, 'qf'),
  )

  // QF (4 cards) → Semi (2 cards): 2 pairs
  addPair(
    COL_X.qf, COL_X.semi, 2,
    (i) => cardCenterY(i, 'qf'),
    (j) => cardCenterY(j, 'semi'),
  )

  // Semi (2 cards) → Final (1 card): 1 pair
  addPair(
    COL_X.semi, COL_X.final, 1,
    (i) => cardCenterY(i, 'semi'),
    () => cardCenterY(0, 'final'),
  )

  // Final → Champion: horizontal line
  const yfin = cardCenterY(0, 'final')
  paths.push(`M${COL_X.final + CARD_W},${yfin} H${COL_X.champion}`)

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: TOTAL_W,
        height: BRACKET_H + THIRD_BELOW + CARD_H + 20,
        pointerEvents: 'none',
        overflow: 'visible',
      }}
    >
      {paths.map((d, i) => (
        <path key={i} d={d} {...lineProps} />
      ))}
    </svg>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function TournamentBracket({
  mode,
  groupMatches,
  knockoutMatches,
  predMap = {},
  tiebreakerMap = {},
  officialGroupResolution = 'complete',
}: TournamentBracketProps) {
  const officialGroupPredMap  = buildOfficialGroupScoreMap(groupMatches)
  const officialKoDisplayMap  = buildScoreMap(knockoutMatches, ['finished', 'live'])
  const officialKoWinnerMap   = buildScoreMap(knockoutMatches, ['finished'])
  const officialDisplayMap    = { ...officialGroupPredMap, ...officialKoDisplayMap }
  const officialWinnerMap     = { ...officialGroupPredMap, ...officialKoWinnerMap }

  const pMap = buildKnockoutMap(knockoutMatches)

  const allOfficialGroupsComplete = groupMatches.length > 0 && groupMatches.every((match) =>
    match.status === 'finished' && match.home_score != null && match.away_score != null
  )

  function groupIsComplete(group: string) {
    const scoped = groupMatches.filter((match) => match.group === group)
    return scoped.length > 0 && scoped.every((match) =>
      match.status === 'finished' && match.home_score != null && match.away_score != null
    )
  }

  function qualificationStatusForSlot(pNum: number, side: 0 | 1, resolvedTeam: string): BracketTeamStatus | undefined {
    if (mode !== 'official' || pNum > 88 || isPlaceholderName(resolvedTeam)) return undefined

    const slot = KNOCKOUT_FIXTURES[pNum]?.[side]
    if (!slot) return undefined

    const direct = slot.match(/^([12])°\s+Grupo\s+([A-L])$/)
    if (direct) {
      const group = direct[2]
      if (!groupIsComplete(group)) return 'provisional'
      return direct[1] === '1' ? 'confirmed_first' : 'confirmed_second'
    }

    if (/^3°\s+Grupo\s+/.test(slot)) {
      return allOfficialGroupsComplete ? 'confirmed_third' : 'provisional'
    }

    return undefined
  }

  const predictionStandings = buildScopedStandings(groupMatches, predMap, tiebreakerMap)
  const predictionThirds = buildThirdSlotData(groupMatches, predMap, tiebreakerMap)
  const officialStandings = buildScopedStandings(groupMatches, officialGroupPredMap, {}, officialGroupResolution, true)
  const officialThirds = buildThirdSlotData(groupMatches, officialGroupPredMap, {}, officialGroupResolution, true)

  function getContext(source: BracketSource) {
    return source === 'official'
      ? {
          scoreMap: officialWinnerMap,
          standings: officialStandings,
          bestThirdsGroups: officialThirds.bestThirdsGroups,
          thirdSlotAssignment: officialThirds.thirdSlotAssignment,
          tiebreakers: {},
        }
      : {
          scoreMap: predMap,
          standings: predictionStandings,
          bestThirdsGroups: predictionThirds.bestThirdsGroups,
          thirdSlotAssignment: predictionThirds.thirdSlotAssignment,
          tiebreakers: tiebreakerMap,
        }
  }

  function resolveFromSource(placeholder: string, source: BracketSource, depth = 0): string {
    const context = getContext(source)
    const normalized = normalizePlaceholderName(placeholder)
    if (depth > 8) return normalized

    const direct = normalized.match(/^(\d)°\s+Grupo\s+([A-L])$/)
    if (direct) {
      const pos = Number(direct[1]) - 1
      return context.standings[direct[2]]?.[pos] ?? normalized
    }

    const third = normalized.match(/^3°\s+Grupo\s+([A-L](?:\/[A-L])*)$/)
    if (third) {
      const groups = third[1]
      const assigned = context.thirdSlotAssignment[groups]
      const fallback = `Mejor 3° de ${groups}`
      if (assigned) return context.standings[assigned]?.[2] ?? fallback
      const candidates = groups.split('/').filter((group) => context.bestThirdsGroups.has(group))
      if (candidates.length === 1) return context.standings[candidates[0]]?.[2] ?? fallback
      return fallback
    }

    const knockout = normalized.match(/^(Ganador|Perdedor)\s+P(\d+)$/)
    if (!knockout) return normalized

    const pNum = Number(knockout[2])
    const fixture = KNOCKOUT_FIXTURES[pNum]
    const match = pMap[pNum]
    const fallback = `${knockout[1]} P${pNum}`
    if (!fixture || !match) return fallback

    const home = resolveFromSource(fixture[0], source, depth + 1)
    const away = resolveFromSource(fixture[1], source, depth + 1)
    const score = context.scoreMap[match.id]
    if (!score) return fallback

    if (score.home_score === score.away_score) {
      if (source === 'official') return fallback
      const tiebreaker = normalizeTiebreakerTeam(context.tiebreakers[match.id])
      if (!tiebreaker) return fallback
      if (tiebreaker === home) return knockout[1] === 'Ganador' ? home : away
      if (tiebreaker === away) return knockout[1] === 'Ganador' ? away : home
      return fallback
    }

    const homeWins = score.home_score > score.away_score
    return knockout[1] === 'Ganador'
      ? (homeWins ? home : away)
      : (homeWins ? away : home)
  }

  function getMatchData(pNum: number) {
    const match    = pMap[pNum] ?? null
    const rawHome  = match?.home_team ?? ''
    const rawAway  = match?.away_team ?? ''
    const source: BracketSource = mode === 'official' ? 'official' : 'prediction'
    const displayScoreMap = source === 'official' ? officialDisplayMap : predMap
    const winnerScoreMap = source === 'official' ? officialWinnerMap : predMap

    const homeTeam = rawHome ? resolveFromSource(rawHome, source) : fallbackSlotLabel(pNum, 0)
    const awayTeam = rawAway ? resolveFromSource(rawAway, source) : fallbackSlotLabel(pNum, 1)
    const homeStatus = qualificationStatusForSlot(pNum, 0, homeTeam)
    const awayStatus = qualificationStatusForSlot(pNum, 1, awayTeam)

    const displayScore = match ? displayScoreMap[match.id] : undefined
    const winnerScore = match ? winnerScoreMap[match.id] : undefined
    const tb   = match ? normalizeTiebreakerTeam(tiebreakerMap[match.id]) : undefined
    const teamsResolved = !isPlaceholderName(homeTeam) && !isPlaceholderName(awayTeam)
    const displayPred = teamsResolved ? displayScore : undefined
    const winnerPred = teamsResolved ? winnerScore : undefined

    const homeScore = displayPred?.home_score
    const awayScore = displayPred?.away_score
    const winner    = getWinner(homeTeam, awayTeam, winnerPred, tb)
    // Audit comparison
    let auditStatus: 'correct' | 'wrong' | 'pending' | undefined
    if (mode === 'audit' && match) {
      const offPred = officialKoWinnerMap[match.id]
      if (offPred) {
        const offHome   = rawHome ? resolveFromSource(rawHome, 'official') : ''
        const offAway   = rawAway ? resolveFromSource(rawAway, 'official') : ''
        const offTeamsResolved = !isPlaceholderName(offHome) && !isPlaceholderName(offAway)
        const offWinner = offTeamsResolved ? getWinner(offHome, offAway, offPred) : null
        if (offWinner && winner) {
          auditStatus = offWinner === winner ? 'correct' : 'wrong'
        } else {
          auditStatus = 'pending'
        }
      } else {
        auditStatus = 'pending'
      }
    }

    return { homeTeam, awayTeam, homeScore, awayScore, winner, auditStatus, homeStatus, awayStatus }
  }

  const finalData = getMatchData(FINAL_P)
  const champion  = finalData.winner && !isPlaceholderName(finalData.winner) ? finalData.winner : null

  const thirdData = getMatchData(THIRD_P)

  // Round header labels
  const headers = [
    { label: 'D16', x: COL_X.d32 },
    { label: 'Octavos', x: COL_X.oct },
    { label: 'Cuartos', x: COL_X.qf },
    { label: 'Semis', x: COL_X.semi },
    { label: 'Final', x: COL_X.final },
    { label: 'Campeón', x: COL_X.champion },
  ]

  function renderCard(pNum: number, top: number, left: number) {
    const d = getMatchData(pNum)
    return (
      <div key={pNum} style={{ position: 'absolute', top, left }}>
        <BracketCard
          homeTeam={d.homeTeam}
          awayTeam={d.awayTeam}
          homeScore={d.homeScore}
          awayScore={d.awayScore}
          winner={d.winner}
          auditStatus={d.auditStatus}
          homeStatus={d.homeStatus}
          awayStatus={d.awayStatus}
        />
      </div>
    )
  }

  return (
    <div style={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
      {/* Audit legend */}
      {mode === 'audit' && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          <LegendDot color="rgba(168,240,216,0.35)" label="Ganador correcto" />
          <LegendDot color="rgba(255,59,59,0.35)" label="Ganador incorrecto" />
          <LegendDot color="rgba(255,255,255,0.09)" label="Sin resultado oficial" />
        </div>
      )}

      {/* Scroll wrapper */}
      <div style={{ overflowX: 'auto', maxWidth: '100%', WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'], paddingBottom: 12 }}>
        <div style={{ position: 'relative', width: TOTAL_W, minWidth: TOTAL_W }}>

          {/* Headers */}
          <div style={{ display: 'flex', marginBottom: 6 }}>
            {headers.map(({ label, x }) => (
              <div
                key={label}
                style={{
                  position: 'absolute',
                  left: x,
                  width: label === 'Campeón' ? CHAMPION_W : CARD_W,
                  top: 0,
                  height: HEADER_H,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.16em', color: '#333' }}>
                  {label}
                </span>
              </div>
            ))}
          </div>

          {/* Bracket body */}
          <div style={{
            position: 'relative',
            height: BRACKET_H + HEADER_H + THIRD_BELOW + CARD_H + 20,
            marginTop: HEADER_H,
          }}>
            <Connectors />

            {/* D32 */}
            {D32_ORDER.map((pNum, i) =>
              renderCard(pNum, i * UNIT, COL_X.d32)
            )}

            {/* Oct */}
            {OCT_ORDER.map((pNum, j) =>
              renderCard(pNum, cardCenterY(j, 'oct') - CARD_H / 2, COL_X.oct)
            )}

            {/* QF */}
            {QF_ORDER.map((pNum, k) =>
              renderCard(pNum, cardCenterY(k, 'qf') - CARD_H / 2, COL_X.qf)
            )}

            {/* Semi */}
            {SEMI_ORDER.map((pNum, s) =>
              renderCard(pNum, cardCenterY(s, 'semi') - CARD_H / 2, COL_X.semi)
            )}

            {/* Final */}
            <div key={FINAL_P} style={{ position: 'absolute', top: cardCenterY(0, 'final') - CARD_H / 2, left: COL_X.final }}>
              <BracketCard
                homeTeam={finalData.homeTeam}
                awayTeam={finalData.awayTeam}
                homeScore={finalData.homeScore}
                awayScore={finalData.awayScore}
                winner={finalData.winner}
                auditStatus={finalData.auditStatus}
                homeStatus={finalData.homeStatus}
                awayStatus={finalData.awayStatus}
              />
            </div>

            {/* Champion */}
            <div style={{
              position: 'absolute',
              top: cardCenterY(0, 'final') - 32,
              left: COL_X.champion,
            }}>
              <ChampionCard team={champion} />
            </div>

            {/* 3rd Place — below main bracket */}
            <div style={{
              position: 'absolute',
              top: BRACKET_H + THIRD_BELOW,
              left: COL_X.semi,
            }}>
              <div style={{ marginBottom: 4 }}>
                <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#333' }}>
                  3er Puesto
                </span>
              </div>
              <BracketCard
                homeTeam={thirdData.homeTeam}
                awayTeam={thirdData.awayTeam}
                homeScore={thirdData.homeScore}
                awayScore={thirdData.awayScore}
                winner={thirdData.winner}
                auditStatus={thirdData.auditStatus}
                homeStatus={thirdData.homeStatus}
                awayStatus={thirdData.awayStatus}
              />
            </div>

          </div>
        </div>
      </div>

      {/* Mobile hint */}
      <p style={{ fontSize: 10, color: '#333', textAlign: 'center', marginTop: 8 }} className="lg:hidden">
        ← Deslizá para ver el bracket completo →
      </p>
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 10, height: 10, borderRadius: 3, border: `2px solid ${color}`, flexShrink: 0 }} />
      <span style={{ fontSize: 11, color: '#5a5a5a' }}>{label}</span>
    </div>
  )
}

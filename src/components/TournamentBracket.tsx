'use client'

import { useState } from 'react'
import type { Match } from '@/types'
import { getTeam, flagUrl } from '@/lib/teams'
import { buildOfficialGroupScoreMap } from '@/lib/group-standings'
import {
  computeAllStandings,
  buildKnockoutMap,
  computeBestThirdsGroups,
  assignBestThirdsToSlots,
  KNOCKOUT_FIXTURES,
  resolveTeamFull,
} from '@/lib/bracket'
import { computeFifaAllStandings, computeFifaGroupStandings, computeFifaBestThirds } from '@/lib/fifa-standings'
import type { KnockoutBonusLedgerItem, KnockoutBonusRound } from '@/lib/knockout-bonus'

const TROPHY_ICON = String.fromCodePoint(0x1F3C6)

export type BracketMode = 'official' | 'prode' | 'audit'
type PredMap = Record<string, { home_score: number; away_score: number }>
type TbMap = Record<string, string>
type BracketSource = 'prediction' | 'official'
type BracketTeamStatus = 'confirmed_first' | 'confirmed_second' | 'confirmed_third' | 'provisional'

function candidateList(name: string) {
  if (!name.includes(' / ')) return []
  return name.split(' / ').map((item) => item.trim()).filter(Boolean)
}

function candidateDisplayName(name: string) {
  if (!name.includes(' / ')) return name
  const candidates = name.split(' / ').map((item) => item.trim()).filter(Boolean)
  if (candidates.length <= 1) return name
  return `${candidates.length} posibles`
}

function candidateFullTitle(name: string) {
  if (!name.includes(' / ')) return undefined
  const candidates = name.split(' / ').map((item) => item.trim()).filter(Boolean)
  if (candidates.length <= 1) return undefined
  return `Pueden quedar acá: ${candidates.join(', ')}`
}

function sameTeam(left: string | null | undefined, right: string | null | undefined) {
  return String(left ?? '').trim().localeCompare(String(right ?? '').trim(), undefined, { sensitivity: 'base' }) === 0
}

function bracketTeamStatusStyle(status?: BracketTeamStatus) {
  if (status === 'confirmed_first') {
    return { background: 'rgba(255,224,64,0.24)', border: 'rgba(255,224,64,0.95)' }
  }
  if (status === 'confirmed_second') {
    return { background: 'rgba(203,213,225,0.22)', border: 'rgba(203,213,225,0.9)' }
  }
  if (status === 'confirmed_third') {
    return { background: 'rgba(208,138,69,0.24)', border: 'rgba(208,138,69,0.92)' }
  }
  if (status === 'provisional') {
    return { background: 'rgba(177,140,255,0.20)', border: 'rgba(177,140,255,0.9)' }
  }
  return { background: 'transparent', border: 'transparent' }
}


export interface TournamentBracketProps {
  mode: BracketMode
  layout?: 'default' | 'compact-official'
  groupMatches: Match[]
  knockoutMatches: Match[]
  predMap?: PredMap
  tiebreakerMap?: TbMap
  officialGroupResolution?: 'complete' | 'current'
  /** Equipos que el usuario acertÃƒÂ³ que clasificaban a 16avos: muestran +1 en la columna D16. */
  roundOf32AwardedTeams?: Set<string>
  roundOf32ExactCrossings?: Set<number>
  trajectoryAwards?: KnockoutBonusLedgerItem[]
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

const BRACKET_H   = 8 * UNIT
const HEADER_H    = 28
const CHAMPION_W  = 120
const THIRD_BELOW = 24               // gap between main bracket and 3rd-place row

const COL_X = {
  d32: 0,
  oct: COL_STEP,
  qf: COL_STEP * 2,
  semi: COL_STEP * 3,
  final: COL_STEP * 4,
  champion: COL_STEP * 4,
  rightSemi: COL_STEP * 5,
  rightQf: COL_STEP * 6,
  rightOct: COL_STEP * 7,
  rightD32: COL_STEP * 8,
}

const TOTAL_W = COL_X.rightD32 + CARD_W
const COMPACT_CARD_W = 122
const COMPACT_COL_GAP = 9

type BracketSide = 'left' | 'right' | 'center'

const COMPACT_TEAM_NAMES: Record<string, string> = {
  'Arabia Saudita': 'Arabia S.',
  'Bosnia y Herzegovina': 'Bosnia H.',
  'Cabo Verde': 'C. Verde',
  'Corea del Sur': 'Corea Sur',
  'Costa de Marfil': 'Costa Marfil',
  'Estados Unidos': 'EE.UU.',
  'Nueva Zelanda': 'N. Zelanda',
  'Países Bajos': 'P. Bajos',
  'República Checa': 'R. Checa',
  'RD Congo': 'R.D. Congo',
}

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
  if (fifaThirds?.standings.some((team) => team.qualificationStatus === 'pending')) {
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
    normalized.includes('\u00B0') ||
    normalized.startsWith('Ganador') ||
    normalized.startsWith('Perdedor') ||
    normalized.startsWith('Ganador Grupo') ||
    normalized.startsWith('Segundo Grupo') ||
    normalized.startsWith('Mejor tercero') ||
    normalized === 'Mejor 3\u00B0' ||
    /^P\d+[HA]$/.test(normalized)
  )
}

function normalizePlaceholderName(name: string): string {
  return name
    .replace(/ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â°|Ãƒâ€šÃ‚Â°|Ã‚Â°|Â°|º/g, '\u00B0')
    .replace(/\s+/g, ' ')
    .trim()
}

function longFixtureLabel(raw: string): string {
  const normalized = normalizePlaceholderName(raw)
  const direct = normalized.match(/^([12])\u00B0\s+Grupo\s+([A-L])$/)
  if (direct) return `${direct[1] === '1' ? 'Ganador' : 'Segundo'} Grupo ${direct[2]}`

  const third = normalized.match(/^3\u00B0\s+Grupo\s+([A-L](?:\/[A-L])*)$/)
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
  if (normalized === 'Mejor 3\u00B0') return 'Mejor 3\u00B0'
  const internal = normalized.match(/^P(\d+)([HA])$/)
  if (internal) return fallbackSlotLabel(Number(internal[1]), internal[2] === 'H' ? 0 : 1)
  const m = normalized.match(/^([12])\u00B0\s+Grupo\s+([A-L])$/)
  if (m) return `${m[1]}Ã‚Â° Grp ${m[2]}`
  const third = normalized.match(/^3\u00B0\s+Grupo\s+([A-L](?:\/[A-L])*)$/)
  if (third) return `Mejor 3\u00B0 de ${third[1]}`
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

// Ã¢â€â‚¬Ã¢â€â‚¬ Compact match card Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

function TeamRow({
  name,
  score,
  won,
  isPH,
  status,
  bonuses,
  onCandidateClick,
  compact = false,
  side = 'left',
}: {
  name: string
  score?: number
  won: boolean
  isPH: boolean
  status?: BracketTeamStatus
  bonuses?: number[]
  onCandidateClick?: (candidates: string[]) => void
  compact?: boolean
  side?: BracketSide
}) {
  const candidates = candidateList(name)
  const candidateName = candidateDisplayName(name)
  const displayName = compact ? (COMPACT_TEAM_NAMES[candidateName] ?? candidateName) : candidateName
  const fullTitle = candidates.length > 1 ? `Pueden quedar acá: ${candidates.join(', ')}` : undefined
  const meta = !isPH ? getTeam(name) : null
  const statusStyle = bracketTeamStatusStyle(status)

  function openCandidateDetail() {
    if (candidates.length <= 1) return
    onCandidateClick?.(candidates)
  }

  return (
    <div
      title={fullTitle}
      role={fullTitle ? 'button' : undefined}
      tabIndex={fullTitle ? 0 : undefined}
      onClick={openCandidateDetail}
      onKeyDown={(event) => {
        if (!fullTitle) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          openCandidateDetail()
        }
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: compact ? 3 : 4,
        padding: compact ? '0 4px' : '0 6px',
        height: '50%',
        background: won ? 'rgba(255,107,0,0.18)' : statusStyle.background,
        borderLeft: side !== 'right' ? '5px solid ' + statusStyle.border : undefined,
        borderRight: side === 'right' ? '5px solid ' + statusStyle.border : undefined,
        boxShadow: status ? 'inset 0 0 0 1px ' + statusStyle.border : 'none',
        minWidth: 0,
        cursor: fullTitle ? 'pointer' : 'default',
      }}
    >
      <div style={{ width: 16, height: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', order: compact && side === 'right' ? 2 : 1 }}>
        {!fullTitle && !isPH && meta?.iso2 ? (
          <img src={flagUrl(meta.iso2)} alt={name} style={{ width: 16, height: 11, objectFit: 'contain' }} />
        ) : (
          <span style={{ fontSize: fullTitle ? 11 : 9, color: fullTitle ? '#e6d9ff' : '#555' }}>
            {fullTitle ? 'ⓘ' : '?'}
          </span>
        )}
      </div>

      <span
        style={{
          flex: 1,
          minWidth: 0,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          color: fullTitle ? '#e6d9ff' : (isPH ? '#555' : '#cfd3dc'),
          fontSize: 10,
          fontWeight: fullTitle ? 800 : 500,
          textAlign: compact && side === 'right' ? 'right' : 'left',
          order: compact && side === 'right' ? 1 : 2,
        }}
      >
        {displayName}
      </span>

      {bonuses?.map((bonus) => (
        <span
          key={bonus}
          title={`Puntos totales en este cruce (+${bonus})`}
          style={{
            flexShrink: 0,
            fontSize: 8,
            fontWeight: 800,
            lineHeight: 1,
            color: '#0A0A0A',
            background: '#A8F0D8',
            borderRadius: 4,
            padding: '2px 3px',
            order: 3,
          }}
        >
          +{bonus}
        </span>
      ))}

      {score !== undefined && (
        <span style={{
          fontSize: 11,
          fontWeight: 800,
          color: won ? '#ffb36b' : '#fff',
          minWidth: 12,
          textAlign: 'right',
          order: compact && side === 'left' ? 0 : 4,
          alignSelf: compact ? 'stretch' : undefined,
          display: compact ? 'flex' : undefined,
          alignItems: compact ? 'center' : undefined,
          justifyContent: compact ? 'center' : undefined,
          width: compact ? 19 : undefined,
          borderRight: compact && side === 'left' ? '1px solid rgba(255,255,255,0.08)' : undefined,
          borderLeft: compact && side === 'right' ? '1px solid rgba(255,255,255,0.08)' : undefined,
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
  homeBonuses,
  awayBonuses,
  onCandidateClick,
  width = CARD_W,
  compact = false,
  side = 'left',
}: {
  homeTeam: string
  awayTeam: string
  homeScore?: number
  awayScore?: number
  winner?: string | null
  auditStatus?: 'correct' | 'wrong' | 'pending' | 'exact-crossing'
  homeStatus?: BracketTeamStatus
  awayStatus?: BracketTeamStatus
  homeBonuses?: number[]
  awayBonuses?: number[]
  onCandidateClick?: (candidates: string[]) => void
  width?: number
  compact?: boolean
  side?: BracketSide
}) {
  const isPHHome = isPlaceholderName(homeTeam)
  const isPHAway = isPlaceholderName(awayTeam)
  const homeWon  = !isPHHome && winner === homeTeam
  const awayWon  = !isPHAway && winner === awayTeam

  const borderColor =
    auditStatus === 'exact-crossing' ? 'rgba(255,176,0,0.9)' :
    auditStatus === 'correct' ? 'rgba(168,240,216,0.35)' :
    auditStatus === 'wrong'   ? 'rgba(255,59,59,0.35)'   :
    'rgba(255,255,255,0.09)'

  return (
    <div style={{
      width,
      height: CARD_H,
      border: `1px solid ${borderColor}`,
      borderRadius: 7,
      background: auditStatus === 'exact-crossing' ? 'linear-gradient(135deg,rgba(255,176,0,.16),#0c0c0c 70%)' : '#0c0c0c',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <TeamRow name={homeTeam} score={homeScore} won={homeWon} isPH={isPHHome} status={homeStatus} bonuses={homeBonuses} onCandidateClick={onCandidateClick} compact={compact} side={side} />
      <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', flexShrink: 0 }} />
      <TeamRow name={awayTeam} score={awayScore} won={awayWon} isPH={isPHAway} status={awayStatus} bonuses={awayBonuses} onCandidateClick={onCandidateClick} compact={compact} side={side} />
    </div>
  )
}

// Ã¢â€â‚¬Ã¢â€â‚¬ Champion card Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

function ChampionCard({ team, bonus }: { team: string | null; bonus?: number }) {
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
        <span aria-hidden="true" style={{ fontSize: 18, opacity: 0.22 }}>{TROPHY_ICON}</span>
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
      {bonus != null && bonus > 0 && (
        <span
          title={`Bonus real de trayectoria (+${bonus})`}
          style={{
            position: 'absolute',
            right: 6,
            top: 6,
            borderRadius: 4,
            background: '#A8F0D8',
            color: '#0A0A0A',
            padding: '2px 3px',
            fontSize: 8,
            fontWeight: 900,
            lineHeight: 1,
          }}
        >
          +{bonus}
        </span>
      )}
    </div>
  )
}

// Ã¢â€â‚¬Ã¢â€â‚¬ SVG connectors Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

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
      // stub-right from ya + vertical yaÃ¢â€ â€™yb + stub-left back from yb + horizontal ymÃ¢â€ â€™next col
      paths.push(`M${xFrom},${ya} H${xJunc} V${yb} H${xFrom}`)
      paths.push(`M${xJunc},${ym} H${xTo}`)
    }
  }

  // D32 (16 cards) Ã¢â€ â€™ Oct (8 cards): 8 pairs
  addPair(
    COL_X.d32, COL_X.oct, 8,
    (i) => cardCenterY(i, 'd32'),
    (j) => cardCenterY(j, 'oct'),
  )

  // Oct (8 cards) Ã¢â€ â€™ QF (4 cards): 4 pairs
  addPair(
    COL_X.oct, COL_X.qf, 4,
    (i) => cardCenterY(i, 'oct'),
    (j) => cardCenterY(j, 'qf'),
  )

  // QF (4 cards) Ã¢â€ â€™ Semi (2 cards): 2 pairs
  addPair(
    COL_X.qf, COL_X.semi, 2,
    (i) => cardCenterY(i, 'qf'),
    (j) => cardCenterY(j, 'semi'),
  )

  // Semi (2 cards) Ã¢â€ â€™ Final (1 card): 1 pair
  addPair(
    COL_X.semi, COL_X.final, 1,
    (i) => cardCenterY(i, 'semi'),
    () => cardCenterY(0, 'final'),
  )

  // Final Ã¢â€ â€™ Champion: horizontal line
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

// Ã¢â€â‚¬Ã¢â€â‚¬ Main component Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬

export function TournamentBracket({
  mode,
  layout = 'default',
  groupMatches,
  knockoutMatches,
  predMap = {},
  tiebreakerMap = {},
  officialGroupResolution = 'complete',
  roundOf32AwardedTeams,
  roundOf32ExactCrossings,
  trajectoryAwards = [],
}: TournamentBracketProps) {
  const compact = layout === 'compact-official'
  const cardWidth = compact ? COMPACT_CARD_W : CARD_W
  const colStep = cardWidth + (compact ? COMPACT_COL_GAP : COL_GAP)
  const colX = {
    d32: 0,
    oct: colStep,
    qf: colStep * 2,
    semi: colStep * 3,
    final: colStep * 4,
    champion: colStep * 4,
    rightSemi: colStep * 5,
    rightQf: colStep * 6,
    rightOct: colStep * 7,
    rightD32: colStep * 8,
  }
  const totalWidth = colX.rightD32 + cardWidth
  const officialGroupPredMap  = buildOfficialGroupScoreMap(groupMatches)
  const officialKoDisplayMap  = buildScoreMap(knockoutMatches, ['finished', 'live'])
  const officialKoWinnerMap   = buildScoreMap(knockoutMatches, ['finished'])
  const officialDisplayMap    = { ...officialGroupPredMap, ...officialKoDisplayMap }
  const officialWinnerMap     = { ...officialGroupPredMap, ...officialKoWinnerMap }

  const pMap = buildKnockoutMap(knockoutMatches)

  const allOfficialGroupsComplete = groupMatches.length > 0 && groupMatches.every((match) =>
    match.status === 'finished' && match.home_score != null && match.away_score != null
  )

  const directSlotCache = new Map<string, { candidates: string[] }>()

  function directSlotCandidateInfo(group: string, position: 0 | 1) {
    const cacheKey = `${group}-${position}`
    const cached = directSlotCache.get(cacheKey)
    if (cached) return cached

    const scoped = groupMatches.filter((match) => match.group === group)

    if (scoped.length === 0) {
      const result = { candidates: [] }
      directSlotCache.set(cacheKey, result)
      return result
    }

    const current = computeFifaGroupStandings(scoped, officialGroupPredMap)
    const pending = scoped.filter((match) => !officialGroupPredMap[match.id])

    if (pending.length === 0) {
      const name = current.standings[position]?.name
      const result = { candidates: name ? [name] : [] }
      directSlotCache.set(cacheKey, result)
      return result
    }

    // Con 1 o 2 partidos pendientes por grupo simulamos marcadores posibles.
    // Si hubiera mÃƒÂ¡s, dejamos el slot como provisorio con la tabla actual.
    if (pending.length > 2) {
      const name = current.standings[position]?.name
      const result = { candidates: name ? [name] : [] }
      directSlotCache.set(cacheKey, result)
      return result
    }

    const candidates = new Set<string>()
    const scoreOptions: Array<{ home_score: number; away_score: number }> = []

    for (let home_score = 0; home_score <= 12; home_score++) {
      for (let away_score = 0; away_score <= 12; away_score++) {
        scoreOptions.push({ home_score, away_score })
      }
    }

    const testMap = { ...officialGroupPredMap }

    function visit(index: number) {
      if (index >= pending.length) {
        const projected = computeFifaGroupStandings(scoped, testMap)
        const name = projected.standings[position]?.name
        if (name) candidates.add(name)
        return
      }

      const match = pending[index]
      for (const score of scoreOptions) {
        testMap[match.id] = score
        visit(index + 1)
      }

      delete testMap[match.id]
    }

    visit(0)

    const result = { candidates: [...candidates].sort((a, b) => a.localeCompare(b)) }
    directSlotCache.set(cacheKey, result)
    return result
  }

  function qualificationStatusForSlot(pNum: number, side: 0 | 1, resolvedTeam: string): BracketTeamStatus | undefined {
    if (mode !== 'official' || pNum > 88 || isPlaceholderName(resolvedTeam)) return undefined

    const slot = KNOCKOUT_FIXTURES[pNum]?.[side]
    if (!slot) return undefined

    const direct = slot.match(/^([12])\u00B0\s+Grupo\s+([A-L])$/)
    if (direct) {
      const position = Number(direct[1]) - 1 as 0 | 1
      const group = direct[2]
      const info = directSlotCandidateInfo(group, position)

      if (info.candidates.length === 1 && info.candidates[0] === resolvedTeam) {
        return position === 0 ? 'confirmed_first' : 'confirmed_second'
      }

      return 'provisional'
    }

    if (/^3\u00B0\s+Grupo\s+/.test(slot)) {
      return allOfficialGroupsComplete ? 'confirmed_third' : 'provisional'
    }

    return undefined
  }

  const predictionStandings = computeAllStandings(groupMatches, predMap, tiebreakerMap)
  const predictionBestThirdsGroups = computeBestThirdsGroups(groupMatches, predMap, tiebreakerMap)
  const predictionThirds = {
    bestThirdsGroups: predictionBestThirdsGroups,
    thirdSlotAssignment: predictionBestThirdsGroups.size > 0
      ? assignBestThirdsToSlots(predictionBestThirdsGroups)
      : {} as Record<string, string>,
  }
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

    const direct = normalized.match(/^(\d)\u00B0\s+Grupo\s+([A-L])$/)
    if (direct) {
      const pos = Number(direct[1]) - 1
      const group = direct[2]

      if (source === 'official' && (pos === 0 || pos === 1)) {
        const info = directSlotCandidateInfo(group, pos as 0 | 1)
        if (info.candidates.length === 1) return info.candidates[0]
        if (info.candidates.length > 1) return info.candidates.join(' / ')
      }

      return context.standings[group]?.[pos] ?? normalized
    }

    const third = normalized.match(/^3\u00B0\s+Grupo\s+([A-L](?:\/[A-L])*)$/)
    if (third) {
      const groups = third[1]
      const assigned = context.thirdSlotAssignment[groups]
      const fallback = `Mejor 3\u00B0 de ${groups}`
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
    if (source === 'official' && match.status === 'finished' && match.qualified_team) {
      if (match.qualified_team === home) return knockout[1] === 'Ganador' ? home : away
      if (match.qualified_team === away) return knockout[1] === 'Ganador' ? away : home
    }

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
    const source: BracketSource = mode === 'official' ? 'official' : 'prediction'
    const originalFixture = KNOCKOUT_FIXTURES[pNum]
    const rawHome  = source === 'prediction' && originalFixture ? originalFixture[0] : (match?.home_team ?? '')
    const rawAway  = source === 'prediction' && originalFixture ? originalFixture[1] : (match?.away_team ?? '')
    const displayScoreMap = source === 'official' ? officialDisplayMap : predMap
    const winnerScoreMap = source === 'official' ? officialWinnerMap : predMap

    const homeTeam = rawHome
      ? source === 'prediction'
        ? resolveTeamFull(rawHome, predictionStandings, pMap, predMap, tiebreakerMap, 0, predictionThirds.bestThirdsGroups, predictionThirds.thirdSlotAssignment)
        : resolveFromSource(rawHome, source)
      : fallbackSlotLabel(pNum, 0)

    const awayTeam = rawAway
      ? source === 'prediction'
        ? resolveTeamFull(rawAway, predictionStandings, pMap, predMap, tiebreakerMap, 0, predictionThirds.bestThirdsGroups, predictionThirds.thirdSlotAssignment)
        : resolveFromSource(rawAway, source)
      : fallbackSlotLabel(pNum, 1)
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
    const winner = source === 'official' && match?.status === 'finished' && match.qualified_team
      ? match.qualified_team
      : getWinner(homeTeam, awayTeam, winnerPred, tb)
    // Audit comparison: the crossing belongs to the current slot. How either
    // team reached it in previous rounds must not affect this comparison.
    let auditStatus: 'correct' | 'wrong' | 'pending' | undefined
    let exactCrossing = false
    let resultPoints = 0
    if (mode === 'audit' && match) {
      const offPred = officialKoWinnerMap[match.id]
      if (offPred) {
        const offHome   = rawHome ? resolveFromSource(rawHome, 'official') : ''
        const offAway   = rawAway ? resolveFromSource(rawAway, 'official') : ''
        const offTeamsResolved = !isPlaceholderName(offHome) && !isPlaceholderName(offAway)
        exactCrossing =
          offTeamsResolved &&
          sameTeam(homeTeam, offHome) &&
          sameTeam(awayTeam, offAway)

        if (exactCrossing && displayPred && match.status === 'finished') {
          const exactScore =
            displayPred.home_score === offPred.home_score &&
            displayPred.away_score === offPred.away_score
          const sameOutcome =
            Math.sign(displayPred.home_score - displayPred.away_score) ===
            Math.sign(offPred.home_score - offPred.away_score)
          const qualifierMatches =
            offPred.home_score !== offPred.away_score ||
            (winner != null && sameTeam(winner, match.qualified_team))
          resultPoints = qualifierMatches ? (exactScore ? 3 : sameOutcome ? 1 : 0) : 0
        }

        auditStatus = exactCrossing ? 'correct' : 'wrong'
      } else {
        auditStatus = 'pending'
      }
    }

    return { homeTeam, awayTeam, homeScore, awayScore, winner, auditStatus, exactCrossing, resultPoints, homeStatus, awayStatus }
  }

  const finalData = getMatchData(FINAL_P)
  const champion  = finalData.winner && !isPlaceholderName(finalData.winner) ? finalData.winner : null

  const thirdData = getMatchData(THIRD_P)

  // Round header labels
  const headers = [
    { label: '16avos', x: colX.d32 },
    { label: 'Octavos', x: colX.oct },
    { label: 'Cuartos', x: colX.qf },
    { label: 'Semis', x: colX.semi },
    { label: 'Final', x: colX.final },
    { label: 'Semis', x: colX.rightSemi },
    { label: 'Cuartos', x: colX.rightQf },
    { label: 'Octavos', x: colX.rightOct },
    { label: '16avos', x: colX.rightD32 },
  ]

  const [openCandidateInfo, setOpenCandidateInfo] = useState<string[] | null>(null)

  function openCandidateDetail(candidates: string[]) {
    setOpenCandidateInfo(candidates)
  }

  function renderCard(pNum: number, top: number, left: number, side: BracketSide) {
    const d = getMatchData(pNum)
    const exactCrossing =
      d.exactCrossing ||
      (pNum >= 73 && pNum <= 88 && roundOf32ExactCrossings?.has(pNum))
    const showBonus = mode !== 'official' && pNum <= 88 && roundOf32AwardedTeams != null
    // La UI sólo ubica premios que el ledger ya otorgó. No vuelve a comparar
    // cruce, rival, partido ni slot.
    const displayedRound: KnockoutBonusRound | null =
      pNum >= 73 && pNum <= 88 ? 'round_of_32' :
      pNum >= 89 && pNum <= 96 ? 'round_of_16' :
      pNum >= 97 && pNum <= 100 ? 'quarterfinal' :
      pNum >= 101 && pNum <= 102 ? 'semifinal' :
      pNum === 104 ? 'final' : null
    const bonusesFor = (team: string) => {
      const trajectoryPoints = trajectoryAwards
        .filter((item) => item.awarded && item.team === team && item.round === displayedRound)
        .reduce((total, item) => total + item.points, 0)
      let total = trajectoryPoints
      if (
        total === 0 &&
        showBonus &&
        !isPlaceholderName(team) &&
        roundOf32AwardedTeams!.has(team)
      ) total = 1
      if (exactCrossing && sameTeam(team, d.winner)) total += d.resultPoints
      return total > 0 ? [total] : []
    }
    return (
      <div key={pNum} style={{ position: 'absolute', top, left }}>
        <BracketCard
          homeTeam={d.homeTeam}
          awayTeam={d.awayTeam}
          homeScore={d.homeScore}
          awayScore={d.awayScore}
          winner={d.winner}
          auditStatus={exactCrossing ? 'exact-crossing' : d.auditStatus}
          homeStatus={d.homeStatus}
          awayStatus={d.awayStatus}
          homeBonuses={bonusesFor(d.homeTeam)}
          awayBonuses={bonusesFor(d.awayTeam)}
          onCandidateClick={openCandidateDetail}
          width={cardWidth}
          compact={compact}
          side={side}
        />
      </div>
    )
  }
  const championBonus = champion
    ? trajectoryAwards.find((item) =>
        item.awarded &&
        item.team === champion &&
        item.round === 'champion'
      )?.points
    : undefined

  return (
    <div style={{ minWidth: 0, maxWidth: '100%', overflow: 'hidden' }}>
      {openCandidateInfo && (
        <div
          onClick={() => setOpenCandidateInfo(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            background: 'rgba(0,0,0,0.58)',
            backdropFilter: 'blur(3px)',
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: 'min(360px, 100%)',
              borderRadius: 18,
              border: '1px solid rgba(177,140,255,0.55)',
              background: 'linear-gradient(180deg, rgba(24,20,38,0.98), rgba(10,10,14,0.98))',
              boxShadow: '0 24px 80px rgba(0,0,0,0.65)',
              padding: 18,
              color: '#fff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: 0.4, textTransform: 'uppercase', color: '#e6d9ff' }}>
                  Posibles equipos
                </div>
                <div style={{ fontSize: 12, color: '#aeb6c7', marginTop: 4 }}>
                  Pueden quedar en este lugar de la llave:
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpenCandidateInfo(null)}
                aria-label="Cerrar"
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 999,
                  border: '1px solid rgba(255,255,255,0.18)',
                  background: 'rgba(255,255,255,0.08)',
                  color: '#fff',
                  fontSize: 18,
                  fontWeight: 900,
                  cursor: 'pointer',
                  lineHeight: '26px',
                }}
              >
                Ãƒâ€”
              </button>
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              {openCandidateInfo.map((team) => {
                const meta = getTeam(team)
                return (
                  <div
                    key={team}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '9px 10px',
                      borderRadius: 12,
                      background: 'rgba(255,255,255,0.07)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      fontSize: 13,
                      fontWeight: 800,
                    }}
                  >
                    {meta?.iso2 ? (
                      <img src={flagUrl(meta.iso2)} alt={team} style={{ width: 20, height: 14, objectFit: 'contain' }} />
                    ) : (
                      <span style={{ color: '#b18cff' }}>ⓘ</span>
                    )}
                    <span>{team}</span>
                  </div>
                )
              })}
            </div>

            <div style={{ fontSize: 11, color: '#7f8796', marginTop: 14 }}>
              TocÃƒÂ¡ fuera del cartel o la Ãƒâ€” para cerrar.
            </div>
          </div>
        </div>
      )}
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
        <div style={{ position: 'relative', width: totalWidth, minWidth: totalWidth }}>

          {/* Headers */}
          <div style={{ display: 'flex', marginBottom: 6 }}>
            {headers.map(({ label, x }) => (
              <div
                key={label}
                style={{
                  position: 'absolute',
                  left: x,
                  width: cardWidth,
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
            height: compact ? BRACKET_H + HEADER_H + 20 : BRACKET_H + HEADER_H + THIRD_BELOW + CARD_H + 20,
            marginTop: HEADER_H,
          }}>
            {/* Las dos mitades avanzan hacia el centro. */}

            {/* D32 */}
            {D32_ORDER.slice(0, 8).map((pNum, i) => renderCard(pNum, i * UNIT, colX.d32, 'left'))}
            {D32_ORDER.slice(8).map((pNum, i) => renderCard(pNum, i * UNIT, colX.rightD32, 'right'))}

            {/* Oct */}
            {OCT_ORDER.slice(0, 4).map((pNum, i) => renderCard(pNum, (i * 2 + 1) * UNIT - CARD_H / 2, colX.oct, 'left'))}
            {OCT_ORDER.slice(4).map((pNum, i) => renderCard(pNum, (i * 2 + 1) * UNIT - CARD_H / 2, colX.rightOct, 'right'))}

            {/* QF */}
            {QF_ORDER.slice(0, 2).map((pNum, i) => renderCard(pNum, (i * 4 + 2) * UNIT - CARD_H / 2, colX.qf, 'left'))}
            {QF_ORDER.slice(2).map((pNum, i) => renderCard(pNum, (i * 4 + 2) * UNIT - CARD_H / 2, colX.rightQf, 'right'))}

            {/* Semi */}
            {renderCard(SEMI_ORDER[0], 4 * UNIT - CARD_H / 2, colX.semi, 'left')}
            {renderCard(SEMI_ORDER[1], 4 * UNIT - CARD_H / 2, colX.rightSemi, 'right')}

            {/* Final */}
            <div key={FINAL_P} style={{ position: 'absolute', top: 4 * UNIT - CARD_H / 2, left: colX.final }}>
              <BracketCard
                homeTeam={finalData.homeTeam}
                awayTeam={finalData.awayTeam}
                homeScore={finalData.homeScore}
                awayScore={finalData.awayScore}
                winner={finalData.winner}
                auditStatus={finalData.auditStatus}
                homeStatus={finalData.homeStatus}
                awayStatus={finalData.awayStatus}
                onCandidateClick={openCandidateDetail}
                width={cardWidth}
                compact={compact}
                side="center"
              />
            </div>

            {/* Champion */}
            <div style={{
              position: 'absolute',
              top: 4 * UNIT + CARD_H / 2 + 12,
              left: colX.champion + (cardWidth - CHAMPION_W) / 2,
            }}>
              <ChampionCard team={champion} bonus={championBonus} />
            </div>

            {/* 3rd Place Ã¢â‚¬â€ below main bracket */}
            <div style={{
              position: 'absolute',
              top: compact ? 4 * UNIT - CARD_H / 2 - 94 : BRACKET_H + THIRD_BELOW,
              left: colX.final,
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
                onCandidateClick={openCandidateDetail}
                width={cardWidth}
                compact={compact}
                side="center"
              />
            </div>

          </div>
        </div>
      </div>

      {/* Mobile hint */}
      <p style={{ fontSize: 10, color: '#333', textAlign: 'center', marginTop: 8 }} className="lg:hidden">
        Ã¢â€ Â DeslizÃƒÂ¡ para ver el bracket completo Ã¢â€ â€™
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

'use client'

import { useState, useRef, useEffect } from 'react'
import clsx from 'clsx'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Shuffle, Lock, AlertTriangle } from 'lucide-react'
import type { Match } from '@/types'
import { getTeam, flagUrl } from '@/lib/teams'
import { StatusBadge } from '@/components/StatusBadge'
import { generateRandomKnockoutPredictions, upsertPredictionsBatch } from '@/app/(app)/fixture/actions'
import { computeAllStandings, buildKnockoutMap, resolveTeamFull, computeBestThirdsGroups, assignBestThirdsToSlots, getPendingGroupTiebreakers } from '@/lib/bracket'
import { normalizeScoreInput, parseScoreInput } from '@/lib/score-input'

type PredMap = Record<string, { home_score: number; away_score: number }>
type LocalInputs = Record<string, { home: string; away: string }>

function formatClientError(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return String(error)
}

interface Props {
  groupMatches: Match[]
  knockoutMatches: Match[]
  predMap: PredMap
  initialTiebreakerMap?: Record<string, string>
  isAdmin?: boolean
  groupTiebreakerMap?: Record<string, string>
  readOnly?: boolean
  clearSignal?: { version: number; stages: string[] }
  openRandomModal?: number
}

const ROUND_ORDER = ['round_of_32', 'round_of_16', 'quarter', 'semi', 'third_place', 'final'] as const
type RoundKey = typeof ROUND_ORDER[number]
type AdminLoadState = 'idle' | 'saving' | 'saved' | 'error'

const ROUND_LABELS: Record<string, string> = {
  round_of_32:  'Dieciseisavos',
  round_of_16:  'Octavos',
  quarter:      'Cuartos',
  semi:         'Semis',
  third_place:  '3er Puesto',
  final:        'Final',
}

const STRIP_COLOR: Record<string, string> = {
  open:     '#FF6B00',
  closed:   '#7A5BC9',
  live:     '#FF3B3B',
  finished: '#3a3a3a',
}

function isPlaceholder(name: string) {
  return name.includes('°') || name.startsWith('Ganador') || name.startsWith('Perdedor') || name === 'Mejor 3°'
}

// P-number friendly labels for unresolved knockout placeholders
const P_NUM_INFO: Record<number, { round: string; short: string }> = {
  73:  { round: 'D16', short: '#1'  }, 74:  { round: 'D16', short: '#2'  },
  75:  { round: 'D16', short: '#3'  }, 76:  { round: 'D16', short: '#4'  },
  77:  { round: 'D16', short: '#5'  }, 78:  { round: 'D16', short: '#6'  },
  79:  { round: 'D16', short: '#7'  }, 80:  { round: 'D16', short: '#8'  },
  81:  { round: 'D16', short: '#9'  }, 82:  { round: 'D16', short: '#10' },
  83:  { round: 'D16', short: '#11' }, 84:  { round: 'D16', short: '#12' },
  85:  { round: 'D16', short: '#13' }, 86:  { round: 'D16', short: '#14' },
  87:  { round: 'D16', short: '#15' }, 88:  { round: 'D16', short: '#16' },
  89:  { round: 'Oct.',  short: '#1' }, 90:  { round: 'Oct.',  short: '#2' },
  91:  { round: 'Oct.',  short: '#3' }, 92:  { round: 'Oct.',  short: '#4' },
  93:  { round: 'Oct.',  short: '#5' }, 94:  { round: 'Oct.',  short: '#6' },
  95:  { round: 'Oct.',  short: '#7' }, 96:  { round: 'Oct.',  short: '#8' },
  97:  { round: 'Ctos.', short: '#1' }, 98:  { round: 'Ctos.', short: '#2' },
  99:  { round: 'Ctos.', short: '#3' }, 100: { round: 'Ctos.', short: '#4' },
  101: { round: 'Semi', short: '1'  }, 102: { round: 'Semi', short: '2' },
  103: { round: '3er Puesto', short: '' }, 104: { round: 'Final', short: '' },
}

// Transforms raw DB placeholder text into a human-readable label + optional context hint
function formatPlaceholder(raw: string): { primary: string; hint: string | null } {
  // "1° Grupo A" / "2° Grupo B" — already legible
  if (/^[12]°\s+Grupo\s+[A-L]$/.test(raw)) return { primary: raw, hint: null }

  // "3° Grupo A/B/C/D/F" — best third from a qualifying slot
  const thirdGroups = raw.match(/^3°\s+Grupo\s+([A-L](?:\/[A-L])*)$/)
  if (thirdGroups) return { primary: 'Mejor 3°', hint: `Grps. ${thirdGroups[1]}` }

  // "Mejor 3°" (fallback after full resolution)
  if (raw === 'Mejor 3°') return { primary: 'Mejor 3°', hint: null }

  // "Ganador P73"
  const winner = raw.match(/^Ganador\s+P(\d+)$/)
  if (winner) {
    const info = P_NUM_INFO[Number(winner[1])]
    if (info) return { primary: `Gan. ${info.round}${info.short ? ` ${info.short}` : ''}`, hint: null }
  }

  // "Perdedor P101"
  const loser = raw.match(/^Perdedor\s+P(\d+)$/)
  if (loser) {
    const info = P_NUM_INFO[Number(loser[1])]
    if (info) return { primary: `Perd. ${info.round}${info.short ? ` ${info.short}` : ''}`, hint: null }
  }

  return { primary: raw, hint: null }
}

// Brief description shown below the round tabs
const ROUND_CONTEXT: Record<string, string> = {
  round_of_32:  '32 selecciones · campeones, subcampeones + 8 mejores terceros',
  round_of_16:  'Ganadores de Dieciseisavos',
  quarter:      'Ganadores de Octavos',
  semi:         'Ganadores de Cuartos',
  third_place:  'Perdedores de Semis disputan el bronce',
  final:        'Ganadores de Semis disputan el título',
}

function BracketMatchCard({
  match,
  homeTeam,
  awayTeam,
  initialHome,
  initialAway,
  tiebreaker,
  disabled,
  onValuesChange,
  onTiebreakerChange,
}: {
  match: Match
  homeTeam: string
  awayTeam: string
  initialHome: string
  initialAway: string
  tiebreaker?: string
  disabled?: boolean
  onValuesChange: (home: string, away: string) => void
  onTiebreakerChange: (team: string | null) => void
}) {
  const now = new Date()
  const lockedAt = new Date(match.locked_at)
  const isOpen = match.status === 'upcoming' && now < lockedAt && !disabled
  const isLive = match.status === 'live'
  const isFinished = match.status === 'finished'
  const hasRealScore = (isLive || isFinished) && match.home_score != null && match.away_score != null

  const [home, setHome] = useState(initialHome)
  const [away, setAway] = useState(initialAway)

  useEffect(() => {
    setHome(initialHome)
    setAway(initialAway)
  }, [initialHome, initialAway, match.id])

  function handleChange(field: 'home' | 'away', val: string) {
    if (!isOpen) return
    const nextValue = normalizeScoreInput(val)
    const h = field === 'home' ? nextValue : home
    const a = field === 'away' ? nextValue : away
    if (field === 'home') setHome(nextValue)
    else setAway(nextValue)
    onValuesChange(h, a)
  }

  const homeMeta = getTeam(homeTeam)
  const awayMeta = getTeam(awayTeam)
  const homePH = isPlaceholder(homeTeam)
  const awayPH = isPlaceholder(awayTeam)
  const homeFmt = homePH ? formatPlaceholder(homeTeam) : null
  const awayFmt = awayPH ? formatPlaceholder(awayTeam) : null

  const stageLabel = ROUND_LABELS[match.stage] ?? match.stage
  const kickoffStr = format(new Date(match.scheduled_at), 'EEE d MMM · HH:mm', { locale: es })
  const hasPrediction = home !== '' && away !== ''
  const isDrawPred = hasPrediction && Number(home) === Number(away)

  return (
    <article
      className="relative bg-panel overflow-hidden transition-all duration-200 hover:-translate-y-[3px]"
      style={{
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '18px',
        padding: '12px 12px 10px',
      }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.18)')
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)')
      }
    >
      {/* Left strip */}
      <span
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-[18px]"
        style={{ background: isOpen ? '#FF6B00' : '#3a3a3a' }}
      />

      {/* Top row */}
      <div className="flex items-center justify-between mb-3 text-[11px]">
        <div className="flex items-center gap-[8px] text-muted font-bold tracking-[0.04em] uppercase text-[10px]">
          <span
            className="text-white text-[9px] px-1.5 py-0.5 rounded-[5px]"
            style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {stageLabel}
          </span>
          <span className="font-mono">{kickoffStr}</span>
        </div>
        <StatusBadge match={match} />
      </div>

      {/* Teams row */}
      <div className="grid gap-[8px] items-center mb-[10px]" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
        {/* Home */}
        <div className="flex flex-col items-center gap-[6px] text-center">
          <div
            className="w-[38px] h-[38px] rounded-full grid place-items-center overflow-hidden"
            style={homePH
              ? { background: 'rgba(10,10,10,0.6)', border: '1px dashed rgba(255,255,255,0.09)' }
              : { background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {homePH ? (
              <span className="text-[12px]" style={{ color: '#2e2926' }}>?</span>
            ) : homeMeta.iso2 ? (
              <img src={flagUrl(homeMeta.iso2)} alt={homeTeam} style={{ width: '28px', height: '20px', objectFit: 'contain' }} />
            ) : (
              <span className="text-[20px]">{homeMeta.flag}</span>
            )}
          </div>
          <div className="font-extrabold text-[12px] tracking-[-0.01em] leading-tight">
            {homePH ? (
              <span style={{ color: '#4a453f' }}>{homeFmt!.primary}</span>
            ) : homeTeam}
          </div>
          {homePH && homeFmt!.hint && (
            <div className="font-mono text-[9px] -mt-1" style={{ color: '#332f2a' }}>{homeFmt!.hint}</div>
          )}
        </div>

        {/* Center */}
        <div className="font-display text-[11px] text-muted tracking-[0.14em]">VS</div>

        {/* Away */}
        <div className="flex flex-col items-center gap-[6px] text-center">
          <div
            className="w-[38px] h-[38px] rounded-full grid place-items-center overflow-hidden"
            style={awayPH
              ? { background: 'rgba(10,10,10,0.6)', border: '1px dashed rgba(255,255,255,0.09)' }
              : { background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {awayPH ? (
              <span className="text-[12px]" style={{ color: '#2e2926' }}>?</span>
            ) : awayMeta.iso2 ? (
              <img src={flagUrl(awayMeta.iso2)} alt={awayTeam} style={{ width: '28px', height: '20px', objectFit: 'contain' }} />
            ) : (
              <span className="text-[20px]">{awayMeta.flag}</span>
            )}
          </div>
          <div className="font-extrabold text-[12px] tracking-[-0.01em] leading-tight">
            {awayPH ? (
              <span style={{ color: '#4a453f' }}>{awayFmt!.primary}</span>
            ) : awayTeam}
          </div>
          {awayPH && awayFmt!.hint && (
            <div className="font-mono text-[9px] -mt-1" style={{ color: '#332f2a' }}>{awayFmt!.hint}</div>
          )}
        </div>
      </div>

      {/* Score banner for live/finished */}
      {hasRealScore && (
        <div
          className="flex items-center justify-between mb-2 rounded-[10px] gap-3"
          style={{
            padding: '9px 12px',
            background: 'rgba(255,255,255,.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#9a9a9a',
          }}
        >
          <span className="text-[9px] font-extrabold uppercase tracking-[0.18em]">Resultado final</span>
          <span className="font-display text-[18px] text-white tabular-nums">
            {match.home_score} — {match.away_score}
          </span>
        </div>
      )}

      {/* Score inputs */}
      <div
        className="grid items-center"
        style={{
          gridTemplateColumns: '1fr auto 1fr',
          gap: '8px',
          background: isOpen ? '#0A0A0A' : '#0d0d0d',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          padding: '5px',
        }}
      >
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          value={home}
          disabled={!isOpen}
          onChange={(e) => handleChange('home', e.target.value)}
          placeholder="–"
          aria-label={`Goles ${homeTeam}`}
          className="score w-full h-[40px] text-center bg-transparent border-none text-white outline-none rounded-[8px] transition-all duration-150 font-display text-[24px] tracking-[-0.03em]"
          style={isOpen ? undefined : { cursor: 'not-allowed' }}
          onFocus={(e) => {
            if (isOpen) {
              e.target.style.background = 'rgba(255,107,0,0.12)'
              e.target.style.boxShadow = 'inset 0 0 0 2px #FF6B00'
            }
          }}
          onBlur={(e) => {
            e.target.style.background = 'transparent'
            e.target.style.boxShadow = 'none'
          }}
        />
        <span className="font-display text-[18px] text-[#3a3a3a]">—</span>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          value={away}
          disabled={!isOpen}
          onChange={(e) => handleChange('away', e.target.value)}
          placeholder="–"
          aria-label={`Goles ${awayTeam}`}
          className="score w-full h-[40px] text-center bg-transparent border-none text-white outline-none rounded-[8px] transition-all duration-150 font-display text-[24px] tracking-[-0.03em]"
          style={isOpen ? undefined : { cursor: 'not-allowed' }}
          onFocus={(e) => {
            if (isOpen) {
              e.target.style.background = 'rgba(255,107,0,0.12)'
              e.target.style.boxShadow = 'inset 0 0 0 2px #FF6B00'
            }
          }}
          onBlur={(e) => {
            e.target.style.background = 'transparent'
            e.target.style.boxShadow = 'none'
          }}
        />
      </div>

      {/* Tiebreaker: knockout draw → pick who advances */}
      {isOpen && match.stage !== 'group' && hasPrediction && !homePH && !awayPH && isDrawPred && (
        <div
          className="mt-3 rounded-[10px] px-3 py-3"
          style={{ background: '#0A0A0A', border: '1px solid rgba(255,107,0,0.35)' }}
        >
          <p className="text-[10px] font-extrabold tracking-[0.16em] uppercase text-orange mb-2">
            ¿Quién pasa?
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[homeTeam, awayTeam].map((team) => (
              <button
                key={team}
                onClick={() => onTiebreakerChange(tiebreaker === team ? null : team)}
                className={clsx(
                  'px-2 py-2 rounded-[8px] text-[11px] font-bold truncate transition-all duration-150',
                  tiebreaker === team ? 'bg-orange text-bg' : 'text-muted hover:text-white'
                )}
                style={
                  tiebreaker === team
                    ? {}
                    : { background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)' }
                }
              >
                {team}
              </button>
            ))}
          </div>
        </div>
      )}
    </article>
  )
}

const SPECIALS_STORAGE_KEY = 'prode_specials'

function randomSpecials() {
  const balon = ['Lionel Messi', 'Kylian Mbappe', 'Vinicius Junior', 'Jamal Musiala']
  const bota = ['Kylian Mbappe', 'Harry Kane', 'Erling Haaland', 'Julian Alvarez']
  const guante = ['Emiliano Martinez', 'Thibaut Courtois', 'Alisson Becker', 'Mike Maignan']
  const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)] ?? arr[0] ?? ''
  return { balon: pick(balon), bota: pick(bota), guante: pick(guante) }
}

export function BracketView({
  groupMatches,
  knockoutMatches,
  predMap,
  initialTiebreakerMap = {},
  isAdmin = false,
  groupTiebreakerMap = {},
  readOnly = false,
  clearSignal,
  openRandomModal,
}: Props) {
  const pendingTiebreakers = getPendingGroupTiebreakers(groupMatches, predMap, groupTiebreakerMap)
  const hasPendingTiebreakers = pendingTiebreakers.length > 0
  const bracketLocked = readOnly || hasPendingTiebreakers
  const standings = computeAllStandings(groupMatches, predMap, groupTiebreakerMap)
  const pMap = buildKnockoutMap(knockoutMatches)
  const bestThirdsGroups = computeBestThirdsGroups(groupMatches, predMap, groupTiebreakerMap)
  const thirdSlotAssignment = bestThirdsGroups.size > 0 ? assignBestThirdsToSlots(bestThirdsGroups) : {}

  // Local inputs: matchId → { home, away } (starts from predMap)
  const [localInputs, setLocalInputs] = useState<LocalInputs>(() => {
    const init: LocalInputs = {}
    for (const m of knockoutMatches) {
      const pred = predMap[m.id]
      init[m.id] = {
        home: pred?.home_score?.toString() ?? '',
        away: pred?.away_score?.toString() ?? '',
      }
    }
    return init
  })

  const [tiebreakerMap, setTiebreakerMap] = useState<Record<string, string>>(initialTiebreakerMap)
  const [adminSaveState, setAdminSaveState] = useState<AdminLoadState>('idle')
  const [adminSaveError, setAdminSaveError] = useState<string | null>(null)
  const [adminSaveMessage, setAdminSaveMessage] = useState<string | null>(null)
  const [bracketSaveError, setBracketSaveError] = useState(false)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!clearSignal?.version) return
    const stagesToClear = new Set(clearSignal.stages)
    setLocalInputs((prev) => {
      const next = { ...prev }
      for (const match of knockoutMatches) {
        if (!stagesToClear.has(match.stage)) continue
        next[match.id] = { home: '', away: '' }
      }
      return next
    })
    setTiebreakerMap((prev) => {
      const next = { ...prev }
      for (const match of knockoutMatches) {
        if (stagesToClear.has(match.stage)) delete next[match.id]
      }
      return next
    })
  }, [clearSignal?.version, clearSignal?.stages, knockoutMatches])

  useEffect(() => {
    if (bracketLocked) return
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      const now = new Date()
      const predictions = knockoutMatches
        .map((m) => {
          if (m.status !== 'upcoming' || now >= new Date(m.locked_at)) return null
          const inp = localInputs[m.id]
          if (!inp || inp.home === '' || inp.away === '') return null
          const h = parseScoreInput(inp.home)
          const a = parseScoreInput(inp.away)
          if (h == null || a == null) return null
          return { matchId: m.id, homeScore: h, awayScore: a, tiebreakerTeam: tiebreakerMap[m.id] ?? null }
        })
        .filter((p): p is NonNullable<typeof p> => p !== null)
      if (!predictions.length) return
      try {
        await upsertPredictionsBatch(predictions)
        setBracketSaveError(false)
      } catch (err) {
        console.error('[BracketView] autosave failed:', err)
        setBracketSaveError(true)
      }
    }, 800)
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localInputs, tiebreakerMap, bracketLocked])

  // Effective predMap merges saved predictions with locally entered values
  const effectivePredMap: PredMap = { ...predMap }
  const clearedStages = new Set(clearSignal?.stages ?? [])
  for (const match of knockoutMatches) {
    if (clearedStages.has(match.stage)) delete effectivePredMap[match.id]
  }
  for (const [matchId, { home, away }] of Object.entries(localInputs)) {
    if (home !== '' && away !== '') {
      const h = parseScoreInput(home)
      const a = parseScoreInput(away)
      if (h != null && a != null) {
        effectivePredMap[matchId] = { home_score: h, away_score: a }
      }
    }
  }

  function handleValuesChange(matchId: string, home: string, away: string) {
    setLocalInputs((prev) => ({ ...prev, [matchId]: { home, away } }))
  }

  function handleTiebreaker(matchId: string, team: string | null) {
    setTiebreakerMap((prev) => {
      if (!team) {
        const { [matchId]: _removed, ...rest } = prev
        return rest
      }
      return { ...prev, [matchId]: team }
    })
  }

  const byRound: Record<string, Match[]> = {}
  for (const m of knockoutMatches) {
    const key = m.stage
    if (!byRound[key]) byRound[key] = []
    byRound[key].push(m)
  }

  const availableRounds = ROUND_ORDER.filter((r) => byRound[r]?.length)
  const [activeRound, setActiveRound] = useState(availableRounds[0] ?? 'round_of_32')
  const [randomModalOpen, setRandomModalOpen] = useState(false)
  const [adminSelectedRounds, setAdminSelectedRounds] = useState<Set<RoundKey>>(() => new Set())

  const now = new Date()

  function resolve(placeholder: string): string {
    if (bracketLocked) return placeholder
    return resolveTeamFull(placeholder, standings, pMap, effectivePredMap, tiebreakerMap, 0, bestThirdsGroups, thirdSlotAssignment)
  }

  function getResolvedTeams(match: Match) {
    const homeTeam = resolveTeamFull(match.home_team, standings, pMap, effectivePredMap, tiebreakerMap, 0, bestThirdsGroups, thirdSlotAssignment)
    const awayTeam = resolveTeamFull(match.away_team, standings, pMap, effectivePredMap, tiebreakerMap, 0, bestThirdsGroups, thirdSlotAssignment)
    return { homeTeam, awayTeam }
  }

  function isMatchReady(match: Match) {
    if (bracketLocked) return false
    const { homeTeam, awayTeam } = getResolvedTeams(match)
    return !isPlaceholder(homeTeam) && !isPlaceholder(awayTeam)
  }

  function getAdminEligibleMatches(round?: RoundKey) {
    if (bracketLocked) return []
    return knockoutMatches.filter((match) => {
      const key = match.stage
      if (round && key !== round) return false
      if (match.status !== 'upcoming' || now >= new Date(match.locked_at)) return false
      return isMatchReady(match)
    })
  }

  function toggleAdminRound(round: RoundKey) {
    setAdminSelectedRounds((prev) => {
      const next = new Set(prev)
      if (next.has(round)) next.delete(round)
      else next.add(round)
      return next
    })
    setAdminSaveState('idle')
    setAdminSaveError(null)
  }

  function selectAllEligibleRounds() {
    setAdminSelectedRounds(new Set(adminEligibleByRound.filter(({ count }) => count > 0).map(({ round }) => round)))
    setAdminSaveState('idle')
    setAdminSaveError(null)
  }

  async function handleAdminRandomKnockout(rounds: RoundKey[]) {
    const targetMatches = rounds.length
      ? rounds.flatMap((round) => getAdminEligibleMatches(round))
      : getAdminEligibleMatches()
    if (!targetMatches.length) return
    setAdminSaveState('saving')
    setAdminSaveError(null)
    setAdminSaveMessage(null)
    try {
      const generated = await generateRandomKnockoutPredictions(targetMatches.map((m) => m.id))
      setLocalInputs((prev) => {
        const next = { ...prev }
        for (const pred of generated) {
          next[pred.matchId] = {
            home: String(pred.homeScore),
            away: String(pred.awayScore),
          }
        }
        return next
      })
      setAdminSaveMessage('Pronosticos de eliminatorias disponibles cargados correctamente.')
      setAdminSaveState('saved')
      setAdminSelectedRounds(new Set())
      setRandomModalOpen(false)
      setTimeout(() => setAdminSaveState('idle'), 1800)
    } catch (error) {
      const message = formatClientError(error)
      console.error('Error al cargar pronóstico aleatorio de eliminatorias', error)
      setAdminSaveError(message)
      setAdminSaveState('error')
    }
  }

  function handleAdminRandomSpecials() {
    try {
      const next = randomSpecials()
      localStorage.setItem(SPECIALS_STORAGE_KEY, JSON.stringify(next))
      window.dispatchEvent(new Event('prode-specials-randomized'))
      setAdminSaveError(null)
      setAdminSaveMessage('Apuestas especiales de prueba cargadas correctamente.')
      setAdminSaveState('saved')
      setTimeout(() => setAdminSaveState('idle'), 1800)
    } catch (error) {
      const message = formatClientError(error)
      console.error('Error al cargar apuestas especiales', error)
      setAdminSaveError(message)
      setAdminSaveState('error')
    }
  }

  const visibleRounds = availableRounds
  const currentRoundIdx = visibleRounds.indexOf(activeRound as RoundKey)
  const prevRound = currentRoundIdx > 0 ? visibleRounds[currentRoundIdx - 1] : null
  const nextRound = currentRoundIdx < visibleRounds.length - 1 ? visibleRounds[currentRoundIdx + 1] : null

  const matchesTopRef = useRef<HTMLDivElement>(null)
  const prevRoundRef = useRef(activeRound)

  useEffect(() => {
    if (availableRounds.length && !availableRounds.includes(activeRound as RoundKey)) {
      setActiveRound(visibleRounds[0])
    }
  }, [activeRound, availableRounds, visibleRounds])

  useEffect(() => {
    if (activeRound !== prevRoundRef.current) {
      prevRoundRef.current = activeRound
      matchesTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [activeRound])

  useEffect(() => {
    if (openRandomModal) setRandomModalOpen(true)
  }, [openRandomModal])

  const adminEligibleByRound = availableRounds
    .map((round) => ({ round, count: getAdminEligibleMatches(round).length }))
  const adminAllEligibleCount = getAdminEligibleMatches().length

  const selectedAdminCount = [...adminSelectedRounds].reduce(
    (total, round) => total + getAdminEligibleMatches(round).length,
    0
  )

  const canLoadSelectedRounds = selectedAdminCount > 0 && adminSaveState !== 'saving'

  return (
    <div className="space-y-6">
      {bracketLocked && (
        <div
          className="flex items-start gap-3 px-5 py-4 text-sm"
          style={{ background: '#131313', border: '1px solid #272727', borderRadius: '16px' }}
        >
          <span className="mt-0.5 shrink-0" style={{ color: hasPendingTiebreakers ? '#FF6B00' : '#7A5BC9' }}>
            {hasPendingTiebreakers
              ? <AlertTriangle size={16} strokeWidth={2.5} />
              : <Lock size={16} strokeWidth={2.5} />}
          </span>
          <div>
            {hasPendingTiebreakers ? (
              <>
                <p className="font-extrabold text-white leading-snug">Desempates pendientes en grupos</p>
                <p className="text-[13px] mt-0.5 text-muted">Resolvé los desempates para que el bracket se arme correctamente.</p>
              </>
            ) : (
              <>
                <p className="font-extrabold text-white leading-snug">Bracket en modo exploración</p>
                <p className="text-[13px] mt-0.5 text-muted">Completá todos los partidos de grupos para habilitar el guardado de pronósticos.</p>
              </>
            )}
          </div>
        </div>
      )}

      {isAdmin && (adminSaveState === 'saved' || adminSaveState === 'error') && (
        <p className="text-[12px] font-bold px-1" style={{ color: adminSaveState === 'error' ? '#FF6B6B' : '#A8F0D8' }}>
          {adminSaveState === 'error' ? `Error: ${adminSaveError}` : (adminSaveMessage ?? 'Cargado correctamente.')}
        </p>
      )}

      {randomModalOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto"
          style={{ background: 'rgba(0,0,0,0.72)' }}
          role="dialog"
          aria-modal="true"
          aria-label="Cargar pronosticos aleatorios"
        >
          <div className="flex min-h-full items-start min-[540px]:items-center justify-center px-4 py-8">
          <div
            className="w-full max-w-[560px] overflow-hidden"
            style={{ background: '#101010', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, boxShadow: '0 24px 80px rgba(0,0,0,0.45)' }}
          >
            <div className="flex items-start justify-between gap-4 px-6 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div>
                <p className="text-[11px] font-extrabold tracking-[0.18em] uppercase" style={{ color: '#FF6B00' }}>
                  Herramienta admin
                </p>
                <h2 className="mt-1 text-[22px] font-extrabold text-white">Cargar aleatorios</h2>
                <p className="mt-1 text-[13px] text-muted">
                  Elegi fases con cruces disponibles. No se cargan apuestas especiales desde este modal.
                </p>
              </div>
              <button
                onClick={() => setRandomModalOpen(false)}
                disabled={adminSaveState === 'saving'}
                className="grid h-9 w-9 place-items-center rounded-full text-[18px] font-bold disabled:opacity-40"
                style={{ background: '#181818', color: '#8A8A8A', border: '1px solid rgba(255,255,255,0.08)' }}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <div className="px-6 pt-5">
              <button
                onClick={selectAllEligibleRounds}
                disabled={adminSaveState === 'saving' || adminAllEligibleCount === 0}
                className="w-full rounded-[12px] px-4 py-3 text-[13px] font-extrabold uppercase disabled:opacity-40"
                style={{ background: 'rgba(255,107,0,0.14)', color: '#fff', border: '1px solid rgba(255,107,0,0.45)' }}
              >
                Marcar todas las disponibles ({adminAllEligibleCount})
              </button>
            </div>

            <div className="grid gap-2 px-6 py-5 sm:grid-cols-2">
              {adminEligibleByRound.map(({ round, count }) => {
                const checked = adminSelectedRounds.has(round)
                const disabled = count === 0 || adminSaveState === 'saving'
                return (
                  <label
                    key={round}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-[12px] px-3 py-3 text-[13px] font-bold transition-all duration-150"
                    style={{
                      background: checked ? 'rgba(255,107,0,0.14)' : '#151515',
                      color: disabled ? '#6f6f6f' : checked ? '#fff' : '#cfcfcf',
                      border: checked ? '1px solid rgba(255,107,0,0.45)' : '1px solid rgba(255,255,255,0.07)',
                    }}
                  >
                    <span className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => toggleAdminRound(round)}
                        className="h-4 w-4 accent-[#FF6B00]"
                      />
                      <span>{ROUND_LABELS[round]}</span>
                    </span>
                    <span className="font-mono text-[11px] text-muted">{count}</span>
                  </label>
                )
              })}
            </div>

            {adminSaveState === 'error' && adminSaveError && (
              <div className="mx-6 mb-4 rounded-[12px] px-4 py-3 text-[13px] font-bold"
                style={{ background: 'rgba(255,59,59,0.12)', color: '#FF6B6B', border: '1px solid rgba(255,59,59,0.25)' }}
              >
                Error real: {adminSaveError}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2 px-6 py-5" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <button
                onClick={() => setRandomModalOpen(false)}
                disabled={adminSaveState === 'saving'}
                className="px-4 py-2 rounded-full text-[12px] font-extrabold uppercase text-muted disabled:opacity-40"
                style={{ background: '#181818', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                Cerrar
              </button>
              <button
                onClick={() => handleAdminRandomKnockout([...adminSelectedRounds])}
                disabled={!canLoadSelectedRounds}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-extrabold uppercase disabled:opacity-40"
                style={{ background: '#FF6B00', color: '#0A0A0A', border: '1px solid rgba(255,107,0,0.35)' }}
              >
                <Shuffle size={15} strokeWidth={2.5} />
                {adminSaveState === 'saving' ? 'Cargando...' : `Cargar seleccion (${selectedAdminCount})`}
              </button>
            </div>
          </div>
          </div>
        </div>
      )}
      {bracketSaveError && (
        <div
          className="px-5 py-3 text-sm font-bold"
          style={{ background: 'rgba(255,59,59,0.08)', border: '1px solid rgba(255,59,59,0.25)', borderRadius: '16px', color: '#FF8585' }}
        >
          Error al guardar. Revisá tu conexión y volvé a intentarlo.
        </div>
      )}

      {/* Combo row — dropdown + arrows */}
      <div className="flex items-end gap-2" style={{ minWidth: 0 }}>
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <label className="text-[11px] font-extrabold tracking-[0.22em] uppercase text-muted">
            Seleccioná la fase
          </label>
          <div
            className="relative transition-[border-color,background] duration-150"
            style={{
              background: '#141414',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '14px',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = 'rgba(255,255,255,.18)'
              el.style.background = '#1C1C1C'
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = 'rgba(255,255,255,.08)'
              el.style.background = '#141414'
            }}
          >
            <select
              value={activeRound}
              onChange={(e) => setActiveRound(e.target.value as RoundKey)}
              className="w-full bg-transparent text-white font-extrabold text-[15px] outline-none cursor-pointer"
              style={{
                appearance: 'none',
                WebkitAppearance: 'none',
                padding: '11px 44px 11px 14px',
                border: 'none',
              }}
            >
              {visibleRounds.map((round) => (
                <option key={round} value={round} style={{ background: '#000', color: '#fff', fontWeight: 700 }}>
                  {ROUND_LABELS[round]}
                </option>
              ))}
            </select>
            <svg
              className="absolute right-[14px] top-1/2 -translate-y-1/2 pointer-events-none text-muted"
              width="15" height="15" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => prevRound && setActiveRound(prevRound)}
            disabled={!prevRound}
            className="grid place-items-center transition-all duration-150"
            style={{
              width: 44, height: 44,
              background: prevRound ? '#141414' : '#0d0d0d',
              border: `1px solid ${prevRound ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)'}`,
              borderRadius: 12,
              color: prevRound ? '#cfcfcf' : '#282828',
              cursor: prevRound ? 'pointer' : 'default',
            }}
            aria-label="Fase anterior"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            onClick={() => nextRound && setActiveRound(nextRound)}
            disabled={!nextRound}
            className="grid place-items-center transition-all duration-150"
            style={{
              width: 44, height: 44,
              background: nextRound ? '#141414' : '#0d0d0d',
              border: `1px solid ${nextRound ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)'}`,
              borderRadius: 12,
              color: nextRound ? '#cfcfcf' : '#282828',
              cursor: nextRound ? 'pointer' : 'default',
            }}
            aria-label="Fase siguiente"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Scroll anchor */}
      <div ref={matchesTopRef} style={{ scrollMarginTop: '80px' }} />

      {/* Round context line */}
      {ROUND_CONTEXT[activeRound] && (
        <p className="text-[11px] font-medium tracking-[0.03em] px-1" style={{ color: '#3e3a35' }}>
          {ROUND_CONTEXT[activeRound]}
        </p>
      )}

      {/* Mejores terceros info panel — only for round_of_32 */}
      {activeRound === 'round_of_32' && (
        <div
          className="flex items-start gap-3 px-4 py-3 rounded-[12px]"
          style={{ background: '#0e0e0e', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <svg className="mt-0.5 shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3e3a35" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          <div>
            <p className="text-[11px] font-bold leading-snug" style={{ color: '#5a5450' }}>Mejores terceros</p>
            <p className="text-[11px] mt-0.5 leading-snug" style={{ color: '#3e3a35' }}>
              Los 8 mejores terceros de los 12 grupos clasifican. Su posición en el bracket depende de qué grupos los producen.
            </p>
          </div>
        </div>
      )}

      {/* Main round matches — non-final rounds */}
      {activeRound !== 'final' && (
        <div className="grid grid-cols-1 min-[720px]:grid-cols-2 min-[1100px]:grid-cols-3 gap-4">
          {(byRound[activeRound] ?? [])
            .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
            .map((match) => (
              <BracketMatchCard
                key={match.id}
                match={match}
                homeTeam={resolve(match.home_team)}
                awayTeam={resolve(match.away_team)}
                initialHome={localInputs[match.id]?.home ?? ''}
                initialAway={localInputs[match.id]?.away ?? ''}
                tiebreaker={tiebreakerMap[match.id]}
                disabled={bracketLocked}
                onValuesChange={(home, away) => handleValuesChange(match.id, home, away)}
                onTiebreakerChange={(team) => handleTiebreaker(match.id, team)}
              />
            ))}
        </div>
      )}

      {/* Final round: Final + 3er Puesto */}
      {activeRound === 'final' && (
        <div className="grid grid-cols-1 min-[720px]:grid-cols-2 gap-4">
          {(byRound['final'] ?? [])
            .sort((a, b) => {
              if (a.stage === 'third_place' && b.stage !== 'third_place') return 1
              if (b.stage === 'third_place' && a.stage !== 'third_place') return -1
              return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
            })
            .map((match) => (
              <BracketMatchCard
                key={match.id}
                match={match}
                homeTeam={resolve(match.home_team)}
                awayTeam={resolve(match.away_team)}
                initialHome={localInputs[match.id]?.home ?? ''}
                initialAway={localInputs[match.id]?.away ?? ''}
                tiebreaker={tiebreakerMap[match.id]}
                disabled={bracketLocked}
                onValuesChange={(home, away) => handleValuesChange(match.id, home, away)}
                onTiebreakerChange={(team) => handleTiebreaker(match.id, team)}
              />
            ))}
        </div>
      )}

    </div>
  )
}

'use client'

import { useState, useRef, useEffect } from 'react'
import clsx from 'clsx'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Shuffle } from 'lucide-react'
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
  const isClosed = match.status === 'upcoming' && now >= lockedAt
  const isLive = match.status === 'live'
  const isFinished = match.status === 'finished'
  const isScored = isLive || isFinished
  const stripKey = isOpen ? 'open' : isClosed ? 'closed' : match.status

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

  const stageLabel = ROUND_LABELS[match.stage] ?? match.stage
  const kickoffStr = format(new Date(match.scheduled_at), 'EEE d MMM · HH:mm', { locale: es })
  const closeStr = format(lockedAt, 'HH:mm', { locale: es })
  const hasPrediction = home !== '' && away !== ''
  const isDrawPred = hasPrediction && Number(home) === Number(away)

  return (
    <article
      className="relative bg-panel overflow-hidden transition-all duration-200 hover:-translate-y-[3px]"
      style={{
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '24px',
        padding: '22px 22px 20px',
      }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.18)')
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)')
      }
    >
      {/* Left status strip */}
      <span
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-[24px]"
        style={{ background: STRIP_COLOR[stripKey] ?? '#3a3a3a' }}
      />

      {/* Top row */}
      <div className="flex items-center justify-between mb-4 text-[12px]">
        <div className="flex items-center gap-[10px] text-muted font-bold tracking-[0.06em] uppercase text-[11px]">
          <span
            className="text-white text-[10px] px-2 py-1 rounded-[6px]"
            style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {stageLabel}
          </span>
          <span>{kickoffStr}</span>
        </div>
        <StatusBadge match={match} />
      </div>

      {/* Teams */}
      <div
        className="grid gap-3 items-center mb-4"
        style={{ gridTemplateColumns: '1fr auto 1fr' }}
      >
        {/* Home */}
        <div className="flex flex-col items-center gap-[10px] text-center">
          <div
            className="w-14 h-14 rounded-full grid place-items-center overflow-hidden"
            style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {homePH ? (
              <span className="text-[16px] text-[#3a3630]">?</span>
            ) : homeMeta.iso2 ? (
              <img src={flagUrl(homeMeta.iso2)} alt={homeTeam} style={{ width: '38px', height: '26px', objectFit: 'contain' }} />
            ) : (
              <span className="text-[28px]">{homeMeta.flag}</span>
            )}
          </div>
          <div>
            <div
              className={clsx(
                'font-extrabold tracking-[-0.01em] leading-tight',
                homePH ? 'text-[11px] text-[#3a3630] italic' : 'text-[15px]'
              )}
            >
              {homeTeam}
            </div>
            {!homePH && (
              <div className="font-mono text-[10px] text-muted tracking-[0.2em] mt-0.5">
                {homeMeta.code}
              </div>
            )}
          </div>
        </div>

        {/* Center */}
        <div className="font-display text-[14px] text-muted tracking-[0.18em]">
          {isScored ? `${match.home_score} — ${match.away_score}` : 'VS'}
        </div>

        {/* Away */}
        <div className="flex flex-col items-center gap-[10px] text-center">
          <div
            className="w-14 h-14 rounded-full grid place-items-center overflow-hidden"
            style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {awayPH ? (
              <span className="text-[16px] text-[#3a3630]">?</span>
            ) : awayMeta.iso2 ? (
              <img src={flagUrl(awayMeta.iso2)} alt={awayTeam} style={{ width: '38px', height: '26px', objectFit: 'contain' }} />
            ) : (
              <span className="text-[28px]">{awayMeta.flag}</span>
            )}
          </div>
          <div>
            <div
              className={clsx(
                'font-extrabold tracking-[-0.01em] leading-tight',
                awayPH ? 'text-[11px] text-[#3a3630] italic' : 'text-[15px]'
              )}
            >
              {awayTeam}
            </div>
            {!awayPH && (
              <div className="font-mono text-[10px] text-muted tracking-[0.2em] mt-0.5">
                {awayMeta.code}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Score inputs */}
      <div
        className="grid items-center"
        style={{
          gridTemplateColumns: '1fr auto 1fr',
          gap: '10px',
          background: isOpen ? '#0A0A0A' : '#0d0d0d',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          padding: '10px',
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
          className="score w-full h-[54px] text-center bg-transparent border-none text-white outline-none rounded-[10px] transition-all duration-150 font-display text-[34px] tracking-[-0.03em]"
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
        <span className="font-display text-[24px] text-[#3a3a3a]">—</span>
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
          className="score w-full h-[54px] text-center bg-transparent border-none text-white outline-none rounded-[10px] transition-all duration-150 font-display text-[34px] tracking-[-0.03em]"
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
          className="mt-3 rounded-[14px] px-3 py-3"
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

      {/* Bottom row */}
      <div className="mt-3 flex items-center justify-between gap-[10px] text-[12px]">
        <span className="text-muted font-semibold">
          {isClosed && <span>Pronóstico bloqueado</span>}
          {isLive && match.home_score != null && (
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted">
              En vivo:{' '}
              <b className="font-display text-[13px] text-white tracking-[0.04em]">
                {match.home_score} — {match.away_score}
              </b>
            </span>
          )}
          {isFinished && match.home_score != null && (
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted">
              Final:{' '}
              <b className="font-display text-[13px] text-white tracking-[0.04em]">
                {match.home_score} — {match.away_score}
              </b>
            </span>
          )}
        </span>
        {isOpen && (
          <span className="text-muted font-semibold shrink-0">Cierra {closeStr}</span>
        )}
      </div>
    </article>
  )
}

const SPECIALS_STORAGE_KEY = 'prode_specials'

const SPECIALS_ITEMS = [
  { key: 'balon', label: 'Balón de Oro', desc: 'Mejor jugador del torneo', pts: '+20', color: '#5B2D8E' },
  { key: 'bota',  label: 'Bota de Oro',  desc: 'Máximo goleador del torneo', pts: '+15', color: '#FF6B00' },
  { key: 'guante', label: 'Guante de Oro', desc: 'Mejor arquero del torneo', pts: '+15', color: '#1565C0' },
] as const

type SpecialsKey = typeof SPECIALS_ITEMS[number]['key']
type SpecialsValues = Record<SpecialsKey, string>

const SPECIALS_TEST_VALUES: Record<SpecialsKey, string[]> = {
  balon: ['Lionel Messi', 'Kylian Mbappe', 'Vinicius Junior', 'Jamal Musiala'],
  bota: ['Kylian Mbappe', 'Harry Kane', 'Erling Haaland', 'Julian Alvarez'],
  guante: ['Emiliano Martinez', 'Thibaut Courtois', 'Alisson Becker', 'Mike Maignan'],
}

function pickRandom(values: string[]) {
  return values[Math.floor(Math.random() * values.length)] ?? values[0] ?? ''
}

function randomSpecials(): SpecialsValues {
  return {
    balon: pickRandom(SPECIALS_TEST_VALUES.balon),
    bota: pickRandom(SPECIALS_TEST_VALUES.bota),
    guante: pickRandom(SPECIALS_TEST_VALUES.guante),
  }
}

function onlyLetters(value: string) {
  // Allow letters (including accented), spaces — strip everything else
  return value.replace(/[^a-zA-ZÀ-ÿ\s]/g, '')
}

function SpecialsCard() {
  const [values, setValues] = useState<SpecialsValues>({ balon: '', bota: '', guante: '' })
  const [saved, setSaved] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SPECIALS_STORAGE_KEY)
      if (stored) setValues(JSON.parse(stored))
    } catch {}
  }, [])

  useEffect(() => {
    function handleClear() {
      setValues({ balon: '', bota: '', guante: '' })
      setSaved(false)
    }
    function handleRandomize() {
      try {
        const stored = localStorage.getItem(SPECIALS_STORAGE_KEY)
        setValues(stored ? JSON.parse(stored) : randomSpecials())
      } catch {
        setValues(randomSpecials())
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 1800)
    }
    window.addEventListener('prode-specials-cleared', handleClear)
    window.addEventListener('prode-specials-randomized', handleRandomize)
    return () => {
      window.removeEventListener('prode-specials-cleared', handleClear)
      window.removeEventListener('prode-specials-randomized', handleRandomize)
    }
  }, [])

  function handleChange(key: SpecialsKey, raw: string) {
    const cleaned = onlyLetters(raw)
    const next = { ...values, [key]: cleaned }
    setValues(next)
    setSaved(false)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      try { localStorage.setItem(SPECIALS_STORAGE_KEY, JSON.stringify(next)) } catch {}
      setSaved(true)
      setTimeout(() => setSaved(false), 1800)
    }, 600)
  }

  return (
    <div
      className="relative flex flex-col overflow-hidden"
      style={{
        background: 'linear-gradient(145deg, rgba(91,45,142,0.16) 0%, rgba(91,45,142,0.05) 100%)',
        border: '1px solid rgba(168,140,220,0.22)',
        borderRadius: 24,
        padding: '22px 22px 20px',
      }}
    >
      <span
        className="absolute left-0 top-0 bottom-0 rounded-l-[24px]"
        style={{ width: 4, background: '#5B2D8E' }}
      />
      <div className="flex items-center justify-between mb-4">
        <span
          className="text-[10px] px-2 py-1 rounded-[6px] font-bold"
          style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)', color: '#c8a8f0' }}
        >
          Apuesta Especial
        </span>
        <span className="font-mono text-[11px] font-bold tracking-[0.06em]" style={{ color: saved ? '#A8F0D8' : '#5a4a6a' }}>
          {saved ? 'Guardado ✓' : 'hasta +50 pts'}
        </span>
      </div>
      <div className="flex flex-col gap-2.5 flex-1">
        {SPECIALS_ITEMS.map(({ key, label, desc, pts, color }) => (
          <div
            key={key}
            className="flex flex-col gap-1.5 px-3 pt-[10px] pb-[10px] rounded-[12px]"
            style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${color}33` }}
          >
            <div className="flex items-center gap-3">
              <div className="w-[3px] h-5 rounded-full shrink-0" style={{ background: color }} />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-bold leading-tight">{label}</p>
                <p className="text-[10px] font-medium" style={{ color: '#4a4a5a' }}>{desc}</p>
              </div>
              <span className="font-display text-[20px] shrink-0 leading-none" style={{ color }}>{pts}</span>
            </div>
            <input
              type="text"
              value={values[key]}
              onChange={(e) => handleChange(key, e.target.value)}
              placeholder="Escribí el jugador..."
              maxLength={40}
              className="w-full bg-transparent outline-none font-medium text-[13px] text-white placeholder:text-[#3a3a4a] rounded-[8px] transition-all duration-150"
              style={{
                padding: '7px 10px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
              onFocus={(e) => {
                e.target.style.background = `${color}18`
                e.target.style.borderColor = `${color}66`
              }}
              onBlur={(e) => {
                e.target.style.background = 'rgba(255,255,255,0.04)'
                e.target.style.borderColor = 'rgba(255,255,255,0.08)'
              }}
            />
          </div>
        ))}
      </div>
    </div>
  )
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

  useEffect(() => {
    if (availableRounds.length && !availableRounds.includes(activeRound as RoundKey)) {
      setActiveRound(visibleRounds[0])
    }
  }, [activeRound, availableRounds, visibleRounds])

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
          className="px-5 py-4 text-sm"
          style={{ background: '#131313', border: '1px solid #272727', borderRadius: '16px' }}
        >
          {hasPendingTiebreakers ? (
            <span className="font-extrabold text-white">Hay desempates pendientes. Resolvelos para armar eliminatorias.</span>
          ) : (
            <>
              <span className="font-extrabold text-white">Podés explorar el bracket, pero no guardar pronósticos.</span>
              <span className="text-muted"> Completá todos los partidos de grupos para habilitar el guardado.</span>
            </>
          )}
        </div>
      )}

      {isAdmin && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm"
          style={{ background: '#101010', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px' }}
        >
          <div>
            <p className="font-extrabold text-white">Herramienta admin eliminatorias</p>
            <p className="text-muted">
              {adminSaveState === 'saved'
                ? adminSaveMessage ?? 'Pronósticos cargados correctamente.'
                : adminSaveState === 'error' && adminSaveError
                ? `Error real: ${adminSaveError}`
                : 'Carga pronosticos aleatorios solo para eliminatorias disponibles. Apuestas especiales es una carga de prueba separada.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setRandomModalOpen(true)
                setAdminSaveState('idle')
                setAdminSaveError(null)
              }}
              disabled={adminSaveState === 'saving' || adminAllEligibleCount === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-extrabold uppercase disabled:opacity-40"
              style={{ background: '#FF6B00', color: '#0A0A0A', border: '1px solid rgba(255,107,0,0.35)' }}
            >
              <Shuffle size={15} strokeWidth={2.5} />
              Cargar aleatorios
            </button>
            <button
              onClick={handleAdminRandomSpecials}
              disabled={adminSaveState === 'saving'}
              className="px-4 py-2 rounded-full text-[12px] font-extrabold uppercase disabled:opacity-40"
              style={{ background: '#181818', color: '#c8a8f0', border: '1px solid rgba(168,140,220,0.22)' }}
            >
              Cargar apuestas especiales
            </button>
          </div>
        </div>
      )}

      {randomModalOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center px-4 py-8"
          style={{ background: 'rgba(0,0,0,0.72)' }}
          role="dialog"
          aria-modal="true"
          aria-label="Cargar pronosticos aleatorios"
        >
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
      )}
      {bracketSaveError && (
        <div
          className="px-5 py-3 text-sm font-bold"
          style={{ background: 'rgba(255,59,59,0.08)', border: '1px solid rgba(255,59,59,0.25)', borderRadius: '16px', color: '#FF8585' }}
        >
          Error al guardar. Revisá tu conexión y volvé a intentarlo.
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {visibleRounds.map((round) => (
          <button
            key={round}
            onClick={() => setActiveRound(round)}
            className={clsx(
              'px-4 py-2 rounded-full text-[12px] font-extrabold tracking-[0.08em] uppercase transition-all duration-150',
              activeRound === round
                ? 'bg-[#c8a84a] text-[#0a0a0a]'
                : 'text-[#7a7266] hover:text-[#ede8dc]'
            )}
            style={
              activeRound === round
                ? { boxShadow: '0 6px 18px -8px rgba(200,168,74,.5)' }
                : { background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }
            }
          >
            {ROUND_LABELS[round]}
          </button>
        ))}
      </div>

      {/* Main round matches — non-final rounds */}
      {activeRound !== 'final' && (
        <div className="grid grid-cols-1 min-[600px]:grid-cols-2 min-[960px]:grid-cols-3 min-[1200px]:grid-cols-4 gap-4">
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

      {/* Final round: Final + 3er Puesto + Apuesta Especial — misma altura */}
      {activeRound === 'final' && (
        <div className="grid grid-cols-1 min-[600px]:grid-cols-2 min-[960px]:grid-cols-3 gap-4 items-stretch">
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
          <SpecialsCard />
        </div>
      )}

    </div>
  )
}

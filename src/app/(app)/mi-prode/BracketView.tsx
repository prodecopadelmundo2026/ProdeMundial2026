'use client'

import { useRef, useState, useTransition } from 'react'
import clsx from 'clsx'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Match } from '@/types'
import { getTeam, flagUrl } from '@/lib/teams'
import { StatusBadge } from '@/components/StatusBadge'
import { upsertPrediction } from '@/app/(app)/fixture/actions'
import { computeAllStandings, buildKnockoutMap, resolveTeamFull } from '@/lib/bracket'

type PredMap = Record<string, { home_score: number; away_score: number }>

interface Props {
  groupMatches: Match[]
  knockoutMatches: Match[]
  predMap: PredMap
}

const ROUND_ORDER = ['round_of_32', 'round_of_16', 'quarter', 'semi', 'final'] as const
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
  pred,
}: {
  match: Match
  homeTeam: string
  awayTeam: string
  pred?: { home_score: number; away_score: number }
}) {
  const now = new Date()
  const lockedAt = new Date(match.locked_at)
  const isOpen = match.status === 'upcoming' && now < lockedAt
  const isClosed = match.status === 'upcoming' && now >= lockedAt
  const isLive = match.status === 'live'
  const isFinished = match.status === 'finished'
  const isScored = isLive || isFinished
  const stripKey = isOpen ? 'open' : isClosed ? 'closed' : match.status

  const [home, setHome] = useState(pred?.home_score?.toString() ?? '')
  const [away, setAway] = useState(pred?.away_score?.toString() ?? '')
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    pred ? 'saved' : 'idle'
  )
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [, startTransition] = useTransition()

  function doSave(h: string, a: string) {
    const hNum = parseInt(h, 10)
    const aNum = parseInt(a, 10)
    if (isNaN(hNum) || isNaN(aNum) || hNum < 0 || aNum < 0) return
    setSaveState('saving')
    startTransition(async () => {
      try {
        await upsertPrediction(match.id, hNum, aNum)
        setSaveState('saved')
      } catch {
        setSaveState('error')
      }
    })
  }

  function handleChange(field: 'home' | 'away', val: string) {
    if (!isOpen) return
    if (field === 'home') setHome(val)
    else setAway(val)
    const h = field === 'home' ? val : home
    const a = field === 'away' ? val : away
    setSaveState('idle')
    if (timerRef.current) clearTimeout(timerRef.current)
    if (h !== '' && a !== '') {
      timerRef.current = setTimeout(() => doSave(h, a), 500)
    }
  }

  const homeMeta = getTeam(homeTeam)
  const awayMeta = getTeam(awayTeam)
  const homePH = isPlaceholder(homeTeam)
  const awayPH = isPlaceholder(awayTeam)

  const stageLabel = ROUND_LABELS[match.stage] ?? match.stage
  const kickoffStr = format(new Date(match.scheduled_at), 'EEE d MMM · HH:mm', { locale: es })
  const closeStr = format(lockedAt, 'HH:mm', { locale: es })
  const hasPrediction = home !== '' && away !== ''

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
      <div className="flex items-center justify-between mb-[18px] text-[12px]">
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
        className="grid gap-[14px] items-center mb-[18px]"
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
          type="number"
          inputMode="numeric"
          min={0}
          max={20}
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
          type="number"
          inputMode="numeric"
          min={0}
          max={20}
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

      {/* Bottom row */}
      <div className="mt-[14px] flex items-center justify-between gap-[10px] text-[12px]">
        <span className="text-muted font-semibold">
          {isOpen && saveState === 'idle' && !hasPrediction && (
            <span className="text-orange">Falta cargar</span>
          )}
          {isOpen && saveState === 'idle' && hasPrediction && (
            <span>Pronóstico cargado</span>
          )}
          {isOpen && saveState === 'saving' && <span>Guardando...</span>}
          {isOpen && saveState === 'saved' && <span>Guardado</span>}
          {isOpen && saveState === 'error' && (
            <span className="text-[#FF6B6B]">Error al guardar</span>
          )}
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

export function BracketView({ groupMatches, knockoutMatches, predMap }: Props) {
  const standings = computeAllStandings(groupMatches, predMap)
  const pMap = buildKnockoutMap(knockoutMatches)

  const byRound: Record<string, Match[]> = {}
  for (const m of knockoutMatches) {
    const key = m.stage === 'third_place' ? 'final' : m.stage
    if (!byRound[key]) byRound[key] = []
    byRound[key].push(m)
  }

  const availableRounds = ROUND_ORDER.filter((r) => byRound[r]?.length)
  const [activeRound, setActiveRound] = useState(availableRounds[0] ?? 'round_of_32')

  const hasGroupPredictions = groupMatches.some((m) => predMap[m.id])

  return (
    <div className="space-y-6">
      {!hasGroupPredictions && (
        <div
          className="px-5 py-4 text-sm text-[#7a7266]"
          style={{ background: '#131313', border: '1px solid #272727', borderRadius: '16px' }}
        >
          Completá tus predicciones de grupos para ver los equipos clasificados en el bracket.
        </div>
      )}

      {/* Round tabs */}
      <div className="flex flex-wrap gap-2">
        {availableRounds.map((round) => (
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

      {/* Main round matches */}
      <div className="grid grid-cols-1 min-[600px]:grid-cols-2 min-[960px]:grid-cols-3 min-[1200px]:grid-cols-4 gap-4">
        {(byRound[activeRound] ?? [])
          .filter((m) => m.stage !== 'third_place')
          .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
          .map((match) => (
            <BracketMatchCard
              key={match.id}
              match={match}
              homeTeam={resolveTeamFull(match.home_team, standings, pMap, predMap)}
              awayTeam={resolveTeamFull(match.away_team, standings, pMap, predMap)}
              pred={predMap[match.id]}
            />
          ))}
      </div>

      {/* Third place (alongside final tab) */}
      {activeRound === 'final' && byRound['final']?.some((m) => m.stage === 'third_place') && (
        <div>
          <p className="text-xs tracking-[0.2em] uppercase text-[#7a7266] mb-3">3er Puesto</p>
          <div className="grid grid-cols-1 min-[600px]:grid-cols-2 gap-4">
            {byRound['final']
              .filter((m) => m.stage === 'third_place')
              .map((match) => (
                <BracketMatchCard
                  key={match.id}
                  match={match}
                  homeTeam={resolveTeamFull(match.home_team, standings, pMap, predMap)}
                  awayTeam={resolveTeamFull(match.away_team, standings, pMap, predMap)}
                  pred={predMap[match.id]}
                />
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

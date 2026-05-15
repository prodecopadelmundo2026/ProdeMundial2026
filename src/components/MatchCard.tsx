'use client'

import { useRef, useState, useTransition, useEffect } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { StatusBadge } from './StatusBadge'
import { getTeam } from '@/lib/teams'
import { upsertPrediction } from '@/app/(app)/fixture/actions'
import type { Match } from '@/types'

type Prediction = { home_score: number; away_score: number }
type PtsType = 'exact' | 'partial' | 'miss'

function calcPoints(pred: Prediction, result: Prediction): { pts: 0 | 1 | 3; type: PtsType } {
  if (pred.home_score === result.home_score && pred.away_score === result.away_score)
    return { pts: 3, type: 'exact' }
  const predSign = Math.sign(pred.home_score - pred.away_score)
  const realSign = Math.sign(result.home_score - result.away_score)
  if (predSign === realSign) return { pts: 1, type: 'partial' }
  return { pts: 0, type: 'miss' }
}

function PtsBadge({ pts, type }: { pts: 0 | 1 | 3; type: PtsType }) {
  const styles: Record<PtsType, { bg: string; color: string }> = {
    exact:   { bg: '#FFE040', color: '#0A0A0A' },
    partial: { bg: '#A8F0D8', color: '#0A0A0A' },
    miss:    { bg: '#2a2a2a', color: '#9a9a9a' },
  }
  const { bg, color } = styles[type]
  return (
    <span
      className="inline-flex items-center gap-1.5 px-[11px] py-[6px] rounded-full text-[12px] font-extrabold"
      style={{ background: bg, color }}
    >
      <span className="font-display text-[14px]">+{pts}</span>
      {type === 'exact' ? 'exacto' : type === 'partial' ? 'parcial' : 'incorrecto'}
    </span>
  )
}

type Props = {
  match: Match
  prediction?: Prediction | null
}

const STRIP_COLOR: Record<string, string> = {
  open:     '#FF6B00',
  closed:   '#7A5BC9',
  live:     '#FF3B3B',
  finished: '#3a3a3a',
}

export function MatchCard({ match, prediction }: Props) {
  const now = new Date()
  const lockedAt = new Date(match.locked_at)
  const isOpen = match.status === 'upcoming' && now < lockedAt
  const isClosed = match.status === 'upcoming' && now >= lockedAt
  const isLive = match.status === 'live'
  const isFinished = match.status === 'finished'
  const isScored = isLive || isFinished
  const stripKey = isOpen ? 'open' : isClosed ? 'closed' : match.status

  const [home, setHome] = useState(prediction?.home_score?.toString() ?? '')
  const [away, setAway] = useState(prediction?.away_score?.toString() ?? '')
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    prediction ? 'saved' : 'idle',
  )
  const [savedAt, setSavedAt] = useState<Date | null>(prediction ? new Date() : null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [, startTransition] = useTransition()

  // Relative save time label (updates every 30s)
  const [, tick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  function doSave(h: string, a: string) {
    const hNum = parseInt(h, 10)
    const aNum = parseInt(a, 10)
    if (isNaN(hNum) || isNaN(aNum) || hNum < 0 || aNum < 0) return
    setSaveState('saving')
    startTransition(async () => {
      try {
        await upsertPrediction(match.id, hNum, aNum)
        setSaveState('saved')
        setSavedAt(new Date())
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

  function savedMinsAgo() {
    if (!savedAt) return ''
    const mins = Math.floor((Date.now() - savedAt.getTime()) / 60_000)
    return mins < 1 ? 'hace un momento' : `hace ${mins} min`
  }

  const homeTeam = getTeam(match.home_team)
  const awayTeam = getTeam(match.away_team)
  const groupLabel = match.group ? `GRUPO ${match.group}` : match.stage.replace('_', ' ').toUpperCase()
  const kickoffStr = format(new Date(match.scheduled_at), "EEE d MMM · HH:mm", { locale: es })
  const closeStr = format(lockedAt, 'HH:mm', { locale: es })

  const hasPrediction = home !== '' && away !== ''
  const predObj = hasPrediction
    ? { home_score: parseInt(home, 10), away_score: parseInt(away, 10) }
    : null
  const ptsBadge =
    isScored && predObj && match.home_score != null && match.away_score != null
      ? calcPoints(predObj, { home_score: match.home_score, away_score: match.away_score })
      : null

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
            {groupLabel}
          </span>
          <span>{kickoffStr}</span>
        </div>
        <StatusBadge match={match} />
      </div>

      {/* Teams */}
      <div className="grid gap-[14px] items-center mb-[18px]" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
        {/* Home */}
        <div className="flex flex-col items-center gap-[10px] text-center">
          <div
            className="w-14 h-14 rounded-full grid place-items-center text-[28px]"
            style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {homeTeam.flag}
          </div>
          <div>
            <div className="font-extrabold text-[15px] tracking-[-0.01em]">{match.home_team}</div>
            <div className="font-mono text-[10px] text-muted tracking-[0.2em] mt-0.5">{homeTeam.code}</div>
          </div>
        </div>

        {/* Center: VS or score */}
        <div className="font-display text-[14px] text-muted tracking-[0.18em]">
          {isScored
            ? `${match.home_score} — ${match.away_score}`
            : 'VS'}
        </div>

        {/* Away */}
        <div className="flex flex-col items-center gap-[10px] text-center">
          <div
            className="w-14 h-14 rounded-full grid place-items-center text-[28px]"
            style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {awayTeam.flag}
          </div>
          <div>
            <div className="font-extrabold text-[15px] tracking-[-0.01em]">{match.away_team}</div>
            <div className="font-mono text-[10px] text-muted tracking-[0.2em] mt-0.5">{awayTeam.code}</div>
          </div>
        </div>
      </div>

      {/* Score row */}
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
          aria-label={`Goles ${match.home_team}`}
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
          aria-label={`Goles ${match.away_team}`}
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
        {/* Left hint */}
        <span className="text-muted font-semibold">
          {isOpen && saveState === 'idle' && !hasPrediction && (
            <span className="text-orange">Falta cargar</span>
          )}
          {isOpen && saveState === 'idle' && hasPrediction && (
            <span>Pronóstico cargado</span>
          )}
          {isOpen && saveState === 'saving' && (
            <span>Guardando...</span>
          )}
          {isOpen && saveState === 'saved' && (
            <span>
              Guardado{' '}
              <b className="text-mint">{savedMinsAgo()}</b>
            </span>
          )}
          {isOpen && saveState === 'error' && (
            <span className="text-[#FF6B6B]">Error al guardar</span>
          )}
          {isClosed && <span>Pronóstico bloqueado</span>}
          {isLive && match.home_score != null && (
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted">
              Resultado en vivo:{' '}
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

        {/* Right: close time or pts badge */}
        {isOpen && (
          <span className="text-muted font-semibold shrink-0">Cierra {closeStr}</span>
        )}
        {ptsBadge && <PtsBadge pts={ptsBadge.pts} type={ptsBadge.type} />}
      </div>
    </article>
  )
}

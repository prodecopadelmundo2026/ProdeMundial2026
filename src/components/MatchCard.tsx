'use client'

import { useRef, useState, useTransition, useEffect } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { StatusBadge } from './StatusBadge'
import { getTeam, flagUrl } from '@/lib/teams'
import { upsertPrediction } from '@/app/(app)/fixture/actions'
import { normalizeScoreInput, parseScoreInput } from '@/lib/score-input'
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
  const styles: Record<PtsType, { bg: string; color: string; label: string }> = {
    exact:   { bg: '#FFE040', color: '#0A0A0A', label: 'exacto' },
    partial: { bg: '#A8F0D8', color: '#0A0A0A', label: 'parcial' },
    miss:    { bg: '#2a2a2a', color: '#9a9a9a', label: 'falló' },
  }
  const { bg, color, label } = styles[type]
  return (
    <span
      className="inline-flex items-center gap-1.5 px-[11px] py-[6px] rounded-full text-[12px] font-extrabold shrink-0"
      style={{ background: bg, color }}
    >
      <span className="font-display text-[14px]">{type === 'miss' ? '0' : `+${pts}`}</span>
      {label}
    </span>
  )
}

function formatMs(ms: number) {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

type Props = {
  match: Match
  prediction?: Prediction | null
  noAutosave?: boolean
  initialHome?: string
  initialAway?: string
  onValuesChange?: (home: string, away: string) => void
  onSaveStateChange?: (state: 'idle' | 'dirty' | 'saving' | 'saved' | 'error') => void
  readOnly?: boolean
}

const STRIP_COLOR: Record<string, string> = {
  open:     '#FF6B00',
  closed:   '#7A5BC9',
  live:     '#FF3B3B',
  finished: '#3a3a3a',
}

export function MatchCard({ match, prediction, noAutosave, initialHome, initialAway, onValuesChange, onSaveStateChange, readOnly }: Props) {
  const now = new Date()
  const lockedAt = new Date(match.locked_at)
  const isOpen = match.status === 'upcoming' && now < lockedAt
  const isClosed = match.status === 'upcoming' && now >= lockedAt
  const isLive = match.status === 'live'
  const isFinished = match.status === 'finished'
  const isScored = isLive || isFinished
  const stripKey = isOpen ? 'open' : isClosed ? 'closed' : match.status

  const [home, setHome] = useState(initialHome ?? prediction?.home_score?.toString() ?? '')
  const [away, setAway] = useState(initialAway ?? prediction?.away_score?.toString() ?? '')
  const [saveState, setSaveState] = useState<'idle' | 'dirty' | 'saving' | 'saved' | 'error'>(
    !noAutosave && prediction ? 'saved' : 'idle',
  )
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestValuesRef = useRef({
    home: initialHome ?? prediction?.home_score?.toString() ?? '',
    away: initialAway ?? prediction?.away_score?.toString() ?? '',
  })
  const [, startTransition] = useTransition()

  // Countdown para partidos cerrados
  const [msLeft, setMsLeft] = useState(() =>
    isClosed ? Math.max(0, new Date(match.scheduled_at).getTime() - Date.now()) : 0
  )
  useEffect(() => {
    if (!isClosed) return
    const id = setInterval(() => {
      setMsLeft(Math.max(0, new Date(match.scheduled_at).getTime() - Date.now()))
    }, 1000)
    return () => clearInterval(id)
  }, [isClosed, match.scheduled_at])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  useEffect(() => {
    const nextHome = initialHome ?? prediction?.home_score?.toString() ?? ''
    const nextAway = initialAway ?? prediction?.away_score?.toString() ?? ''
    setHome(nextHome)
    setAway(nextAway)
    latestValuesRef.current = { home: nextHome, away: nextAway }
  }, [initialHome, initialAway, prediction?.home_score, prediction?.away_score])

  function doSave(h: string, a: string) {
    const hNum = parseScoreInput(h)
    const aNum = parseScoreInput(a)
    if (hNum == null || aNum == null) return
    setSaveState('saving')
    onSaveStateChange?.('saving')
    startTransition(async () => {
      try {
        await upsertPrediction(match.id, hNum, aNum)
        const isLatest = latestValuesRef.current.home === h && latestValuesRef.current.away === a
        setSaveState(isLatest ? 'saved' : 'dirty')
        onSaveStateChange?.(isLatest ? 'saved' : 'dirty')
      } catch (error) {
        console.error('Error al guardar pronóstico', error)
        setSaveState('error')
        onSaveStateChange?.('error')
      }
    })
  }

  function handleChange(field: 'home' | 'away', val: string) {
    if (!isOpen) return
    const nextValue = normalizeScoreInput(val)
    if (field === 'home') setHome(nextValue)
    else setAway(nextValue)
    const h = field === 'home' ? nextValue : home
    const a = field === 'away' ? nextValue : away
    latestValuesRef.current = { home: h, away: a }
    onValuesChange?.(h, a)
    if (noAutosave) return
    setSaveState('dirty')
    onSaveStateChange?.('dirty')
    if (timerRef.current) clearTimeout(timerRef.current)
    if (h !== '' && a !== '') {
      timerRef.current = setTimeout(() => doSave(h, a), 500)
    }
  }

  const homeTeam = getTeam(match.home_team)
  const awayTeam = getTeam(match.away_team)
  const groupLabel = match.group ? `GRUPO ${match.group}` : match.stage.replace('_', ' ').toUpperCase()
  const kickoffStr = format(new Date(match.scheduled_at), "EEE d MMM · HH:mm", { locale: es })

  const hasPrediction = home !== '' && away !== ''
  const predObj = hasPrediction
    ? { home_score: Number(home), away_score: Number(away) }
    : null
  const ptsBadge =
    isScored && predObj && match.home_score != null && match.away_score != null
      ? calcPoints(predObj, { home_score: match.home_score, away_score: match.away_score })
      : null

  const isInputLocked = !isOpen

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
      {/* Strip izquierdo de color según status */}
      <span
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-[24px]"
        style={{ background: STRIP_COLOR[stripKey] ?? '#3a3a3a' }}
      />

      {/* Top row: grupo + fecha + status badge */}
      <div className="flex items-center justify-between mb-[18px] text-[12px]">
        <div className="flex items-center gap-[10px] text-muted font-bold tracking-[0.06em] uppercase text-[11px]">
          <span
            className="text-white text-[10px] px-2 py-1 rounded-[6px]"
            style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {groupLabel}
          </span>
          <span className="font-mono">{kickoffStr}</span>
        </div>
        <StatusBadge match={match} />
      </div>

      {/* Teams row: siempre VS en el centro */}
      <div className="grid gap-[14px] items-center mb-[18px]" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
        {/* Local */}
        <div className="flex flex-col items-center gap-[10px] text-center">
          <div
            className="w-14 h-14 rounded-full grid place-items-center overflow-hidden"
            style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {homeTeam.iso2 ? (
              <img
                src={flagUrl(homeTeam.iso2)}
                alt={match.home_team}
                style={{ width: '38px', height: '26px', objectFit: 'contain' }}
              />
            ) : (
              <span className="text-[28px]">{homeTeam.flag}</span>
            )}
          </div>
          <div>
            <div className="font-extrabold text-[15px] tracking-[-0.01em]">{match.home_team}</div>
            <div className="font-mono text-[10px] text-muted tracking-[0.2em] mt-0.5">{homeTeam.code}</div>
          </div>
        </div>

        {/* Centro: SIEMPRE VS */}
        <div className="font-display text-[14px] text-muted tracking-[0.18em]">VS</div>

        {/* Visitante */}
        <div className="flex flex-col items-center gap-[10px] text-center">
          <div
            className="w-14 h-14 rounded-full grid place-items-center overflow-hidden"
            style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {awayTeam.iso2 ? (
              <img
                src={flagUrl(awayTeam.iso2)}
                alt={match.away_team}
                style={{ width: '38px', height: '26px', objectFit: 'contain' }}
              />
            ) : (
              <span className="text-[28px]">{awayTeam.flag}</span>
            )}
          </div>
          <div>
            <div className="font-extrabold text-[15px] tracking-[-0.01em]">{match.away_team}</div>
            <div className="font-mono text-[10px] text-muted tracking-[0.2em] mt-0.5">{awayTeam.code}</div>
          </div>
        </div>
      </div>

      {/* Score context banner — visible para live/finished (independiente de readOnly) */}
      {isScored && match.home_score != null && match.away_score != null && (
        <div
          className="flex items-center justify-between mb-2.5 rounded-[12px] font-extrabold gap-3"
          style={{
            padding: '11px 14px',
            ...(isLive ? {
              background: 'linear-gradient(90deg, rgba(255,59,59,.22), rgba(255,59,59,.06))',
              border: '1px solid rgba(255,59,59,.3)',
              color: '#FF8585',
            } : {
              background: 'rgba(255,255,255,.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#9a9a9a',
            }),
          }}
        >
          <span className="inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.18em]">
            {isLive && (
              <span
                className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0"
                style={{ animation: 'blink 1s infinite' }}
              />
            )}
            {isLive ? 'Marcador en vivo' : 'Resultado final'}
          </span>
          <span className="font-display text-[20px] text-white tabular-nums">
            {match.home_score} — {match.away_score}
          </span>
        </div>
      )}

      {/* Pronóstico read-only (home page, vista pública) */}
      {readOnly && prediction && (
        <div
          className="flex items-center justify-between mt-1 px-3 py-2.5 rounded-[12px] text-[11px] font-bold"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <span className="text-muted tracking-[0.12em] uppercase text-[10px] font-extrabold">Tu pronóstico</span>
          <span className="font-mono text-white text-[13px]">
            {prediction.home_score} — {prediction.away_score}
          </span>
        </div>
      )}

      {/* Sección de pronóstico editable — solo visible cuando no es readOnly */}
      {!readOnly && (
        <>
          {/* pred-label: "Tu pronóstico" + copy contextual a la derecha */}
          <div className="flex items-center justify-between mb-1.5 text-[10px] font-extrabold tracking-[0.22em] uppercase text-muted">
            <span>Tu pronóstico</span>
            {isOpen && !hasPrediction && (
              <span style={{ color: '#FF6B00' }}>Falta cargar</span>
            )}
            {isClosed && <span>Bloqueado</span>}
          </div>

          {/* Score row con inputs */}
          <div
            className="grid items-center"
            style={{
              gridTemplateColumns: '1fr auto 1fr',
              gap: '10px',
              background: isInputLocked ? '#0d0d0d' : '#0A0A0A',
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
              disabled={isInputLocked}
              onChange={(e) => handleChange('home', e.target.value)}
              placeholder="–"
              aria-label={`Goles ${match.home_team}`}
              className="score w-full h-[54px] text-center bg-transparent border-none text-white outline-none rounded-[10px] transition-all duration-150 font-display text-[34px] tracking-[-0.03em]"
              style={isInputLocked ? { cursor: 'not-allowed' } : undefined}
              onFocus={(e) => {
                if (!isInputLocked) {
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
              disabled={isInputLocked}
              onChange={(e) => handleChange('away', e.target.value)}
              placeholder="–"
              aria-label={`Goles ${match.away_team}`}
              className="score w-full h-[54px] text-center bg-transparent border-none text-white outline-none rounded-[10px] transition-all duration-150 font-display text-[34px] tracking-[-0.03em]"
              style={isInputLocked ? { cursor: 'not-allowed' } : undefined}
              onFocus={(e) => {
                if (!isInputLocked) {
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

          {/* Bottom row: hint editorial + pts badge */}
          <div className="mt-[14px] flex items-center justify-between gap-[10px] text-[12px]">
            <span className="text-muted font-semibold">
              {isOpen && !noAutosave && saveState === 'saving' && (
                <span>Guardando...</span>
              )}
              {isOpen && !noAutosave && saveState === 'dirty' && (
                <span style={{ color: '#FFB15C' }}>Cambios sin guardar</span>
              )}
              {isOpen && !noAutosave && saveState === 'saved' && (
                <span>Guardado</span>
              )}
              {isOpen && !noAutosave && saveState === 'error' && (
                <span style={{ color: '#FF6B6B' }}>Error al guardar</span>
              )}
              {isClosed && (
                <span>
                  Empieza en{' '}
                  <b className="font-mono">{formatMs(msLeft)}</b>
                </span>
              )}
              {isLive && (
                <span>
                  {ptsBadge && ptsBadge.pts === 3
                    ? 'Si termina así, ganás +3'
                    : 'Podés sumar hasta +3 según cómo termine'}
                </span>
              )}
              {isFinished && ptsBadge?.type === 'exact' && (
                <span>Marcador exacto. La rompiste.</span>
              )}
              {isFinished && ptsBadge?.type === 'partial' && (
                <span>Acertaste el ganador.</span>
              )}
              {isFinished && ptsBadge?.type === 'miss' && (
                <span>No le pegaste — mañana hay revancha.</span>
              )}
              {isFinished && !predObj && (
                <span>Sin pronóstico cargado.</span>
              )}
            </span>
            {ptsBadge && <PtsBadge pts={ptsBadge.pts} type={ptsBadge.type} />}
          </div>
        </>
      )}
    </article>
  )
}

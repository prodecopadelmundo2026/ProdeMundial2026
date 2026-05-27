'use client'

import { useRef, useState, useTransition, useEffect } from 'react'
import { Pencil } from 'lucide-react'
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
    miss:    { bg: '#2a2a2a', color: '#9a9a9a', label: 'incorrecto' },
  }
  const { bg, color, label } = styles[type]
  return (
    <span
      className="inline-flex items-center gap-1.5 px-[10px] py-[5px] rounded-full text-[11px] font-extrabold shrink-0"
      style={{ background: bg, color }}
    >
      <span className="font-display text-[13px]">{type === 'miss' ? '0' : `+${pts}`}</span>
      {label}
    </span>
  )
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
  showPrediction?: boolean
}

export function MatchCard({ match, prediction, noAutosave, initialHome, initialAway, onValuesChange, onSaveStateChange, readOnly, showPrediction = true }: Props) {
  const now = new Date()
  const lockedAt = new Date(match.locked_at)
  const isOpen = match.status === 'upcoming' && now < lockedAt && !readOnly
  const hasRealScore = (match.status === 'finished' || match.status === 'live')
    && match.home_score != null && match.away_score != null
  const isInputLocked = !isOpen

  const [home, setHome] = useState(initialHome ?? prediction?.home_score?.toString() ?? '')
  const [away, setAway] = useState(initialAway ?? prediction?.away_score?.toString() ?? '')
  const [saveState, setSaveState] = useState<'idle' | 'dirty' | 'saving' | 'saved' | 'error'>(
    !noAutosave && prediction ? 'saved' : 'idle',
  )
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const homeInputRef = useRef<HTMLInputElement>(null)
  const latestValuesRef = useRef({
    home: initialHome ?? prediction?.home_score?.toString() ?? '',
    away: initialAway ?? prediction?.away_score?.toString() ?? '',
  })
  const [, startTransition] = useTransition()

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
    showPrediction && hasRealScore && predObj && match.home_score != null && match.away_score != null
      ? calcPoints(predObj, { home_score: match.home_score, away_score: match.away_score })
      : null

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
      {/* Strip izquierdo */}
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
            {groupLabel}
          </span>
          <span className="font-mono">{kickoffStr}</span>
        </div>
        <StatusBadge match={match} />
      </div>

      {/* Teams row */}
      <div className="grid gap-[8px] items-center mb-[10px]" style={{ gridTemplateColumns: '1fr auto 1fr' }}>
        {/* Local */}
        <div className="flex flex-col items-center gap-[6px] text-center">
          <div
            className="w-[38px] h-[38px] rounded-full grid place-items-center overflow-hidden"
            style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {homeTeam.iso2 ? (
              <img
                src={flagUrl(homeTeam.iso2)}
                alt={match.home_team}
                style={{ width: '28px', height: '20px', objectFit: 'contain' }}
              />
            ) : (
              <span className="text-[20px]">{homeTeam.flag}</span>
            )}
          </div>
          <div className="font-extrabold text-[12px] tracking-[-0.01em] leading-tight">{match.home_team}</div>
        </div>

        {/* Centro: siempre VS */}
        <div className="font-display text-[11px] text-muted tracking-[0.14em]">VS</div>

        {/* Visitante */}
        <div className="flex flex-col items-center gap-[6px] text-center">
          <div
            className="w-[38px] h-[38px] rounded-full grid place-items-center overflow-hidden"
            style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {awayTeam.iso2 ? (
              <img
                src={flagUrl(awayTeam.iso2)}
                alt={match.away_team}
                style={{ width: '28px', height: '20px', objectFit: 'contain' }}
              />
            ) : (
              <span className="text-[20px]">{awayTeam.flag}</span>
            )}
          </div>
          <div className="font-extrabold text-[12px] tracking-[-0.01em] leading-tight">{match.away_team}</div>
        </div>
      </div>

      {/* Partido terminado/en vivo: Pronóstico + Resultado Final */}
      {hasRealScore ? (
        <>
          <div className="flex flex-col gap-[8px]">
            {/* Pronóstico */}
            {showPrediction && (
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] mb-[5px]" style={{ color: '#4a4a4a' }}>
                Pronóstico
              </p>
              <div
                className="flex items-center justify-center rounded-[12px]"
                style={{ padding: '10px 8px', background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                {hasPrediction ? (
                  <span className="font-display text-[24px] text-white tabular-nums">{home} — {away}</span>
                ) : (
                  <span className="text-[11px] font-bold" style={{ color: '#3a3a3a' }}>Sin pronóstico</span>
                )}
              </div>
            </div>
            )}
            {/* Resultado final */}
            <div>
              <p className="text-[9px] font-extrabold uppercase tracking-[0.18em] mb-[5px]" style={{ color: '#9a9a9a' }}>
                Resultado final
              </p>
              <div
                className="flex items-center justify-center rounded-[12px]"
                style={{ padding: '10px 8px', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <span className="font-display text-[24px] text-white tabular-nums">
                  {match.home_score} — {match.away_score}
                </span>
              </div>
            </div>
          </div>
          {/* Pts badge */}
          {ptsBadge && (
            <div className="mt-[10px] flex justify-end">
              <PtsBadge pts={ptsBadge.pts} type={ptsBadge.type} />
            </div>
          )}
        </>
      ) : (
        <>
          {/* Pronóstico read-only (home page, vista pública) */}
          {showPrediction && readOnly && prediction && (
            <div
              className="flex items-center justify-between px-3 py-2 rounded-[10px] text-[11px] font-bold"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <span className="text-muted tracking-[0.12em] uppercase text-[10px] font-extrabold">Tu pronóstico</span>
              <span className="font-mono text-white text-[12px]">
                {prediction.home_score} — {prediction.away_score}
              </span>
            </div>
          )}

          {/* Pronóstico editable */}
          {!readOnly && (
            <>
              {isOpen && (
                <div className="mb-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => homeInputRef.current?.focus()}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-extrabold uppercase"
                    style={{ background: 'rgba(255,107,0,0.12)', color: '#FF6B00', border: '1px solid rgba(255,107,0,0.28)' }}
                  >
                    <Pencil size={12} strokeWidth={2.5} />
                    Editar
                  </button>
                </div>
              )}
              <div
                className="grid items-center"
                style={{
                  gridTemplateColumns: '1fr auto 1fr',
                  gap: '8px',
                  background: isInputLocked ? '#0d0d0d' : '#0A0A0A',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  padding: '5px',
                }}
              >
                <input
                  ref={homeInputRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={2}
                  value={home}
                  disabled={isInputLocked}
                  onChange={(e) => handleChange('home', e.target.value)}
                  placeholder="–"
                  aria-label={`Goles ${match.home_team}`}
                  className="score w-full h-[40px] text-center bg-transparent border-none text-white outline-none rounded-[8px] transition-all duration-150 font-display text-[24px] tracking-[-0.03em]"
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
                <span className="font-display text-[18px] text-[#3a3a3a]">—</span>
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
                  className="score w-full h-[40px] text-center bg-transparent border-none text-white outline-none rounded-[8px] transition-all duration-150 font-display text-[24px] tracking-[-0.03em]"
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
              {(!noAutosave && saveState === 'error') && (
                <div className="mt-[10px] flex justify-end">
                  <span className="text-[11px] font-semibold" style={{ color: '#FF6B6B' }}>Error al guardar</span>
                </div>
              )}
            </>
          )}
        </>
      )}
    </article>
  )
}

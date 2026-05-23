'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setMatchResult } from './actions'
import type { Match } from '@/types'

export function AdminMatchForm({
  match,
  disabledReason,
}: {
  match: Match
  disabledReason?: string | null
}) {
  const [home, setHome] = useState(match.home_score?.toString() ?? '')
  const [away, setAway] = useState(match.away_score?.toString() ?? '')
  const [status, setStatus] = useState<Match['status']>(match.status)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  useEffect(() => {
    setHome(match.home_score?.toString() ?? '')
    setAway(match.away_score?.toString() ?? '')
    setStatus(match.status)
    setError(null)
    setOk(false)
  }, [match.id, match.home_score, match.away_score, match.status])

  const bothScoresSet = home !== '' && away !== ''
  const pointsWillCalculate = bothScoresSet && status === 'finished'
  const scoresButNotFinished = bothScoresSet && status !== 'finished'
  const isDisabled = Boolean(disabledReason)

  function handleScoreChange(field: 'home' | 'away', val: string) {
    if (field === 'home') setHome(val)
    else setAway(val)
    setOk(false)
    // Auto-select "Finalizado" when both scores are entered and status is still upcoming
    const otherVal = field === 'home' ? away : home
    if (val !== '' && otherVal !== '' && status === 'upcoming') {
      setStatus('finished')
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setOk(false)

    if (home === '' || away === '') {
      setError('Ingresá ambos goles')
      return
    }

    startTransition(async () => {
      try {
        await setMatchResult(match.id, Number(home), Number(away), status)
        setOk(true)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido')
      }
    })
  }

  const inputStyle: React.CSSProperties = {
    width: '52px',
    textAlign: 'center',
    background: '#0A0A0A',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '10px',
    padding: '7px 4px',
    fontSize: '18px',
    fontFamily: 'var(--font-display, monospace)',
    color: '#ffffff',
    outline: 'none',
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* Score inputs */}
        <div
          className="flex items-center gap-2"
          style={{
            background: '#131313',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px',
            padding: '5px 10px',
          }}
        >
          <input
            type="number"
            min={0}
            max={30}
            value={home}
            disabled={isDisabled || isPending}
            onChange={(e) => handleScoreChange('home', e.target.value)}
            style={inputStyle}
            onFocus={(e) => {
              e.target.style.borderColor = '#FF6B00'
              e.target.style.boxShadow = 'inset 0 0 0 1px #FF6B00'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(255,255,255,0.12)'
              e.target.style.boxShadow = 'none'
            }}
            placeholder="0"
          />
          <span className="font-display text-[16px]" style={{ color: '#3a3a3a' }}>—</span>
          <input
            type="number"
            min={0}
            max={30}
            value={away}
            disabled={isDisabled || isPending}
            onChange={(e) => handleScoreChange('away', e.target.value)}
            style={inputStyle}
            onFocus={(e) => {
              e.target.style.borderColor = '#FF6B00'
              e.target.style.boxShadow = 'inset 0 0 0 1px #FF6B00'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(255,255,255,0.12)'
              e.target.style.boxShadow = 'none'
            }}
            placeholder="0"
          />
        </div>

        {/* Status select */}
        <div className="relative">
          <select
            value={status}
            disabled={isDisabled || isPending}
            onChange={(e) => { setStatus(e.target.value as Match['status']); setOk(false) }}
            style={{
              background: status === 'finished' ? 'rgba(168,240,216,0.08)' : status === 'live' ? 'rgba(255,59,59,0.1)' : '#131313',
              border: scoresButNotFinished
                ? '1px solid rgba(255,177,92,0.5)'
                : status === 'finished'
                ? '1px solid rgba(168,240,216,0.3)'
                : '1px solid rgba(255,255,255,0.08)',
              borderRadius: '10px',
              padding: '8px 32px 8px 12px',
              fontSize: '12px',
              fontWeight: 700,
              color: status === 'finished' ? '#A8F0D8' : status === 'live' ? '#FF6B6B' : '#cfcfcf',
              outline: 'none',
              appearance: 'none',
              WebkitAppearance: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="upcoming" style={{ background: '#0d0d0d', color: '#cfcfcf' }}>Próximo</option>
            <option value="live" style={{ background: '#0d0d0d', color: '#cfcfcf' }}>En vivo</option>
            <option value="finished" style={{ background: '#0d0d0d', color: '#cfcfcf' }}>Finalizado ✓</option>
          </select>
          <span
            className="pointer-events-none absolute right-[10px] top-1/2 -translate-y-1/2 text-[10px]"
            style={{ color: '#4a4a4a' }}
          >
            ▼
          </span>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isDisabled || isPending}
          className="px-4 py-2 rounded-full text-[12px] font-extrabold uppercase transition-all duration-150 disabled:opacity-40"
          style={{ background: '#FF6B00', color: '#0A0A0A' }}
          onMouseEnter={(e) => { if (!isPending) e.currentTarget.style.background = '#ff7d1a' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#FF6B00' }}
        >
          {isPending ? 'Guardando…' : 'Guardar'}
        </button>

        {ok && (
          <span className="text-[12px] font-bold" style={{ color: '#A8F0D8' }}>
            ✓ Guardado {pointsWillCalculate ? '· puntos calculados' : ''}
          </span>
        )}
        {error && (
          <span className="text-[12px] font-bold" style={{ color: '#FF6B6B' }}>{error}</span>
        )}
      </div>

      {disabledReason && (
        <p className="text-[11px] font-bold" style={{ color: '#FFB15C' }}>
          {disabledReason}
        </p>
      )}

      {/* Warning: scores set but status isn't finished */}
      {scoresButNotFinished && (
        <p className="text-[11px] font-bold" style={{ color: '#FFB15C' }}>
          ⚠ Cambiá el estado a <b>Finalizado</b> para que se calculen los puntos de los usuarios.
        </p>
      )}
    </form>
  )
}

'use client'

import { useEffect, useRef, useState } from 'react'
import { saveSpecialBets, type SpecialBetsValues } from './actions'
import { PRODE_SUBMISSION_CUTOFF_AT } from '@/lib/tournament-dates'

const AWARDS = [
  { key: 'balon', label: 'Balon de Oro', sub: 'Mejor jugador del torneo', pts: '+20', color: '#5B2D8E', inputLabel: 'Jugador' },
  { key: 'bota', label: 'Bota de Oro', sub: 'Maximo goleador del torneo', pts: '+15', color: '#FF6B00', inputLabel: 'Jugador' },
  { key: 'guante', label: 'Guante de Oro', sub: 'Mejor arquero del torneo', pts: '+15', color: '#1565C0', inputLabel: 'Arquero' },
] as const

type Key = typeof AWARDS[number]['key']
type Values = SpecialBetsValues

type Props = {
  initialValues: Values
  readOnly?: boolean
}

function onlyLetters(value: string) {
  return value.replace(/[^a-zA-ZÀ-ÿ\s]/g, '')
}

export function SpecialsTab({ initialValues, readOnly = false }: Props) {
  const [values, setValues] = useState<Values>(initialValues)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cutoffLabel = new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date(PRODE_SUBMISSION_CUTOFF_AT))

  async function persist(next: Values) {
    if (readOnly) return
    try {
      await saveSpecialBets(next)
      setSaveError(null)
      setSaved(true)
      setTimeout(() => setSaved(false), 1800)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'No se pudieron guardar las apuestas especiales.')
    }
  }

  useEffect(() => {
    function handleClear() {
      setValues({ balon: '', bota: '', guante: '' })
      setSaved(false)
    }
    function handleRandomize(event: Event) {
      const next = (event as CustomEvent<Values>).detail
      if (!next) return
      setValues(next)
      void persist(next)
    }
    window.addEventListener('prode-specials-cleared', handleClear)
    window.addEventListener('prode-specials-randomized', handleRandomize)
    return () => {
      window.removeEventListener('prode-specials-cleared', handleClear)
      window.removeEventListener('prode-specials-randomized', handleRandomize)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly])

  function handleChange(key: Key, raw: string) {
    if (readOnly) return
    const cleaned = onlyLetters(raw)
    const next = { ...values, [key]: cleaned }
    setValues(next)
    setSaved(false)
    setSaveError(null)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => void persist(next), 600)
  }

  return (
    <div>
      <div style={{ marginBottom: '22px', maxWidth: '560px' }}>
        <h3
          className="font-display uppercase leading-none tracking-[-0.02em]"
          style={{ fontSize: 'clamp(24px, 3vw, 32px)' }}
        >
          Apuestas <em className="not-italic italic" style={{ color: '#5B2D8E' }}>especiales</em>
        </h3>
        <p className="text-[14px] mt-2 leading-[1.5]" style={{ color: '#8A8A8A' }}>
          Carga quien crees que se va a llevar cada distincion. Solo se evaluan al final del torneo.{' '}
          <b className="text-white font-extrabold">Cierran 24 horas antes del primer partido.</b>
        </p>
      </div>

      <div className="grid grid-cols-1 min-[780px]:grid-cols-3 gap-[14px]">
        {AWARDS.map(({ key, label, sub, pts, color, inputLabel }) => (
          <article
            key={key}
            className="relative overflow-hidden rounded-[18px] flex flex-col gap-[18px] transition-[transform,border-color] duration-200"
            style={{
              background: '#141414',
              border: '1px solid rgba(255,255,255,0.08)',
              padding: '20px',
            }}
          >
            <span
              className="absolute left-0 top-0 bottom-0 rounded-l-[18px]"
              style={{ width: 4, background: color }}
            />

            <header className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-[18px] uppercase leading-none tracking-[-0.01em] text-white">
                  {label}
                </p>
                <p className="text-[12px] font-semibold mt-[6px] leading-[1.4]" style={{ color: '#8A8A8A' }}>
                  {sub}
                </p>
              </div>
              <span
                className="font-display leading-[.85] tracking-[-0.04em] shrink-0"
                style={{ fontSize: '36px', color }}
              >
                {pts}
              </span>
            </header>

            <div className="flex flex-col gap-[6px]">
              <label
                htmlFor={`sp-${key}`}
                className="text-[10px] font-extrabold tracking-[0.22em] uppercase"
                style={{ color: '#8A8A8A' }}
              >
                {inputLabel}
              </label>
              <input
                id={`sp-${key}`}
                type="text"
                value={values[key]}
                disabled={readOnly}
                onChange={(e) => handleChange(key, e.target.value)}
                placeholder="Nombre del jugador"
                maxLength={40}
                className="w-full outline-none font-bold text-[15px] text-white placeholder:font-medium placeholder:text-[#555] rounded-[12px] transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-70"
                style={{
                  background: '#0A0A0A',
                  border: '1px solid rgba(255,255,255,0.08)',
                  padding: '14px 16px',
                }}
                onFocus={(e) => {
                  if (readOnly) return
                  e.target.style.borderColor = color
                  e.target.style.background = '#0d0d0d'
                  e.target.style.boxShadow = '0 0 0 4px rgba(255,255,255,0.04)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.08)'
                  e.target.style.background = '#0A0A0A'
                  e.target.style.boxShadow = ''
                }}
              />
              {saved && values[key] && (
                <span className="inline-flex items-center gap-[6px] text-[11px] font-bold" style={{ color: '#A8F0D8' }}>
                  Guardado
                </span>
              )}
            </div>
          </article>
        ))}
      </div>

      <div
        className="mt-[22px] flex items-center justify-between gap-[14px] flex-wrap px-5 py-4 rounded-[14px]"
        style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <span className="text-[13px]" style={{ color: '#8A8A8A' }}>
          {readOnly ? (
            'La carga del Prode ya cerro. Podes consultar tus apuestas, pero ya no editarlas.'
          ) : (
            <>
              Podes editarlas hasta el{' '}
              <b className="font-mono text-[12px] font-extrabold tracking-[0.1em] uppercase text-white">{cutoffLabel} ART</b>
            </>
          )}
        </span>
        <span
          className="font-mono text-[11px] font-bold tracking-[0.06em] transition-colors duration-300"
          style={{ color: saveError ? '#FF6B6B' : saved ? '#A8F0D8' : '#4a4a4a' }}
        >
          {saveError ?? (saved ? 'Guardado' : 'Guardado automatico')}
        </span>
      </div>
    </div>
  )
}

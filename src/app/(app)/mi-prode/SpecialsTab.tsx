'use client'

import { useState, useEffect, useRef } from 'react'

const SPECIALS_STORAGE_KEY = 'prode_specials'

const AWARDS = [
  { key: 'balon', label: 'Balón de Oro', sub: 'Mejor jugador del torneo', pts: '+20', color: '#5B2D8E', inputLabel: 'Jugador' },
  { key: 'bota', label: 'Bota de Oro', sub: 'Máximo goleador del torneo', pts: '+15', color: '#FF6B00', inputLabel: 'Jugador' },
  { key: 'guante', label: 'Guante de Oro', sub: 'Mejor arquero del torneo', pts: '+15', color: '#1565C0', inputLabel: 'Arquero' },
] as const

type Key = typeof AWARDS[number]['key']
type Values = Record<Key, string>

function onlyLetters(value: string) {
  return value.replace(/[^a-zA-ZÀ-ÿ\s]/g, '')
}

export function SpecialsTab() {
  const [values, setValues] = useState<Values>({ balon: '', bota: '', guante: '' })
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
        if (stored) setValues(JSON.parse(stored))
      } catch {}
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

  function handleChange(key: Key, raw: string) {
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
    <div>
      {/* Section head */}
      <div style={{ marginBottom: '22px', maxWidth: '560px' }}>
        <h3
          className="font-display uppercase leading-none tracking-[-0.02em]"
          style={{ fontSize: 'clamp(24px, 3vw, 32px)' }}
        >
          Apuestas <em className="not-italic italic" style={{ color: '#5B2D8E' }}>especiales</em>
        </h3>
        <p className="text-[14px] mt-2 leading-[1.5]" style={{ color: '#8A8A8A' }}>
          Cargá quien creés que se va a llevar cada distinción. Solo se evalúan al final del torneo.{' '}
          <b className="text-white font-extrabold">Cierran el 11 de junio.</b>
        </p>
      </div>

      {/* Cards grid */}
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
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'
              ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.16)'
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform = ''
              ;(e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'
            }}
          >
            {/* Left strip */}
            <span
              className="absolute left-0 top-0 bottom-0 rounded-l-[18px]"
              style={{ width: 4, background: color }}
            />

            {/* Header */}
            <header className="flex items-start justify-between gap-3">
              <div>
                <p
                  className="font-display text-[18px] uppercase leading-none tracking-[-0.01em] text-white"
                >
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

            {/* Input */}
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
                onChange={(e) => handleChange(key, e.target.value)}
                placeholder="Nombre del jugador"
                maxLength={40}
                className="w-full outline-none font-bold text-[15px] text-white placeholder:font-medium placeholder:text-[#555] rounded-[12px] transition-all duration-150"
                style={{
                  background: '#0A0A0A',
                  border: '1px solid rgba(255,255,255,0.08)',
                  padding: '14px 16px',
                }}
                onFocus={(e) => {
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
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Guardado
                </span>
              )}
            </div>
          </article>
        ))}
      </div>

      {/* Save footer */}
      <div
        className="mt-[22px] flex items-center justify-between gap-[14px] flex-wrap px-5 py-4 rounded-[14px]"
        style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <span className="text-[13px]" style={{ color: '#8A8A8A' }}>
          Podés editarlas hasta el{' '}
          <b className="font-mono text-[12px] font-extrabold tracking-[0.1em] uppercase text-white">11 jun · 15:30</b>
        </span>
        <span
          className="font-mono text-[11px] font-bold tracking-[0.06em] transition-colors duration-300"
          style={{ color: saved ? '#A8F0D8' : '#4a4a4a' }}
        >
          {saved ? 'Guardado ✓' : 'Guardado automático'}
        </span>
      </div>
    </div>
  )
}

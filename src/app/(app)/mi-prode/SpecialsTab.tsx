'use client'

import { useState, useEffect, useRef } from 'react'

const SPECIALS_STORAGE_KEY = 'prode_specials'

const AWARDS = [
  { key: 'balon', label: 'Balón de Oro', desc: 'Mejor jugador del torneo', pts: '+20', color: '#5B2D8E', accent: 'rgba(91,45,142,0.14)', border: 'rgba(168,140,220,0.22)' },
  { key: 'bota', label: 'Bota de Oro', desc: 'Máximo goleador del torneo', pts: '+15', color: '#FF6B00', accent: 'rgba(255,107,0,0.1)', border: 'rgba(255,107,0,0.22)' },
  { key: 'guante', label: 'Guante de Oro', desc: 'Mejor arquero del torneo', pts: '+15', color: '#1565C0', accent: 'rgba(21,101,192,0.12)', border: 'rgba(100,160,230,0.22)' },
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
      <div className="grid grid-cols-1 min-[780px]:grid-cols-3 gap-4">
        {AWARDS.map(({ key, label, desc, pts, color, accent, border }) => (
          <div
            key={key}
            className="relative flex flex-col overflow-hidden rounded-[20px]"
            style={{ background: accent, border: `1px solid ${border}`, padding: '20px 20px 18px' }}
          >
            <span
              className="absolute left-0 top-0 bottom-0 rounded-l-[20px]"
              style={{ width: 4, background: color }}
            />
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-extrabold text-[15px] leading-tight">{label}</p>
                <p className="text-[11px] mt-0.5 font-medium" style={{ color: '#5a5a6a' }}>{desc}</p>
              </div>
              <span className="font-display text-[28px] leading-none shrink-0 ml-2" style={{ color }}>{pts}</span>
            </div>
            <input
              type="text"
              value={values[key]}
              onChange={(e) => handleChange(key, e.target.value)}
              placeholder="Nombre del jugador..."
              maxLength={40}
              aria-label={label}
              className="w-full bg-transparent outline-none font-medium text-[14px] text-white placeholder:font-normal placeholder:text-[#3a3a4a] rounded-[10px] transition-all duration-150"
              style={{
                padding: '9px 12px',
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

      <div className="mt-5 flex items-center justify-between gap-3 flex-wrap">
        <p className="font-mono text-[11px] font-bold tracking-[0.1em] text-muted">
          Fecha límite: <b className="text-white">11 jun · 16:00</b>
        </p>
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

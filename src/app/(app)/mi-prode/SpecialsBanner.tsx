'use client'

import { useState, useEffect } from 'react'

const DISMISS_KEY = 'specials-banner-dismissed'

interface Props {
  onClickCargar?: () => void
}

export function SpecialsBanner({ onClickCargar }: Props) {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === '1')
  }, [])

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  if (dismissed) return null

  return (
    <aside
      className="mb-6 flex items-center gap-[14px] rounded-[14px] px-4 py-3"
      style={{
        background: 'rgba(91,45,142,0.16)',
        border: '1px solid rgba(168,140,220,0.2)',
        fontSize: '13px',
      }}
    >
      {/* Icon */}
      <div
        className="w-7 h-7 rounded-[8px] grid place-items-center shrink-0"
        style={{ background: '#5B2D8E', color: '#fff' }}
      >
        <svg
          width="14" height="14" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.2"
          strokeLinecap="round" strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
          <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
          <path d="M4 22h16"/>
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
        </svg>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0 flex items-baseline gap-2 flex-wrap leading-[1.3]">
        <h4 className="inline font-extrabold text-[13px]">
          Balón, Bota y Guante de Oro sin cargar.
        </h4>
        <p className="inline text-[#cfcfcf] font-medium text-[13px]">
          Hasta{' '}
          <b className="text-mint font-extrabold font-mono text-[12px]">+50 pts</b>{' '}
          antes del 11 jun.
        </p>
      </div>

      {/* CTA */}
      <button
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-extrabold text-[12px] shrink-0 transition-[background,border-color] duration-150"
        style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(168,140,220,0.4)' }}
        onClick={onClickCargar}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#5B2D8E'
          e.currentTarget.style.borderColor = '#5B2D8E'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.borderColor = 'rgba(168,140,220,0.4)'
        }}
      >
        Cargar
      </button>

      {/* Dismiss */}
      <button
        onClick={dismiss}
        aria-label="Cerrar aviso"
        className="w-6 h-6 rounded-[6px] grid place-items-center shrink-0 transition-[background,color] duration-150"
        style={{ color: '#8A8A8A' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
          e.currentTarget.style.color = '#fff'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = '#8A8A8A'
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6 6 18M6 6l12 12"/>
        </svg>
      </button>
    </aside>
  )
}

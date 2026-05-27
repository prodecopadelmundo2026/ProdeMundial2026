'use client'

import { useState } from 'react'
import type { Match } from '@/types'
import { TournamentBracket } from '@/components/TournamentBracket'

interface Props {
  groupMatches: Match[]
  knockoutMatches: Match[]
}

export function AdminBracketSection({ groupMatches, knockoutMatches }: Props) {
  const [open, setOpen] = useState(false)

  const hasAnyResult = knockoutMatches.some(
    (m) => m.home_score != null && m.away_score != null
  )

  return (
    <div className="mt-10">
      <div
        className="flex items-center justify-between px-5 py-4 rounded-[16px] cursor-pointer transition-colors duration-150"
        style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.07)' }}
        onClick={() => setOpen((v) => !v)}
        role="button"
        aria-expanded={open}
      >
        <div>
          <p className="text-[10px] font-extrabold tracking-[0.2em] uppercase mb-1" style={{ color: '#4a4a4a' }}>
            Llave oficial
          </p>
          <p className="font-extrabold text-[15px] text-white leading-snug">
            Bracket de resultados
          </p>
          {!hasAnyResult && (
            <p className="text-[12px] mt-0.5" style={{ color: '#4a4a4a' }}>
              Sin resultados de eliminatorias cargados aún
            </p>
          )}
        </div>
        <svg
          width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="#4a4a4a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>

      {open && (
        <div className="mt-4">
          <TournamentBracket
            mode="official"
            groupMatches={groupMatches}
            knockoutMatches={knockoutMatches}
          />
        </div>
      )}
    </div>
  )
}

'use client'

import { useState } from 'react'
import clsx from 'clsx'
import type { Match } from '@/types'
import { MatchCard } from '@/components/MatchCard'

type PredictionMap = Record<string, { home_score: number; away_score: number }>
type GroupedMatches = Record<string, Match[]>

const KNOCKOUT_ORDER = ['Octavos', 'Cuartos', 'Semifinal', 'Final']

function sortTabs(keys: string[]) {
  const groups = keys.filter((k) => k.startsWith('Grupo')).sort()
  const knockout = KNOCKOUT_ORDER.filter((k) => keys.includes(k))
  return [...groups, ...knockout]
}

export function FixtureTabs({
  grouped,
  predictions,
}: {
  grouped: GroupedMatches
  predictions: PredictionMap
}) {
  const tabs = sortTabs(Object.keys(grouped))
  const [active, setActive] = useState(tabs[0] ?? '')

  if (!tabs.length) {
    return (
      <div
        className="rounded-[24px] bg-panel p-16 text-center"
        style={{ border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <p className="font-display text-[20px] tracking-[-0.01em] uppercase mb-2">
          El fixture se publicará próximamente
        </p>
        <p className="text-muted text-[14px]">Volvé cuando arranque el torneo.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            className={clsx(
              'px-4 py-2 rounded-full text-[12px] font-extrabold tracking-[0.08em] uppercase transition-all duration-150',
              active === tab
                ? 'bg-orange text-bg'
                : 'text-muted hover:text-white'
            )}
            style={
              active === tab
                ? { boxShadow: '0 6px 18px -8px rgba(255,107,0,.5)' }
                : { background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }
            }
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Matches grid */}
      <div className="grid grid-cols-1 min-[720px]:grid-cols-2 min-[1100px]:grid-cols-3 gap-4">
        {(grouped[active] ?? []).map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            prediction={predictions[match.id] ?? null}
          />
        ))}
      </div>
    </div>
  )
}

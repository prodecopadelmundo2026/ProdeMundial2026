'use client'

import { useState } from 'react'
import clsx from 'clsx'
import type { Match } from '@/types'
import { FixtureTabs } from '@/app/(app)/fixture/FixtureTabs'
import { BracketView } from './BracketView'

type PredMap = Record<string, { home_score: number; away_score: number }>

const TABS = [
  { id: 'grupos', label: 'Grupos' },
  { id: 'eliminatoria', label: 'Fase Eliminatoria' },
] as const

type TabId = (typeof TABS)[number]['id']

interface Props {
  groupMatches: Match[]
  knockoutMatches: Match[]
  predMap: PredMap
  totalPoints: number
  totalPredictions: number
  finishedCount: number
}

export function MiProdeTabs({
  groupMatches,
  knockoutMatches,
  predMap,
  totalPoints,
  totalPredictions,
  finishedCount,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('grupos')

  // Agrupa los partidos de fase de grupos por "Grupo X" para pasarlos a FixtureTabs
  const groupedByGroup: Record<string, Match[]> = {}
  for (const m of groupMatches) {
    if (!m.group) continue
    const key = `Grupo ${m.group}`
    if (!groupedByGroup[key]) groupedByGroup[key] = []
    groupedByGroup[key].push(m)
  }

  return (
    <div className="space-y-6">
      {/* Stats strip */}
      {totalPredictions > 0 && (
        <p className="text-sm text-[#7a7266]">
          {totalPredictions} predicciones
          {finishedCount > 0 && (
            <>
              {' '}·{' '}
              <span className="font-bold text-[#c8a84a]">{totalPoints} pts</span>
            </>
          )}
        </p>
      )}

      {/* Main tabs */}
      <div className="flex gap-2 border-b border-[#272727] pb-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              'px-1 pb-3 text-sm font-semibold tracking-wide transition-colors duration-150 border-b-2 -mb-px',
              activeTab === tab.id
                ? 'border-[#c8a84a] text-[#c8a84a]'
                : 'border-transparent text-[#7a7266] hover:text-[#ede8dc]'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'grupos' ? (
        <FixtureTabs grouped={groupedByGroup} predictions={predMap} />
      ) : (
        <BracketView
          groupMatches={groupMatches}
          knockoutMatches={knockoutMatches}
          predMap={predMap}
        />
      )}
    </div>
  )
}

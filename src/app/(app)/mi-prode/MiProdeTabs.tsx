'use client'

import { useState } from 'react'
import type { Match } from '@/types'
import { GroupBatchEditor } from './GroupBatchEditor'
import { BracketView } from './BracketView'

type PredMap = Record<string, { home_score: number; away_score: number }>

type TabId = 'grupos' | 'eliminatoria'

interface Props {
  groupMatches: Match[]
  knockoutMatches: Match[]
  predMap: PredMap
  tiebreakerMap: Record<string, string>
}

export function MiProdeTabs({
  groupMatches,
  knockoutMatches,
  predMap,
  tiebreakerMap,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('grupos')

  const groupedByGroup: Record<string, Match[]> = {}
  for (const m of groupMatches) {
    if (!m.group) continue
    const key = `Grupo ${m.group}`
    if (!groupedByGroup[key]) groupedByGroup[key] = []
    groupedByGroup[key].push(m)
  }

  return (
    <div>
      {/* Header: h1 + phase tabs inline */}
      <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
        <h1
          className="font-display uppercase leading-[0.94] tracking-[-0.03em]"
          style={{ fontSize: 'clamp(28px, 4.5vw, 40px)' }}
        >
          Mi <em className="italic text-orange">Prode</em>
        </h1>

        {/* Pill tabs */}
        <div
          className="inline-flex items-center gap-1 p-[5px] rounded-full"
          style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {(['grupos', 'eliminatoria'] as TabId[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-[18px] py-[10px] rounded-full font-extrabold text-[13px] transition-all duration-150"
              style={
                activeTab === tab
                  ? { background: '#FF6B00', color: '#0A0A0A' }
                  : { color: '#8A8A8A' }
              }
              onMouseEnter={(e) => {
                if (activeTab !== tab) e.currentTarget.style.color = '#fff'
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab) e.currentTarget.style.color = '#8A8A8A'
              }}
            >
              {tab === 'grupos' ? 'Grupos' : 'Eliminatorias'}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido según tab */}
      {activeTab === 'grupos' ? (
        <GroupBatchEditor grouped={groupedByGroup} predMap={predMap} />
      ) : (
        <BracketView
          groupMatches={groupMatches}
          knockoutMatches={knockoutMatches}
          predMap={predMap}
          initialTiebreakerMap={tiebreakerMap}
        />
      )}
    </div>
  )
}

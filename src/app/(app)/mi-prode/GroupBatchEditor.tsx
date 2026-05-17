'use client'

import { useState } from 'react'
import clsx from 'clsx'
import type { Match } from '@/types'
import { MatchCard } from '@/components/MatchCard'
import { upsertPredictionsBatch } from '@/app/(app)/fixture/actions'

type PredMap = Record<string, { home_score: number; away_score: number }>
type LocalPreds = Record<string, { home: string; away: string }>

function sortTabs(keys: string[]) {
  return keys.filter((k) => k.startsWith('Grupo')).sort()
}

interface Props {
  grouped: Record<string, Match[]>
  predMap: PredMap
}

export function GroupBatchEditor({ grouped, predMap }: Props) {
  const tabs = sortTabs(Object.keys(grouped))
  const [activeTab, setActiveTab] = useState(tabs[0] ?? '')

  const [localPreds, setLocalPreds] = useState<Record<string, LocalPreds>>(() => {
    const init: Record<string, LocalPreds> = {}
    for (const tab of tabs) {
      init[tab] = {}
      for (const match of grouped[tab] ?? []) {
        const pred = predMap[match.id]
        init[tab][match.id] = {
          home: pred?.home_score?.toString() ?? '',
          away: pred?.away_score?.toString() ?? '',
        }
      }
    }
    return init
  })

  const [saveState, setSaveState] = useState<Record<string, 'idle' | 'saving' | 'saved' | 'error'>>({})

  function handleValuesChange(tab: string, matchId: string, home: string, away: string) {
    setLocalPreds((prev) => ({
      ...prev,
      [tab]: { ...prev[tab], [matchId]: { home, away } },
    }))
    setSaveState((prev) => ({ ...prev, [tab]: 'idle' }))
  }

  async function handleSave(tab: string) {
    const tabPreds = localPreds[tab] ?? {}
    const predictions = Object.entries(tabPreds)
      .filter(([, { home, away }]) => home !== '' && away !== '')
      .map(([matchId, { home, away }]) => ({
        matchId,
        homeScore: parseInt(home, 10),
        awayScore: parseInt(away, 10),
      }))
      .filter((p) => !isNaN(p.homeScore) && !isNaN(p.awayScore) && p.homeScore >= 0 && p.awayScore >= 0)

    if (!predictions.length) return

    setSaveState((prev) => ({ ...prev, [tab]: 'saving' }))
    try {
      await upsertPredictionsBatch(predictions)
      setSaveState((prev) => ({ ...prev, [tab]: 'saved' }))
    } catch {
      setSaveState((prev) => ({ ...prev, [tab]: 'error' }))
    }
  }

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

  const tabMatches = grouped[activeTab] ?? []
  const tabPreds = localPreds[activeTab] ?? {}

  const now = new Date()
  const openMatches = tabMatches.filter(
    (m) => m.status === 'upcoming' && now < new Date(m.locked_at)
  )
  const filledCount = openMatches.filter((m) => {
    const p = tabPreds[m.id]
    return p && p.home !== '' && p.away !== ''
  }).length
  const totalOpen = openMatches.length

  const tabSaveState = saveState[activeTab] ?? 'idle'
  const hasSomeFilled = filledCount > 0

  return (
    <div>
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={clsx(
              'px-4 py-2 rounded-full text-[12px] font-extrabold tracking-[0.08em] uppercase transition-all duration-150',
              activeTab === tab ? 'bg-orange text-bg' : 'text-muted hover:text-white'
            )}
            style={
              activeTab === tab
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
        {tabMatches.map((match) => {
          const p = tabPreds[match.id] ?? { home: '', away: '' }
          return (
            <MatchCard
              key={match.id}
              match={match}
              noAutosave
              initialHome={p.home}
              initialAway={p.away}
              onValuesChange={(home, away) => handleValuesChange(activeTab, match.id, home, away)}
            />
          )
        })}
      </div>

      {/* Save button */}
      {totalOpen > 0 && (
        <div className="mt-6 flex items-center justify-between gap-4">
          <span className="text-[13px] text-muted font-semibold">
            {filledCount}/{totalOpen} completados
          </span>
          <button
            onClick={() => handleSave(activeTab)}
            disabled={!hasSomeFilled || tabSaveState === 'saving'}
            className="px-6 py-2.5 rounded-full text-[13px] font-extrabold tracking-[0.06em] uppercase transition-all duration-150 disabled:opacity-40"
            style={{
              background: tabSaveState === 'saved' ? '#A8F0D8' : '#FF6B00',
              color: tabSaveState === 'saved' ? '#0A0A0A' : '#fff',
              boxShadow:
                hasSomeFilled && tabSaveState !== 'saving'
                  ? '0 6px 18px -8px rgba(255,107,0,.5)'
                  : 'none',
            }}
          >
            {tabSaveState === 'saving'
              ? 'Guardando...'
              : tabSaveState === 'saved'
              ? 'Guardado'
              : tabSaveState === 'error'
              ? 'Error — reintentar'
              : `Guardar ${activeTab}`}
          </button>
        </div>
      )}
    </div>
  )
}

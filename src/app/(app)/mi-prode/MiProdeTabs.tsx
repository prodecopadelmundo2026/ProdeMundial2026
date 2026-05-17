'use client'

import { useState } from 'react'
import clsx from 'clsx'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Match, Prediction } from '@/types'
import { StatusBadge } from '@/components/StatusBadge'
import { BracketView } from './BracketView'

type PredictionWithMatch = Prediction & { match: Match }
type PredMap = Record<string, { home_score: number; away_score: number }>

function PointsBadge({ points }: { points: number | null }) {
  if (points === null) return null
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-sm px-2.5 py-0.5 text-xs font-bold tabular-nums border',
        points === 3 && 'bg-[#c8a84a]/10 border-[#c8a84a]/30 text-[#c8a84a]',
        points === 1 && 'bg-[#1c1c1c] border-[#272727] text-[#7a7266]',
        points === 0 && 'bg-[#1c1c1c] border-[#272727] text-[#3a3630]'
      )}
    >
      {points === 3 ? '3 pts' : points === 1 ? '1 pt' : '0 pts'}
    </span>
  )
}

function GroupPredictionsList({ predictions }: { predictions: PredictionWithMatch[] }) {
  const groupPredictions = predictions.filter((p) => p.match.stage === 'group')

  if (!groupPredictions.length) {
    return (
      <div className="text-center py-12 text-[#7a7266]">
        <p className="text-sm">Todavía no predijiste ningún partido de grupos.</p>
        <p className="text-xs mt-1">Entrá al Fixture para empezar.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {groupPredictions.map((pred) => {
        const isFinished = pred.match.status === 'finished'
        return (
          <div
            key={pred.id}
            className="bg-[#131313] border border-[#272727] px-5 py-4"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-[#7a7266]">
                {format(new Date(pred.match.scheduled_at), 'd MMM · HH:mm', { locale: es })}
                {pred.match.group && (
                  <span className="ml-2 text-[#3a3630]">Grupo {pred.match.group}</span>
                )}
              </span>
              <StatusBadge match={pred.match} />
            </div>

            <div className="flex items-center justify-between gap-4 flex-wrap">
              <p className="font-medium text-[#ede8dc]">
                {pred.match.home_team}{' '}
                <span className="text-[#3a3630] font-normal">vs</span>{' '}
                {pred.match.away_team}
              </p>

              <div className="flex items-center gap-3 text-sm">
                <span className="text-[#7a7266]">
                  Mi pronóstico:{' '}
                  <span className="font-semibold text-[#ede8dc] tabular-nums">
                    {pred.home_score} - {pred.away_score}
                  </span>
                </span>

                {isFinished && (
                  <>
                    <span className="text-[#272727]">·</span>
                    <span className="text-[#7a7266]">
                      Real:{' '}
                      <span className="font-semibold text-[#ede8dc] tabular-nums">
                        {pred.match.home_score} - {pred.match.away_score}
                      </span>
                    </span>
                    <PointsBadge points={pred.points} />
                  </>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

const TABS = [
  { id: 'grupos', label: 'Grupos' },
  { id: 'eliminatoria', label: 'Fase Eliminatoria' },
] as const

type TabId = (typeof TABS)[number]['id']

interface Props {
  groupMatches: Match[]
  knockoutMatches: Match[]
  predictions: PredictionWithMatch[]
  predMap: PredMap
  totalPoints: number
  totalPredictions: number
  finishedCount: number
}

export function MiProdeTabs({
  groupMatches,
  knockoutMatches,
  predictions,
  predMap,
  totalPoints,
  totalPredictions,
  finishedCount,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('grupos')

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
        <GroupPredictionsList predictions={predictions} />
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

'use client'

import { useState, useTransition } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Check, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import type { Match } from '@/types'
import { StatusBadge } from '@/components/StatusBadge'
import { upsertPrediction } from './actions'

type PredictionMap = Record<string, { home_score: number; away_score: number }>
type GroupedMatches = Record<string, Match[]>

const KNOCKOUT_ORDER = ['Octavos', 'Cuartos', 'Semifinal', 'Final']

function sortTabs(keys: string[]) {
  const groups = keys.filter((k) => k.startsWith('Grupo')).sort()
  const knockout = KNOCKOUT_ORDER.filter((k) => keys.includes(k))
  return [...groups, ...knockout]
}

function isMatchOpen(match: Match) {
  return match.status === 'upcoming' && new Date() < new Date(match.locked_at)
}

function PredictionForm({
  match,
  existing,
}: {
  match: Match
  existing: { home_score: number; away_score: number } | null
}) {
  const open = isMatchOpen(match)
  const [home, setHome] = useState(existing?.home_score?.toString() ?? '')
  const [away, setAway] = useState(existing?.away_score?.toString() ?? '')
  const [saved, setSaved] = useState(!!existing)
  const [isPending, startTransition] = useTransition()

  const isDirty =
    home !== (existing?.home_score?.toString() ?? '') ||
    away !== (existing?.away_score?.toString() ?? '')

  const canSave =
    open &&
    home !== '' &&
    away !== '' &&
    !isNaN(Number(home)) &&
    !isNaN(Number(away)) &&
    Number(home) >= 0 &&
    Number(away) >= 0 &&
    (isDirty || !saved)

  function handleSave() {
    startTransition(async () => {
      await upsertPrediction(match.id, Number(home), Number(away))
      setSaved(true)
    })
  }

  if (!open && !existing) {
    return (
      <p className="text-xs text-gray-300 mt-3 text-right">Sin predicción</p>
    )
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between gap-3">
      <span className="text-xs text-gray-400 shrink-0">Tu predicción</span>

      <div className="flex items-center gap-2">
        {open ? (
          <>
            <input
              type="number"
              min={0}
              max={20}
              value={home}
              onChange={(e) => { setHome(e.target.value); setSaved(false) }}
              className="w-10 text-center text-sm font-semibold border border-gray-200 rounded-lg py-1 focus:outline-none focus:border-green-500 tabular-nums"
              placeholder="—"
            />
            <span className="text-gray-300 font-light">—</span>
            <input
              type="number"
              min={0}
              max={20}
              value={away}
              onChange={(e) => { setAway(e.target.value); setSaved(false) }}
              className="w-10 text-center text-sm font-semibold border border-gray-200 rounded-lg py-1 focus:outline-none focus:border-green-500 tabular-nums"
              placeholder="—"
            />
            <button
              onClick={handleSave}
              disabled={!canSave || isPending}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition',
                saved && !isDirty
                  ? 'bg-green-50 text-green-600'
                  : canSave
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-300 cursor-not-allowed'
              )}
              style={canSave && !(saved && !isDirty) ? { backgroundColor: '#0a3d1f' } : {}}
            >
              {isPending ? (
                <Loader2 size={12} className="animate-spin" />
              ) : saved && !isDirty ? (
                <>
                  <Check size={12} />
                  Guardado
                </>
              ) : (
                'Guardar'
              )}
            </button>
          </>
        ) : (
          <span className="text-sm font-semibold text-gray-700 tabular-nums">
            {existing ? `${existing.home_score} — ${existing.away_score}` : '—'}
          </span>
        )}
      </div>
    </div>
  )
}

function MatchCard({
  match,
  prediction,
}: {
  match: Match
  prediction: { home_score: number; away_score: number } | null
}) {
  const isFinished = match.status === 'finished'

  return (
    <div className="bg-white rounded-xl px-5 py-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <StatusBadge match={match} />
        <span className="text-xs text-gray-400">
          {format(new Date(match.scheduled_at), 'd MMM · HH:mm', { locale: es })}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 font-semibold text-gray-800">
          <span>{match.home_team}</span>
          {isFinished ? (
            <span className="text-gray-900 font-bold tabular-nums px-2">
              {match.home_score} - {match.away_score}
            </span>
          ) : (
            <span className="text-gray-300 font-normal text-sm">vs</span>
          )}
          <span>{match.away_team}</span>
        </div>

        {!isFinished && match.status !== 'live' && match.group && (
          <span className="text-xs text-gray-300">Grupo {match.group}</span>
        )}
      </div>

      <PredictionForm match={match} existing={prediction} />
    </div>
  )
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
      <div className="text-center py-16 text-gray-400">
        <p className="text-lg font-medium">El fixture se publicará próximamente.</p>
        <p className="text-sm mt-1">Volvé a revisar cuando arranque el torneo.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            className={clsx(
              'px-3 py-1.5 rounded-lg text-sm font-medium transition',
              active === tab
                ? 'text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
            style={active === tab ? { backgroundColor: '#0a3d1f' } : {}}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Matches */}
      <div className="space-y-3">
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

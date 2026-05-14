'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { useForm, type FieldValues, type UseFormRegister } from 'react-hook-form'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Check, Loader2, Lock } from 'lucide-react'
import clsx from 'clsx'
import type { Match } from '@/types'
import { StatusBadge } from '@/components/StatusBadge'
import { savePredictions } from './actions'

type PredictionMap = Record<string, { home_score: number; away_score: number }>
type GroupedMatches = Record<string, Match[]>
type SaveState = Awaited<ReturnType<typeof savePredictions>>

const KNOCKOUT_ORDER = ['Octavos', 'Cuartos', 'Semifinal', 'Final']
const initialSaveState: SaveState = { ok: false, message: null }

function sortTabs(keys: string[]) {
  const groups = keys.filter((k) => k.startsWith('Grupo')).sort()
  const knockout = KNOCKOUT_ORDER.filter((k) => keys.includes(k))
  return [...groups, ...knockout]
}

function isMatchOpen(match: Match) {
  return match.status === 'upcoming' && new Date() < new Date(match.locked_at)
}

function SaveButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#0a3d1f] px-4 py-3 text-base font-bold text-white transition hover:bg-[#0f4f2a] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 sm:w-auto"
    >
      {pending ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
      Guardar
    </button>
  )
}

function PredictionFields({
  match,
  existing,
  register,
}: {
  match: Match
  existing: { home_score: number; away_score: number } | null
  register: UseFormRegister<FieldValues>
}) {
  const open = isMatchOpen(match)

  if (!open) {
    return (
      <div className="mt-3 flex items-center justify-between border-t border-gray-50 pt-3 text-sm">
        <span className="flex items-center gap-1.5 text-gray-400">
          <Lock size={14} />
          Cerrado
        </span>
        <span className="font-semibold tabular-nums text-gray-700">
          {existing ? `${existing.home_score} - ${existing.away_score}` : 'Sin pronostico'}
        </span>
      </div>
    )
  }

  return (
    <div className="mt-3 flex items-center justify-between gap-3 border-t border-gray-50 pt-3">
      <input type="hidden" name="match_id" value={match.id} />
      <span className="text-xs text-gray-400">Tu pronostico</span>

      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          max={30}
          inputMode="numeric"
          defaultValue={existing?.home_score ?? ''}
          {...register(`home_${match.id}`, { min: 0, max: 30 })}
          className="h-11 w-14 rounded-lg border border-gray-200 text-center text-base font-semibold tabular-nums focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600/10"
          aria-label={`Goles de ${match.home_team}`}
        />
        <span className="text-gray-300">-</span>
        <input
          type="number"
          min={0}
          max={30}
          inputMode="numeric"
          defaultValue={existing?.away_score ?? ''}
          {...register(`away_${match.id}`, { min: 0, max: 30 })}
          className="h-11 w-14 rounded-lg border border-gray-200 text-center text-base font-semibold tabular-nums focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-600/10"
          aria-label={`Goles de ${match.away_team}`}
        />
      </div>
    </div>
  )
}

function MatchCard({
  match,
  prediction,
  register,
}: {
  match: Match
  prediction: { home_score: number; away_score: number } | null
  register: UseFormRegister<FieldValues>
}) {
  const isFinished = match.status === 'finished'

  return (
    <div className="rounded-xl border border-gray-100 bg-white px-4 py-4 shadow-sm sm:px-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <StatusBadge match={match} />
        <span className="text-xs text-gray-400">
          {format(new Date(match.scheduled_at), 'd MMM - HH:mm', { locale: es })}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 text-sm font-semibold text-gray-800 sm:text-base">
          <span className="break-words">{match.home_team}</span>
          {isFinished ? (
            <span className="px-2 font-bold tabular-nums text-gray-900">
              {match.home_score} - {match.away_score}
            </span>
          ) : (
            <span className="px-2 text-sm font-normal text-gray-300">vs</span>
          )}
          <span className="break-words">{match.away_team}</span>
        </div>

        {!isFinished && match.status !== 'live' && match.group && (
          <span className="shrink-0 text-xs text-gray-300">Grupo {match.group}</span>
        )}
      </div>

      <PredictionFields match={match} existing={prediction} register={register} />
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
  const [state, formAction] = useActionState(savePredictions, initialSaveState)
  const { register } = useForm()
  const activeMatches = grouped[active] ?? []
  const hasOpenMatches = activeMatches.some(isMatchOpen)

  if (!tabs.length) {
    return (
      <div className="py-16 text-center text-gray-400">
        <p className="text-lg font-medium">El fixture se publicara pronto.</p>
        <p className="mt-1 text-sm">Volve a revisar cuando arranque el torneo.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex gap-1.5 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActive(tab)}
            className={clsx(
              'min-h-10 shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition',
              active === tab
                ? 'bg-[#0a3d1f] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <form action={formAction} className="space-y-3">
        {activeMatches.map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            prediction={predictions[match.id] ?? null}
            register={register}
          />
        ))}

        <div className="sticky bottom-0 -mx-4 border-t border-gray-100 bg-gray-50/95 px-4 py-4 backdrop-blur sm:static sm:mx-0 sm:flex sm:items-center sm:justify-between sm:border-0 sm:bg-transparent sm:px-0">
          <p
            className={clsx(
              'mb-3 min-h-5 text-sm sm:mb-0',
              state.message && state.ok && 'text-green-700',
              state.message && !state.ok && 'text-red-600',
              !state.message && 'text-gray-400'
            )}
          >
            {state.message ?? (hasOpenMatches ? 'Carga tus resultados y guarda una vez.' : 'No hay partidos abiertos en esta seccion.')}
          </p>
          <SaveButton disabled={!hasOpenMatches} />
        </div>
      </form>
    </div>
  )
}

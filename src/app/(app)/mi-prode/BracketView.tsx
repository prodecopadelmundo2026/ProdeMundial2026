'use client'

import { useState } from 'react'
import clsx from 'clsx'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Match } from '@/types'
import { getTeam } from '@/lib/teams'
import { computeAllStandings, resolveTeam } from '@/lib/bracket'

type PredMap = Record<string, { home_score: number; away_score: number }>

interface Props {
  groupMatches: Match[]
  knockoutMatches: Match[]
  predMap: PredMap
}

const ROUND_ORDER = ['round_of_32', 'round_of_16', 'quarter', 'semi', 'final'] as const
const ROUND_LABELS: Record<string, string> = {
  round_of_32: '32avos',
  round_of_16: 'Octavos',
  quarter: 'Cuartos',
  semi: 'Semis',
  final: 'Final',
}

function isPlaceholder(name: string) {
  return name.includes('°') || name.startsWith('Ganador') || name.startsWith('Perdedor') || name === 'Mejor 3°'
}

function BracketMatchCard({
  match,
  homeTeam,
  awayTeam,
  pred,
}: {
  match: Match
  homeTeam: string
  awayTeam: string
  pred?: { home_score: number; away_score: number }
}) {
  const home = getTeam(homeTeam)
  const away = getTeam(awayTeam)
  const homePH = isPlaceholder(homeTeam)
  const awayPH = isPlaceholder(awayTeam)

  return (
    <div className="bg-[#131313] border border-[#272727] overflow-hidden">
      {/* Date */}
      <div className="px-4 pt-3 pb-2 border-b border-[#1e1e1e]">
        <span className="text-[11px] text-[#7a7266] tracking-wide">
          {format(new Date(match.scheduled_at), "d MMM · HH:mm", { locale: es })} hs
        </span>
      </div>

      {/* Teams */}
      <div className="px-4 py-3 space-y-3">
        {/* Home */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {!homePH && <span className="text-lg leading-none">{home.flag}</span>}
            <span
              className={clsx(
                'text-sm font-semibold truncate',
                homePH ? 'text-[#3a3630] italic' : 'text-[#ede8dc]'
              )}
            >
              {homeTeam}
            </span>
          </div>
          {pred && (
            <span className="text-sm font-bold tabular-nums text-[#c8a84a]">
              {pred.home_score}
            </span>
          )}
        </div>

        <div className="border-t border-[#1e1e1e]" />

        {/* Away */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {!awayPH && <span className="text-lg leading-none">{away.flag}</span>}
            <span
              className={clsx(
                'text-sm font-semibold truncate',
                awayPH ? 'text-[#3a3630] italic' : 'text-[#ede8dc]'
              )}
            >
              {awayTeam}
            </span>
          </div>
          {pred && (
            <span className="text-sm font-bold tabular-nums text-[#c8a84a]">
              {pred.away_score}
            </span>
          )}
        </div>
      </div>

      {pred && (
        <div className="px-4 pb-2">
          <span className="text-[10px] text-[#7a7266] tracking-[0.15em] uppercase">Mi pronóstico</span>
        </div>
      )}
    </div>
  )
}

export function BracketView({ groupMatches, knockoutMatches, predMap }: Props) {
  const standings = computeAllStandings(groupMatches, predMap)

  // Group knockout matches by stage, excluding third_place (show with final)
  const byRound: Record<string, Match[]> = {}
  for (const m of knockoutMatches) {
    const key = m.stage === 'third_place' ? 'final' : m.stage
    if (!byRound[key]) byRound[key] = []
    byRound[key].push(m)
  }

  // Only show rounds that have matches
  const availableRounds = ROUND_ORDER.filter((r) => byRound[r]?.length)
  const [activeRound, setActiveRound] = useState(availableRounds[0] ?? 'round_of_32')

  const hasGroupPredictions = groupMatches.some((m) => predMap[m.id])

  return (
    <div className="space-y-6">
      {!hasGroupPredictions && (
        <div className="bg-[#131313] border border-[#272727] px-5 py-4 text-sm text-[#7a7266]">
          Completá tus predicciones de grupos para ver los equipos clasificados en el bracket.
        </div>
      )}

      {/* Round tabs */}
      <div className="flex flex-wrap gap-2">
        {availableRounds.map((round) => (
          <button
            key={round}
            onClick={() => setActiveRound(round)}
            className={clsx(
              'px-4 py-2 rounded-full text-[12px] font-extrabold tracking-[0.08em] uppercase transition-all duration-150',
              activeRound === round
                ? 'bg-[#c8a84a] text-[#0a0a0a]'
                : 'text-[#7a7266] hover:text-[#ede8dc]'
            )}
            style={
              activeRound === round
                ? { boxShadow: '0 6px 18px -8px rgba(200,168,74,.5)' }
                : { background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }
            }
          >
            {ROUND_LABELS[round]}
          </button>
        ))}
      </div>

      {/* Matches grid */}
      <div className="grid grid-cols-1 min-[600px]:grid-cols-2 min-[960px]:grid-cols-3 min-[1200px]:grid-cols-4 gap-3">
        {(byRound[activeRound] ?? [])
          .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
          .map((match) => {
            const homeTeam = resolveTeam(match.home_team, standings)
            const awayTeam = resolveTeam(match.away_team, standings)
            const pred = predMap[match.id]
            return (
              <BracketMatchCard
                key={match.id}
                match={match}
                homeTeam={homeTeam}
                awayTeam={awayTeam}
                pred={pred}
              />
            )
          })}
      </div>

      {/* Third place (shown alongside final) */}
      {activeRound === 'final' && byRound['final']?.some((m) => m.stage === 'third_place') && (
        <div>
          <p className="text-xs tracking-[0.2em] uppercase text-[#7a7266] mb-3">3° Puesto</p>
          <div className="grid grid-cols-1 min-[600px]:grid-cols-2 gap-3">
            {byRound['final']
              .filter((m) => m.stage === 'third_place')
              .map((match) => (
                <BracketMatchCard
                  key={match.id}
                  match={match}
                  homeTeam={resolveTeam(match.home_team, standings)}
                  awayTeam={resolveTeam(match.away_team, standings)}
                  pred={predMap[match.id]}
                />
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

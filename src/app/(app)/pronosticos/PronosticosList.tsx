'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { ArrowRight, Search } from 'lucide-react'
import {
  formatAverageScore,
  formatPickedResult,
  hasVirtualTrajectoryInsights,
  percent,
  statusLabel,
  stageLabel,
  type PredictionMatchCardData,
} from '@/lib/prediction-insights'
import { VirtualTrajectoryInsights } from '@/components/VirtualTrajectoryInsights'
import { flagUrl, getTeam } from '@/lib/teams'

function TeamFlag({ team }: { team: string }) {
  const meta = getTeam(team)
  return meta.iso2 ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={flagUrl(meta.iso2)} alt="" className="inline-block h-[22px] w-[30px] rounded-sm object-cover" />
  ) : <span>{meta.flag}</span>
}

type Filter = 'all' | 'upcoming' | 'live' | 'finished'

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'upcoming', label: 'Próximos' },
  { id: 'live', label: 'En vivo' },
  { id: 'finished', label: 'Finalizados' },
]

function sortMatches(matches: PredictionMatchCardData[]) {
  const bucket = { live: 0, upcoming: 1, finished: 2 }

  return [...matches].sort((a, b) => {
    const bucketDiff = bucket[a.status] - bucket[b.status]
    if (bucketDiff !== 0) return bucketDiff

    const dateA = new Date(a.scheduled_at).getTime()
    const dateB = new Date(b.scheduled_at).getTime()
    return a.status === 'finished' ? dateB - dateA : dateA - dateB
  })
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'rounded-full px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.08em] transition-all active:scale-[0.98]',
        active ? 'bg-orange text-bg' : 'text-muted hover:text-white'
      )}
      style={
        active
          ? { boxShadow: '0 6px 18px -8px rgba(255,107,0,.75)' }
          : { background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }
      }
    >
      {label}
    </button>
  )
}

function MiniBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const width = percent(value, total)

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="truncate text-[11px] font-bold text-[#cfcfcf]">{label}</span>
        <span className="font-display text-[18px] leading-none tabular-nums" style={{ color }}>
          {width}%
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full" style={{ width: `${width}%`, background: color }} />
      </div>
    </div>
  )
}

function MatchPredictionCard({ match }: { match: PredictionMatchCardData }) {
  const isScored = match.status === 'live' || match.status === 'finished'
  const exactCrossingCount = match.trajectory?.exactCrossing.length ?? 0
  const hasTrajectoryInsights = hasVirtualTrajectoryInsights(match.trajectory)
  const statusTone =
    match.status === 'live'
      ? { bg: 'rgba(255,59,59,0.12)', color: '#FF6B6B' }
      : match.status === 'finished'
      ? { bg: 'rgba(255,255,255,0.06)', color: '#9a9a9a' }
      : { bg: 'rgba(255,107,0,0.12)', color: '#FF6B00' }

  return (
    <article
      className="tap-card rounded-[22px] bg-panel p-4 min-[760px]:p-5"
      style={{ border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span
              className="rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em]"
              style={statusTone}
            >
              {statusLabel(match.status)}
            </span>
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
              {stageLabel(match.stage, match.group)}
            </span>
          </div>
          <h2 className="flex flex-wrap items-center gap-2 font-display text-[clamp(24px,4vw,38px)] uppercase leading-none tracking-[-0.02em]">
            <TeamFlag team={match.home_team} /> {match.home_team} <span className="text-orange">vs</span> <TeamFlag team={match.away_team} /> {match.away_team}
          </h2>
          <p className="mt-3 font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
            {isScored && match.home_score != null && match.away_score != null
              ? `${match.home_score}-${match.away_score} · 90 min${match.status === 'live' ? ' parcial' : ''}`
              : `${match.kickoff_label} ART`}
          </p>
        </div>
        <div
          className="grid min-h-[74px] w-[96px] shrink-0 place-items-center rounded-[16px] bg-[#0A0A0A] px-2 py-3 text-center"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="min-w-0">
            <p className="font-display text-[30px] leading-none tabular-nums">
              {match.trajectory ? exactCrossingCount : match.insights.total_count}
            </p>
            <p className="mt-1 font-mono text-[9px] font-extrabold uppercase leading-tight tracking-[0.12em] text-muted">
              {match.trajectory
                ? exactCrossingCount === 1 ? 'Cruce exacto' : 'Cruces exactos'
                : 'Cargados'}
            </p>
          </div>
        </div>
      </div>

      {match.trajectory && hasTrajectoryInsights ? (
        <div className="mt-5 rounded-[14px] bg-[#0A0A0A] p-4" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          <VirtualTrajectoryInsights homeTeam={match.home_team} awayTeam={match.away_team} data={match.trajectory} compact />
        </div>
      ) : match.insights.total_count > 0 ? (
        <div className="mt-5 grid gap-5 min-[920px]:grid-cols-[1fr_0.9fr]">
          <div className="grid gap-3">
            <MiniBar label={`Gana ${match.home_team}`} value={match.insights.home_count} total={match.insights.total_count} color="#A8F0D8" />
            <MiniBar label="Empate" value={match.insights.draw_count} total={match.insights.total_count} color="#FFE040" />
            <MiniBar label={`Gana ${match.away_team}`} value={match.insights.away_count} total={match.insights.total_count} color="#FF6B00" />
          </div>
          <div className="grid gap-3">
            <div className="rounded-[14px] bg-[#0A0A0A] p-3" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="font-mono text-[9px] font-extrabold uppercase tracking-[0.16em] text-muted">Resultado más elegido</p>
              <p className="mt-1 text-[14px] font-extrabold">{formatPickedResult(match.insights.most_picked_home_score, match.insights.most_picked_away_score, match.insights.most_picked_count)}</p>
            </div>
            <div className="rounded-[14px] bg-[#0A0A0A] p-3" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="font-mono text-[9px] font-extrabold uppercase tracking-[0.16em] text-muted">Promedio esperado</p>
              <p className="mt-1 text-[14px] font-extrabold">{formatAverageScore(match.home_team, match.away_team, match.insights)}</p>
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-5 rounded-[14px] bg-[#0A0A0A] p-4 text-[13px] font-semibold text-muted" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          Todavía no hay pronósticos cargados para este partido.
        </p>
      )}

      <div className="mt-5 flex justify-end">
        <Link
          href={`/pronosticos/${match.id}`}
          className="inline-flex items-center gap-2 rounded-full bg-orange px-4 py-2.5 text-[12px] font-extrabold text-bg transition-transform hover:-translate-y-0.5"
        >
          Ver detalle
          <ArrowRight size={15} strokeWidth={3} />
        </Link>
      </div>
    </article>
  )
}

export function PronosticosList({ matches }: { matches: PredictionMatchCardData[] }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const filteredMatches = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return sortMatches(matches).filter((match) => {
      const statusMatches = filter === 'all' || match.status === filter
      const queryMatches =
        normalizedQuery.length === 0 ||
        match.home_team.toLowerCase().includes(normalizedQuery) ||
        match.away_team.toLowerCase().includes(normalizedQuery)

      return statusMatches && queryMatches
    })
  }, [filter, matches, query])

  return (
    <div>
      <div className="mb-6 grid gap-3 min-[760px]:grid-cols-[minmax(260px,420px)_1fr] min-[760px]:items-center">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar equipo"
            className="w-full rounded-[16px] bg-[#0A0A0A] py-3 pl-11 pr-4 text-[14px] font-semibold text-white placeholder:text-muted"
            style={{ border: '1px solid rgba(255,255,255,0.1)' }}
          />
        </label>
        <div className="flex flex-wrap gap-2 min-[760px]:justify-end">
          {FILTERS.map((item) => (
            <FilterChip
              key={item.id}
              label={item.label}
              active={filter === item.id}
              onClick={() => setFilter(item.id)}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        {filteredMatches.map((match) => (
          <MatchPredictionCard key={match.id} match={match} />
        ))}
      </div>

      {filteredMatches.length === 0 && (
        <div
          className="rounded-[24px] bg-panel p-12 text-center"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <p className="font-display text-[22px] uppercase leading-none">Sin partidos</p>
          <p className="mt-2 text-[13px] font-semibold text-muted">Probá con otro equipo o filtro.</p>
        </div>
      )}
    </div>
  )
}

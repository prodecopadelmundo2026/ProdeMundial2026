'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useState, useMemo } from 'react'
import clsx from 'clsx'
import type { Match } from '@/types'
import { getTeam, flagUrl } from '@/lib/teams'
import { compareMatchesByProductScheduleAsc, formatMatchDayKeyArgentina, formatMatchDayLabelArgentina, formatMatchKickoffArgentina, formatMatchTimeArgentina } from '@/lib/match-datetime'
import { buildGroupTableRows, buildOfficialGroupScoreMap } from '@/lib/group-standings'
import { GroupStandingsTables, type GroupTableSection } from '@/components/GroupStandingsTables'

function TeamFlag({ iso2, fallback }: { iso2: string; fallback: string }) {
  return (
    <div
      className="grid h-4 w-6 shrink-0 place-items-center overflow-hidden rounded-[2px]"
      style={{ background: '#1a1a1a' }}
    >
      {iso2 ? (
        <img src={flagUrl(iso2)} alt="" style={{ width: '24px', height: '16px', objectFit: 'cover' }} />
      ) : (
        <span className="text-[11px] leading-none">{fallback}</span>
      )}
    </div>
  )
}

function MatchRow({ match }: { match: Match }) {
  const home = getTeam(match.home_team)
  const away = getTeam(match.away_team)
  const isLive = match.status === 'live'
  const isFinished = match.status === 'finished'
  const isScored = isLive || isFinished
  const groupAnchor = match.stage === 'group' && match.group ? `tabla-grupo-${match.group}` : null
  const time = formatMatchTimeArgentina(match.scheduled_at)

  const stageLabel =
    match.stage !== 'group'
      ? STAGE_LABELS[match.stage] ?? match.stage
      : match.group
      ? `Grupo ${match.group}`
      : ''

  function goToGroupTable() {
    if (!groupAnchor) return
    const target = document.getElementById(groupAnchor)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
      window.history.replaceState(null, '', `#${groupAnchor}`)
    }
  }

  return (
    <div
      className={clsx(
        'tap-card flex items-center gap-3 px-4 py-3 border-b border-[#1a1a1a] last:border-0 hover:bg-white/[0.025] transition-colors',
        groupAnchor && 'cursor-pointer'
      )}
      role={groupAnchor ? 'link' : undefined}
      tabIndex={groupAnchor ? 0 : undefined}
      onClick={goToGroupTable}
      onKeyDown={(event) => {
        if (!groupAnchor) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          goToGroupTable()
        }
      }}
      aria-label={groupAnchor ? `Ir a la tabla del Grupo ${match.group}` : undefined}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: isLive ? '#FF3B3B' : isFinished ? '#3a3a3a' : '#FF6B00' }}
      />

      <span className="w-9 shrink-0 font-mono text-[11px] text-muted">{time}</span>

      {stageLabel && (
        match.stage === 'group' && match.group ? (
          <a
            href={`#tabla-grupo-${match.group}`}
            onClick={(event) => event.stopPropagation()}
            className="hidden shrink-0 rounded-[4px] px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.12em] transition-colors hover:text-white min-[520px]:block"
            style={{ background: '#1a1a1a', color: '#8A8A8A' }}
            aria-label={`Ver tabla del Grupo ${match.group}`}
          >
            {stageLabel}
          </a>
        ) : (
          <span
            className="hidden min-[520px]:block text-[9px] font-extrabold tracking-[0.12em] uppercase shrink-0 px-1.5 py-0.5 rounded-[4px]"
            style={{ background: '#1a1a1a', color: '#5a5a5a' }}
          >
            {stageLabel}
          </span>
        )
      )}

      {/* Home */}
      <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 min-[520px]:gap-2">
        <span className="hidden truncate text-right text-[13px] font-semibold min-[520px]:block">{match.home_team}</span>
        <TeamFlag iso2={home.iso2} fallback={home.flag} />
        <span className="font-mono text-[11px] font-extrabold uppercase tracking-[0.06em] text-white min-[520px]:hidden">
          {home.displayCode}
        </span>
      </div>

      {/* Center: real result when available, otherwise just VS */}
      <div className="w-9 shrink-0 text-center min-[520px]:w-[60px]">
        {isScored ? (
          <span className="font-display text-[15px] tracking-[-0.02em]">
            {match.home_score}-{match.away_score}
          </span>
        ) : (
          <span className="text-muted text-[11px] tracking-[0.12em] font-bold">VS</span>
        )}
      </div>

      {/* Away */}
      <div className="flex min-w-0 flex-1 items-center gap-1.5 min-[520px]:gap-2">
        <span className="font-mono text-[11px] font-extrabold uppercase tracking-[0.06em] text-white min-[520px]:hidden">
          {away.displayCode}
        </span>
        <TeamFlag iso2={away.iso2} fallback={away.flag} />
        <span className="hidden truncate text-[13px] font-semibold min-[520px]:block">{match.away_team}</span>
      </div>

      {/* Right: status */}
      <div className="shrink-0 w-[78px] text-right">
        {isLive && (
          <span className="text-[10px] font-extrabold tracking-[0.06em] text-[#FF3B3B]">EN VIVO</span>
        )}
        {isFinished && (
          <div>
            <span className="text-[10px] font-bold text-muted">Final</span>
            <Link
              href={`/pronosticos/${match.id}#puntos-partido`}
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
              className="mt-1 inline-flex rounded-full bg-orange px-2 py-1 text-[9px] font-extrabold uppercase tracking-[0.06em] text-bg transition-colors hover:bg-white"
            >
              Ver puntos
            </Link>
          </div>
        )}
        {match.stage === 'group' && match.group && (
          <a
            href={`#tabla-grupo-${match.group}`}
            onClick={(event) => event.stopPropagation()}
            className="mt-0.5 block text-[9px] font-extrabold uppercase tracking-[0.08em] text-orange hover:text-white"
          >
            Ver grupo
          </a>
        )}
      </div>
    </div>
  )
}

const STAGE_LABELS: Record<string, string> = {
  round_of_32: 'Dieciseisavos',
  round_of_16: 'Octavos',
  quarter: 'Cuartos',
  semi: 'Semis',
  third_place: '3? Puesto',
  final: 'Final',
}

type Filter = 'all' | string
type FixtureMatchesFilter = 'current' | 'live' | 'upcoming' | 'finished' | 'all'

function resolveFixtureMatchesFilter(rawFilter: string | null): FixtureMatchesFilter {
  if (rawFilter === 'live' || rawFilter === 'upcoming' || rawFilter === 'finished' || rawFilter === 'all') {
    return rawFilter
  }
  return 'current'
}

function EmptyFixtureState({
  fixtureFilter,
  nextMatch,
}: {
  fixtureFilter: FixtureMatchesFilter
  nextMatch: Match | null
}) {
  const title =
    fixtureFilter === 'live'
      ? 'No hay partidos en vivo ahora'
      : fixtureFilter === 'upcoming'
      ? 'No hay próximos partidos cargados'
      : fixtureFilter === 'finished'
      ? 'Todavía no hay partidos finalizados'
      : 'El fixture se publicará próximamente'

  return (
    <div
      className="rounded-[24px] px-5 py-12 text-center sm:px-8 sm:py-16"
      style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      <p className="mb-3 font-display text-[20px] uppercase leading-tight tracking-[-0.01em] text-white sm:text-[24px]">
        {title}
      </p>
      {fixtureFilter === 'live' ? (
        nextMatch ? (
          <div className="mx-auto max-w-[520px] space-y-2 text-[14px] font-semibold leading-relaxed text-muted">
            <p>
              El próximo partido es:{' '}
              <span className="text-white">
                {nextMatch.home_team} vs {nextMatch.away_team} · {formatMatchKickoffArgentina(nextMatch.scheduled_at)} ART
              </span>
            </p>
            <p>También podés usar el filtro Próximos para ver los partidos que vienen.</p>
          </div>
        ) : (
          <p className="text-[14px] font-semibold text-muted">No hay partidos en vivo ni próximos cargados.</p>
        )
      ) : (
        <p className="mx-auto max-w-[460px] text-[14px] font-semibold leading-relaxed text-muted">
          {fixtureFilter === 'all' || fixtureFilter === 'current'
            ? 'Volvé cuando esté cargado el calendario.'
            : 'Probá con otro filtro para seguir mirando el fixture.'}
        </p>
      )}
    </div>
  )
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'px-3.5 py-[7px] rounded-full text-[11px] font-extrabold tracking-[0.07em] uppercase transition-all duration-150 active:scale-[0.98]',
        active ? 'bg-orange text-bg' : 'text-muted hover:text-white'
      )}
      style={
        active
          ? { boxShadow: '0 4px 14px -6px rgba(255,107,0,.6)' }
          : { background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }
      }
    >
      {label}
    </button>
  )
}

function mobileGroupSelectLabel(filter: Filter) {
  if (filter === 'all' || filter === 'eliminatoria') return ''
  return filter
}

export function FixtureList({ matches, allMatches = matches }: { matches: Match[]; allMatches?: Match[] }) {
  const searchParams = useSearchParams()
  const fixtureFilter = resolveFixtureMatchesFilter(searchParams.get('matches'))
  const [filter, setFilter] = useState<Filter>('all')
  const nextUpcomingMatch = useMemo(
    () =>
      [...allMatches]
        .filter((match) => match.status === 'upcoming')
        .sort(compareMatchesByProductScheduleAsc)[0] ?? null,
    [allMatches]
  )

  const groups = useMemo(() => {
    const seen = new Set<string>()
    matches.filter((m) => m.stage === 'group' && m.group).forEach((m) => seen.add(m.group!))
    return [...seen].sort()
  }, [matches])

  const hasKnockout = useMemo(() => matches.some((m) => m.stage !== 'group'), [matches])

  const filtered = useMemo(() => {
    if (filter === 'all') return matches
    if (filter === 'eliminatoria') return matches.filter((m) => m.stage !== 'group')
    return matches.filter((m) => m.group === filter)
  }, [matches, filter])

  const days = useMemo(() => {
    const map: Record<string, Match[]> = {}
    const order: string[] = []
    for (const m of filtered) {
      const day = formatMatchDayKeyArgentina(m.scheduled_at)
      if (!map[day]) {
        map[day] = []
        order.push(day)
      }
      map[day].push(m)
    }
    return order
      .map((day) => ({
        day,
        matches: map[day],
      }))
  }, [filtered])

  const officialGroupTables = useMemo<GroupTableSection[]>(() => {
    const groupMatches = allMatches.filter((match) => match.stage === 'group' && match.group)
    const scoreMap = buildOfficialGroupScoreMap(groupMatches)
    const visibleGroups = filter === 'all' || filter === 'eliminatoria'
      ? groups
      : groups.filter((group) => group === filter)

    return visibleGroups.map((group) => {
      const scoped = groupMatches.filter((match) => match.group === group)
      return {
        id: group,
        title: `Grupo ${group}`,
        description: 'Tabla oficial',
        anchorId: `tabla-grupo-${group}`,
        rows: buildGroupTableRows(scoped, scoreMap, {}, `Grupo ${group}`),
        tone: 'official',
      }
    })
  }, [allMatches, filter, groups])

  if (!matches.length) {
    return <EmptyFixtureState fixtureFilter={fixtureFilter} nextMatch={nextUpcomingMatch} />
  }

  return (
    <div>
      {/* Filter chips */}
      <div className="mb-6 flex gap-2 min-[640px]:hidden">
        <FilterChip label="Todos" active={filter === 'all'} onClick={() => setFilter('all')} />
        <select
          value={mobileGroupSelectLabel(filter)}
          onChange={(event) => setFilter(event.target.value || 'all')}
          aria-label="Elegir grupo"
          className={clsx(
            'rounded-full px-3.5 py-[7px] text-[11px] font-extrabold uppercase tracking-[0.07em] outline-none transition-all duration-150',
            filter !== 'all' && filter !== 'eliminatoria' ? 'bg-orange text-bg' : 'text-muted'
          )}
          style={
            filter !== 'all' && filter !== 'eliminatoria'
              ? { boxShadow: '0 4px 14px -6px rgba(255,107,0,.6)' }
              : { background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }
          }
        >
          <option value="">Grupos</option>
          {groups.map((g) => (
            <option key={g} value={g}>{`Grupo ${g}`}</option>
          ))}
        </select>
      </div>

      <div className="mb-6 hidden flex-wrap gap-2 min-[640px]:flex">
        <FilterChip label="Todos" active={filter === 'all'} onClick={() => setFilter('all')} />
        {groups.map((g) => (
          <FilterChip
            key={g}
            label={`Grupo ${g}`}
            active={filter === g}
            onClick={() => setFilter(g)}
          />
        ))}
        {hasKnockout && (
          <FilterChip
            label="Eliminatoria"
            active={filter === 'eliminatoria'}
            onClick={() => setFilter('eliminatoria')}
          />
        )}
      </div>

      {/* Day-grouped list */}
      <div className="space-y-5">
        {days.map(({ day, matches: dayMatches }) => {
          const label = formatMatchDayLabelArgentina(day)
          return (
            <div key={day}>
              <div className="flex items-center gap-3 mb-2 px-1">
                <span
                  className="text-[11px] font-extrabold tracking-[0.18em] uppercase"
                  style={{ color: '#7a7266' }}
                >
                  {label}
                </span>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: '#1a1a1a', color: '#5a5a5a' }}
                >
                  {dayMatches.length} {dayMatches.length === 1 ? 'partido' : 'partidos'}
                </span>
              </div>
              <div
                style={{
                  background: '#0f0f0f',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: '16px',
                  overflow: 'hidden',
                }}
              >
                {dayMatches.map((m) => (
                  <MatchRow key={m.id} match={m} />
                ))}
              </div>
            </div>
          )
        })}
        {days.length === 0 && (
          <p className="text-muted text-[14px] text-center py-12">
            No hay partidos para este filtro.
          </p>
        )}

        {officialGroupTables.length > 0 && (
          <GroupStandingsTables
            title="Tablas oficiales en vivo"
            subtitle="Posiciones reales calculadas con los resultados cargados."
            sections={officialGroupTables}
            controls={false}
          />
        )}
      </div>
    </div>
  )
}

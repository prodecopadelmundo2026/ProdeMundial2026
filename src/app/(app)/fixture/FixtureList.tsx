'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'
import clsx from 'clsx'
import type { Match } from '@/types'
import { getTeam, flagUrl } from '@/lib/teams'
import { formatMatchDayKeyArgentina, formatMatchDayLabelArgentina, formatMatchTimeArgentina } from '@/lib/match-datetime'
import { buildGroupTableRows, buildOfficialGroupScoreMap } from '@/lib/group-standings'
import { GroupStandingsTables, type GroupTableSection } from '@/components/GroupStandingsTables'

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

      <span className="font-mono text-[11px] text-muted w-9 shrink-0">{time}</span>

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
      <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
        <span className="text-[13px] font-semibold truncate text-right">{match.home_team}</span>
        <div
          className="w-6 h-4 overflow-hidden rounded-[2px] shrink-0 grid place-items-center"
          style={{ background: '#1a1a1a' }}
        >
          {home.iso2 ? (
            <img src={flagUrl(home.iso2)} alt="" style={{ width: '24px', height: '16px', objectFit: 'cover' }} />
          ) : (
            <span className="text-[11px] leading-none">{home.flag}</span>
          )}
        </div>
      </div>

      {/* Center: real result when available, otherwise just VS */}
      <div className="shrink-0 w-[60px] text-center">
        {isScored ? (
          <span className="font-display text-[15px] tracking-[-0.02em]">
            {match.home_score}-{match.away_score}
          </span>
        ) : (
          <span className="text-muted text-[11px] tracking-[0.12em] font-bold">VS</span>
        )}
      </div>

      {/* Away */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div
          className="w-6 h-4 overflow-hidden rounded-[2px] shrink-0 grid place-items-center"
          style={{ background: '#1a1a1a' }}
        >
          {away.iso2 ? (
            <img src={flagUrl(away.iso2)} alt="" style={{ width: '24px', height: '16px', objectFit: 'cover' }} />
          ) : (
            <span className="text-[11px] leading-none">{away.flag}</span>
          )}
        </div>
        <span className="text-[13px] font-semibold truncate">{match.away_team}</span>
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

export function FixtureList({ matches, allMatches = matches }: { matches: Match[]; allMatches?: Match[] }) {
  const [filter, setFilter] = useState<Filter>('all')

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
    return (
      <div
        className="rounded-[24px] p-16 text-center"
        style={{ background: '#111', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <p className="font-display text-[18px] tracking-[-0.01em] uppercase mb-2">
          El fixture se publicará próximamente
        </p>
        <p className="text-muted text-[14px]">Volvé cuando arranque el torneo.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Filter chips */}
      <div className="flex flex-wrap gap-2 mb-6">
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

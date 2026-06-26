import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Match } from '@/types'
import { FixtureList } from './FixtureList'
import { compareMatchesByProductScheduleAsc, compareMatchesByProductScheduleDesc } from '@/lib/match-datetime'

type FixtureMatchesFilter = 'current' | 'live' | 'upcoming' | 'finished' | 'all'

type FixturePageProps = {
  searchParams: Promise<{ matches?: string }>
}

function sortByScheduleAsc(items: Match[]) {
  return [...items].sort(compareMatchesByProductScheduleAsc)
}

function sortByScheduleDesc(items: Match[]) {
  return [...items].sort(compareMatchesByProductScheduleDesc)
}

function resolveFixtureMatchesFilter(rawFilter: string | undefined): FixtureMatchesFilter {
  if (rawFilter === 'live' || rawFilter === 'upcoming' || rawFilter === 'finished' || rawFilter === 'all') {
    return rawFilter
  }
  return 'current'
}

function buildFixtureMatches(matches: Match[], filter: FixtureMatchesFilter) {
  const liveMatches = sortByScheduleAsc(matches.filter((match) => match.status === 'live'))
  const upcomingMatches = sortByScheduleAsc(matches.filter((match) => match.status === 'upcoming'))
  const finishedMatches = sortByScheduleDesc(matches.filter((match) => match.status === 'finished'))

  if (filter === 'live') return liveMatches
  if (filter === 'upcoming') return upcomingMatches
  if (filter === 'finished') return finishedMatches
  if (filter === 'all') return [...liveMatches, ...upcomingMatches, ...finishedMatches]

  const currentMatches = [...liveMatches, ...upcomingMatches]
  return currentMatches.length > 0 ? currentMatches : finishedMatches
}

function fixtureMatchesSummary(filter: FixtureMatchesFilter, matches: Match[]) {
  const liveCount = matches.filter((match) => match.status === 'live').length
  const upcomingCount = matches.filter((match) => match.status === 'upcoming').length
  const finishedCount = matches.filter((match) => match.status === 'finished').length

  if (filter === 'live') return `${liveCount} ${liveCount === 1 ? 'partido en vivo' : 'partidos en vivo'}.`
  if (filter === 'upcoming') return `${upcomingCount} ${upcomingCount === 1 ? 'partido próximo' : 'partidos próximos'} por fecha.`
  if (filter === 'finished') return `${finishedCount} ${finishedCount === 1 ? 'partido finalizado' : 'partidos finalizados'} del más reciente al más antiguo.`
  if (filter === 'all') return `${matches.length} partidos: en vivo, próximos y finalizados.`
  if (liveCount > 0) return `${liveCount} en vivo arriba; luego ${upcomingCount} próximos por fecha.`
  if (upcomingCount > 0) return `Próximo partido arriba; luego ${upcomingCount - 1} próximos por fecha.`
  return finishedCount > 0 ? 'No hay partidos pendientes: se muestran los últimos finalizados.' : 'Todavía no hay partidos cargados.'
}

export default async function FixturePage({ searchParams }: FixturePageProps) {
  const { matches: rawMatchesFilter } = await searchParams
  const fixtureMatchesFilter = resolveFixtureMatchesFilter(rawMatchesFilter)
  const supabase = await createClient()

  const matchesResult = await supabase
    .from('matches')
    .select('*')
    .order('scheduled_at', { ascending: true })

  if (matchesResult.error) {
    return (
      <div className="max-w-[860px] mx-auto px-5 py-12">
        <div
          className="rounded-[20px] p-6"
          style={{ background: 'rgba(255,90,90,0.07)', border: '1px solid rgba(255,90,90,0.2)' }}
        >
          <p className="font-bold text-[#FF5A5A] mb-1">Error al cargar los partidos</p>
          <p className="text-sm text-muted font-mono break-all">{matchesResult.error.message}</p>
        </div>
      </div>
    )
  }

  const matches = (matchesResult.data ?? []) as Match[]
  const visibleMatches = buildFixtureMatches(matches, fixtureMatchesFilter)
  const fixtureFilterOptions: Array<{ value: FixtureMatchesFilter; label: string }> = [
    { value: 'current', label: 'Actuales / próximos' },
    { value: 'live', label: 'En vivo' },
    { value: 'upcoming', label: 'Próximos' },
    { value: 'finished', label: 'Finalizados' },
    { value: 'all', label: 'Todos' },
  ]
  const filterBadge: Record<FixtureMatchesFilter, string> = {
    current: 'Vista inicial: actuales',
    live: 'Filtro: en vivo',
    upcoming: 'Filtro: próximos',
    finished: 'Filtro: finalizados',
    all: 'Filtro: todos',
  }

  return (
    <div style={{ padding: '40px 20px 80px' }}>
      <div className="max-w-[1280px] mx-auto">
        <div className="mb-8">
          <p className="text-[11px] font-extrabold tracking-[0.22em] uppercase text-muted mb-2">
            FIFA · USA · Canadá · México
          </p>
          <h1
            className="font-display uppercase leading-[0.9] tracking-[-0.03em]"
            style={{ fontSize: 'clamp(36px, 6vw, 64px)' }}
          >
            Fixture <em className="italic text-orange">completo</em>
          </h1>
          <p className="text-muted text-[14px] mt-3">
            {matches.length} partidos · resultados en tiempo real
          </p>
          <p className="mt-3 max-w-[620px] text-[13px] font-medium leading-relaxed text-[#cfcfcf]">
            El fixture es público para que puedas mirar el calendario completo antes de participar. Para cargar pronósticos sí necesitás tener tu correo habilitado.
          </p>
        </div>

        <div
          className="mb-6 rounded-[18px] px-4 py-4"
          style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-extrabold text-white text-[14px]">Partidos</p>
              <p className="text-muted text-[12px] mt-1">{fixtureMatchesSummary(fixtureMatchesFilter, matches)}</p>
            </div>
            <span
              className="rounded-full px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em]"
              style={{ background: 'rgba(255,107,0,0.1)', border: '1px solid rgba(255,107,0,0.24)', color: '#FFB15C' }}
            >
              {filterBadge[fixtureMatchesFilter]}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {fixtureFilterOptions.map((option) => {
              const active = option.value === fixtureMatchesFilter
              const href = option.value === 'current' ? '/fixture' : `/fixture?matches=${option.value}`
              return (
                <Link
                  key={option.value}
                  href={href}
                  className="rounded-full px-3 py-2 text-[11px] font-extrabold uppercase transition-colors duration-150"
                  style={{
                    background: active ? '#FF6B00' : '#141414',
                    color: active ? '#0A0A0A' : '#cfcfcf',
                    border: active ? '1px solid #FF6B00' : '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  {option.label}
                </Link>
              )
            })}
          </div>
        </div>

        <FixtureList key={fixtureMatchesFilter} matches={visibleMatches} allMatches={matches} />
      </div>
    </div>
  )
}

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Match } from '@/types'
import { AdminMatchForm } from './AdminMatchForm'
import { AdminTestTools } from './AdminTestTools'
import { PrizeSettingsForm } from './PrizeSettingsForm'
import {
  assignBestThirdsToSlots,
  buildKnockoutMap,
  computeAllStandings,
  computeBestThirdsGroups,
  computeBestThirdsTable,
  computeGroupStandingsDetailed,
  getPendingGroupTiebreakers,
  resolveTeamFull,
} from '@/lib/bracket'
import { AdminBracketSection } from './AdminBracketSection'
import { getProdeLockState } from '@/lib/prode-lock'
import { setProdeLockOverride, toggleMaintenanceMode } from './actions'
import { getCurrentProfile } from '@/lib/current-profile'
import { getMaintenanceMode } from '@/lib/maintenance'
import {
  compareMatchesByProductScheduleAsc,
  compareMatchesByProductScheduleDesc,
  formatMatchDateTimeArgentina,
} from '@/lib/match-datetime'
import { getPublicPrizeSettings, resolvePrizes } from '@/lib/prize-settings'

type ScoreMap = Record<string, { home_score: number; away_score: number }>

type SpecialBetRow = {
  user_id: string
  balon: string | null
  bota: string | null
  guante: string | null
  updated_at: string | null
}

type SpecialBetProfile = {
  id: string
  name: string | null
  email: string | null
}

type AdminMatchesFilter = 'current' | 'live' | 'upcoming' | 'finished' | 'all'

type AdminPageProps = {
  searchParams: Promise<{ matches?: string }>
}

function hasOfficialScore(match: Match) {
  return match.status === 'finished' && match.home_score != null && match.away_score != null
}

function isResolvedTeam(name: string) {
  return !(
    /^(\d)°\s+Grupo\s+[A-L]/.test(name) ||
    /^3°\s+Grupo\s+[A-L]/.test(name) ||
    name.startsWith('Ganador') ||
    name.startsWith('Perdedor') ||
    name === 'Mejor 3°'
  )
}

function sortByScheduleAsc(items: Match[]) {
  return [...items].sort(compareMatchesByProductScheduleAsc)
}

function sortByScheduleDesc(items: Match[]) {
  return [...items].sort(compareMatchesByProductScheduleDesc)
}

function resolveAdminMatchesFilter(rawFilter: string | undefined): AdminMatchesFilter {
  if (rawFilter === 'live' || rawFilter === 'upcoming' || rawFilter === 'finished' || rawFilter === 'all') {
    return rawFilter
  }
  return 'current'
}

function buildAdminMatchSections(matches: Match[], filter: AdminMatchesFilter) {
  const liveMatches = sortByScheduleAsc(matches.filter((match) => match.status === 'live'))
  const upcomingMatches = sortByScheduleAsc(matches.filter((match) => match.status === 'upcoming'))
  const finishedMatches = sortByScheduleDesc(matches.filter((match) => match.status === 'finished'))

  if (filter === 'live') return [{ key: 'Resultados', label: 'Partidos en vivo', matches: liveMatches }]
  if (filter === 'upcoming') return [{ key: 'Resultados', label: 'Proximos partidos', matches: upcomingMatches }]
  if (filter === 'finished') return [{ key: 'Resultados', label: 'Partidos finalizados', matches: finishedMatches }]
  if (filter === 'all') {
    return [
      { key: 'Resultados-live', label: 'En vivo', matches: liveMatches },
      { key: 'Resultados-upcoming', label: 'Proximos', matches: upcomingMatches },
      { key: 'Resultados-finished', label: 'Finalizados', matches: finishedMatches },
    ].filter((section) => section.matches.length > 0)
  }

  return [{ key: 'Resultados', label: 'Actuales / proximos', matches: [...liveMatches, ...upcomingMatches] }]
}

function adminMatchesFilterSummary(filter: AdminMatchesFilter, matches: Match[]) {
  const liveCount = matches.filter((match) => match.status === 'live').length
  const upcomingCount = matches.filter((match) => match.status === 'upcoming').length
  const finishedCount = matches.filter((match) => match.status === 'finished').length

  if (filter === 'live') return `${liveCount} ${liveCount === 1 ? 'partido en vivo' : 'partidos en vivo'}.`
  if (filter === 'upcoming') return `${upcomingCount} ${upcomingCount === 1 ? 'partido proximo' : 'partidos proximos'} por fecha ascendente.`
  if (filter === 'finished') return `${finishedCount} ${finishedCount === 1 ? 'partido finalizado' : 'partidos finalizados'} del mas reciente al mas antiguo.`
  if (filter === 'all') return `${matches.length} partidos: vivos y proximos primero, finalizados al final.`
  if (liveCount > 0) return `${liveCount} en vivo arriba; luego ${upcomingCount} proximos por fecha.`
  return upcomingCount > 0 ? `Proximo partido arriba; luego ${upcomingCount - 1} proximos por fecha.` : 'No hay partidos vivos ni proximos.'
}

function sameTableLine(a: { pts: number; gd: number; gf: number }, b: { pts: number; gd: number; gf: number }) {
  return a.pts === b.pts && a.gd === b.gd && a.gf === b.gf
}

function formatAdminPrize(amount: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(amount)
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const { matches: rawMatchesFilter } = await searchParams
  const adminMatchesFilter = resolveAdminMatchesFilter(rawMatchesFilter)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profile = await getCurrentProfile(user)

  if (!profile?.is_admin) redirect('/')

  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .order('scheduled_at', { ascending: true })

  const { data: specialBetRows } = await supabase
    .from('special_bets')
    .select('user_id, balon, bota, guante, updated_at')
    .order('updated_at', { ascending: false })

  const allMatches = (matches ?? []) as Match[]
  const specialUserIds = [...new Set(((specialBetRows ?? []) as SpecialBetRow[]).map((row) => row.user_id))]
  const { data: specialProfiles } = specialUserIds.length
    ? await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', specialUserIds)
    : { data: [] as SpecialBetProfile[] }
  const specialProfileMap = new Map(
    ((specialProfiles ?? []) as SpecialBetProfile[]).map((profile) => [profile.id, profile])
  )
  const specialBets = ((specialBetRows ?? []) as SpecialBetRow[]).map((row) => ({
    ...row,
    profile: specialProfileMap.get(row.user_id) ?? null,
  }))
  const prodeLock = await getProdeLockState(supabase)
  const maintenanceMode = await getMaintenanceMode(supabase)
  const [{ data: metricsData }, prizeSettings] = await Promise.all([
    supabase.rpc('get_public_home_metrics'),
    getPublicPrizeSettings(supabase),
  ])
  const metricsRows = metricsData as Array<{ competitors_count?: number | null }> | { competitors_count?: number | null } | null
  const metrics = Array.isArray(metricsRows) ? metricsRows[0] : metricsRows
  const resolvedPrizes = resolvePrizes(metrics?.competitors_count ?? 0, prizeSettings)
  const groupMatches = allMatches.filter((m) => m.stage === 'group')
  const knockoutMatches = allMatches.filter((m) => m.stage !== 'group')
  const officialScoreMap: ScoreMap = Object.fromEntries(
    allMatches
      .filter(hasOfficialScore)
      .map((m) => [m.id, { home_score: m.home_score!, away_score: m.away_score! }])
  )
  const groupResultsComplete = groupMatches.length > 0 && groupMatches.every(hasOfficialScore)
  const pendingOfficialTiebreakers = groupResultsComplete
    ? getPendingGroupTiebreakers(groupMatches, officialScoreMap)
    : []
  const groupsCanResolve = groupResultsComplete && pendingOfficialTiebreakers.length === 0
  const bestThirdsTableForAudit = groupResultsComplete ? computeBestThirdsTable(groupMatches, officialScoreMap) : []
  const officialStandings = groupsCanResolve ? computeAllStandings(groupMatches, officialScoreMap) : {}
  const bestThirdsGroups = groupsCanResolve ? computeBestThirdsGroups(groupMatches, officialScoreMap) : new Set<string>()
  const thirdSlotAssignment = groupsCanResolve ? assignBestThirdsToSlots(bestThirdsGroups) : {}
  const knockoutMap = buildKnockoutMap(knockoutMatches)
  const bestThirdsTable = groupsCanResolve ? bestThirdsTableForAudit : []

  const pendingOfficialTiebreakerDetails = pendingOfficialTiebreakers.map((pending) => {
    if (pending.startsWith('Grupo ')) {
      const group = pending.replace('Grupo ', '')
      const standings = computeGroupStandingsDetailed(
        groupMatches.filter((m) => m.group === group),
        officialScoreMap,
        {},
        `Grupo ${group}`
      )
      for (let i = 0; i < standings.length; i++) {
        const tied = standings.filter((team) => sameTableLine(team, standings[i]))
        const affectsClassification = tied.length > 1 && tied.some((team) => standings.indexOf(team) <= 2)
        if (affectsClassification) {
          return `${pending}: empate pendiente entre ${tied.map((team) => team.name).join(', ')} (mismos puntos, diferencia y goles a favor).`
        }
      }
      return `${pending}: empate pendiente en posiciones de clasificacion.`
    }

    if (pending === 'Mejores terceros') {
      for (let i = 0; i < bestThirdsTableForAudit.length; i++) {
        const tied = bestThirdsTableForAudit.filter((team) => sameTableLine(team, bestThirdsTableForAudit[i]))
        const crossesCut = tied.length > 1 && tied.some((team) => bestThirdsTableForAudit.indexOf(team) <= 7) && tied.some((team) => bestThirdsTableForAudit.indexOf(team) >= 8)
        if (crossesCut) {
          return `Mejores terceros: empate pendiente entre ${tied.map((team) => `${team.name} (${team.group})`).join(', ')}.`
        }
      }
    }

    return pending
  })

  function resolveOfficialTeam(placeholder: string) {
    if (!groupsCanResolve) return placeholder
    return resolveTeamFull(
      placeholder,
      officialStandings,
      knockoutMap,
      officialScoreMap,
      {},
      0,
      bestThirdsGroups,
      thirdSlotAssignment
    )
  }

  function groupBlockReason(group: string) {
    const groupDone = groupMatches
      .filter((m) => m.group === group)
      .every(hasOfficialScore)
    if (!groupDone) return `Falta completar resultados finalizados del Grupo ${group}.`
    const detail = pendingOfficialTiebreakerDetails.find((item) => item.startsWith(`Grupo ${group}:`))
    return detail ?? `Falta resolver un empate pendiente del Grupo ${group}.`
  }

  function blockReasonForSlot(raw: string, resolved: string) {
    const winner = resolved.match(/^(Ganador|Perdedor)\s+P(\d+)$/) ?? raw.match(/^(Ganador|Perdedor)\s+P(\d+)$/)
    if (winner) return `Falta resultado finalizado del partido P${winner[2]}.`

    const directGroup = raw.match(/^(\d)°\s+Grupo\s+([A-L])$/) ?? resolved.match(/^(\d)°\s+Grupo\s+([A-L])$/)
    if (directGroup) return groupBlockReason(directGroup[2])

    const thirdGroup = raw.match(/^3°\s+Grupo\s+([A-L](?:\/[A-L])*)$/) ?? resolved.match(/^3°\s+Grupo\s+([A-L](?:\/[A-L])*)$/)
    if (thirdGroup || resolved === 'Mejor 3°') {
      if (!groupResultsComplete) return 'Falta completar resultados finalizados de todos los grupos para resolver mejores terceros.'
      const detail = pendingOfficialTiebreakerDetails.find((item) => item.startsWith('Mejores terceros:'))
      return detail ?? 'Falta resolver la combinacion de mejores terceros.'
    }

    return 'Este cruce todavia no puede cargarse porque falta resolver una instancia previa.'
  }

  const adminMatchSections = buildAdminMatchSections(allMatches, adminMatchesFilter)
  const adminMatchesSummary = adminMatchesFilterSummary(adminMatchesFilter, allMatches)
  const adminMatchFilterOptions: Array<{ value: AdminMatchesFilter; label: string }> = [
    { value: 'current', label: 'Actuales / proximos' },
    { value: 'live', label: 'En vivo' },
    { value: 'upcoming', label: 'Proximos' },
    { value: 'finished', label: 'Finalizados' },
    { value: 'all', label: 'Todos' },
  ]
  const adminMatchFilterBadge: Record<AdminMatchesFilter, string> = {
    current: 'Vista inicial: actuales',
    live: 'Filtro: en vivo',
    upcoming: 'Filtro: proximos',
    finished: 'Filtro: finalizados',
    all: 'Filtro: todos',
  }
  const prodeLockLabel = prodeLock.override === 'locked'
    ? 'Bloqueado'
    : prodeLock.override === 'unlocked'
    ? 'Desbloqueado'
    : 'Auto'
  const prizeSummary = `1° ${formatAdminPrize(resolvedPrizes.first)} · 2° ${formatAdminPrize(resolvedPrizes.second)} · 3° ${formatAdminPrize(resolvedPrizes.third)}`
  const adminSections = [
    { label: 'Clasificación', href: '#admin-section-clasificacion' },
    { label: 'Premios', href: '#admin-section-premios' },
    { label: 'Especiales', href: '#admin-section-especiales' },
    { label: 'Resultados', href: '#admin-section-resultados' },
  ]

  return (
    <div style={{ padding: '20px 16px clamp(40px, 8vw, 72px)' }}>
      <div className="max-w-[860px] mx-auto">

        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <span
            className="inline-block font-sans text-[11px] font-extrabold tracking-[0.22em] uppercase text-muted"
            style={{ marginBottom: '10px' }}
          >
            Herramienta admin
          </span>
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <h1
              className="font-display uppercase leading-[.9] tracking-[-0.04em]"
              style={{ fontSize: 'clamp(36px, 6vw, 72px)' }}
            >
              Panel <em className="not-italic italic" style={{ color: '#FF6B00' }}>Admin</em>
            </h1>
            <div className="flex flex-wrap justify-end gap-2">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-extrabold text-[12px] uppercase transition-all duration-150"
                style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', color: '#cfcfcf' }}
              >
                Volver al inicio
              </Link>
              <Link
                href="/admin/whitelist"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-extrabold text-[12px] uppercase transition-all duration-150"
                style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', color: '#cfcfcf' }}
              >
                Participantes habilitados
              </Link>
              <details className="group relative">
                <summary
                  className="inline-flex cursor-pointer list-none items-center gap-2 rounded-full px-4 py-2 text-[12px] font-extrabold uppercase transition-all duration-150 [&::-webkit-details-marker]:hidden"
                  style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', color: '#cfcfcf' }}
                >
                  Estado del Prode: <span style={{ color: prodeLockLabel === 'Bloqueado' ? '#FF6B00' : prodeLockLabel === 'Desbloqueado' ? '#A8F0D8' : '#FFB15C' }}>{prodeLockLabel}</span>
                </summary>
                <form
                  action={setProdeLockOverride}
                  className="absolute right-0 z-20 mt-2 grid min-w-[220px] gap-2 rounded-[14px] p-2"
                  style={{ background: '#101010', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 18px 60px rgba(0,0,0,0.45)' }}
                >
                  {[
                    { value: 'locked', label: 'Bloquear' },
                    { value: 'unlocked', label: 'Desbloquear' },
                    { value: 'auto', label: 'Auto' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="submit"
                      name="override"
                      value={option.value}
                      className="rounded-[10px] px-3 py-2 text-left text-[12px] font-extrabold uppercase"
                      style={{
                        background: option.value === prodeLock.override || (option.value === 'auto' && !prodeLock.override) ? 'rgba(255,255,255,0.08)' : 'transparent',
                        color: option.value === 'locked' ? '#FF6B00' : option.value === 'unlocked' ? '#A8F0D8' : '#FFB15C',
                        border: '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </form>
              </details>
              <form action={toggleMaintenanceMode}>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-extrabold uppercase transition-all duration-150"
                  style={{
                    background: maintenanceMode ? 'rgba(168,240,216,0.12)' : 'rgba(255,107,0,0.16)',
                    color: maintenanceMode ? '#A8F0D8' : '#FF6B00',
                    border: maintenanceMode ? '1px solid rgba(168,240,216,0.3)' : '1px solid rgba(255,107,0,0.3)',
                  }}
                >
                  {maintenanceMode ? 'Desactivar mantenimiento' : 'Activar mantenimiento'}
                </button>
              </form>
            </div>
          </div>
          <p className="font-mono text-[12px] font-bold text-muted tracking-[0.04em] mt-[8px]">
            Carga de resultados · Mundial 2026
          </p>
        </div>

        <details
          id="admin-section-premios"
          className="group mb-5 rounded-[16px]"
          style={{ background: '#101010', border: '1px solid rgba(255,255,255,0.08)', scrollMarginTop: 20 }}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
            <span className="min-w-0">
              <span className="block font-extrabold text-white text-[13px] leading-snug">Premios publicados</span>
              <span className="mt-0.5 block truncate text-[12px] text-muted">{prizeSummary}</span>
            </span>
            <span className="shrink-0 rounded-full px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em]" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#d9d9d9' }}>
              <span className="group-open:hidden">Editar</span>
              <span className="hidden group-open:inline">Ocultar</span>
            </span>
          </summary>
          <div className="px-5 pb-4">
            <p className="mb-4 text-[12px] text-muted">
              Configura los importes visibles en Home y Premios. Si no hay configuracion manual, la web usa el calculo proporcional automatico.
            </p>
            <PrizeSettingsForm
              firstPrize={resolvedPrizes.first}
              secondPrize={resolvedPrizes.second}
              thirdPrize={resolvedPrizes.third}
              isManual={resolvedPrizes.source === 'manual'}
            />
          </div>
        </details>

        <AdminTestTools />

        <details
          id="admin-section-especiales"
          className="group mb-8 rounded-[16px] overflow-hidden"
          style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.07)', scrollMarginTop: 20 }}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
            <span className="min-w-0">
              <span className="block font-extrabold text-white text-[14px]">Apuestas especiales</span>
              <span className="mt-1 block truncate text-muted text-[12px]">
                {specialBets.length} {specialBets.length === 1 ? 'participante cargado' : 'participantes cargados'}
              </span>
            </span>
            <span className="shrink-0 rounded-full px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em]" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#d9d9d9' }}>
              <span className="group-open:hidden">Ver</span>
              <span className="hidden group-open:inline">Ocultar</span>
            </span>
          </summary>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="px-5 pt-4 text-muted text-[12px]">
              Revision manual de Balon de Oro, Bota de Oro y Guante de Oro. No suma puntos automaticamente.
            </p>
            {specialBets.length > 0 ? (
              <div className="grid gap-2 p-3">
              {specialBets.map((bet) => {
                const displayName = bet.profile?.name || bet.profile?.email || bet.user_id
                return (
                  <div
                    key={bet.user_id}
                    className="grid gap-3 rounded-[12px] px-3 py-3 md:grid-cols-[1fr_1fr_1fr_1fr]"
                    style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <div className="min-w-0">
                      <p className="text-[10px] font-extrabold tracking-[0.16em] uppercase text-muted">Usuario</p>
                      <p className="mt-1 truncate text-[13px] font-extrabold text-white">{displayName}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-extrabold tracking-[0.16em] uppercase text-muted">Balon de Oro</p>
                      <p className="mt-1 truncate text-[13px] font-bold text-white">{bet.balon || 'Sin cargar'}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-extrabold tracking-[0.16em] uppercase text-muted">Bota de Oro</p>
                      <p className="mt-1 truncate text-[13px] font-bold text-white">{bet.bota || 'Sin cargar'}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-extrabold tracking-[0.16em] uppercase text-muted">Guante de Oro</p>
                      <p className="mt-1 truncate text-[13px] font-bold text-white">{bet.guante || 'Sin cargar'}</p>
                    </div>
                  </div>
                )
              })}
              </div>
            ) : (
              <p className="px-5 py-6 text-[13px] text-muted">Todavia no hay apuestas especiales cargadas.</p>
            )}
          </div>
        </details>

        <div className="mb-6">
          <details className="md:hidden rounded-[16px]" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>
            <summary className="cursor-pointer px-4 py-3 font-extrabold text-[12px] uppercase" style={{ color: '#cfcfcf' }}>
              Elegir sección
            </summary>
            <div className="grid gap-2 px-3 pb-3">
              {adminSections.map((section) => (
                <a
                  key={section.href}
                  href={section.href}
                  className="rounded-[12px] px-3 py-3 text-[12px] font-extrabold uppercase"
                  style={{ background: '#0A0A0A', color: '#cfcfcf', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  {section.label}
                </a>
              ))}
            </div>
          </details>
          <div className="hidden md:flex flex-wrap gap-2">
            {adminSections.map((section) => (
              <a
                key={section.href}
                href={section.href}
                className="rounded-full px-4 py-2 text-[12px] font-extrabold uppercase transition-colors duration-150"
                style={{ background: '#141414', color: '#cfcfcf', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                {section.label}
              </a>
            ))}
          </div>
        </div>

        <div
          id="admin-section-clasificacion"
          className="mb-8 rounded-[16px] overflow-hidden"
          style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="font-extrabold text-white text-[14px]">Clasificacion oficial</p>
            <p className="text-muted text-[12px] mt-1">
              {groupsCanResolve
                ? 'Grupos completos: eliminatorias resueltas automaticamente desde resultados oficiales.'
                : groupResultsComplete
                ? `Hay desempates pendientes: ${pendingOfficialTiebreakerDetails.join(' ')}`
                : 'Carga todos los resultados de fase de grupos para resolver eliminatorias.'}
            </p>
          </div>
          {groupsCanResolve && (
            <div className="grid gap-5 p-5 lg:grid-cols-[1.1fr_0.9fr]">
              <div>
                <p className="text-[10px] font-extrabold tracking-[0.18em] uppercase mb-3" style={{ color: '#8A8A8A' }}>
                  Posiciones de grupos
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {Array.from(new Set(groupMatches.map((m) => m.group).filter(Boolean))).map((group) => {
                    const standings = computeGroupStandingsDetailed(
                      groupMatches.filter((m) => m.group === group),
                      officialScoreMap,
                      {},
                      `Grupo ${group}`
                    )
                    return (
                      <div key={group} className="rounded-[12px] px-3 py-3" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <p className="text-[10px] font-extrabold tracking-[0.16em] uppercase mb-2" style={{ color: '#FF6B00' }}>
                          Grupo {group}
                        </p>
                        <div className="space-y-1">
                          {standings.map((team, index) => (
                            <div key={team.name} className="grid grid-cols-[24px_1fr_auto] gap-2 text-[12px]">
                              <span className="font-mono text-muted">{index + 1}</span>
                              <span className="font-bold text-white truncate">{team.name}</span>
                              <span className="font-mono text-muted">{team.pts} pts</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-extrabold tracking-[0.18em] uppercase mb-3" style={{ color: '#8A8A8A' }}>
                  Mejores terceros
                </p>
                <div className="space-y-2">
                  {bestThirdsTable.map((team, index) => (
                    <div
                      key={`${team.group}-${team.name}`}
                      className="grid grid-cols-[26px_1fr_auto] gap-2 rounded-[10px] px-3 py-2 text-[12px]"
                      style={{
                        background: team.qualified ? 'rgba(168,240,216,0.08)' : '#141414',
                        border: team.qualified ? '1px solid rgba(168,240,216,0.18)' : '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <span className="font-mono text-muted">{index + 1}</span>
                      <span className="font-bold text-white truncate">
                        {team.name} <span className="text-muted font-mono">({team.group})</span>
                      </span>
                      <span className="font-mono text-muted">{team.pts} pts · DG {team.gd}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div
          id="admin-section-resultados"
          className="mb-5 rounded-[16px] px-4 py-4"
          style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.07)', scrollMarginTop: 20 }}
        >
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-extrabold text-white text-[14px]">Resultados oficiales</p>
              <p className="text-muted text-[12px] mt-1">{adminMatchesSummary}</p>
            </div>
            <span
              className="rounded-full px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em]"
              style={{ background: 'rgba(255,107,0,0.1)', border: '1px solid rgba(255,107,0,0.24)', color: '#FFB15C' }}
            >
              {adminMatchFilterBadge[adminMatchesFilter]}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {adminMatchFilterOptions.map((option) => {
              const active = option.value === adminMatchesFilter
              const href = option.value === 'current'
                ? '/admin#admin-section-resultados'
                : `/admin?matches=${option.value}#admin-section-resultados`
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

        {!matches?.length ? (
          <div
            className="px-5 py-4 rounded-[16px] text-[13px]"
            style={{ background: 'rgba(255,177,92,0.08)', border: '1px solid rgba(255,177,92,0.2)', color: '#FFB15C' }}
          >
            <p className="font-extrabold">No hay partidos cargados.</p>
            <p className="mt-1 text-muted text-[12px]">Insertá los partidos en Supabase usando el SQL del schema.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {adminMatchSections.map((section) => (
              <div
                key={section.key}
                style={{ scrollMarginTop: '20px' }}
              >
                <p
                  className="text-[10px] font-extrabold tracking-[0.2em] uppercase mb-3"
                  style={{ color: '#4a4a4a' }}
                >
                  {section.label.toUpperCase()}
                </p>
                <div className="space-y-2">
                  {section.matches.length === 0 ? (
                    <div
                      className="rounded-[16px] px-5 py-4 text-[13px] font-bold"
                      style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.07)', color: '#8A8A8A' }}
                    >
                      No hay partidos para este filtro.
                    </div>
                  ) : section.matches.map((match) => {
                    const resolvedHome = match.stage === 'group' ? match.home_team : resolveOfficialTeam(match.home_team)
                    const resolvedAway = match.stage === 'group' ? match.away_team : resolveOfficialTeam(match.away_team)
                    const homeUnresolved = match.stage !== 'group' && !isResolvedTeam(resolvedHome)
                    const awayUnresolved = match.stage !== 'group' && !isResolvedTeam(resolvedAway)
                    const disabledReason = homeUnresolved
                      ? blockReasonForSlot(match.home_team, resolvedHome)
                      : awayUnresolved
                      ? blockReasonForSlot(match.away_team, resolvedAway)
                      : null
                    return (
                    <div
                      key={match.id}
                      className="rounded-[16px] overflow-hidden"
                      style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.07)' }}
                    >
                      {/* Match header */}
                      <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div>
                          <p className="font-extrabold text-[13px] text-white">
                            {resolvedHome} <span className="text-muted font-normal">vs</span> {resolvedAway}
                          </p>
                          {match.stage !== 'group' && (resolvedHome !== match.home_team || resolvedAway !== match.away_team) && (
                            <p className="font-mono text-[10px] text-muted mt-0.5">
                              {match.home_team} vs {match.away_team}
                            </p>
                          )}
                          <p className="font-mono text-[11px] text-muted mt-0.5">
                            {formatMatchDateTimeArgentina(match.scheduled_at, { includeYear: true, separator: ' · ' })}
                            {match.home_score !== null && match.away_score !== null && (
                              <span className="ml-2 font-extrabold" style={{ color: '#A8F0D8' }}>
                                {match.home_score} — {match.away_score}
                              </span>
                            )}
                          </p>
                        </div>
                        <span
                          className="text-[10px] font-extrabold px-2.5 py-1 rounded-full tracking-[0.08em] uppercase shrink-0"
                          style={
                            match.status === 'finished'
                              ? { background: '#1a1a1a', color: '#4a4a4a' }
                              : match.status === 'live'
                              ? { background: 'rgba(255,59,59,0.12)', color: '#FF6B6B', border: '1px solid rgba(255,59,59,0.2)' }
                              : { background: 'rgba(255,107,0,0.1)', color: '#FF6B00', border: '1px solid rgba(255,107,0,0.2)' }
                          }
                        >
                          {match.status === 'finished' ? 'Finalizado' : match.status === 'live' ? 'En vivo' : 'Próximo'}
                        </span>
                      </div>
                      {/* Form */}
                      <div className="px-5 py-3">
                        <AdminMatchForm match={match} disabledReason={disabledReason} />
                      </div>
                    </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Official bracket section */}
        {matches && matches.length > 0 && (
          <AdminBracketSection
            groupMatches={(matches as Match[]).filter((m) => m.stage === 'group')}
            knockoutMatches={(matches as Match[]).filter((m) => m.stage !== 'group')}
          />
        )}

      </div>
    </div>
  )
}

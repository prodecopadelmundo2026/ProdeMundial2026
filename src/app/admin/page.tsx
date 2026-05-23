import Link from 'next/link'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/server'
import type { Match } from '@/types'
import { AdminMatchForm } from './AdminMatchForm'
import { AdminTestTools } from './AdminTestTools'
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
import { toggleProdeLockOverride } from './actions'

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

function stageLabel(stage: Match['stage']) {
  const labels: Record<Match['stage'], string> = {
    group: 'Fase de grupos',
    round_of_32: 'Dieciseisavos',
    round_of_16: 'Octavos',
    quarter: 'Cuartos',
    semi: 'Semifinales',
    third_place: '3er puesto',
    final: 'Final',
  }
  return labels[stage] ?? stage
}

function adminSectionId(key: string) {
  const map: Record<string, string> = {
    Clasificacion: 'admin-section-clasificacion',
    Grupos: 'admin-section-grupos',
    Dieciseisavos: 'admin-section-dieciseisavos',
    Octavos: 'admin-section-octavos',
    Cuartos: 'admin-section-cuartos',
    Semifinales: 'admin-section-semis',
    '3er puesto': 'admin-section-tercer-puesto',
    Final: 'admin-section-final',
  }
  return map[key] ?? `admin-section-${key.toLowerCase().replace(/\s+/g, '-')}`
}

function sameTableLine(a: { pts: number; gd: number; gf: number }, b: { pts: number; gd: number; gf: number }) {
  return a.pts === b.pts && a.gd === b.gd && a.gf === b.gf
}

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

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

  const groups: Record<string, Match[]> = {}
  for (const m of allMatches) {
    const key = m.group ? `Grupo ${m.group}` : stageLabel(m.stage)
    if (!groups[key]) groups[key] = []
    groups[key].push(m)
  }
  const groupEntries = Object.entries(groups).filter(([groupName]) => groupName.startsWith('Grupo '))
  const knockoutEntries = Object.entries(groups).filter(([groupName]) => !groupName.startsWith('Grupo '))
  const adminSections = [
    { label: 'Clasificación', href: '#admin-section-clasificacion' },
    { label: 'Especiales', href: '#admin-section-especiales' },
    { label: 'Grupos', href: '#admin-section-grupos' },
    { label: 'Dieciseisavos', href: '#admin-section-dieciseisavos' },
    { label: 'Octavos', href: '#admin-section-octavos' },
    { label: 'Cuartos', href: '#admin-section-cuartos' },
    { label: 'Semis', href: '#admin-section-semis' },
    { label: 'Tercer puesto', href: '#admin-section-tercer-puesto' },
    { label: 'Final', href: '#admin-section-final' },
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
            <div className="flex flex-wrap gap-2">
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
            </div>
          </div>
          <p className="font-mono text-[12px] font-bold text-muted tracking-[0.04em] mt-[8px]">
            Carga de resultados · Mundial 2026
          </p>
        </div>

        <form
          action={toggleProdeLockOverride}
          className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[16px] px-5 py-4"
          style={{ background: '#101010', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div>
            <p className="font-extrabold text-white text-[13px] leading-snug">Estado del Prode</p>
            <p className="text-[12px] mt-0.5 text-muted">
              {prodeLock.locked ? 'Apuestas bloqueadas' : 'Apuestas abiertas'}
              {prodeLock.override
                ? ` - override manual: ${prodeLock.override === 'locked' ? 'bloqueado' : 'desbloqueado'}`
                : prodeLock.automaticLocked
                ? ' - bloqueo automatico por resultado oficial'
                : ' - sin resultados oficiales cargados'}
            </p>
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-full text-[12px] font-extrabold uppercase"
            style={{
              background: prodeLock.locked ? 'rgba(168,240,216,0.12)' : 'rgba(255,107,0,0.16)',
              color: prodeLock.locked ? '#A8F0D8' : '#FF6B00',
              border: prodeLock.locked ? '1px solid rgba(168,240,216,0.3)' : '1px solid rgba(255,107,0,0.3)',
            }}
          >
            {prodeLock.locked ? 'Desbloquear Prode' : 'Bloquear Prode'}
          </button>
        </form>

        <AdminTestTools />

        <div
          id="admin-section-especiales"
          className="mb-8 rounded-[16px] overflow-hidden"
          style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.07)', scrollMarginTop: 20 }}
        >
          <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="font-extrabold text-white text-[14px]">Apuestas especiales</p>
            <p className="text-muted text-[12px] mt-1">
              Revision manual de Balon de Oro, Bota de Oro y Guante de Oro. No suma puntos automaticamente.
            </p>
          </div>
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
            {[...groupEntries, ...knockoutEntries].map(([groupName, groupMatches], sectionIndex) => (
              <div
                key={groupName}
                id={groupName.startsWith('Grupo ')
                  ? sectionIndex === 0 ? adminSectionId('Grupos') : undefined
                  : adminSectionId(groupName)}
                style={{ scrollMarginTop: '20px' }}
              >
                <p
                  className="text-[10px] font-extrabold tracking-[0.2em] uppercase mb-3"
                  style={{ color: '#4a4a4a' }}
                >
                  {groupName.toUpperCase()}
                </p>
                <div className="space-y-2">
                  {groupMatches.map((match) => {
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
                            {format(new Date(match.scheduled_at), "EEE d MMM yyyy · HH:mm", { locale: es })}
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

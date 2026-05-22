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

type ScoreMap = Record<string, { home_score: number; away_score: number }>

function hasOfficialScore(match: Match) {
  return match.home_score != null && match.away_score != null
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

  const allMatches = (matches ?? []) as Match[]
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
  const officialStandings = groupsCanResolve ? computeAllStandings(groupMatches, officialScoreMap) : {}
  const bestThirdsGroups = groupsCanResolve ? computeBestThirdsGroups(groupMatches, officialScoreMap) : new Set<string>()
  const thirdSlotAssignment = groupsCanResolve ? assignBestThirdsToSlots(bestThirdsGroups) : {}
  const knockoutMap = buildKnockoutMap(knockoutMatches)
  const bestThirdsTable = groupsCanResolve ? computeBestThirdsTable(groupMatches, officialScoreMap) : []

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

  const groups: Record<string, Match[]> = {}
  for (const m of allMatches) {
    const key = m.group ? `Grupo ${m.group}` : stageLabel(m.stage)
    if (!groups[key]) groups[key] = []
    groups[key].push(m)
  }

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
            <Link
              href="/admin/whitelist"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-extrabold text-[12px] uppercase transition-all duration-150"
              style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', color: '#cfcfcf' }}
            >
              Lista blanca
            </Link>
          </div>
          <p className="font-mono text-[12px] font-bold text-muted tracking-[0.04em] mt-[8px]">
            Carga de resultados · Mundial 2026
          </p>
        </div>

        <AdminTestTools />

        <div
          className="mb-8 rounded-[16px] overflow-hidden"
          style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="font-extrabold text-white text-[14px]">Clasificacion oficial</p>
            <p className="text-muted text-[12px] mt-1">
              {groupsCanResolve
                ? 'Grupos completos: eliminatorias resueltas automaticamente desde resultados oficiales.'
                : groupResultsComplete
                ? `Hay desempates pendientes: ${pendingOfficialTiebreakers.join(', ')}.`
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
            {Object.entries(groups).map(([groupName, groupMatches]) => (
              <div key={groupName}>
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
                    const knockoutUnresolved = match.stage !== 'group' && (!isResolvedTeam(resolvedHome) || !isResolvedTeam(resolvedAway))
                    const disabledReason = knockoutUnresolved
                      ? 'Este cruce todavia no puede cargarse: faltan resultados previos o desempates para resolver los equipos.'
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
      </div>
    </div>
  )
}

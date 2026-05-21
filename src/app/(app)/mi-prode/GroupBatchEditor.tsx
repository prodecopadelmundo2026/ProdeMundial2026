'use client'

import { useState, useMemo } from 'react'
import type { Match } from '@/types'
import { MatchCard } from '@/components/MatchCard'
import { getTeam, flagUrl } from '@/lib/teams'

type PredMap = Record<string, { home_score: number; away_score: number }>
type LocalPred = { home: string; away: string }

interface TeamStats {
  name: string
  pts: number
  gf: number
  ga: number
  played: number
}

function computeGroupStandings(matches: Match[], preds: Record<string, LocalPred>): TeamStats[] {
  const stats: Record<string, TeamStats> = {}
  for (const m of matches) {
    if (!stats[m.home_team]) stats[m.home_team] = { name: m.home_team, pts: 0, gf: 0, ga: 0, played: 0 }
    if (!stats[m.away_team]) stats[m.away_team] = { name: m.away_team, pts: 0, gf: 0, ga: 0, played: 0 }
  }
  for (const m of matches) {
    const p = preds[m.id]
    if (!p || p.home === '' || p.away === '') continue
    const h = parseInt(p.home, 10)
    const a = parseInt(p.away, 10)
    if (isNaN(h) || isNaN(a)) continue
    stats[m.home_team].played++
    stats[m.away_team].played++
    stats[m.home_team].gf += h
    stats[m.home_team].ga += a
    stats[m.away_team].gf += a
    stats[m.away_team].ga += h
    if (h > a) {
      stats[m.home_team].pts += 3
    } else if (h === a) {
      stats[m.home_team].pts += 1
      stats[m.away_team].pts += 1
    } else {
      stats[m.away_team].pts += 3
    }
  }
  return Object.values(stats).sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts
    const gdB = b.gf - b.ga
    const gdA = a.gf - a.ga
    if (gdB !== gdA) return gdB - gdA
    if (b.gf !== a.gf) return b.gf - a.gf
    return a.name.localeCompare(b.name)
  })
}

// Teams are truly tied only when pts, goal difference AND goals for all match
function areTied(a: TeamStats, b: TeamStats) {
  return a.pts === b.pts && (a.gf - a.ga) === (b.gf - b.ga) && a.gf === b.gf
}

// Reorder tied groups in standings based on tiebreaker choices
function applyTiebreakers(
  standings: TeamStats[],
  tiebreakers: Record<string, string>,
  groupKey: string
): TeamStats[] {
  const result = [...standings]
  let i = 0
  while (i < result.length) {
    let j = i + 1
    while (j < result.length && areTied(result[j], result[i])) j++
    if (j > i + 1) {
      const tiedSlice = result.slice(i, j)
      const picked: TeamStats[] = []
      for (let pos = i; pos < j - 1; pos++) {
        const choice = tiebreakers[`${groupKey}_pos_${pos}`]
        if (!choice) break
        const teamIdx = tiedSlice.findIndex(
          t => t.name === choice && !picked.some(p => p.name === t.name)
        )
        if (teamIdx === -1) break
        picked.push(tiedSlice[teamIdx])
      }
      const remaining = tiedSlice.filter(t => !picked.some(p => p.name === t.name))
      const reordered = [...picked, ...remaining]
      for (let k = 0; k < reordered.length; k++) {
        result[i + k] = reordered[k]
      }
    }
    i = j
  }
  return result
}

// Re-sort best thirds list applying tiebreaker picks
function applyTiebreakersToThirds(
  thirds: BestThirdTeam[],
  tiebreakers: Record<string, string>
): BestThirdTeam[] {
  return [...thirds].sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts
    const gdB = b.gf - b.ga, gdA = a.gf - a.ga
    if (gdB !== gdA) return gdB - gdA
    if (b.gf !== a.gf) return b.gf - a.gf

    // N-team rank key: "3rd-rank-A-B-C" = "A,B,C"
    const rankKey = Object.keys(tiebreakers).find(k => {
      if (!k.startsWith('3rd-rank-')) return false
      const names = k.slice('3rd-rank-'.length).split('-')
      return names.includes(a.name) && names.includes(b.name)
    })
    if (rankKey) {
      const ranked = tiebreakers[rankKey].split(',')
      const ai = ranked.indexOf(a.name)
      const bi = ranked.indexOf(b.name)
      if (ai !== -1 && bi !== -1) return ai - bi
    }

    // 2-team pairwise key fallback
    const k1 = `3rd-${a.name}-vs-${b.name}`
    const k2 = `3rd-${b.name}-vs-${a.name}`
    const picked = tiebreakers[k1] || tiebreakers[k2]
    if (picked === a.name) return -1
    if (picked === b.name) return 1
    return a.name.localeCompare(b.name)
  })
}

function TeamFlag({ name }: { name: string }) {
  const meta = getTeam(name)
  if (meta.iso2) {
    return (
      <img
        src={flagUrl(meta.iso2)}
        alt={name}
        style={{ width: '18px', height: '13px', objectFit: 'contain', flexShrink: 0 }}
      />
    )
  }
  return <span className="text-[12px] shrink-0">{meta.flag}</span>
}

interface StandingsTableProps {
  standings: TeamStats[]
  tiebreakers: Record<string, string>
  onTiebreaker: (key: string, team: string | null) => void
  groupKey: string
}

function StandingsTable({ standings, tiebreakers, onTiebreaker, groupKey }: StandingsTableProps) {
  if (!standings.some((t) => t.played > 0)) return null

  const displayStandings = applyTiebreakers(standings, tiebreakers, groupKey)

  // Detect tied groups from display standings (same stats, just reordered)
  const tieGroups: number[][] = []
  let i = 0
  while (i < displayStandings.length) {
    let j = i + 1
    while (j < displayStandings.length && areTied(displayStandings[j], displayStandings[i])) j++
    if (j > i + 1) tieGroups.push(Array.from({ length: j - i }, (_, k) => i + k))
    i = j
  }
  const tiedIndices = new Set(tieGroups.flat())

  return (
    <div className="mt-6">
      <p className="text-[11px] font-extrabold tracking-[0.18em] uppercase text-muted mb-3">
        Tabla del grupo
      </p>
      <div
        className="overflow-hidden"
        style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px' }}
      >
        {/* Header */}
        <div
          className="grid text-[9px] font-extrabold tracking-[0.12em] uppercase text-muted px-4 py-2"
          style={{
            gridTemplateColumns: '24px 1fr 36px 36px 36px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: '#0a0a0a',
          }}
        >
          <span>#</span>
          <span>Equipo</span>
          <span className="text-center">Pts</span>
          <span className="text-center">GF</span>
          <span className="text-center">GD</span>
        </div>

        {displayStandings.map((team, idx) => {
          const advances = idx < 2
          const isTied = tiedIndices.has(idx)
          return (
            <div
              key={team.name}
              className="grid items-center px-4 py-[10px]"
              style={{
                gridTemplateColumns: '24px 1fr 36px 36px 36px',
                borderBottom: idx < displayStandings.length - 1 ? '1px solid rgba(255,255,255,0.05)' : undefined,
                background: advances ? 'rgba(168,240,216,0.03)' : undefined,
              }}
            >
              <span
                className="text-[12px] font-extrabold"
                style={{ color: advances ? '#A8F0D8' : isTied ? '#FF6B00' : '#4a4a4a' }}
              >
                {idx + 1}
              </span>
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <TeamFlag name={team.name} />
                <span className="text-[12px] font-semibold truncate">{team.name}</span>
                {isTied && (
                  <span
                    className="text-[8px] font-extrabold tracking-[0.1em] px-1 py-0.5 rounded shrink-0"
                    style={{ background: 'rgba(255,107,0,0.15)', color: '#FF6B00' }}
                  >
                    =
                  </span>
                )}
              </div>
              <span
                className="text-center text-[13px] font-bold"
                style={{ color: advances ? '#A8F0D8' : '#fff' }}
              >
                {team.played > 0 ? team.pts : '—'}
              </span>
              <span className="text-center text-[12px] text-muted">
                {team.played > 0 ? team.gf : '—'}
              </span>
              <span className="text-center text-[12px] text-muted">
                {team.played > 0
                  ? (team.gf - team.ga >= 0 ? '+' : '') + (team.gf - team.ga)
                  : '—'}
              </span>
            </div>
          )
        })}
      </div>

      {/* Cascading tiebreaker questions for tied groups that include relevant positions */}
      {tieGroups.map((group) => {
        // Only show tiebreakers for groups that touch positions 0, 1, or 2
        if (!group.some(idx => idx <= 2)) return null
        const tiedTeams = group.map(idx => displayStandings[idx])
        const basePos = group[0]

        return (
          <div key={basePos} className="mt-3 space-y-3">
            {group.slice(0, -1).map((posIdx, k) => {
              // Teams already chosen for earlier positions in this group
              const chosenBefore = group.slice(0, k)
                .map(p => tiebreakers[`${groupKey}_pos_${p}`])
                .filter((v): v is string => Boolean(v))

              const available = tiedTeams.filter(t => !chosenBefore.includes(t.name))
              const currentPick = tiebreakers[`${groupKey}_pos_${posIdx}`]

              // Label based on absolute position and group size
              const is2WayAt0 = group.length === 2 && posIdx === 0
              let questionLabel: string
              if (is2WayAt0) questionLabel = '¿Quién pasa primero?'
              else if (posIdx === 0) questionLabel = '¿Quién es el primero?'
              else if (posIdx === 1) questionLabel = '¿Quién es el segundo?'
              else questionLabel = '¿Quién queda tercero?'

              return (
                <div
                  key={posIdx}
                  className="rounded-[14px] px-4 py-3"
                  style={{ background: '#0A0A0A', border: '1px solid rgba(255,107,0,0.28)' }}
                >
                  <p className="text-[10px] font-extrabold tracking-[0.1em] uppercase mb-2" style={{ color: '#FF6B00' }}>
                    {questionLabel}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {available.map((team) => (
                      <button
                        key={team.name}
                        onClick={() => onTiebreaker(`${groupKey}_pos_${posIdx}`, currentPick === team.name ? null : team.name)}
                        className="flex items-center gap-2 px-3 py-2 rounded-[10px] text-[12px] font-bold transition-all duration-150"
                        style={
                          currentPick === team.name
                            ? { background: '#FF6B00', color: '#0A0A0A' }
                            : { background: '#1a1a1a', color: '#cfcfcf', border: '1px solid rgba(255,255,255,0.08)' }
                        }
                      >
                        <TeamFlag name={team.name} />
                        {team.name}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

interface BestThirdTeam extends TeamStats {
  group: string
}

interface BestThirdsViewProps {
  thirds: BestThirdTeam[]
  tiebreakers: Record<string, string>
  onTiebreaker: (key: string, team: string | null) => void
}

function BestThirdsView({ thirds, tiebreakers, onTiebreaker }: BestThirdsViewProps) {
  if (!thirds.length) {
    return (
      <p className="text-muted text-[14px] py-8 text-center">
        Completá tus pronósticos de grupos para ver los mejores terceros.
      </p>
    )
  }

  // Re-sort applying tiebreaker picks so the table updates live
  const displayThirds = useMemo(
    () => applyTiebreakersToThirds(thirds, tiebreakers),
    [thirds, tiebreakers]
  )

  const tieGroups: number[][] = []
  let i = 0
  while (i < displayThirds.length) {
    let j = i + 1
    while (j < displayThirds.length && areTied(displayThirds[j], displayThirds[i])) j++
    if (j > i + 1) tieGroups.push(Array.from({ length: j - i }, (_, k) => i + k))
    i = j
  }
  const tiedIndices = new Set(tieGroups.flat())

  return (
    <div>
      <div
        className="mb-4 px-4 py-3 rounded-[14px] text-[13px] text-muted"
        style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        Los 8 mejores terceros clasifican a Dieciseisavos. Ordenados por puntos, diferencia de gol y goles a favor.
      </div>

      <div
        className="overflow-hidden"
        style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px' }}
      >
        {/* Header */}
        <div
          className="grid text-[9px] font-extrabold tracking-[0.12em] uppercase text-muted px-4 py-2"
          style={{
            gridTemplateColumns: '24px 40px 1fr 36px 36px 36px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            background: '#0a0a0a',
          }}
        >
          <span>#</span>
          <span>GRP</span>
          <span>Equipo</span>
          <span className="text-center">Pts</span>
          <span className="text-center">GF</span>
          <span className="text-center">GD</span>
        </div>

        {displayThirds.map((team, idx) => {
          const advances = idx < 8
          const isTied = tiedIndices.has(idx)
          return (
            <div
              key={team.name}
              className="grid items-center px-4 py-[10px]"
              style={{
                gridTemplateColumns: '24px 40px 1fr 36px 36px 36px',
                borderBottom: idx < displayThirds.length - 1 ? '1px solid rgba(255,255,255,0.05)' : undefined,
                background: advances ? 'rgba(168,240,216,0.03)' : undefined,
              }}
            >
              <span
                className="text-[12px] font-extrabold"
                style={{ color: advances ? '#A8F0D8' : isTied ? '#FF6B00' : '#4a4a4a' }}
              >
                {idx + 1}
              </span>
              <span
                className="text-[10px] font-extrabold tracking-[0.08em] uppercase"
                style={{ color: '#5a5a5a' }}
              >
                Grp {team.group}
              </span>
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <TeamFlag name={team.name} />
                <span className="text-[12px] font-semibold truncate">{team.name}</span>
                {isTied && (
                  <span
                    className="text-[8px] font-extrabold tracking-[0.1em] px-1 py-0.5 rounded shrink-0"
                    style={{ background: 'rgba(255,107,0,0.15)', color: '#FF6B00' }}
                  >
                    =
                  </span>
                )}
              </div>
              <span
                className="text-center text-[13px] font-bold"
                style={{ color: advances ? '#A8F0D8' : '#fff' }}
              >
                {team.pts}
              </span>
              <span className="text-center text-[12px] text-muted">{team.gf}</span>
              <span className="text-center text-[12px] text-muted">
                {team.gf - team.ga >= 0 ? '+' : ''}{team.gf - team.ga}
              </span>
            </div>
          )
        })}
      </div>

      {/* Tiebreaker — when the tie includes at least one team in the top 8 */}
      {tieGroups.map((group) => {
        const touchesTop8 = group.some(idx => idx <= 7)
        if (!touchesTop8) return null
        const spansTop8 = group.some(idx => idx <= 7) && group.some(idx => idx >= 8)
        const teams = group.map(idx => displayThirds[idx])

        if (teams.length === 2) {
          const [teamA, teamB] = teams
          const key = `3rd-${teamA.name}-vs-${teamB.name}`
          const altKey = `3rd-${teamB.name}-vs-${teamA.name}`
          const picked = tiebreakers[key] || tiebreakers[altKey]
          const canonicalKey = tiebreakers[key] !== undefined ? key : altKey
          const question = spansTop8 ? '¿Quién pasa?' : '¿Quién queda mejor posicionado?'
          const subtitle = spansTop8
            ? `${teamA.name} y ${teamB.name} están empatadas en el límite del 8vo puesto.`
            : `${teamA.name} y ${teamB.name} están empatadas dentro del top 8.`
          return (
            <div
              key={key}
              className="mt-3 rounded-[14px] px-4 py-3"
              style={{ background: '#0A0A0A', border: '1px solid rgba(255,107,0,0.28)' }}
            >
              <p className="text-[10px] font-extrabold tracking-[0.1em] uppercase mb-1" style={{ color: '#FF6B00' }}>
                {question}
              </p>
              <p className="text-[12px] text-muted mb-2">{subtitle}</p>
              <div className="flex gap-2">
                {[teamA, teamB].map((team) => (
                  <button
                    key={team.name}
                    onClick={() => onTiebreaker(canonicalKey, picked === team.name ? null : team.name)}
                    className="flex items-center gap-2 px-3 py-2 rounded-[10px] text-[12px] font-bold transition-all duration-150"
                    style={
                      picked === team.name
                        ? { background: '#FF6B00', color: '#0A0A0A' }
                        : { background: '#1a1a1a', color: '#cfcfcf', border: '1px solid rgba(255,255,255,0.08)' }
                    }
                  >
                    <TeamFlag name={team.name} />
                    {team.name}
                  </button>
                ))}
              </div>
            </div>
          )
        }

        // 3+ teams: single ranking question
        const rankKey = `3rd-rank-${teams.map(t => t.name).sort().join('-')}`
        const currentRanking: string[] = tiebreakers[rankKey]
          ? tiebreakers[rankKey].split(',')
          : []
        const question = spansTop8 ? 'Ordenar mejores terceros' : 'Ordenar posición dentro del top 8'
        const subtitle = spansTop8
          ? `${teams.length} equipos empatados. Hacé clic en orden de mejor a peor para definir quién pasa al 8vo puesto.`
          : `${teams.length} equipos empatados dentro del top 8. Definí su posición relativa.`

        return (
          <div
            key={rankKey}
            className="mt-3 rounded-[14px] px-4 py-3"
            style={{ background: '#0A0A0A', border: '1px solid rgba(255,107,0,0.28)' }}
          >
            <p className="text-[10px] font-extrabold tracking-[0.1em] uppercase mb-1" style={{ color: '#FF6B00' }}>
              {question}
            </p>
            <p className="text-[12px] text-muted mb-3">{subtitle}</p>
            <div className="flex gap-2 flex-wrap">
              {teams.map((team) => {
                const rankIdx = currentRanking.indexOf(team.name)
                const isRanked = rankIdx !== -1
                return (
                  <button
                    key={team.name}
                    onClick={() => {
                      let next: string[]
                      if (isRanked) {
                        next = currentRanking.filter(n => n !== team.name)
                      } else {
                        next = [...currentRanking, team.name]
                      }
                      onTiebreaker(rankKey, next.length ? next.join(',') : null)
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-[10px] text-[12px] font-bold transition-all duration-150"
                    style={
                      isRanked
                        ? { background: '#FF6B00', color: '#0A0A0A' }
                        : { background: '#1a1a1a', color: '#cfcfcf', border: '1px solid rgba(255,255,255,0.08)' }
                    }
                  >
                    {isRanked && (
                      <span
                        className="text-[10px] font-extrabold w-4 h-4 rounded-full grid place-items-center shrink-0"
                        style={{ background: 'rgba(0,0,0,0.25)' }}
                      >
                        {rankIdx + 1}
                      </span>
                    )}
                    <TeamFlag name={team.name} />
                    {team.name}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function sortTabs(keys: string[]) {
  return keys.filter((k) => k.startsWith('Grupo')).sort()
}

const BEST_THIRDS_VIEW = '__mejores_terceros__'

function tabLabel(tab: string): string {
  return tab === BEST_THIRDS_VIEW ? 'Mejores Terceros' : tab
}

interface Props {
  grouped: Record<string, Match[]>
  predMap: PredMap
  localGroupPreds: Record<string, LocalPred>
  onGroupPredChange: (matchId: string, home: string, away: string) => void
  onMatchSaveStateChange?: (matchId: string, state: 'idle' | 'dirty' | 'saving' | 'saved' | 'error') => void
  tiebreakers: Record<string, string>
  onTiebreaker: (key: string, team: string | null) => void
}

export function GroupBatchEditor({ grouped, predMap, localGroupPreds, onGroupPredChange, onMatchSaveStateChange, tiebreakers, onTiebreaker }: Props) {
  const tabs = sortTabs(Object.keys(grouped))
  const [activeGroup, setActiveGroup] = useState(tabs[0] ?? '')

  const currentGroupMatches = grouped[activeGroup] ?? []

  // Derive current group's predictions from the lifted flat map
  const currentGroupPreds = useMemo((): Record<string, LocalPred> => {
    const result: Record<string, LocalPred> = {}
    for (const m of currentGroupMatches) {
      result[m.id] = localGroupPreds[m.id] ?? { home: '', away: '' }
    }
    return result
  }, [currentGroupMatches, localGroupPreds])

  const standings = useMemo(
    () =>
      activeGroup === BEST_THIRDS_VIEW
        ? []
        : computeGroupStandings(currentGroupMatches, currentGroupPreds),
    [activeGroup, currentGroupMatches, currentGroupPreds]
  )

  const bestThirds = useMemo<BestThirdTeam[]>(() => {
    return tabs
      .flatMap((tab) => {
        const matches = grouped[tab] ?? []
        const preds: Record<string, LocalPred> = {}
        for (const m of matches) {
          preds[m.id] = localGroupPreds[m.id] ?? { home: '', away: '' }
        }
        const st = computeGroupStandings(matches, preds)
        const third = st[2]
        if (!third || third.played === 0) return []
        return [{ ...third, group: tab.replace('Grupo ', '') }]
      })
      .sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts
        const gdB = b.gf - b.ga
        const gdA = a.gf - a.ga
        if (gdB !== gdA) return gdB - gdA
        if (b.gf !== a.gf) return b.gf - a.gf
        return a.name.localeCompare(b.name)
      })
  }, [tabs, grouped, localGroupPreds])

  const allTabs = [...tabs, BEST_THIRDS_VIEW]
  const currentIdx = allTabs.indexOf(activeGroup)
  const prevTab = currentIdx > 0 ? allTabs[currentIdx - 1] : null
  const nextTab = currentIdx < allTabs.length - 1 ? allTabs[currentIdx + 1] : null

  if (!tabs.length) {
    return (
      <div
        className="rounded-[24px] bg-panel p-16 text-center"
        style={{ border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <p className="font-display text-[20px] tracking-[-0.01em] uppercase mb-2">
          El fixture se publicará próximamente
        </p>
        <p className="text-muted text-[14px]">Volvé cuando arranque el torneo.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Combo row — select + meta inline */}
      <div className="flex items-start gap-[18px] flex-wrap mb-7">
        <div className="flex flex-col gap-1.5 w-[280px] max-w-full">
          <label className="text-[11px] font-extrabold tracking-[0.22em] uppercase text-muted">
            Seleccioná el grupo
          </label>
          <div
            className="relative transition-[border-color,background] duration-150"
            style={{
              background: '#141414',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '14px',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = 'rgba(255,255,255,.18)'
              el.style.background = '#1C1C1C'
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = 'rgba(255,255,255,.08)'
              el.style.background = '#141414'
            }}
          >
            <select
              value={activeGroup}
              onChange={(e) => setActiveGroup(e.target.value)}
              className="w-full bg-transparent text-white font-extrabold text-[16px] outline-none cursor-pointer"
              style={{
                appearance: 'none',
                WebkitAppearance: 'none',
                padding: '16px 50px 16px 18px',
                border: 'none',
              }}
            >
              {tabs.map((tab) => (
                <option key={tab} value={tab} style={{ background: '#000', color: '#fff', fontWeight: 700 }}>
                  {tab}
                </option>
              ))}
              <option value={BEST_THIRDS_VIEW} style={{ background: '#000', color: '#fff', fontWeight: 700 }}>
                Mejores Terceros
              </option>
            </select>
            <svg
              className="absolute right-[18px] top-1/2 -translate-y-1/2 pointer-events-none text-muted"
              width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </div>

        {/* Navigation arrows */}
        <div className="flex gap-2 self-end" style={{ paddingBottom: '1px' }}>
          <button
            onClick={() => prevTab && setActiveGroup(prevTab)}
            disabled={!prevTab}
            className="grid place-items-center transition-all duration-150"
            style={{
              width: 52, height: 52,
              background: prevTab ? '#141414' : '#0d0d0d',
              border: `1px solid ${prevTab ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)'}`,
              borderRadius: 14,
              color: prevTab ? '#cfcfcf' : '#282828',
              cursor: prevTab ? 'pointer' : 'default',
            }}
            aria-label="Grupo anterior"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            onClick={() => nextTab && setActiveGroup(nextTab)}
            disabled={!nextTab}
            className="grid place-items-center transition-all duration-150"
            style={{
              width: 52, height: 52,
              background: nextTab ? '#141414' : '#0d0d0d',
              border: `1px solid ${nextTab ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)'}`,
              borderRadius: 14,
              color: nextTab ? '#cfcfcf' : '#282828',
              cursor: nextTab ? 'pointer' : 'default',
            }}
            aria-label="Grupo siguiente"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>

        {/* Meta inline */}
        <span
          className="text-[13px] font-bold text-muted self-end whitespace-nowrap"
          style={{ paddingBottom: '18px', letterSpacing: '0.02em' }}
        >
          <b className="text-white font-extrabold">6</b> partidos · 11–22 junio
        </span>
      </div>

      {activeGroup === BEST_THIRDS_VIEW ? (
        <BestThirdsView
          thirds={bestThirds}
          tiebreakers={tiebreakers}
          onTiebreaker={onTiebreaker}
        />
      ) : (
        <>
          {/* Matches grid — autosave via MatchCard */}
          <div className="grid grid-cols-1 min-[720px]:grid-cols-2 min-[1100px]:grid-cols-3 gap-4">
            {currentGroupMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                prediction={predMap[match.id] ?? null}
                initialHome={currentGroupPreds[match.id]?.home}
                initialAway={currentGroupPreds[match.id]?.away}
                onValuesChange={(home, away) => onGroupPredChange(match.id, home, away)}
                onSaveStateChange={(state) => onMatchSaveStateChange?.(match.id, state)}
              />
            ))}
          </div>

          {/* Standings table */}
          <StandingsTable
            standings={standings}
            tiebreakers={tiebreakers}
            onTiebreaker={onTiebreaker}
            groupKey={activeGroup}
          />
        </>
      )}

      {/* Bottom navigation */}
      <div
        className="flex items-center justify-between mt-8 gap-3"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '24px' }}
      >
        {prevTab ? (
          <button
            onClick={() => setActiveGroup(prevTab)}
            className="flex items-center gap-2 font-extrabold transition-all duration-150"
            style={{
              background: '#141414',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 999,
              padding: '12px 20px',
              fontSize: 13,
              color: '#cfcfcf',
              cursor: 'pointer',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            {tabLabel(prevTab)}
          </button>
        ) : <span />}
        {nextTab ? (
          <button
            onClick={() => setActiveGroup(nextTab)}
            className="flex items-center gap-2 font-extrabold transition-all duration-150"
            style={{
              background: 'rgba(255,107,0,0.1)',
              border: '1px solid rgba(255,107,0,0.3)',
              borderRadius: 999,
              padding: '12px 20px',
              fontSize: 13,
              color: '#FF6B00',
              cursor: 'pointer',
            }}
          >
            {tabLabel(nextTab)}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        ) : <span />}
      </div>
    </div>
  )
}

'use client'

import { useState, useMemo } from 'react'
import type { Match } from '@/types'
import { MatchCard } from '@/components/MatchCard'
import { getTeam, flagUrl } from '@/lib/teams'

type PredMap = Record<string, { home_score: number; away_score: number }>
type LocalPreds = Record<string, { home: string; away: string }>

interface TeamStats {
  name: string
  pts: number
  gf: number
  ga: number
  played: number
}

function computeGroupStandings(matches: Match[], preds: LocalPreds): TeamStats[] {
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
    if (b.gf !== a.gf) return b.gf - a.gf
    return a.name.localeCompare(b.name)
  })
}

function areTied(a: TeamStats, b: TeamStats) {
  return a.pts === b.pts && a.gf === b.gf
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
}

function StandingsTable({ standings, tiebreakers, onTiebreaker }: StandingsTableProps) {
  if (!standings.some((t) => t.played > 0)) return null

  // Group tied adjacent teams
  const tieGroups: number[][] = []
  let i = 0
  while (i < standings.length) {
    let j = i + 1
    while (j < standings.length && areTied(standings[j], standings[i])) j++
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

        {standings.map((team, idx) => {
          const advances = idx < 2
          const isTied = tiedIndices.has(idx)
          return (
            <div
              key={team.name}
              className="grid items-center px-4 py-[10px]"
              style={{
                gridTemplateColumns: '24px 1fr 36px 36px 36px',
                borderBottom: idx < standings.length - 1 ? '1px solid rgba(255,255,255,0.05)' : undefined,
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

      {/* Tiebreaker messages for positions that matter (2nd/3rd boundary) */}
      {tieGroups.map((group) => {
        const criticalPos = group.some((i) => i === 1 || i === 2)
        if (!criticalPos) return null
        const teams = group.map((i) => standings[i])
        const pairs: [TeamStats, TeamStats][] = []
        for (let k = 0; k < teams.length - 1; k++) {
          pairs.push([teams[k], teams[k + 1]])
        }
        return pairs.map(([teamA, teamB]) => {
          const key = `${teamA.name}-vs-${teamB.name}`
          const picked = tiebreakers[key]
          return (
            <div
              key={key}
              className="mt-3 rounded-[14px] px-4 py-3"
              style={{ background: '#0A0A0A', border: '1px solid rgba(255,107,0,0.28)' }}
            >
              <p className="text-[10px] font-extrabold tracking-[0.1em] uppercase mb-2" style={{ color: '#FF6B00' }}>
                {teamA.name} y {teamB.name} están empatadas · ¿Quién pasa?
              </p>
              <div className="flex gap-2">
                {[teamA, teamB].map((team) => (
                  <button
                    key={team.name}
                    onClick={() => onTiebreaker(key, picked === team.name ? null : team.name)}
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
        })
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

  // Find tie groups
  const tieGroups: number[][] = []
  let i = 0
  while (i < thirds.length) {
    let j = i + 1
    while (j < thirds.length && areTied(thirds[j], thirds[i])) j++
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
        Los 8 mejores terceros clasifican a Dieciseisavos. Ordenados por puntos y goles a favor.
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

        {thirds.map((team, idx) => {
          const advances = idx < 8
          const isTied = tiedIndices.has(idx)
          return (
            <div
              key={team.name}
              className="grid items-center px-4 py-[10px]"
              style={{
                gridTemplateColumns: '24px 40px 1fr 36px 36px 36px',
                borderBottom: idx < thirds.length - 1 ? '1px solid rgba(255,255,255,0.05)' : undefined,
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

      {/* Tiebreaker messages for positions around 8th place */}
      {tieGroups.map((group) => {
        const criticalPos = group.some((i) => i === 7 || i === 8)
        if (!criticalPos) return null
        const teams = group.map((i) => thirds[i])
        const pairs: [BestThirdTeam, BestThirdTeam][] = []
        for (let k = 0; k < teams.length - 1; k++) {
          pairs.push([teams[k], teams[k + 1]])
        }
        return pairs.map(([teamA, teamB]) => {
          const key = `3rd-${teamA.name}-vs-${teamB.name}`
          const picked = tiebreakers[key]
          return (
            <div
              key={key}
              className="mt-3 rounded-[14px] px-4 py-3"
              style={{ background: '#0A0A0A', border: '1px solid rgba(255,107,0,0.28)' }}
            >
              <p className="text-[10px] font-extrabold tracking-[0.1em] uppercase mb-1" style={{ color: '#FF6B00' }}>
                ¿Quién pasa?
              </p>
              <p className="text-[12px] text-muted mb-2">
                {teamA.name} y {teamB.name} se encuentran empatadas. ¿Quién creés que es mejor tercera?
              </p>
              <div className="flex gap-2">
                {[teamA, teamB].map((team) => (
                  <button
                    key={team.name}
                    onClick={() => onTiebreaker(key, picked === team.name ? null : team.name)}
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
        })
      })}
    </div>
  )
}

function sortTabs(keys: string[]) {
  return keys.filter((k) => k.startsWith('Grupo')).sort()
}

const BEST_THIRDS_VIEW = '__mejores_terceros__'

interface Props {
  grouped: Record<string, Match[]>
  predMap: PredMap
}

export function GroupBatchEditor({ grouped, predMap }: Props) {
  const tabs = sortTabs(Object.keys(grouped))
  const [activeGroup, setActiveGroup] = useState(tabs[0] ?? '')
  const [tiebreakers, setTiebreakers] = useState<Record<string, string>>({})

  const [localPreds, setLocalPreds] = useState<Record<string, LocalPreds>>(() => {
    const init: Record<string, LocalPreds> = {}
    for (const tab of tabs) {
      init[tab] = {}
      for (const match of grouped[tab] ?? []) {
        const pred = predMap[match.id]
        init[tab][match.id] = {
          home: pred?.home_score?.toString() ?? '',
          away: pred?.away_score?.toString() ?? '',
        }
      }
    }
    return init
  })

  function handleValuesChange(group: string, matchId: string, home: string, away: string) {
    setLocalPreds((prev) => ({
      ...prev,
      [group]: { ...prev[group], [matchId]: { home, away } },
    }))
  }

  function handleTiebreaker(key: string, team: string | null) {
    setTiebreakers((prev) => {
      if (!team) {
        const { [key]: _removed, ...rest } = prev
        return rest
      }
      return { ...prev, [key]: team }
    })
  }

  const currentGroupMatches = grouped[activeGroup] ?? []
  const currentGroupPreds = localPreds[activeGroup] ?? {}

  const standings = useMemo(
    () =>
      activeGroup === BEST_THIRDS_VIEW
        ? []
        : computeGroupStandings(currentGroupMatches, currentGroupPreds),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeGroup, localPreds]
  )

  const bestThirds = useMemo<BestThirdTeam[]>(() => {
    return tabs
      .flatMap((tab) => {
        const matches = grouped[tab] ?? []
        const preds = localPreds[tab] ?? {}
        const st = computeGroupStandings(matches, preds)
        const third = st[2]
        if (!third || third.played === 0) return []
        return [{ ...third, group: tab.replace('Grupo ', '') }]
      })
      .sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts
        if (b.gf !== a.gf) return b.gf - a.gf
        return a.name.localeCompare(b.name)
      })
  }, [tabs, grouped, localPreds])

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
      {/* Combo dropdown — estilo del diseño */}
      <div className="mb-8 max-w-[340px]">
        <label className="block text-[11px] font-extrabold tracking-[0.22em] uppercase text-muted mb-1.5">
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
          {/* Chevron icon */}
          <svg
            className="absolute right-[18px] top-1/2 -translate-y-1/2 pointer-events-none text-muted"
            width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>

      {activeGroup === BEST_THIRDS_VIEW ? (
        <BestThirdsView
          thirds={bestThirds}
          tiebreakers={tiebreakers}
          onTiebreaker={handleTiebreaker}
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
                onValuesChange={(home, away) =>
                  handleValuesChange(activeGroup, match.id, home, away)
                }
              />
            ))}
          </div>

          {/* Standings table */}
          <StandingsTable
            standings={standings}
            tiebreakers={tiebreakers}
            onTiebreaker={handleTiebreaker}
          />
        </>
      )}
    </div>
  )
}

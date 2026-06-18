'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { Match } from '@/types'

export type MatchPointsBreakdownRow = {
  user_id: string
  name: string
  home_score: number
  away_score: number
  points: number
}

type PointsGroupConfig = {
  title: string
  modalTitle: string
  rows: MatchPointsBreakdownRow[]
  empty: string
  exact?: boolean
}

function playersLabel(count: number) {
  return `${count} ${count === 1 ? 'jugador' : 'jugadores'}`
}

function predictionLabel(row: MatchPointsBreakdownRow, exact?: boolean) {
  return exact ? 'Resultado exacto' : `Apostó ${row.home_score}-${row.away_score}`
}

function PlayerRow({
  row,
  exact,
  currentUserId,
}: {
  row: MatchPointsBreakdownRow
  exact?: boolean
  currentUserId: string | null
}) {
  const isCurrentUser = currentUserId === row.user_id

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] px-3 py-2.5"
      style={{
        background: isCurrentUser ? 'rgba(255,107,0,0.12)' : '#0A0A0A',
        border: isCurrentUser ? '1px solid rgba(255,107,0,0.42)' : '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <span className="flex min-w-0 flex-wrap items-center gap-2 text-[14px] font-extrabold text-white">
        <span className="min-w-0">{row.name}</span>
        {isCurrentUser && (
          <span
            className="rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.1em]"
            style={{ background: 'rgba(255,107,0,0.18)', border: '1px solid rgba(255,107,0,0.35)', color: '#FFB15C' }}
          >
            Vos
          </span>
        )}
      </span>
      <span className="font-mono text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted">
        {predictionLabel(row, exact)}
      </span>
    </div>
  )
}

function PointsRows({
  rows,
  exact,
  empty,
  currentUserId,
}: {
  rows: MatchPointsBreakdownRow[]
  exact?: boolean
  empty: string
  currentUserId: string | null
}) {
  if (rows.length === 0) {
    return <p className="rounded-[14px] bg-[#0A0A0A] px-4 py-3 text-[13px] font-semibold text-muted">{empty}</p>
  }

  return (
    <div className="grid gap-1.5">
      {rows.map((row) => (
        <PlayerRow key={row.user_id} row={row} exact={exact} currentUserId={currentUserId} />
      ))}
    </div>
  )
}

function PointsGroup({
  group,
  currentUserId,
  onOpen,
}: {
  group: PointsGroupConfig
  currentUserId: string | null
  onOpen: (group: PointsGroupConfig) => void
}) {
  const previewRows = group.rows.slice(0, 5)
  const hasMore = group.rows.length > previewRows.length

  return (
    <div className="rounded-[16px] bg-[#111] p-4" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-[26px] uppercase leading-none text-white">{group.title}</p>
          <p className="mt-1 text-[12px] font-bold text-muted">{playersLabel(group.rows.length)}</p>
        </div>
        {hasMore && (
          <button
            type="button"
            onClick={() => onOpen(group)}
            className="rounded-full bg-orange px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-bg transition-transform hover:-translate-y-0.5"
          >
            Ver todos
          </button>
        )}
      </div>
      <div className="mt-3">
        <PointsRows rows={previewRows} exact={group.exact} empty={group.empty} currentUserId={currentUserId} />
      </div>
    </div>
  )
}

export function MatchPointsSection({
  match,
  exactPointsRows,
  partialPointsRows,
  zeroPointsRows,
  currentUserId,
}: {
  match: Match
  exactPointsRows: MatchPointsBreakdownRow[]
  partialPointsRows: MatchPointsBreakdownRow[]
  zeroPointsRows: MatchPointsBreakdownRow[]
  currentUserId: string | null
}) {
  const [selectedGroup, setSelectedGroup] = useState<PointsGroupConfig | null>(null)
  const groups: PointsGroupConfig[] = [
    {
      title: '+3',
      modalTitle: '+3 puntos',
      rows: exactPointsRows,
      exact: true,
      empty: 'Nadie sumo 3 puntos en este partido.',
    },
    {
      title: '+1',
      modalTitle: '+1 punto',
      rows: partialPointsRows,
      empty: 'Nadie sumo 1 punto en este partido.',
    },
    {
      title: '0',
      modalTitle: '0 puntos',
      rows: zeroPointsRows,
      empty: 'No hay jugadores sin puntos para este partido.',
    },
  ]

  useEffect(() => {
    if (!selectedGroup) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setSelectedGroup(null)
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [selectedGroup])

  return (
    <>
      <section
        id="puntos-partido"
        className="mb-5 rounded-[24px] bg-panel p-4 min-[760px]:p-5"
        style={{ border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] font-extrabold uppercase tracking-[0.18em] text-orange">
              Transparencia
            </p>
            <h2 className="mt-2 font-display text-[32px] uppercase leading-none">Puntos de este partido</h2>
          </div>
          <p className="text-[12px] font-semibold text-muted">
            Resultado oficial: {match.home_score}-{match.away_score}
          </p>
        </div>

        <div className="grid gap-4 min-[920px]:grid-cols-3">
          {groups.map((group) => (
            <PointsGroup
              key={group.title}
              group={group}
              currentUserId={currentUserId}
              onOpen={setSelectedGroup}
            />
          ))}
        </div>
      </section>

      {selectedGroup && (
        <div className="fixed inset-0 z-[220] grid place-items-center px-4 py-6">
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-black/72"
            aria-label="Cerrar puntos"
            onClick={() => setSelectedGroup(null)}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="match-points-title"
            className="relative max-h-[calc(100dvh-48px)] w-full max-w-[560px] overflow-hidden rounded-[24px] bg-[#101010] p-5 shadow-2xl min-[640px]:p-6"
            style={{ border: '1px solid rgba(255,255,255,0.12)' }}
          >
            <div className="absolute inset-x-0 top-0 h-1.5 bg-orange" aria-hidden="true" />
            <button
              type="button"
              aria-label="Cerrar"
              onClick={() => setSelectedGroup(null)}
              className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-muted transition-colors hover:bg-white/5 hover:text-white"
            >
              <X size={18} aria-hidden="true" />
            </button>

            <p className="mb-3 inline-flex rounded-full bg-orange/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-orange">
              {playersLabel(selectedGroup.rows.length)}
            </p>
            <h2 id="match-points-title" className="pr-10 font-display text-[34px] uppercase leading-none tracking-[-0.02em]">
              {selectedGroup.modalTitle}
            </h2>

            <div className="mt-5 max-h-[52dvh] overflow-y-auto rounded-[18px] bg-[#0A0A0A] p-3" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              <PointsRows
                rows={selectedGroup.rows}
                exact={selectedGroup.exact}
                empty={selectedGroup.empty}
                currentUserId={currentUserId}
              />
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedGroup(null)}
                className="rounded-full bg-orange px-5 py-3 text-[12px] font-extrabold text-bg transition-transform hover:-translate-y-0.5"
              >
                Cerrar
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  )
}

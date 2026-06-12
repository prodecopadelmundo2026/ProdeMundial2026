'use client'

import { useMemo, useState } from 'react'
import clsx from 'clsx'
import type { GroupTableRow } from '@/lib/group-standings'
import { flagUrl, getTeam } from '@/lib/teams'

export type GroupTableSection = {
  id: string
  title: string
  description?: string
  rows: GroupTableRow[]
  tone?: 'participant' | 'viewer' | 'official'
  anchorId?: string
}

const TONE_COLOR = {
  participant: '#FFB15C',
  viewer: '#A8F0D8',
  official: '#FFFFFF',
} as const

const ROW_STYLE = [
  {
    label: '1',
    color: '#FFE040',
    background: 'rgba(255,224,64,0.12)',
    border: '1px solid rgba(255,224,64,0.32)',
  },
  {
    label: '2',
    color: '#D7DEE8',
    background: 'rgba(215,222,232,0.11)',
    border: '1px solid rgba(215,222,232,0.24)',
  },
  {
    label: '3',
    color: '#E8A87C',
    background: 'rgba(232,168,124,0.10)',
    border: '1px solid rgba(232,168,124,0.22)',
  },
  {
    label: '4',
    color: '#8A8A8A',
    background: 'rgba(255,255,255,0.025)',
    border: '1px solid rgba(255,255,255,0.04)',
  },
] as const

function TeamCell({ name, rankStyle }: { name: string; rankStyle: typeof ROW_STYLE[number] }) {
  const meta = getTeam(name)
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span
        className="grid h-6 w-6 shrink-0 place-items-center overflow-hidden rounded-full bg-black/40"
        style={{ border: `1px solid ${rankStyle.color}55` }}
      >
        {meta.iso2 ? (
          <img src={flagUrl(meta.iso2)} alt="" className="h-[16px] w-[22px] object-contain" />
        ) : (
          <span className="text-[13px] leading-none">{meta.flag}</span>
        )}
      </span>
      <span className="truncate text-[12px] font-extrabold text-white">{name}</span>
    </div>
  )
}

function Stat({ value, strong = false }: { value: number; strong?: boolean }) {
  return (
    <span className={clsx('text-center font-mono text-[10px] tabular-nums', strong ? 'font-extrabold text-white' : 'font-bold text-muted')}>
      {value}
    </span>
  )
}

function GroupTableCard({ section }: { section: GroupTableSection }) {
  const color = TONE_COLOR[section.tone ?? 'official']
  return (
    <article id={section.anchorId} className="min-w-0 scroll-mt-24 rounded-[16px] bg-[#141414] p-3" style={{ border: `1px solid ${color}33` }}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-extrabold text-white">{section.title}</p>
          {section.description && (
            <p className="mt-0.5 truncate text-[11px] font-semibold text-muted">{section.description}</p>
          )}
        </div>
        <span className="rounded-full px-2 py-1 font-mono text-[9px] font-extrabold uppercase tracking-[0.12em]" style={{ color, background: '#0A0A0A', border: `1px solid ${color}33` }}>
          Top 2
        </span>
      </div>

      <div className="grid grid-cols-[minmax(64px,1fr)_repeat(8,minmax(14px,18px))] items-center gap-x-0.5 rounded-[10px] px-1.5 py-1.5 font-mono text-[8px] font-extrabold uppercase tracking-[0.04em] text-muted sm:grid-cols-[minmax(96px,1fr)_repeat(8,minmax(20px,24px))] sm:gap-x-1.5 sm:px-2 sm:text-[9px] sm:tracking-[0.08em]" style={{ background: '#0A0A0A' }}>
        <span>Equipo</span>
        <span className="text-center">PJ</span>
        <span className="text-center">PG</span>
        <span className="text-center">PE</span>
        <span className="text-center">PP</span>
        <span className="text-center">GF</span>
        <span className="text-center">GC</span>
        <span className="text-center">DG</span>
        <span className="text-center">PTS</span>
      </div>

      <div className="mt-1.5 grid gap-1">
        {section.rows.map((row, index) => {
          const rankStyle = ROW_STYLE[index] ?? ROW_STYLE[3]
          return (
            <div
              key={row.name}
              className="grid min-h-[34px] grid-cols-[minmax(64px,1fr)_repeat(8,minmax(14px,18px))] items-center gap-x-0.5 rounded-[10px] px-1.5 sm:grid-cols-[minmax(96px,1fr)_repeat(8,minmax(20px,24px))] sm:gap-x-1.5 sm:px-2"
              style={{
                background: rankStyle.background,
                border: rankStyle.border,
              }}
            >
              <TeamCell name={row.name} rankStyle={rankStyle} />
              <Stat value={row.played} />
              <Stat value={row.wins} />
              <Stat value={row.draws} />
              <Stat value={row.losses} />
              <Stat value={row.gf} />
              <Stat value={row.gc} />
              <Stat value={row.gd} />
              <Stat value={row.pts} strong />
            </div>
          )
        })}
      </div>
    </article>
  )
}

export function GroupStandingsTables({
  title,
  subtitle,
  sections,
  controls = true,
}: {
  title: string
  subtitle?: string
  sections: GroupTableSection[]
  controls?: boolean
}) {
  const [visible, setVisible] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(sections.map((section) => [section.id, true]))
  )

  const visibleSections = useMemo(
    () => sections.filter((section) => !controls || visible[section.id] !== false),
    [controls, sections, visible]
  )

  if (sections.length === 0) return null

  return (
    <section className="rounded-[20px] bg-[#0d0d0d] p-4" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14px] font-extrabold text-white">{title}</p>
          {subtitle && <p className="mt-1 max-w-[680px] text-[12px] font-semibold leading-relaxed text-muted">{subtitle}</p>}
        </div>
        {controls && (
          <div className="flex flex-wrap gap-2">
            {sections.map((section) => {
              const active = visible[section.id] !== false
              const color = TONE_COLOR[section.tone ?? 'official']
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setVisible((current) => ({ ...current, [section.id]: !active }))}
                  className="rounded-full px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.1em] transition-colors"
                  style={{
                    background: active ? color : 'rgba(255,255,255,0.04)',
                    color: active ? '#0A0A0A' : '#d9d9d9',
                    border: active ? `1px solid ${color}` : '1px solid rgba(255,255,255,0.1)',
                  }}
                  aria-pressed={active}
                >
                  {section.title}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {visibleSections.length > 0 && (
        <div className={clsx('grid min-w-0 gap-3', visibleSections.length === 1 ? 'mx-auto max-w-[430px]' : 'lg:grid-cols-3')}>
          {visibleSections.map((section) => (
            <GroupTableCard key={section.id} section={section} />
          ))}
        </div>
      )}
    </section>
  )
}

'use client'

import { useState, useRef, useEffect } from 'react'
import type { RankingEntry } from '@/types'

function initials(name: string): string {
  return name.trim()[0]?.toUpperCase() ?? '?'
}

const TOP3_COLOR: Record<number, string> = {
  1: '#FFE040',
  2: '#A8F0D8',
  3: '#E8A87C',
}

function RankRow({
  entry,
  isMe,
  innerRef,
}: {
  entry: RankingEntry
  isMe: boolean
  innerRef?: React.Ref<HTMLDivElement>
}) {
  const posColor = isMe ? '#FF6B00' : (TOP3_COLOR[entry.rank] ?? '#4a4a4a')

  return (
    <div
      ref={innerRef}
      className="grid items-center gap-[14px] rounded-[14px] px-[14px] py-3 transition-colors duration-150"
      style={{
        gridTemplateColumns: '54px 1fr auto',
        background: isMe ? 'rgba(255,107,0,0.1)' : 'transparent',
        border: isMe ? '1px solid rgba(255,107,0,0.28)' : '1px solid transparent',
      }}
      onMouseEnter={(e) => {
        if (!isMe) (e.currentTarget as HTMLElement).style.background = '#1c1c1c'
      }}
      onMouseLeave={(e) => {
        if (!isMe) (e.currentTarget as HTMLElement).style.background = 'transparent'
      }}
    >
      {/* Posición */}
      <span
        className="font-display text-[22px] leading-none tracking-[-0.03em] tabular-nums"
        style={{ color: posColor }}
      >
        {entry.rank}
      </span>

      {/* Usuario */}
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-9 h-9 rounded-full shrink-0 grid place-items-center font-bold text-[14px] text-white"
          style={{
            background: entry.rank === 1
              ? 'linear-gradient(135deg, #FF6B00, #FFE040)'
              : 'linear-gradient(135deg, #5B2D8E, #1565C0)',
            border: '2px solid #2a2a2a',
          }}
        >
          {initials(entry.name)}
        </div>
        <div className="min-w-0 flex flex-col gap-0.5">
          <div className="font-extrabold text-[14px] tracking-[-0.01em] truncate flex items-center gap-2">
            {entry.name}
            {isMe && (
              <span
                className="font-mono text-[9px] font-extrabold tracking-[0.18em] px-[7px] py-[2px] rounded-[6px] shrink-0"
                style={{ background: '#FF6B00', color: '#0A0A0A' }}
              >
                VOS
              </span>
            )}
          </div>
          <div className="font-mono text-[10px] font-bold tracking-[0.16em] uppercase text-muted truncate">
            {entry.exact_predictions ?? 0} exactas · {entry.correct_result_predictions ?? 0} parciales
          </div>
        </div>
      </div>

      {/* Puntos */}
      <div className="text-right shrink-0">
        <span className="font-display text-[22px] leading-none tracking-[-0.03em] tabular-nums">
          {entry.total_points}
        </span>
        <span
          className="font-mono text-[10px] font-bold tracking-[0.16em] uppercase ml-1.5"
          style={{ color: '#8A8A8A' }}
        >
          pts
        </span>
      </div>
    </div>
  )
}

export function RankingClient({
  entries,
  userId,
}: {
  entries: RankingEntry[]
  userId?: string
}) {
  const [search, setSearch] = useState('')
  const meRowRef = useRef<HTMLDivElement | null>(null)
  const stickyRef = useRef<HTMLElement | null>(null)

  const filtered = search.trim()
    ? entries.filter((e) =>
        e.name.toLowerCase().includes(search.trim().toLowerCase())
      )
    : entries

  const meEntry = entries.find((e) => e.user_id === userId)

  useEffect(() => {
    const me = meRowRef.current
    const sticky = stickyRef.current
    if (!me || !sticky) return
    if (!('IntersectionObserver' in window)) {
      sticky.style.display = 'none'
      return
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return
        const aboveViewport = entry.boundingClientRect.top < 0
        sticky.classList.toggle('you-sticky--show', !entry.isIntersecting && aboveViewport)
      },
      { rootMargin: '-60px 0px 0px 0px' }
    )
    obs.observe(me)
    return () => obs.disconnect()
  }, [])

  return (
    <>
      {/* Search row */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <div
          className="flex flex-1 items-center gap-[10px] min-w-[200px] rounded-[14px] px-4 py-3 transition-all duration-150"
          style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="#8A8A8A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true"
            style={{ flexShrink: 0 }}
          >
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar participante…"
            aria-label="Buscar participante"
            className="flex-1 bg-transparent border-none outline-none text-white text-[14px] font-semibold placeholder:text-muted placeholder:font-normal"
          />
        </div>
        <div
          className="font-mono text-[11px] font-bold tracking-[0.1em] px-4 py-3 rounded-[14px] whitespace-nowrap"
          style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)', color: '#8A8A8A' }}
        >
          <b className="text-white">{filtered.length}</b> PARTICIPANTES
        </div>
      </div>

      {/* Lista */}
      <div
        className="flex flex-col gap-1.5 rounded-[24px] p-2.5"
        style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {filtered.length === 0 ? (
          <div className="py-10 text-center text-muted text-[14px]">
            No se encontró ningún participante.
          </div>
        ) : (
          filtered.map((entry) => (
            <RankRow
              key={entry.user_id}
              entry={entry}
              isMe={entry.user_id === userId}
              innerRef={entry.user_id === userId ? meRowRef : undefined}
            />
          ))
        )}
      </div>

      {/* Sticky bottom — fila del usuario cuando scrollea hacia arriba */}
      {meEntry && userId && (
        <aside
          ref={stickyRef as React.RefObject<HTMLElement>}
          className="you-sticky"
          aria-label="Tu posición en el ranking"
        >
          <div
            className="grid items-center gap-[14px] rounded-[14px] px-[14px] py-3"
            style={{ gridTemplateColumns: '54px 1fr auto', background: 'rgba(255,107,0,0.1)' }}
          >
            <span className="font-display text-[22px] leading-none tracking-[-0.03em] tabular-nums" style={{ color: '#FF6B00' }}>
              {meEntry.rank}
            </span>
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-9 h-9 rounded-full shrink-0 grid place-items-center font-bold text-[14px] text-white"
                style={{ background: 'linear-gradient(135deg, #5B2D8E, #1565C0)', border: '2px solid #2a2a2a' }}
              >
                {initials(meEntry.name)}
              </div>
              <div className="min-w-0 flex flex-col gap-0.5">
                <div className="font-extrabold text-[14px] tracking-[-0.01em] truncate flex items-center gap-2">
                  {meEntry.name}
                  <span
                    className="font-mono text-[9px] font-extrabold tracking-[0.18em] px-[7px] py-[2px] rounded-[6px] shrink-0"
                    style={{ background: '#FF6B00', color: '#0A0A0A' }}
                  >
                    VOS
                  </span>
                </div>
                <div className="font-mono text-[10px] font-bold tracking-[0.16em] uppercase text-muted truncate">
                  {meEntry.exact_predictions ?? 0} exactas · {meEntry.correct_result_predictions ?? 0} parciales
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="font-display text-[22px] leading-none tracking-[-0.03em] tabular-nums">
                {meEntry.total_points}
              </span>
              <span className="font-mono text-[10px] font-bold tracking-[0.16em] uppercase ml-1.5" style={{ color: '#8A8A8A' }}>
                pts
              </span>
            </div>
          </div>
        </aside>
      )}
    </>
  )
}

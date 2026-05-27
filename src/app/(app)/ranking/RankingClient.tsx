'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import type { RankingEntry } from '@/types'
import { formatRank, hasPrizeTie, rankMedal } from '@/lib/ranking-display'

function initials(name: string): string {
  return name.trim()[0]?.toUpperCase() ?? '?'
}

const TOP3_COLOR: Record<number, string> = {
  1: '#FFE040',
  2: '#A8F0D8',
  3: '#E8A87C',
}

function RankMark({
  entry,
  entries,
  color,
  rankingStarted,
}: {
  entry: RankingEntry
  entries: RankingEntry[]
  color: string
  rankingStarted: boolean
}) {
  if (!rankingStarted) {
    return (
      <span className="font-mono text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted sm:text-[11px]">
        Esperando
      </span>
    )
  }

  const medal = rankMedal(entry.rank)
  return (
    <span className="flex min-w-0 items-center gap-1.5 whitespace-nowrap leading-none" style={{ color }}>
      {medal && <span className="text-[16px] leading-none sm:text-[18px]" aria-hidden="true">{medal}</span>}
      <span className="font-display text-[20px] leading-none tabular-nums sm:text-[22px]">
        {formatRank(entry, entries)}
      </span>
    </span>
  )
}

function RankRow({
  entry,
  isMe,
  innerRef,
  entries,
  rankingStarted,
}: {
  entry: RankingEntry
  isMe: boolean
  innerRef?: React.Ref<HTMLDivElement>
  entries: RankingEntry[]
  rankingStarted: boolean
}) {
  const hasPredictions = (entry.predictions_count ?? 0) > 0
  const posColor = !rankingStarted ? '#8A8A8A' : isMe ? '#FF6B00' : (TOP3_COLOR[entry.rank] ?? '#4a4a4a')

  return (
    <Link
      href={`/ranking/${entry.user_id}`}
      className="block"
      aria-disabled={!hasPredictions}
      tabIndex={hasPredictions ? undefined : -1}
      onClick={(event) => {
        if (!hasPredictions) event.preventDefault()
      }}
    >
      <div
        ref={innerRef}
        className="grid grid-cols-[76px_minmax(0,1fr)_auto] items-center gap-2 rounded-[14px] px-3 py-3 transition-colors duration-150 sm:grid-cols-[92px_minmax(0,1fr)_auto] sm:gap-[14px] sm:px-[14px]"
        style={{
          background: isMe ? 'rgba(255,107,0,0.1)' : 'transparent',
          border: isMe ? '1px solid rgba(255,107,0,0.28)' : '1px solid transparent',
          cursor: hasPredictions ? 'pointer' : 'default',
          opacity: hasPredictions ? 1 : 0.72,
        }}
        onMouseEnter={(e) => {
          if (hasPredictions && !isMe) (e.currentTarget as HTMLElement).style.background = '#1c1c1c'
        }}
        onMouseLeave={(e) => {
          if (!isMe) (e.currentTarget as HTMLElement).style.background = 'transparent'
        }}
      >
      {/* Posición */}
      <RankMark entry={entry} entries={entries} color={posColor} rankingStarted={rankingStarted} />

      {/* Usuario */}
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
        <div
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[14px] font-bold text-white"
          style={{
            background: entry.rank === 1
              ? rankingStarted ? 'linear-gradient(135deg, #FF6B00, #FFE040)' : 'linear-gradient(135deg, #5B2D8E, #1565C0)'
              : 'linear-gradient(135deg, #5B2D8E, #1565C0)',
            border: '2px solid #2a2a2a',
          }}
        >
          {initials(entry.name)}
        </div>
        <div className="min-w-0 flex flex-col gap-0.5">
          <div className="flex items-center gap-2 truncate text-[14px] font-extrabold leading-tight">
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
          <div className="truncate font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-muted sm:tracking-[0.16em]">
            {hasPredictions
              ? `${entry.exact_predictions ?? 0} exactas · ${entry.correct_result_predictions ?? 0} parciales · ${entry.incorrect_predictions ?? 0} incorrectas`
              : 'Registrado · todavía no cargó su Prode'}
          </div>
        </div>
      </div>

      {/* Puntos */}
        <div className="text-right shrink-0">
          {rankingStarted && hasPredictions ? (
            <>
              <span
                className="font-display text-[21px] leading-none tabular-nums sm:text-[22px]"
                style={{ color: entry.total_points === 0 ? '#8A8A8A' : undefined }}
              >
                {entry.total_points}
              </span>
              <span
                className="ml-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] sm:ml-1.5 sm:text-[10px] sm:tracking-[0.16em]"
                style={{ color: '#8A8A8A' }}
              >
                pts
              </span>
            </>
          ) : (
            <span className="font-mono text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted sm:text-[11px]">
              Sin puntos
            </span>
          )}
        </div>
      </div>
    </Link>
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
  const rankingStarted = entries.some((entry) => entry.total_points > 0)

  const filtered = search.trim()
    ? entries.filter((e) =>
        e.name.toLowerCase().includes(search.trim().toLowerCase())
      )
    : entries

  const meEntry = entries.find((e) => e.user_id === userId)
  const showPrizeTieNote = rankingStarted && hasPrizeTie(entries)

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
          className="whitespace-nowrap rounded-[14px] px-3 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.08em] sm:px-4 sm:text-[11px] sm:tracking-[0.1em]"
          style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)', color: '#8A8A8A' }}
        >
          <b className="text-white">{filtered.length}</b> JUGADORES
        </div>
      </div>

      {!rankingStarted && (
        <div
          className="mb-5 rounded-[18px] px-5 py-5 text-[13px] font-semibold leading-relaxed sm:text-[14px]"
          style={{ background: 'rgba(168,240,216,0.07)', border: '1px solid rgba(168,240,216,0.18)', color: '#cfcfcf' }}
        >
          <strong className="block text-white font-extrabold mb-1">El conteo de puntos todavía no arrancó.</strong>
          El conteo de puntos empieza cuando se carguen los primeros resultados oficiales. Hasta entonces podés revisar los Prodes cargados por cada participante.
        </div>
      )}

      {showPrizeTieNote && (
        <div
          className="mb-5 rounded-[16px] px-4 py-3 text-[12px] font-semibold leading-relaxed sm:text-[13px]"
          style={{ background: 'rgba(168,240,216,0.07)', border: '1px solid rgba(168,240,216,0.18)', color: '#cfcfcf' }}
        >
          <strong className="font-extrabold text-white">Empate:</strong> los jugadores igualados en puntos y exactas comparten el premio correspondiente. Si el empate excede el podio, la aclaración vale solo para los puestos premiados.
        </div>
      )}

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
                entries={entries}
                rankingStarted={rankingStarted}
              />
            ))
          )}
      </div>

      {/* Sticky bottom — fila del usuario cuando scrollea hacia arriba */}
      {rankingStarted && meEntry && userId && (
        <aside
          ref={stickyRef as React.RefObject<HTMLElement>}
          className="you-sticky"
          aria-label="Tu posición en el ranking"
        >
          <div
            className="grid grid-cols-[76px_minmax(0,1fr)_auto] items-center gap-2 rounded-[14px] px-3 py-3 sm:grid-cols-[92px_minmax(0,1fr)_auto] sm:gap-[14px] sm:px-[14px]"
            style={{ background: 'rgba(255,107,0,0.1)' }}
          >
            <RankMark entry={meEntry} entries={entries} color="#FF6B00" rankingStarted={rankingStarted} />
            <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
              <div
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[14px] font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #5B2D8E, #1565C0)', border: '2px solid #2a2a2a' }}
              >
                {initials(meEntry.name)}
              </div>
              <div className="min-w-0 flex flex-col gap-0.5">
                <div className="flex items-center gap-2 truncate text-[14px] font-extrabold leading-tight">
                  {meEntry.name}
                  <span
                    className="font-mono text-[9px] font-extrabold tracking-[0.18em] px-[7px] py-[2px] rounded-[6px] shrink-0"
                    style={{ background: '#FF6B00', color: '#0A0A0A' }}
                  >
                    VOS
                  </span>
                </div>
                <div className="truncate font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-muted sm:tracking-[0.16em]">
                  {meEntry.exact_predictions ?? 0} exactas · {meEntry.correct_result_predictions ?? 0} parciales · {meEntry.incorrect_predictions ?? 0} incorrectas
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span
                className="font-display text-[21px] leading-none tabular-nums sm:text-[22px]"
                style={{ color: meEntry.total_points === 0 ? '#8A8A8A' : undefined }}
              >
                {meEntry.total_points}
              </span>
              <span className="ml-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] sm:ml-1.5 sm:text-[10px] sm:tracking-[0.16em]" style={{ color: '#8A8A8A' }}>
                pts
              </span>
            </div>
          </div>
        </aside>
      )}
    </>
  )
}

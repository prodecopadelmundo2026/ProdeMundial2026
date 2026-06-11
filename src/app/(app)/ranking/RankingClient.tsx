'use client'

import { useState, useRef, useEffect } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import type { RankingEntry } from '@/types'
import { formatRank, hasPrizeTie, rankMedal } from '@/lib/ranking-display'
import { formatPrizePool } from '@/lib/prode-progress'

function initials(name: string): string {
  return name.trim()[0]?.toUpperCase() ?? '?'
}

function normalizeProdeStatus(entry: RankingEntry) {
  if (entry.prode_status === 'complete') return 'completed'
  if (entry.prode_status === 'empty') return 'not_started'
  return entry.prode_status ?? ((entry.predictions_count ?? 0) > 0 ? 'in_progress' : 'not_started')
}

function progressPercentage(entry: RankingEntry) {
  if (typeof entry.progress_percentage === 'number') return Math.max(0, Math.min(100, entry.progress_percentage))
  if (entry.expected_count && entry.expected_count > 0) {
    return Math.min(100, Math.round(((entry.loaded_count ?? entry.predictions_count ?? 0) / entry.expected_count) * 100))
  }
  return (entry.predictions_count ?? 0) > 0 ? 1 : 0
}

function progressStatusText(entry: RankingEntry) {
  const status = normalizeProdeStatus(entry)
  if (status === 'completed') return 'Terminado'
  if (status === 'almost_done') return 'En proceso'
  if (status === 'in_progress') return 'En proceso'
  return 'Sin cargar'
}

function RankingRowWrapper({ userId, children }: { userId: string | null; children: ReactNode }) {
  if (!userId) return <div className="block">{children}</div>
  return (
    <Link href={`/ranking/${userId}`} className="block">
      {children}
    </Link>
  )
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
  const hasDetail = Boolean(entry.user_id)
  const isTrial = entry.participant_status === 'trial'
  const percentage = progressPercentage(entry)
  const statusText = rankingStarted
    ? normalizeProdeStatus(entry) === 'completed'
      ? 'Prode completo'
      : hasPredictions
      ? 'Prode en proceso'
      : 'Todavia no cargo su Prode'
    : progressStatusText(entry)
  const posColor = !rankingStarted ? '#8A8A8A' : isMe ? '#FF6B00' : (TOP3_COLOR[entry.rank] ?? '#4a4a4a')

  return (
    <RankingRowWrapper userId={entry.user_id}>
      <div
        ref={innerRef}
        className="grid grid-cols-[76px_minmax(0,1fr)_auto] items-center gap-2 rounded-[14px] px-3 py-3 transition-colors duration-150 sm:grid-cols-[92px_minmax(0,1fr)_auto] sm:gap-[14px] sm:px-[14px]"
        style={{
          background: isMe ? 'rgba(255,107,0,0.1)' : 'transparent',
          border: isMe ? '1px solid rgba(255,107,0,0.28)' : '1px solid transparent',
          cursor: hasDetail ? 'pointer' : 'default',
          opacity: hasPredictions ? 1 : 0.82,
        }}
        onMouseEnter={(e) => {
          if (hasDetail && !isMe) (e.currentTarget as HTMLElement).style.background = '#1c1c1c'
        }}
        onMouseLeave={(e) => {
          if (hasDetail && !isMe) (e.currentTarget as HTMLElement).style.background = 'transparent'
        }}
      >
      {/* Posición */}
      {isTrial ? (
        <span className="font-mono text-[10px] font-extrabold uppercase tracking-[0.12em] sm:text-[11px]" style={{ color: '#FFB15C' }}>
          Invitado
        </span>
      ) : (
        <RankMark entry={entry} entries={entries.filter((item) => item.participant_status !== 'trial')} color={posColor} rankingStarted={rankingStarted} />
      )}

      {/* Usuario */}
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
        <div
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-[14px] font-bold text-white"
          style={{
            background: !isTrial && entry.rank === 1
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
            {isTrial && (
              <span
                className="font-mono text-[9px] font-extrabold tracking-[0.18em] px-[7px] py-[2px] rounded-[6px] shrink-0"
                style={{ background: 'rgba(255,177,92,0.16)', color: '#FFB15C', border: '1px solid rgba(255,177,92,0.28)' }}
              >
                INVITADO
              </span>
            )}
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
            {rankingStarted
              ? hasPredictions
                ? `${statusText} · ${entry.exact_predictions ?? 0} exactas · ${entry.correct_result_predictions ?? 0} parciales · ${entry.incorrect_predictions ?? 0} incorrectas`
                : statusText
              : `${statusText} · ${percentage}% cargado`}
          </div>
        </div>
      </div>

      {/* Puntos */}
        <div className="text-right shrink-0">
          {rankingStarted ? (
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
            <div className="w-[86px] sm:w-[110px]">
              <div className="mb-1 flex items-center justify-end gap-1.5">
                {normalizeProdeStatus(entry) === 'completed' && (
                  <span className="h-2 w-2 rounded-full" style={{ background: '#A8F0D8' }} aria-hidden="true" />
                )}
                <span className="font-display text-[21px] leading-none tabular-nums sm:text-[22px]">
                  {percentage}%
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-black/35">
                <div className="h-full rounded-full" style={{ width: `${percentage}%`, background: normalizeProdeStatus(entry) === 'completed' ? '#A8F0D8' : '#FFB15C' }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </RankingRowWrapper>
  )
}

export function RankingClient({
  entries,
  userId,
  rankingStarted,
  summary,
}: {
  entries: RankingEntry[]
  userId?: string
  rankingStarted: boolean
  summary?: {
    confirmedPlayers: number
    prizePoolArs: number
    completedProdes: number
    pendingProdes: number
  }
}) {
  const [search, setSearch] = useState('')
  const meRowRef = useRef<HTMLDivElement | null>(null)
  const stickyRef = useRef<HTMLElement | null>(null)
  const sortForCurrentMode = (items: RankingEntry[]) => rankingStarted
    ? items
    : [...items].sort((a, b) => progressPercentage(b) - progressPercentage(a) || a.name.localeCompare(b.name))
  const officialEntries = sortForCurrentMode(entries.filter((entry) => entry.participant_status !== 'trial'))
  const trialEntries = sortForCurrentMode(entries.filter((entry) => entry.participant_status === 'trial'))

  const filterBySearch = (items: RankingEntry[]) => search.trim()
    ? items.filter((e) => e.name.toLowerCase().includes(search.trim().toLowerCase()))
    : items

  const filteredOfficial = filterBySearch(officialEntries)
  const filteredTrial = filterBySearch(trialEntries)
  const filtered = [...filteredOfficial, ...filteredTrial]

  const meEntry = entries.find((e) => e.user_id === userId)
  const showPrizeTieNote = rankingStarted && hasPrizeTie(officialEntries)
  const podiumEntries = rankingStarted ? officialEntries.filter((entry) => entry.rank <= 3).slice(0, 3) : []

  function RankingSection({
    title,
    description,
    items,
    empty,
    tone = 'official',
  }: {
    title: string
    description: string
    items: RankingEntry[]
    empty: string
    tone?: 'official' | 'trial'
  }) {
    return (
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2 px-1">
          <div>
            <h2 className="font-display text-[22px] uppercase leading-none tracking-[-0.02em] text-white">
              {title}
            </h2>
            <p className="mt-1 max-w-[620px] text-[12px] font-semibold leading-relaxed text-muted">
              {description}
            </p>
          </div>
          <span
            className="rounded-full px-3 py-1.5 font-mono text-[10px] font-extrabold uppercase tracking-[0.1em]"
            style={{
              background: tone === 'trial' ? 'rgba(255,177,92,0.1)' : 'rgba(168,240,216,0.08)',
              color: tone === 'trial' ? '#FFB15C' : '#A8F0D8',
              border: tone === 'trial' ? '1px solid rgba(255,177,92,0.2)' : '1px solid rgba(168,240,216,0.18)',
            }}
          >
            {items.length}
          </span>
        </div>

        <div
          className="flex flex-col gap-1.5 rounded-[24px] p-2.5"
          style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {items.length === 0 ? (
            <div className="py-10 text-center text-muted text-[14px]">
              {empty}
            </div>
          ) : (
            items.map((entry) => (
              <RankRow
                key={entry.user_id ?? `pending-${entry.name}`}
                entry={entry}
                isMe={Boolean(entry.user_id) && entry.user_id === userId}
                innerRef={entry.user_id && entry.user_id === userId ? meRowRef : undefined}
                entries={officialEntries}
                rankingStarted={rankingStarted}
              />
            ))
          )}
        </div>
      </section>
    )
  }

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
            placeholder="Buscar Prode…"
            aria-label="Buscar Prode"
            className="flex-1 bg-transparent border-none outline-none text-white text-[14px] font-semibold placeholder:text-muted placeholder:font-normal"
          />
        </div>
        <div
          className="whitespace-nowrap rounded-[14px] px-3 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.08em] sm:px-4 sm:text-[11px] sm:tracking-[0.1em]"
          style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)', color: '#8A8A8A' }}
        >
          <b className="text-white">{filtered.length}</b> RESULTADOS
        </div>
      </div>

      <div
        className="mb-5 rounded-[16px] px-4 py-3 text-[12px] font-semibold leading-relaxed sm:text-[13px]"
        style={{ background: 'rgba(255,177,92,0.07)', border: '1px solid rgba(255,177,92,0.18)', color: '#cfcfcf' }}
      >
        Los invitados pueden probar el sistema y cargar pronosticos, pero solo los competidores participan oficialmente por premios.
      </div>

      {!rankingStarted && (
        <>
          <div
            className="mb-5 rounded-[18px] px-5 py-5 text-[13px] font-semibold leading-relaxed sm:text-[14px]"
            style={{ background: 'rgba(168,240,216,0.07)', border: '1px solid rgba(168,240,216,0.18)', color: '#cfcfcf' }}
          >
            <strong className="block text-white font-extrabold mb-1">El conteo de puntos todavia no arranco.</strong>
            Antes de los primeros resultados oficiales, esta tabla funciona como listado de participantes y avance de carga.
          </div>
          {summary && (
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ['Confirmados', summary.confirmedPlayers],
                ['Pozo actual', summary.prizePoolArs > 0 ? formatPrizePool(summary.confirmedPlayers) : '$0'],
                ['Prodes completos', summary.completedProdes],
                ['Con carga pendiente', summary.pendingProdes],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[16px] bg-[#141414] p-4" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p className="font-display text-[26px] leading-none text-white">{value}</p>
                  <p className="mt-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted">{label}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showPrizeTieNote && (
        <div
          className="mb-5 rounded-[16px] px-4 py-3 text-[12px] font-semibold leading-relaxed sm:text-[13px]"
          style={{ background: 'rgba(168,240,216,0.07)', border: '1px solid rgba(168,240,216,0.18)', color: '#cfcfcf' }}
        >
          <strong className="font-extrabold text-white">Empate:</strong> los competidores igualados en puntos y exactas comparten el premio correspondiente. Si el empate excede el podio, la aclaración vale solo para los puestos premiados.
        </div>
      )}

      {podiumEntries.length > 0 && (
        <section className="mb-7">
          <div className="mb-3 px-1">
            <h2 className="font-display text-[24px] uppercase leading-none tracking-[-0.02em] text-white">
              Podio en vivo
            </h2>
            <p className="mt-1 text-[12px] font-semibold leading-relaxed text-muted">
              Top 3 competitivo segun puntos y criterios de desempate.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {podiumEntries.filter((entry) => entry.user_id).map((entry) => {
              const color = TOP3_COLOR[entry.rank] ?? '#A8A8A8'
              return (
                <Link
                  key={entry.user_id ?? entry.name}
                  href={`/ranking/${entry.user_id!}`}
                  className="rounded-[18px] p-4 transition-transform hover:-translate-y-0.5"
                  style={{ background: '#141414', border: `1px solid ${color}55` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-full font-display text-[20px] text-bg" style={{ background: color }}>
                      {rankMedal(entry.rank) || entry.rank}
                    </div>
                    <div className="text-right">
                      <p className="font-display text-[32px] leading-none tabular-nums" style={{ color }}>
                        {entry.total_points}
                      </p>
                      <p className="font-mono text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted">pts</p>
                    </div>
                  </div>
                  <p className="mt-4 truncate text-[15px] font-extrabold text-white">{entry.name}</p>
                  <p className="mt-1 truncate font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
                    {entry.exact_predictions ?? 0} exactas · {entry.correct_result_predictions ?? 0} parciales
                  </p>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      <div className="space-y-7">
        <RankingSection
          title="Ranking oficial"
          description={rankingStarted ? 'Competidores que participan oficialmente por premios. Las posiciones de esta tabla son las posiciones oficiales.' : 'Competidores confirmados. Antes del Mundial se ordenan por avance de carga, no por puntos.'}
          items={filteredOfficial}
          empty={search.trim() ? 'No se encontraron competidores para esa búsqueda.' : 'Todavía no hay competidores en el ranking oficial.'}
        />

        <RankingSection
          title="Invitados probando el sistema"
          description="Invitados habilitados para probar, cargar pronósticos y conocer la plataforma. No tienen posición oficial ni participan por premios."
          items={filteredTrial}
          empty={search.trim() ? 'No se encontraron invitados para esa búsqueda.' : 'No hay invitados con Prode cargado para mostrar.'}
          tone="trial"
        />
      </div>

      {/* Sticky bottom — fila del usuario cuando scrollea hacia arriba */}
      {meEntry && userId && (
        <aside
          ref={stickyRef as React.RefObject<HTMLElement>}
          className="you-sticky"
          aria-label="Tu posición en el ranking"
        >
          <div
            className="grid grid-cols-[76px_minmax(0,1fr)_auto] items-center gap-2 rounded-[14px] px-3 py-3 sm:grid-cols-[92px_minmax(0,1fr)_auto] sm:gap-[14px] sm:px-[14px]"
            style={{ background: 'rgba(255,107,0,0.1)' }}
          >
            {meEntry.participant_status === 'trial' ? (
              <span className="font-mono text-[10px] font-extrabold uppercase tracking-[0.12em]" style={{ color: '#FFB15C' }}>
                Invitado
              </span>
            ) : (
              <RankMark entry={meEntry} entries={entries.filter((item) => item.participant_status !== 'trial')} color="#FF6B00" rankingStarted={rankingStarted} />
            )}
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
                  {meEntry.participant_status === 'trial' && (
                    <span
                      className="font-mono text-[9px] font-extrabold tracking-[0.18em] px-[7px] py-[2px] rounded-[6px] shrink-0"
                      style={{ background: 'rgba(255,177,92,0.16)', color: '#FFB15C', border: '1px solid rgba(255,177,92,0.28)' }}
                    >
                      INVITADO
                    </span>
                  )}
                  <span
                    className="font-mono text-[9px] font-extrabold tracking-[0.18em] px-[7px] py-[2px] rounded-[6px] shrink-0"
                    style={{ background: '#FF6B00', color: '#0A0A0A' }}
                  >
                    VOS
                  </span>
                </div>
                <div className="truncate font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-muted sm:tracking-[0.16em]">
                  {rankingStarted
                    ? (meEntry.predictions_count ?? 0) > 0
                      ? `Prode en proceso · ${meEntry.exact_predictions ?? 0} exactas · ${meEntry.correct_result_predictions ?? 0} parciales · ${meEntry.incorrect_predictions ?? 0} incorrectas`
                      : 'Todavia no cargo su Prode'
                    : `${progressStatusText(meEntry)} · ${progressPercentage(meEntry)}% cargado`}
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              {rankingStarted ? (
                <>
                  <span
                    className="font-display text-[21px] leading-none tabular-nums sm:text-[22px]"
                    style={{ color: meEntry.total_points === 0 ? '#8A8A8A' : undefined }}
                  >
                    {meEntry.total_points}
                  </span>
                  <span className="ml-1 font-mono text-[9px] font-bold uppercase tracking-[0.12em] sm:ml-1.5 sm:text-[10px] sm:tracking-[0.16em]" style={{ color: '#8A8A8A' }}>
                    pts
                  </span>
                </>
              ) : (
                <span className="font-display text-[21px] leading-none tabular-nums sm:text-[22px]">
                  {progressPercentage(meEntry)}%
                </span>
              )}
            </div>
          </div>
        </aside>
      )}
    </>
  )
}

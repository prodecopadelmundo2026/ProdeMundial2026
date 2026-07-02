'use client'

import { useMemo, useState } from 'react'
import type { StatisticsCard, StatisticsData } from '@/lib/statistics'

const COLORS = ['#FF6B00', '#A8F0D8', '#FFE040', '#8B7CFF', '#53A7FF', '#FF8CC6', '#B8FF6A', '#FFB15C', '#B0B0B0', '#E170FF']

function StatCards({ cards }: { cards: StatisticsCard[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 min-[390px]:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <article key={card.key} className="min-w-0 rounded-[18px] border border-white/10 bg-[#111] p-4 sm:p-5">
          <p className="font-mono text-[10px] font-extrabold uppercase tracking-[0.16em] text-orange">{card.title}</p>
          <h3 className="mt-3 break-words text-[17px] font-extrabold leading-tight text-white">{card.name}</h3>
          <p className="mt-2 font-display text-[28px] leading-none text-[#A8F0D8]">{card.value}</p>
          <p className="mt-3 text-[11px] font-medium leading-relaxed text-muted">{card.detail}</p>
        </article>
      ))}
    </div>
  )
}

export function StatisticsDashboard({ data }: { data: StatisticsData }) {
  const [range, setRange] = useState<'all' | 'week' | 'day'>('all')
  const [limit, setLimit] = useState<'5' | '10' | 'all'>('10')
  const [selectedDate, setSelectedDate] = useState(data.snapshots.at(-1)?.date ?? '')

  const visibleSnapshots = useMemo(() => {
    if (range === 'day') return data.snapshots.filter((snapshot) => snapshot.date === selectedDate)
    if (range === 'week') {
      const index = Math.max(0, data.snapshots.findIndex((snapshot) => snapshot.date === selectedDate))
      return data.snapshots.slice(Math.max(0, index - 6), index + 1)
    }
    return data.snapshots
  }, [data.snapshots, range, selectedDate])

  const selected = data.snapshots.find((snapshot) => snapshot.date === selectedDate) ?? data.snapshots.at(-1)
  const take = limit === 'all' ? Number.POSITIVE_INFINITY : Number(limit)
  const selectedUsers = (selected?.entries ?? []).slice(0, take)
  const width = 920
  const height = 360
  const pad = { left: 42, right: 18, top: 20, bottom: 38 }
  const maxRank = Math.max(1, selectedUsers.length)
  const x = (index: number) => visibleSnapshots.length <= 1
    ? width / 2
    : pad.left + index * ((width - pad.left - pad.right) / (visibleSnapshots.length - 1))
  const y = (rank: number) => pad.top + (rank - 1) * ((height - pad.top - pad.bottom) / Math.max(1, maxRank - 1))

  return (
    <div className="space-y-12">
      <section aria-labelledby="timeline-title">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-[10px] font-extrabold uppercase tracking-[0.2em] text-orange">Evolución diaria</p>
            <h2 id="timeline-title" className="mt-2 font-display text-[30px] uppercase leading-none sm:text-[42px]">Línea de tiempo</h2>
          </div>
          <div className="grid grid-cols-1 gap-2 min-[390px]:grid-cols-3">
            <select aria-label="Período" value={range} onChange={(event) => setRange(event.target.value as typeof range)} className="min-w-0 rounded-xl border border-white/10 bg-[#151515] px-3 py-2 text-[12px] font-bold">
              <option value="all">Todos los días</option>
              <option value="week">Semana</option>
              <option value="day">Fecha puntual</option>
            </select>
            <select aria-label="Fecha" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="min-w-0 rounded-xl border border-white/10 bg-[#151515] px-3 py-2 text-[12px] font-bold">
              {data.snapshots.map((snapshot) => <option key={snapshot.date} value={snapshot.date}>{snapshot.label}</option>)}
            </select>
            <select aria-label="Cantidad de usuarios" value={limit} onChange={(event) => setLimit(event.target.value as typeof limit)} className="min-w-0 rounded-xl border border-white/10 bg-[#151515] px-3 py-2 text-[12px] font-bold">
              <option value="5">Top 5</option>
              <option value="10">Top 10</option>
              <option value="all">Todos</option>
            </select>
          </div>
        </div>

        <div className="rounded-[20px] border border-white/10 bg-[#0e0e0e] p-3 sm:p-5">
          {visibleSnapshots.length ? (
            <>
              <div className="w-full overflow-hidden">
                <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Evolución de posiciones del ranking" className="h-auto w-full min-w-0">
                  {Array.from({ length: Math.min(maxRank, 10) }, (_, index) => index + 1).map((rank) => (
                    <g key={rank}>
                      <line x1={pad.left} x2={width - pad.right} y1={y(rank)} y2={y(rank)} stroke="rgba(255,255,255,.07)" />
                      <text x={pad.left - 10} y={y(rank) + 4} fill="#777" textAnchor="end" fontSize="11">#{rank}</text>
                    </g>
                  ))}
                  {selectedUsers.map((user, colorIndex) => {
                    const points = visibleSnapshots.flatMap((snapshot, index) => {
                      const entry = snapshot.entries.find((item) => item.userId === user.userId)
                      return entry ? [{ px: x(index), py: y(entry.rank), entry }] : []
                    })
                    return (
                      <g key={user.userId}>
                        {points.length > 1 && <polyline points={points.map((point) => `${point.px},${point.py}`).join(' ')} fill="none" stroke={COLORS[colorIndex % COLORS.length]} strokeWidth="3" strokeLinejoin="round" />}
                        {points.map((point, index) => <circle key={index} cx={point.px} cy={point.py} r="4" fill={COLORS[colorIndex % COLORS.length]}><title>{user.name}: #{point.entry.rank}, {point.entry.points} pts</title></circle>)}
                      </g>
                    )
                  })}
                  {visibleSnapshots.map((snapshot, index) => <text key={snapshot.date} x={x(index)} y={height - 10} fill="#777" textAnchor="middle" fontSize="10">{visibleSnapshots.length <= 12 || index % Math.ceil(visibleSnapshots.length / 8) === 0 ? snapshot.label : ''}</text>)}
                </svg>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                {selectedUsers.map((user, index) => <span key={user.userId} className="flex min-w-0 items-center gap-2 text-[11px] font-bold"><i className="h-2 w-2 shrink-0 rounded-full" style={{ background: COLORS[index % COLORS.length] }} />{user.name}</span>)}
              </div>
            </>
          ) : <p className="py-16 text-center text-sm text-muted">La línea aparecerá cuando haya partidos finalizados.</p>}
        </div>
      </section>

      <section aria-labelledby="daily-table-title">
        <h2 id="daily-table-title" className="font-display text-[28px] uppercase sm:text-[36px]">Tabla al {selected?.label ?? 'día'}</h2>
        <div className="mt-4 space-y-2">
          {(selected?.entries ?? []).slice(0, take).map((entry) => (
            <article key={entry.userId} className="grid min-w-0 grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-2 rounded-[14px] border border-white/8 bg-[#111] px-3 py-3 sm:grid-cols-[58px_minmax(0,1fr)_repeat(5,minmax(64px,auto))] sm:gap-3 sm:px-4">
              <span className="font-display text-[20px] text-orange">#{entry.rank}</span>
              <strong className="min-w-0 truncate text-[13px] sm:text-[14px]">{entry.name}</strong>
              <span className="text-right font-display text-[20px]">{entry.points}<small className="ml-1 font-mono text-[9px] text-muted">PTS</small></span>
              <span className="col-start-2 font-mono text-[10px] text-muted sm:col-start-auto"><b className={entry.rankChange > 0 ? 'text-[#A8F0D8]' : entry.rankChange < 0 ? 'text-[#ff8f8f]' : 'text-muted'}>{entry.rankChange > 0 ? `↑${entry.rankChange}` : entry.rankChange < 0 ? `↓${Math.abs(entry.rankChange)}` : '—'}</b> posición</span>
              <span className="font-mono text-[10px] text-muted"><b className="text-white">+{entry.pointsChange}</b> día</span>
              <span className="font-mono text-[10px] text-muted"><b className="text-white">{entry.exact}</b> exactas</span>
              <span className="font-mono text-[10px] text-muted"><b className="text-white">{entry.signs}</b> signos</span>
              <span className="font-mono text-[10px] text-muted"><b className="text-white">{entry.bonus}</b> bonus</span>
            </article>
          ))}
        </div>
      </section>

      <section>
        <p className="font-mono text-[10px] font-extrabold uppercase tracking-[0.2em] text-orange">Lo que importa</p>
        <h2 className="mb-5 mt-2 font-display text-[30px] uppercase sm:text-[42px]">Estadísticas serias</h2>
        <StatCards cards={data.serious} />
      </section>

      <section>
        <p className="font-mono text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#A8F0D8]">El vestuario opina</p>
        <h2 className="mb-5 mt-2 font-display text-[30px] uppercase sm:text-[42px]">Estadísticas graciosas</h2>
        <StatCards cards={data.curious} />
      </section>
    </div>
  )
}

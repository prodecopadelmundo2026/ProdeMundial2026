'use client'

import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import type {
  DateMatchStat, StatisticsCard, StatisticsData, StatisticsPhase, StatisticsSnapshotEntry,
} from '@/lib/statistics'

type Metric = 'rank' | 'points' | 'exact' | 'signs' | 'bonus'
type Hover = { entry: StatisticsSnapshotEntry; date: string; label: string; x?: number; y?: number } | null
type LineVisual = { primary: string; secondary?: string; gradientId: string }
const COLORS = [
  '#FF6B00', '#A8F0D8', '#FFE040', '#8B7CFF', '#53A7FF', '#FF8CC6',
  '#B8FF6A', '#FFB15C', '#E170FF', '#6FE7FF', '#F59E0B', '#22C55E',
  '#F43F5E', '#14B8A6', '#A78BFA', '#38BDF8', '#FB7185', '#84CC16',
  '#F97316', '#2DD4BF', '#C084FC', '#60A5FA', '#FACC15', '#34D399',
]
const STAGES: Record<string, string> = {
  group: 'Fase de grupos', round_of_32: '16avos', round_of_16: 'Octavos',
  quarter: 'Cuartos', semi: 'Semifinal', third_place: 'Tercer puesto', final: 'Final',
}

function buildLineVisuals(data: StatisticsData) {
  const combinations: Array<{ primary: string; secondary?: string }> = COLORS.map((primary) => ({ primary }))
  for (let offset = 1; offset < COLORS.length; offset += 1) {
    for (let index = 0; index < COLORS.length; index += 1) {
      const pair = (index + offset) % COLORS.length
      if (index < pair) combinations.push({ primary: COLORS[index], secondary: COLORS[pair] })
    }
  }
  return new Map(
    [...data.participants]
      .sort((a, b) => a.user_id.localeCompare(b.user_id))
      .map((participant, index) => {
        const visual = combinations[index % combinations.length]
        return [participant.user_id, { ...visual, gradientId: `timeline-color-${index}` }] as const
      })
  )
}

function visualBackground(visual: LineVisual) {
  return visual.secondary
    ? `linear-gradient(90deg, ${visual.primary} 0 50%, ${visual.secondary} 50% 100%)`
    : visual.primary
}

function metricValue(entry: StatisticsSnapshotEntry, phase: StatisticsPhase, metric: Metric) {
  return metric === 'rank' ? entry.ranks[phase] : entry.metrics[phase][metric]
}

function UserPicker({
  data, selected, setSelected, visuals, currentUserId,
}: {
  data: StatisticsData
  selected: string[]
  setSelected: (ids: string[]) => void
  visuals: Map<string, LineVisual>
  currentUserId: string | null
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const filtered = data.participants.filter((participant) => participant.name.toLowerCase().includes(query.toLowerCase()))
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-[#151515] px-3 py-2 text-left text-[12px] font-bold">
        <span>{selected.length ? `${selected.length} participantes` : 'Elegir participantes'}</span>
        <Search size={14} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-30 mt-2 max-h-[320px] overflow-hidden rounded-[16px] border border-white/10 bg-[#171717] p-3 shadow-2xl sm:min-w-[320px]">
          <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3">
            <Search size={14} className="text-muted" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar participante" className="min-w-0 flex-1 bg-transparent py-2.5 text-[12px] outline-none" />
          </label>
          <div className="mt-2 max-h-[210px] overflow-y-auto">
            {filtered.map((participant) => {
              const checked = selected.includes(participant.user_id)
              const visual = visuals.get(participant.user_id)!
              const isCurrent = participant.user_id === currentUserId
              return (
                <label key={participant.user_id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-[12px] hover:bg-white/5">
                  <input type="checkbox" checked={checked} onChange={() => setSelected(checked ? selected.filter((id) => id !== participant.user_id) : [...selected, participant.user_id])} />
                  <i className={`h-2 w-2 rounded-full ${isCurrent ? 'ring-2 ring-white ring-offset-2 ring-offset-[#171717]' : ''}`} style={{ background: visualBackground(visual) }} />
                  <span className="min-w-0 truncate font-bold">{participant.name}{isCurrent ? ' · Vos' : ''}</span>
                </label>
              )
            })}
          </div>
          <div className="mt-2 flex gap-2 border-t border-white/10 pt-3">
            <button type="button" onClick={() => setSelected([])} className="flex-1 rounded-lg bg-white/5 px-3 py-2 text-[10px] font-extrabold uppercase">Limpiar</button>
            <button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-lg bg-orange px-3 py-2 text-[10px] font-extrabold uppercase text-black">Listo</button>
          </div>
        </div>
      )}
    </div>
  )
}

function DetailModal({ card, close }: { card: StatisticsCard; close: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/75 p-4" onClick={close}>
      <section role="dialog" aria-modal="true" aria-label={card.title} onClick={(event) => event.stopPropagation()} className="max-h-[80vh] w-full max-w-[520px] overflow-y-auto rounded-[22px] border border-white/10 bg-[#151515] p-5">
        <div className="flex items-start justify-between gap-4">
          <div><p className="font-mono text-[10px] font-extrabold uppercase tracking-[.16em] text-orange">{card.title}</p><h3 className="mt-2 font-display text-[32px]">{card.value}</h3></div>
          <button type="button" onClick={close} aria-label="Cerrar detalle" className="rounded-full bg-white/5 p-2"><X size={18} /></button>
        </div>
        <div className="mt-5 space-y-2">
          {card.winners.map((winner) => <div key={winner.userId} className="flex items-center justify-between gap-3 rounded-xl bg-white/5 px-3 py-3 text-[13px]"><strong>{winner.name}</strong><span className="font-mono text-[11px] text-[#A8F0D8]">{winner.value}</span></div>)}
        </div>
      </section>
    </div>
  )
}

function StatCards({ cards }: { cards: StatisticsCard[] }) {
  const [detail, setDetail] = useState<StatisticsCard | null>(null)
  return (
    <>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map((card) => {
          const hasUsefulDetail = card.winners.length > 1
          return (
          <article key={card.key} className="flex min-h-[136px] min-w-0 flex-col rounded-[16px] border border-white/10 bg-[#111] p-3.5 sm:min-h-[176px] sm:rounded-[18px] sm:p-5">
            <p className="font-mono text-[9px] font-extrabold uppercase tracking-[0.14em] text-orange">{card.title}</p>
            <p className="mt-2 font-display text-[26px] leading-none text-[#A8F0D8] sm:mt-3 sm:text-[28px]">{card.value}</p>
            <div className="mt-2 min-h-0 text-[12px] font-extrabold leading-snug sm:mt-3 sm:min-h-[38px] sm:text-[13px]">
              {card.winners.length > 3 ? (
                <><p>{card.winners.length} participantes empatados</p><p className="mt-1 truncate text-[10px] font-medium text-muted">{card.winners.slice(0, 3).map((winner) => winner.name).join(', ')}…</p></>
              ) : <p className="line-clamp-2">{card.winners.map((winner) => winner.name).join(', ') || 'Sin datos'}</p>}
            </div>
            <p className="mt-1.5 line-clamp-2 text-[10px] font-medium leading-relaxed text-muted sm:mt-2">{card.detail}</p>
            {hasUsefulDetail && (
              <button type="button" onClick={() => setDetail(card)} className="mt-auto pt-2 text-left font-mono text-[9px] font-extrabold uppercase tracking-[.12em] text-white/70 hover:text-white sm:pt-3">Ver detalle</button>
            )}
          </article>
          )
        })}
      </div>
      {detail && <DetailModal card={detail} close={() => setDetail(null)} />}
    </>
  )
}

function MatchCard({ match }: { match: DateMatchStat }) {
  const [open, setOpen] = useState(false)
  const categories = [
    ['Exactas', match.exact, '#A8F0D8'], ['Signo / parcial', match.partial, '#FFE040'], ['Sin puntos', match.incorrect, '#ff8f8f'],
  ] as const
  return (
    <article className="min-w-0 rounded-[16px] border border-white/10 bg-[#111] p-3.5 sm:p-4">
      <p className="font-mono text-[9px] font-bold uppercase tracking-[.14em] text-muted">{STAGES[match.stage]}{match.group ? ` · Grupo ${match.group}` : ''}</p>
      <div className="mt-3 grid min-w-0 grid-cols-[minmax(0,1fr)_74px_minmax(0,1fr)] items-center gap-2 text-[12px] font-extrabold sm:text-[13px]">
        <span className="min-w-0 overflow-hidden text-ellipsis text-right leading-tight [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]">{match.homeTeam}</span>
        <strong className="rounded-lg bg-white/8 px-2 py-2 text-center font-display text-[20px] tabular-nums sm:text-[22px]">{match.homeScore}–{match.awayScore}</strong>
        <span className="min-w-0 overflow-hidden text-ellipsis leading-tight [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]">{match.awayTeam}</span>
      </div>
      <button type="button" onClick={() => setOpen((value) => !value)} className="mt-4 grid w-full grid-cols-3 gap-1 text-[9px] font-bold">
        {categories.map(([label, users, color]) => <span key={label} className="rounded-lg bg-white/5 p-2"><b className="block text-[15px]" style={{ color }}>{users.length}</b>{label}</span>)}
      </button>
      {open && <div className="mt-3 space-y-3 border-t border-white/10 pt-3">{categories.map(([label, users, color]) => <div key={label}><p className="font-mono text-[9px] font-extrabold uppercase" style={{ color }}>{label}</p><p className="mt-1 text-[11px] leading-relaxed text-muted">{users.join(', ') || 'Nadie'}</p></div>)}</div>}
    </article>
  )
}

export function StatisticsDashboard({ data, currentUserId }: { data: StatisticsData; currentUserId: string | null }) {
  const [range, setRange] = useState<'all' | 'week' | 'day'>('all')
  const [limit, setLimit] = useState<'5' | '10' | 'all'>('5')
  const [phase, setPhase] = useState<StatisticsPhase>('all')
  const [metric, setMetric] = useState<Metric>('rank')
  const [selectedDate, setSelectedDate] = useState(data.snapshots.at(-1)?.date ?? '')
  const [pickedUsers, setPickedUsers] = useState<string[]>([])
  const [hovered, setHovered] = useState<Hover>(null)
  const [showMobileFilters, setShowMobileFilters] = useState(false)

  const selected = data.snapshots.find((snapshot) => snapshot.date === selectedDate)
  const visuals = useMemo(() => buildLineVisuals(data), [data])
  const visibleSnapshots = useMemo(() => {
    if (range === 'day') return []
    if (range === 'week') {
      const index = data.snapshots.findIndex((snapshot) => snapshot.date === selectedDate)
      return index < 0 ? [] : data.snapshots.slice(Math.max(0, index - 6), index + 1)
    }
    return data.snapshots
  }, [data.snapshots, range, selectedDate])

  const take = limit === 'all' ? Number.POSITIVE_INFINITY : Number(limit)
  const chartUsers = useMemo(() => {
    const base = pickedUsers.length
      ? data.participants.filter((participant) => pickedUsers.includes(participant.user_id))
      : (selected?.entries ?? []).slice(0, take).map((entry) => ({
          user_id: entry.userId, name: entry.name, avatar_url: null,
        }))
    const current = currentUserId
      ? data.participants.find((participant) => participant.user_id === currentUserId)
      : null
    return current && !base.some((participant) => participant.user_id === current.user_id)
      ? [...base, current]
      : base
  }, [currentUserId, data.participants, pickedUsers, selected?.entries, take])

  const width = 1040
  const height = 390
  const pad = { left: 48, right: 20, top: 28, bottom: 42 }
  const plottedValues = visibleSnapshots.flatMap((snapshot) => chartUsers.flatMap((user) => {
    const entry = snapshot.entries.find((item) => item.userId === user.user_id)
    return entry ? [metricValue(entry, phase, metric)] : []
  }))
  const minValue = metric === 'rank' ? 1 : Math.min(0, ...plottedValues)
  const maxValue = Math.max(1, ...plottedValues)
  const x = (index: number) => pad.left + index * ((width - pad.left - pad.right) / Math.max(1, visibleSnapshots.length - 1))
  const y = (value: number) => pad.top + ((metric === 'rank' ? value - minValue : maxValue - value) / Math.max(1, maxValue - minValue)) * (height - pad.top - pad.bottom)
  const topRise = [...(selected?.entries ?? [])].sort((a, b) => b.rankChange - a.rankChange)[0]
  const topFall = [...(selected?.entries ?? [])].sort((a, b) => a.rankChange - b.rankChange)[0]
  const topDay = [...(selected?.entries ?? [])].sort((a, b) => b.changes[phase].points - a.changes[phase].points)[0]

  return (
    <div className="space-y-12">
      <section aria-labelledby="timeline-title">
        <div className="mb-5">
          <p className="font-mono text-[10px] font-extrabold uppercase tracking-[0.2em] text-orange">Evolución diaria</p>
          <h2 id="timeline-title" className="mt-2 font-display text-[30px] uppercase leading-none sm:text-[42px]">Línea de tiempo</h2>
        </div>
        <div className="grid grid-cols-1 gap-2 rounded-[18px] border border-white/10 bg-[#111] p-3 sm:grid-cols-2 lg:grid-cols-6">
          <select aria-label="Período" value={range} onChange={(event) => setRange(event.target.value as typeof range)} className="min-w-0 rounded-xl border border-white/10 bg-[#181818] px-3 py-2.5 text-[11px] font-bold">
            <option value="all">Todos los días</option><option value="week">Semana</option><option value="day">Fecha puntual</option>
          </select>
          <input type="date" aria-label="Fecha" min={data.snapshots[0]?.date} max={data.snapshots.at(-1)?.date} value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="min-w-0 rounded-xl border border-white/10 bg-[#181818] px-3 py-2 text-[11px] font-bold" />
          <button type="button" onClick={() => setShowMobileFilters((value) => !value)} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-left font-mono text-[10px] font-extrabold uppercase tracking-[.12em] text-white/80 sm:col-span-2 lg:hidden">
            {showMobileFilters ? 'Ocultar filtros' : 'Mas filtros'}
          </button>
          <div className={`${showMobileFilters ? 'grid' : 'hidden'} col-span-full grid-cols-1 gap-2 sm:grid-cols-2 lg:contents`}>
            <select aria-label="Fase" value={phase} onChange={(event) => setPhase(event.target.value as StatisticsPhase)} className="min-w-0 rounded-xl border border-white/10 bg-[#181818] px-3 py-2.5 text-[11px] font-bold">
              <option value="all">Todas las fases</option><option value="group">Grupos</option><option value="knockout">Eliminatorias</option>
            </select>
            <select aria-label="Métrica" value={metric} onChange={(event) => setMetric(event.target.value as Metric)} className="min-w-0 rounded-xl border border-white/10 bg-[#181818] px-3 py-2.5 text-[11px] font-bold">
              <option value="rank">Ranking</option><option value="points">Puntos</option><option value="exact">Exactas</option><option value="signs">Signos</option><option value="bonus">Bonus</option>
            </select>
            <select aria-label="Top por defecto" value={limit} onChange={(event) => setLimit(event.target.value as typeof limit)} className="min-w-0 rounded-xl border border-white/10 bg-[#181818] px-3 py-2.5 text-[11px] font-bold">
              <option value="5">Top 5</option><option value="10">Top 10</option><option value="all">Todos</option>
            </select>
            <UserPicker
              data={data}
              selected={pickedUsers}
              setSelected={setPickedUsers}
              visuals={visuals}
              currentUserId={currentUserId}
            />
          </div>
        </div>
        {!selectedDate || !selected ? (
          <div className="mt-4 rounded-[20px] border border-dashed border-white/15 bg-[#0e0e0e] py-16 text-center">
            <p className="font-display text-[24px] uppercase">Sin partidos finalizados</p>
            <p className="mt-2 text-[12px] text-muted">Elegí una fecha marcada por el historial del Prode.</p>
          </div>
        ) : range === 'day' ? (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ['Líder del día', selected.entries[0]?.name ?? '—', `#${selected.entries[0]?.rank ?? '—'}`],
                ['Mayor subida', topRise?.name ?? '—', topRise?.rankChange ? `↑ ${topRise.rankChange}` : 'Sin cambios'],
                ['Mayor caída', topFall?.name ?? '—', topFall?.rankChange ? `↓ ${Math.abs(topFall.rankChange)}` : 'Sin cambios'],
                ['Más puntos del día', topDay?.name ?? '—', `+${topDay?.changes[phase].points ?? 0} pts`],
              ].map(([title, name, value]) => <article key={title} className="rounded-[16px] border border-white/10 bg-[#111] p-3.5 sm:p-4"><p className="font-mono text-[9px] font-bold uppercase tracking-[.14em] text-muted">{title}</p><p className="mt-2 truncate text-[13px] font-extrabold sm:text-[14px]">{name}</p><p className="mt-1.5 font-display text-[24px] text-[#A8F0D8] sm:mt-2 sm:text-[26px]">{value}</p></article>)}
            </div>
            <div className="rounded-[18px] border border-white/10 bg-[#111] p-4">
              <h3 className="font-display text-[24px] uppercase">Balance de la fecha</h3>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px] font-bold">
                {(['exact', 'signs', 'bonus'] as const).map((key) => <div key={key} className="rounded-xl bg-white/5 p-3"><b className="block font-display text-[24px] text-white">{selected.entries.reduce((sum, entry) => sum + entry.changes[phase][key], 0)}</b>{key === 'exact' ? 'Exactas' : key === 'signs' ? 'Signos' : 'Bonus'}</div>)}
              </div>
            </div>
          </div>
        ) : (
          <div className="relative mt-4 rounded-[20px] border border-white/10 bg-[#0e0e0e] p-3 sm:p-5">
            <div className="hidden w-full overflow-hidden sm:block">
              <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Evolución del ranking" className="h-auto w-full">
                <defs>
                  {chartUsers.flatMap((user) => {
                    const visual = visuals.get(user.user_id)
                    return visual?.secondary ? [
                      <linearGradient key={visual.gradientId} id={visual.gradientId} x1="0" x2="1" y1="0" y2="0">
                        <stop offset="0%" stopColor={visual.primary} />
                        <stop offset="49%" stopColor={visual.primary} />
                        <stop offset="51%" stopColor={visual.secondary} />
                        <stop offset="100%" stopColor={visual.secondary} />
                      </linearGradient>,
                    ] : []
                  })}
                </defs>
                {Array.from({ length: 6 }, (_, index) => minValue + index * ((maxValue - minValue) / 5)).map((value) => (
                  <g key={value}><line x1={pad.left} x2={width - pad.right} y1={y(value)} y2={y(value)} stroke="rgba(255,255,255,.07)" /><text x={pad.left - 9} y={y(value) + 4} fill="#777" textAnchor="end" fontSize="10">{metric === 'rank' ? `#${Math.round(value)}` : Math.round(value)}</text></g>
                ))}
                {chartUsers.map((user) => {
                  const visual = visuals.get(user.user_id)!
                  const isCurrent = user.user_id === currentUserId
                  const stroke = visual.secondary ? `url(#${visual.gradientId})` : visual.primary
                  const points = visibleSnapshots.flatMap((snapshot, index) => {
                    const entry = snapshot.entries.find((item) => item.userId === user.user_id)
                    return entry ? [{ px: x(index), py: y(metricValue(entry, phase, metric)), entry, snapshot }] : []
                  })
                  const active = !hovered || hovered.entry.userId === user.user_id
                  return <g key={user.user_id} opacity={active ? 1 : .18} onMouseLeave={() => setHovered(null)}>
                    {isCurrent && points.length > 1 && <polyline points={points.map((point) => `${point.px},${point.py}`).join(' ')} fill="none" stroke="rgba(255,255,255,.72)" strokeWidth="8" strokeLinejoin="round" />}
                    {points.length > 1 && <polyline points={points.map((point) => `${point.px},${point.py}`).join(' ')} fill="none" stroke={stroke} strokeWidth={hovered?.entry.userId === user.user_id || isCurrent ? 5 : 3} strokeLinejoin="round" />}
                    {points.map((point) => <circle key={point.snapshot.date} cx={point.px} cy={point.py} r={isCurrent ? 7 : 6} fill={stroke} stroke={isCurrent ? '#fff' : 'none'} strokeWidth={isCurrent ? 2.5 : 0} className="cursor-pointer" onMouseEnter={() => setHovered({ entry: point.entry, date: point.snapshot.date, label: point.snapshot.label, x: point.px, y: point.py })} />)}
                  </g>
                })}
                {visibleSnapshots.map((snapshot, index) => <text key={snapshot.date} x={x(index)} y={height - 10} fill="#777" textAnchor="middle" fontSize="10">{visibleSnapshots.length <= 12 || index % Math.ceil(visibleSnapshots.length / 8) === 0 ? snapshot.label : ''}</text>)}
              </svg>
            </div>
            <div className="sm:hidden">
              <p className="mb-3 text-[11px] text-muted">En mobile, tocá un participante para ver su detalle. El gráfico completo queda priorizado para pantallas grandes.</p>
              <div className="grid grid-cols-1 gap-2">{chartUsers.map((user) => {
                const entry = selected.entries.find((item) => item.userId === user.user_id)
                if (!entry) return null
                const visual = visuals.get(user.user_id)!
                const isCurrent = user.user_id === currentUserId
                return <button type="button" key={user.user_id} onClick={() => setHovered({ entry, date: selected.date, label: selected.label })} className={`flex min-w-0 items-center gap-3 rounded-xl p-3 text-left ${isCurrent ? 'border border-white/35 bg-white/10 shadow-[0_0_22px_rgba(255,255,255,.08)]' : 'bg-white/5'}`}><i className={`h-3 w-3 shrink-0 rounded-full ${isCurrent ? 'ring-2 ring-white' : ''}`} style={{ background: visualBackground(visual) }} /><span className="min-w-0 flex-1 truncate text-[12px] font-bold">{user.name}{isCurrent ? ' · Vos' : ''}</span><b className="font-mono text-[11px]">{metric === 'rank' ? `#${entry.ranks[phase]}` : metricValue(entry, phase, metric)}</b></button>
              })}</div>
            </div>
            {hovered && (
              <>
                <div className="mt-3 rounded-[14px] border border-white/10 bg-[#181818] p-4 sm:hidden">
                  <div className="flex items-start justify-between gap-3"><div><p className="text-[13px] font-extrabold">{hovered.entry.name}</p><p className="mt-1 font-mono text-[9px] uppercase text-muted">Ranking al {hovered.label}</p></div><button type="button" onClick={() => setHovered(null)} aria-label="Cerrar detalle"><X size={15} /></button></div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]"><span>Ranking <b className="block text-[16px] text-white">#{hovered.entry.ranks[phase]}</b></span><span>Puntos acumulados <b className="block text-[16px] text-white">{hovered.entry.metrics[phase].points}</b></span><span>Cambio de puesto <b className="block text-[16px] text-white">{hovered.entry.rankChanges[phase] > 0 ? `↑${hovered.entry.rankChanges[phase]}` : hovered.entry.rankChanges[phase] < 0 ? `↓${Math.abs(hovered.entry.rankChanges[phase])}` : '—'}</b></span><span>Puntos del día <b className="block text-[16px] text-white">+{hovered.entry.changes[phase].points}</b></span></div>
                </div>
                <div
                  className="pointer-events-none absolute z-20 hidden w-[276px] rounded-[14px] border border-white/10 bg-[#181818]/95 p-4 shadow-2xl sm:block"
                  style={{
                    left: `${((hovered.x ?? width - 280) / width) * 100}%`,
                    top: `${((hovered.y ?? 80) / height) * 100}%`,
                    transform: (hovered.x ?? 0) > width - 320 ? 'translate(calc(-100% - 14px), -50%)' : 'translate(14px, -50%)',
                  }}
                >
                  <p className="text-[13px] font-extrabold">{hovered.entry.name}</p>
                  <p className="mt-1 font-mono text-[9px] uppercase tracking-[.08em] text-muted">Ranking al {hovered.label}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]"><span>Puesto <b className="block text-[16px] text-white">#{hovered.entry.ranks[phase]}</b></span><span>Puntos acumulados <b className="block text-[16px] text-white">{hovered.entry.metrics[phase].points}</b></span><span>Movimiento <b className="block text-[16px] text-white">{hovered.entry.rankChanges[phase] > 0 ? `↑${hovered.entry.rankChanges[phase]}` : hovered.entry.rankChanges[phase] < 0 ? `↓${Math.abs(hovered.entry.rankChanges[phase])}` : '—'}</b></span><span>Ganados ese día <b className="block text-[16px] text-white">+{hovered.entry.changes[phase].points}</b></span></div>
                </div>
              </>
            )}
            <div className="mt-3 hidden flex-wrap gap-x-4 gap-y-2 sm:flex">{chartUsers.map((user) => {
              const visual = visuals.get(user.user_id)!
              const isCurrent = user.user_id === currentUserId
              return <button type="button" onMouseEnter={() => { const entry = selected.entries.find((item) => item.userId === user.user_id); if (entry) setHovered({ entry, date: selected.date, label: selected.label }) }} key={user.user_id} className={`flex min-w-0 items-center gap-2 rounded-full px-2 py-1 text-[10px] font-bold ${isCurrent ? 'bg-white/10 text-white ring-1 ring-white/35' : ''}`}><i className={`h-2 w-2 shrink-0 rounded-full ${isCurrent ? 'ring-2 ring-white' : ''}`} style={{ background: visualBackground(visual) }} />{user.name}{isCurrent ? ' · Vos' : ''}</button>
            })}</div>
          </div>
        )}
      </section>

      {selected && <section><p className="font-mono text-[10px] font-extrabold uppercase tracking-[.2em] text-orange">Resultados oficiales</p><h2 className="mb-5 mt-2 font-display text-[30px] uppercase sm:text-[42px]">Partidos de la fecha</h2>{selected.matches.length ? <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{selected.matches.map((match) => <MatchCard key={match.id} match={match} />)}</div> : <div className="rounded-[16px] border border-dashed border-white/15 py-12 text-center text-[12px] text-muted">No hay partidos finalizados para esta fecha.</div>}</section>}
      <section><p className="font-mono text-[10px] font-extrabold uppercase tracking-[.2em] text-orange">Lo que importa</p><h2 className="mb-5 mt-2 font-display text-[30px] uppercase sm:text-[42px]">Estadísticas serias</h2><StatCards cards={data.serious} /></section>
      <section><p className="font-mono text-[10px] font-extrabold uppercase tracking-[.2em] text-[#A8F0D8]">El vestuario opina</p><h2 className="mb-5 mt-2 font-display text-[30px] uppercase sm:text-[42px]">Estadísticas graciosas</h2><StatCards cards={data.curious} /></section>
    </div>
  )
}

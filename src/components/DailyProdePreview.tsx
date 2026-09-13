'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ArrowRight, Clock3, Filter, Medal, RotateCcw } from 'lucide-react'
import { DailyVisualAtmosphere } from '@/components/DailyVisualAtmosphere'
import { DailyCountdown } from '@/components/DailyCountdown'
import { DailyJourneySelector } from '@/components/DailyJourneySelector'
import { isPublicDailyEvent } from '@/lib/daily-prode/competition-catalog'
import { eventLabel, sportLabel, time } from '@/lib/daily-prode/display'
import { countdownText, journeyDate, journeyEvents, journeyIsLocked, journeyTitle, lockAtForJourney } from '@/lib/daily-prode/journey'
import { publicDailyEvents, publicDailyRooms } from '@/lib/daily-prode/public-data'
import type { DailyEvent, Room } from '@/lib/daily-prode/model'

const SPORTS: DailyEvent['sport'][] = ['football', 'tennis']

function heroTitle(date: string, locked: boolean) {
  const title = journeyTitle(date)
  if (locked || title === 'JORNADA CERRADA') return 'Jornada cerrada'
  return `${title.replace('EVENTOS ', '')} en juego.`
}

function roomLabel(room: Room | undefined) {
  return room ? `${room.label} · $${room.entryFee.toLocaleString('es-AR')}` : 'Sin sala activa'
}

export function DailyProdePreview({ initialDate }: { initialDate?: string }) {
  const [date, setDate] = useState(initialDate ?? journeyDate())
  const [roomId, setRoomId] = useState('')
  const [sports, setSports] = useState<DailyEvent['sport'][]>(SPORTS)
  const [competition, setCompetition] = useState('all')
  const [status, setStatus] = useState('all')
  const [mine, setMine] = useState(false)
  const events = useMemo(() => publicDailyEvents.filter((event) => isPublicDailyEvent(event).eligible), [])
  const dayEvents = journeyEvents(events, date)
  const filtered = dayEvents.filter((event) => sports.includes(event.sport) && (competition === 'all' || event.competition === competition) && (status === 'all' || event.status === status) && !mine)
  const featured = filtered.find((event) => event.status === 'live') ?? filtered.find((event) => event.status === 'upcoming')
  const journeyId = featured?.journeyId ?? dayEvents[0]?.journeyId
  const rooms = publicDailyRooms.filter((item) => item.journeyId === journeyId)
  const room = rooms.find((item) => item.id === roomId) ?? rooms[0]
  const lockAt = lockAtForJourney(events, date)
  const locked = journeyIsLocked(events, date)
  const activeFilters = sports.length !== SPORTS.length || competition !== 'all' || status !== 'all' || mine
  const reset = () => { setSports(SPORTS); setCompetition('all'); setStatus('all'); setMine(false) }
  const toggle = (sport: DailyEvent['sport']) => setSports((current) => current.includes(sport) ? current.filter((item) => item !== sport) : [...current, sport])
  const heroStatus = locked ? 'Jornada cerrada' : featured?.status === 'live' ? 'Evento en curso' : featured ? 'Próximo evento verificado' : 'Sin eventos verificados'

  return <div className="relative isolate min-h-full bg-bg text-white"><DailyVisualAtmosphere /><main className="relative z-10 mx-auto w-full max-w-[1280px] px-4 py-8 pb-28 min-[768px]:px-6">
    <section className="grid items-stretch gap-5 min-[1024px]:grid-cols-[minmax(0,1.35fr)_minmax(330px,.65fr)]">
      <header className="grid min-w-0 content-start"><p className="font-mono text-[11px] font-extrabold uppercase tracking-[.15em] text-mint">Prode diario / agenda única</p><div className="mt-3 min-h-[8.5rem] max-h-[8.5rem] min-[768px]:min-h-[10rem] min-[768px]:max-h-[10rem] min-[1024px]:min-h-[13.5rem] min-[1024px]:max-h-[13.5rem]"><h1 className="max-w-[11ch] text-balance break-words font-display text-[clamp(42px,7vw,84px)] uppercase leading-[.9]">{heroTitle(date, locked)}</h1></div><p className="min-h-[3rem] max-w-2xl break-words text-[15px] font-semibold leading-relaxed text-muted">Eventos reales y verificados para pronosticar. La fecha, el cierre y los filtros viven en una única agenda pública.</p><div className="mt-5 grid min-h-16 max-w-2xl grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-lg border border-white/10 bg-black/55 p-3"><Clock3 className="mt-0.5 text-orange" size={18} /><div className="min-w-0"><p className="font-mono text-[10px] font-extrabold uppercase tracking-[.1em] text-mint">{heroStatus}</p><p className="mt-1 max-w-full break-words text-sm font-bold">{featured ? `${featured.participants.home.name} vs ${featured.participants.away.name}` : 'La agenda se habilita con participantes, horario y fuente autorizada.'}</p></div></div></header>
      <HeroControls date={date} onDateChange={setDate} events={events} rooms={rooms} room={room} roomId={roomId} onRoomChange={setRoomId} locked={locked} lockAt={lockAt} sports={sports} onToggleSport={toggle} onSelectAll={() => setSports(SPORTS)} />
    </section>
    <details className="mt-4 rounded-lg border border-white/10 bg-black/65 p-4"><summary className="flex cursor-pointer items-center gap-2 font-mono text-[11px] font-extrabold uppercase tracking-[.1em]"><Filter size={15} /> Más filtros {activeFilters && '· activos'}</summary><div className="mt-4 grid gap-3 min-[680px]:grid-cols-3"><label className="grid gap-1 text-[11px] font-bold text-muted">Competencia<select value={competition} onChange={(event) => setCompetition(event.target.value)} className="h-10 rounded-md border border-white/15 bg-black px-3 text-white"><option value="all">Todas</option>{[...new Set(dayEvents.map((event) => event.competition))].map((item) => <option key={item}>{item}</option>)}</select></label><label className="grid gap-1 text-[11px] font-bold text-muted">Estado<select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-md border border-white/15 bg-black px-3 text-white"><option value="all">Todos</option><option value="upcoming">Próximos</option><option value="live">En curso</option><option value="finished">Finalizados</option></select></label><label className="flex min-h-10 items-end gap-2 text-sm font-bold"><input checked={mine} onChange={(event) => setMine(event.target.checked)} type="checkbox" className="h-4 w-4 accent-orange" /> Mis pronósticos</label></div>{activeFilters && <button type="button" onClick={reset} className="mt-3 inline-flex min-h-9 items-center gap-2 text-xs font-extrabold text-mint"><RotateCcw size={14} /> Limpiar filtros</button>}</details>
    <section className="mt-5 grid items-stretch gap-3 min-[960px]:grid-cols-[minmax(0,1.45fr)_minmax(300px,.75fr)]">{featured ? <Feature event={featured} /> : <Empty day={date} filtered={activeFilters} />}<JourneySummary filteredCount={filtered.length} featured={featured} locked={locked} /></section>
    <section className="mt-8 border-t border-white/10 pt-7"><div className="flex items-end justify-between gap-4"><div className="min-w-0"><p className="font-mono text-[11px] font-extrabold uppercase tracking-[.15em] text-mint">{journeyTitle(date)}</p><h2 className="mt-2 text-balance font-display text-[clamp(34px,6vw,60px)] uppercase leading-[.9]">Agenda de la <em className="text-orange">fecha.</em></h2></div><strong className="rounded-md border border-white/15 px-3 py-2 font-mono text-xs">{filtered.length}</strong></div>{filtered.length ? <div className="mt-5 grid gap-3">{filtered.map((event) => <EventRow event={event} key={event.id} locked={locked} />)}</div> : <EmptyAgenda filtered={activeFilters} onReset={reset} />}</section>
  </main></div>
}

function HeroControls({ date, onDateChange, events, rooms, room, roomId, onRoomChange, locked, lockAt, sports, onToggleSport, onSelectAll }: { date: string; onDateChange: (value: string) => void; events: DailyEvent[]; rooms: Room[]; room?: Room; roomId: string; onRoomChange: (value: string) => void; locked: boolean; lockAt: string | null; sports: DailyEvent['sport'][]; onToggleSport: (sport: DailyEvent['sport']) => void; onSelectAll: () => void }) {
  const allSports = sports.length === SPORTS.length
  const closeText = locked ? 'La jornada ya está cerrada.' : lockAt ? `Cierre: ${new Date(lockAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' })}` : 'Cierre pendiente de eventos verificados'
  return <aside className="grid min-w-0 content-start gap-5 rounded-lg border border-white/10 bg-black/80 p-5 min-[1024px]:min-h-[360px]" aria-label="Controles de jornada"><DailyJourneySelector value={date} onChange={onDateChange} events={events} /><div className="grid gap-2"><p className="font-mono text-[10px] font-extrabold uppercase tracking-[.1em] text-muted">Salas de la jornada</p><label className="sr-only" htmlFor="daily-room">Sala activa</label><select id="daily-room" value={room?.id ?? roomId} onChange={(event) => onRoomChange(event.target.value)} disabled={!rooms.length} className="h-10 w-full rounded-md border border-white/15 bg-black/70 px-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:text-muted"><option value="">{roomLabel(room)}</option>{rooms.map((item) => <option value={item.id} key={item.id}>{roomLabel(item)}</option>)}</select><p className="min-h-4 text-[10px] font-bold text-muted">{closeText}</p></div><div className="grid gap-2"><p className="font-mono text-[10px] font-extrabold uppercase tracking-[.1em] text-muted">Deportes</p><div className="flex flex-wrap gap-2"><Chip active={allSports} onClick={onSelectAll}>Todos</Chip><Chip active={sports.includes('football')} onClick={() => onToggleSport('football')}>Fútbol</Chip><Chip active={sports.includes('tennis')} onClick={() => onToggleSport('tennis')}>Tenis</Chip></div></div></aside>
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button type="button" onClick={onClick} aria-pressed={active} className={`h-9 shrink-0 rounded-md border px-3 text-xs font-extrabold ${active ? 'border-orange bg-orange text-[#0a0a0a]' : 'border-white/15 bg-black text-white'}`}>{children}</button> }

function Empty({ day, filtered }: { day: string; filtered: boolean }) { return <article className="grid min-h-[332px] grid-rows-[2.5rem_minmax(7.5rem,1fr)_3.5rem_1.5rem] rounded-lg border border-white/10 bg-black/80 p-7"><p className="text-balance font-mono text-[11px] font-extrabold uppercase tracking-[.12em] text-mint">{journeyTitle(day)}</p><h2 className="max-w-[12ch] self-center text-balance break-words font-display text-[clamp(36px,6vw,64px)] uppercase leading-[.9]">No hay eventos <em className="text-orange">verificados.</em></h2><p className="max-w-xl self-end text-sm leading-relaxed text-muted">{filtered ? 'No hay eventos que coincidan con los filtros activos.' : 'No hay eventos verificados para esta fecha.'}</p><p className="self-end font-mono text-[11px] font-extrabold uppercase tracking-[.1em] text-mint">{filtered ? 'Ajustá los filtros para continuar.' : 'Horario disponible al verificarse una fuente.'}</p></article> }

function Feature({ event }: { event: DailyEvent }) { return <article className="grid min-h-[332px] grid-rows-[2.5rem_minmax(7.5rem,1fr)_2rem_1.5rem] rounded-lg border border-white/10 bg-black/80 p-7"><p className="font-mono text-[11px] font-extrabold uppercase tracking-[.12em] text-mint">{sportLabel[event.sport]} · {event.competition}</p><h2 className="max-w-[12ch] self-center text-balance break-words font-display text-[clamp(36px,6vw,64px)] uppercase leading-[.9]">{event.participants.home.name}<span className="block py-2 font-mono text-sm text-orange">VS</span>{event.participants.away.name}</h2><p className="self-end text-sm font-bold text-muted">{time(event.scheduledStart)} · {eventLabel[event.status]}</p><div className="self-end"><DailyCountdown event={event} /></div></article> }

function JourneySummary({ filteredCount, featured, locked }: { filteredCount: number; featured?: DailyEvent; locked: boolean }) { return <aside className="grid min-h-[332px] grid-rows-[auto_1fr_auto] rounded-lg border border-white/10 bg-black/80 p-5"><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-[10px] font-extrabold uppercase tracking-[.1em] text-mint">Resumen de jornada</p><h2 className="mt-2 font-display text-3xl uppercase leading-none">{locked ? 'Cerrada' : 'En espera'}</h2></div><Medal className="shrink-0 text-orange" size={23} /></div><dl className="mt-5 grid content-start gap-3 text-sm"><Row label="Eventos encontrados" value={String(filteredCount)} /><Row label="Próximo evento" value={featured ? `${featured.participants.home.name} vs ${featured.participants.away.name}` : 'Sin próximo evento'} />{featured && <Row label="Contador" value={countdownText(featured)} />}<Row label="Ranking" value="Sin ranking activo" /></dl><div className="mt-5 grid gap-2"><Link href="/mi-prode" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-orange px-3 text-sm font-extrabold text-[#0a0a0a]">Mi Prode <ArrowRight size={16} /></Link><Link href="/ranking" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-white/15 bg-[#141414] px-3 text-sm font-extrabold">Ranking completo <ArrowRight size={16} /></Link></div></aside> }

function EventRow({ event, locked }: { event: DailyEvent; locked: boolean }) { return <article className="grid gap-3 rounded-lg border border-white/10 bg-[#141414] p-4 min-[700px]:grid-cols-[70px_minmax(0,1fr)_auto]"><strong className="font-display text-2xl text-mint">{time(event.scheduledStart)}</strong><div><p className="font-mono text-[10px] font-extrabold uppercase text-mint">{sportLabel[event.sport]} · {event.competition}</p><h3 className="mt-2 font-extrabold">{event.participants.home.name} <span className="text-orange">vs</span> {event.participants.away.name}</h3></div><span className="self-start rounded-md border border-white/15 px-2 py-1 font-mono text-[10px] font-bold uppercase">{locked ? 'Jornada cerrada' : eventLabel[event.status]}</span></article> }

function EmptyAgenda({ filtered, onReset }: { filtered: boolean; onReset: () => void }) { return <div className="mt-5 rounded-lg border border-dashed border-white/15 bg-black/50 p-6"><h3 className="font-display text-3xl uppercase">{filtered ? 'Sin coincidencias' : 'Sin eventos verificados'}</h3><p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">{filtered ? 'Probá limpiar los filtros para consultar toda la fecha.' : 'La agenda se habilitará cuando existan participantes, horario, fuente y verificación autorizados.'}</p>{filtered && <button type="button" onClick={onReset} className="mt-4 text-sm font-extrabold text-mint">Limpiar filtros</button>}</div> }

function Row({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-4 border-t border-white/10 pt-3"><dt className="text-muted">{label}</dt><dd className="max-w-[60%] break-words text-right font-bold">{value}</dd></div> }

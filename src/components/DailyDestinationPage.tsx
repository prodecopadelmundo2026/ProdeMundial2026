'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { DailyVisualAtmosphere } from '@/components/DailyVisualAtmosphere'
import { createDemoParticipation, dailyEvents, demoJourneys, demoRooms, DEMO_USER } from '@/lib/daily-prode-demo'
import { isEligibleDailyEvent } from '@/lib/daily-prode/competition-catalog'
import { agendaOrder, dateLabel, money, pickLabel, predictionLabel, sportLabel } from '@/lib/daily-prode/display'
import { roomRanking } from '@/lib/daily-prode/rooms'
import { scorePrediction } from '@/lib/daily-prode/scoring'

type View = 'my-prode' | 'ranking'

export function DailyDestinationPage({ view }: { view: View }) {
  const [journeyId, setJourneyId] = useState(demoJourneys[1].id)
  const [fee, setFee] = useState(5000)
  const [data] = useState(() => createDemoParticipation())
  const journey = demoJourneys.find((item) => item.id === journeyId)!
  const rooms = demoRooms.filter((item) => item.journeyId === journeyId)
  const room = rooms.find((item) => item.entryFee === fee) ?? rooms[0]
  const events = dailyEvents.filter((item) => item.journeyId === journeyId && isEligibleDailyEvent(item).eligible).sort(agendaOrder)
  const ranking = roomRanking(room, journey, data.entries, data.predictions, dailyEvents)
  const entry = data.entries.find((item) => item.journeyId === journey.id && item.roomId === room.id && item.userId === DEMO_USER)
  const me = ranking.standings.find((item) => item.userId === DEMO_USER)

  return <div className="relative isolate min-h-full overflow-hidden bg-bg">
    <DailyVisualAtmosphere />
    <main className="relative z-10 mx-auto w-full max-w-[1200px] px-4 py-10 pb-28 min-[768px]:px-6">
      <span className="inline-flex rounded-md border border-white/15 bg-black/70 px-2 py-1 font-mono text-[10px] font-extrabold uppercase tracking-[.1em] text-[#d4d4d4]">Datos de demostracion · fuente manual</span>
      <p className="mt-4 font-mono text-[11px] font-extrabold uppercase tracking-[.15em] text-mint">{view === 'my-prode' ? 'MI PRODE DIARIO' : 'RANKING DIARIO'}</p>
      <h1 className="mt-2 font-display text-[clamp(42px,8vw,78px)] uppercase leading-[.9]">{view === 'my-prode' ? <>Tu jornada <em className="text-orange">en juego.</em></> : <>La sala <em className="text-orange">en orden.</em></>}</h1>

      <section className="mt-8 grid gap-3 rounded-lg border border-white/10 bg-black/80 p-4 min-[680px]:grid-cols-[1fr_auto]">
        <div className="grid gap-3 min-[520px]:grid-cols-2">
          <label className="grid gap-1.5 text-[11px] font-extrabold text-[#d4d4d4]">Fecha<select value={journeyId} onChange={(event) => setJourneyId(event.target.value)} className="min-h-10 rounded-md border border-white/15 bg-[#101010] px-3 text-sm text-white">{demoJourneys.map((item) => <option key={item.id} value={item.id}>{dateLabel(item.date)}{item.id === demoJourneys[1].id ? ' · Hoy' : item.id === demoJourneys[2].id ? ' · Mañana' : ' · Historial demo'}</option>)}</select></label>
          <fieldset className="flex flex-wrap gap-2 border-0 p-0"><legend className="mb-1.5 text-[11px] font-extrabold text-[#d4d4d4]">Sala</legend>{rooms.map((item) => <label key={item.id} className="flex min-h-10 items-center gap-2 rounded-md border border-white/15 px-3 text-sm font-bold has-[:checked]:border-orange has-[:checked]:bg-orange/15"><input type="radio" name="daily-room" checked={fee === item.entryFee} onChange={() => setFee(item.entryFee)} />{money(item.entryFee)}</label>)}</fieldset>
        </div>
        <Link href="/diario" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-orange px-4 text-[13px] font-extrabold text-[#0a0a0a]">Prode diario <ArrowRight size={16} /></Link>
      </section>

      {view === 'my-prode' ? <MyDailyProde events={events} entry={entry} predictions={data.predictions} me={me} journeyStatus={journey.status} /> : <DailyRanking ranking={ranking} roomLabel={room.label} pot={ranking.pot} />}
      {view === 'my-prode' && <div className="mt-8 flex flex-wrap gap-3"><Link href="/ranking" className="inline-flex min-h-10 items-center gap-2 rounded-md border border-white/15 bg-[#141414] px-4 text-sm font-extrabold">Ver ranking de la sala <ArrowRight size={16} /></Link><Link href="/reglas" className="inline-flex min-h-10 items-center gap-2 rounded-md border border-white/15 bg-[#141414] px-4 text-sm font-extrabold">Reglas diarias <ArrowRight size={16} /></Link></div>}
      {view === 'ranking' && <p className="mt-6 max-w-[620px] text-[13px] font-semibold leading-relaxed text-muted">Ranking total de la jornada y sala seleccionadas. Los filtros deportivos de la agenda no cambian silenciosamente estos puntos.</p>}
    </main>
  </div>
}

function MyDailyProde({ events, entry, predictions, me, journeyStatus }: { events: typeof dailyEvents; entry: ReturnType<typeof createDemoParticipation>['entries'][number] | undefined; predictions: ReturnType<typeof createDemoParticipation>['predictions']; me: ReturnType<typeof roomRanking>['standings'][number] | undefined; journeyStatus: string }) {
  if (!entry) return <section className="mt-8 rounded-lg border border-white/10 bg-panel p-6"><h2 className="font-display text-3xl uppercase">Sin participación</h2><p className="mt-3 text-sm leading-relaxed text-muted">No participás en esta sala demo. Podés elegir otra sala o consultar la agenda antes de sumarte.</p></section>
  return <section className="mt-8"><div className="grid gap-3 min-[640px]:grid-cols-4"><Mini label="Puntaje acumulado" value={`${me?.points ?? 0} pts`} /><Mini label="Posición" value={me ? `${me.position}°` : '—'} /><Mini label="Eventos" value={`${events.length}`} /><Mini label="Estado" value={journeyStatus === 'closed' ? 'Final demo' : 'Provisional'} /></div><div className="mt-6 grid gap-3">{events.map((event) => { const prediction = predictions.find((item) => item.participationId === entry.id && item.eventId === event.id); const score = prediction ? scorePrediction(event, prediction.pick) : null; return <article key={event.id} className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-white/10 bg-panel p-4"><div><p className="font-mono text-[10px] font-extrabold uppercase tracking-[.1em] text-mint">{sportLabel[event.sport]} · {event.competition}</p><h3 className="mt-1 font-bold">{event.participants.home.name} vs {event.participants.away.name}</h3><p className="mt-1 text-[12px] text-muted">{prediction ? pickLabel(event, prediction.pick) : 'Pronóstico pendiente'}</p></div><div className="text-right"><strong className="font-display text-3xl text-mint">{score?.points ?? '—'}</strong><p className="text-[11px] font-bold text-muted">{score ? predictionLabel[score.status] : 'Sin cargar'}</p></div></article> })}</div></section>
}

function DailyRanking({ ranking, roomLabel, pot }: { ranking: ReturnType<typeof roomRanking>; roomLabel: string; pot: number }) {
  return <section className="mt-8"><div className="grid gap-3 min-[600px]:grid-cols-3"><Mini label="Sala" value={roomLabel} /><Mini label="Pozo estimado demo" value={money(pot)} /><Mini label="Estado" value={ranking.final ? 'Final demo' : 'Provisional'} /></div>{ranking.leaders > 1 && <p className="mt-4 rounded-md border border-yellow/30 bg-yellow/10 p-3 text-[12px] font-bold text-yellow">Empate en el primer puesto entre {ranking.leaders} participantes.</p>}<ol className="mt-6 grid gap-2">{ranking.standings.map((item) => <li key={item.id} className="grid grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-white/10 bg-panel px-4 py-3 data-[user=true]:border-mint/50 data-[user=true]:bg-mint/10" data-user={item.userId === DEMO_USER}><strong className="font-display text-2xl text-orange">{item.position}</strong><span className="font-bold">{item.name}{item.userId === DEMO_USER && <small className="ml-2 font-mono text-[10px] uppercase text-mint">Vos</small>}</span><b className="text-sm">{item.points} pts</b></li>)}</ol></section>
}

function Mini({ label, value }: { label: string; value: string }) {
  return <article className="min-h-28 rounded-lg border border-white/10 bg-panel p-4"><p className="font-mono text-[10px] font-extrabold uppercase tracking-[.1em] text-muted">{label}</p><strong className="mt-3 block break-words font-display text-3xl leading-none">{value}</strong></article>
}

'use client'

import Link from 'next/link'
import { useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, History, Plus, RefreshCw, Trophy } from 'lucide-react'
import { createDemoParticipation, dailyEvents, demoJourneys, demoRooms, DEMO_NOW, DEMO_USER } from '@/lib/daily-prode-demo'
import { agendaOrder, dateLabel, eventLabel, money, pickLabel, predictionLabel, resultLabel, sportLabel, time } from '@/lib/daily-prode/display'
import { joinRoom, roomRanking, savePrediction } from '@/lib/daily-prode/rooms'
import { SCORING, scorePrediction } from '@/lib/daily-prode/scoring'
import type { DailyEvent, Pick, Prediction } from '@/lib/daily-prode/model'
import { DailyPredictionEditor } from './DailyPredictionEditor'
import styles from './DailyProdePreview.module.css'

export function DailyProdePreview({ initialDate }: { initialDate?: string }) {
  const [journeyId, setJourneyId] = useState(demoJourneys.find(j => j.date === initialDate)?.id ?? demoJourneys[1].id)
  const [fee, setFee] = useState(5000)
  const [data, setData] = useState(() => createDemoParticipation())
  const [scenario, setScenario] = useState('normal')
  const journey = demoJourneys.find(j => j.id === journeyId)!
  const rooms = demoRooms.filter(r => r.journeyId === journeyId)
  const room = rooms.find(r => r.entryFee === fee)!
  const events = dailyEvents.filter(e => e.journeyId === journeyId).sort(agendaOrder)
  const displayedEvents = scenario === 'many' ? [...events, ...events.filter(e => e.status === 'upcoming').flatMap(e => Array.from({ length: 4 }, (_, n) => ({ ...e, id: e.id + '-extra-' + n })))].sort(agendaOrder) : events
  const ranking = roomRanking(room, journey, data.entries, data.predictions, dailyEvents)
  const entry = data.entries.find(p => p.roomId === room.id && p.journeyId === journeyId && p.userId === DEMO_USER)
  const me = ranking.standings.find(p => p.userId === DEMO_USER)
  const myRooms = data.entries.filter(p => p.journeyId === journeyId && p.userId === DEMO_USER).length
  const dateIndex = demoJourneys.findIndex(j => j.id === journeyId)
  const ready = scenario !== 'loading' && scenario !== 'error'
  function save(event: DailyEvent, pick: Pick) {
    if (!entry || journey.status !== 'open') throw new Error('La sala no admite este pronostico.')
    const predictions = savePrediction(data.predictions, entry, room, event, pick, DEMO_NOW)
    setData(current => ({ ...current, predictions }))
  }
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.tag}>DEMOSTRACION / DATOS FICTICIOS</span>
          <h1 className={styles.title}>Prode diario</h1>
          <p className={styles.subtitle}>Futbol, tenis y boxeo / Buenos Aires (UTC-3)</p>
          <p className={styles.subtitle}>Jornada de muestra: 13 sep 2026, 12:00. Cambios locales durante esta sesion.</p>
        </div>
        <Link href="/historial" className={styles.tags}><History size={18} /> Historial</Link>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.dateNav}>
          <button className={styles.iconButton} aria-label="Fecha anterior" title="Fecha anterior" disabled={dateIndex === 0} onClick={() => setJourneyId(demoJourneys[dateIndex - 1].id)}><ChevronLeft size={18} /></button>
          <label>Jornada<select aria-label="Jornada" value={journeyId} onChange={e => setJourneyId(e.target.value)}>
            {demoJourneys.map(j => <option value={j.id} key={j.id}>{dateLabel(j.date)}{j.status === 'closed' ? ' / Cerrada' : ''}</option>)}
          </select></label>
          <button className={styles.iconButton} aria-label="Fecha siguiente" title="Fecha siguiente" disabled={dateIndex === demoJourneys.length - 1} onClick={() => setJourneyId(demoJourneys[dateIndex + 1].id)}><ChevronRight size={18} /></button>
        </div>
        <fieldset className={styles.rooms} id="salas">
          <legend>Entrada por sala / importes demo</legend>
          {rooms.map(r => <label key={r.id}><input type="radio" name="room" checked={fee === r.entryFee} onChange={() => setFee(r.entryFee)} />{money(r.entryFee)}</label>)}
        </fieldset>
        <label>Escenario demo<select aria-label="Escenario demo" value={scenario} onChange={e => {
          setScenario(e.target.value)
          if (e.target.value === 'many') setData(createDemoParticipation(true))
        }}>
          <option value="normal">Habitual</option><option value="many">Muchos eventos y personas</option><option value="loading">Cargando</option><option value="error">Error de fuente</option>
        </select></label>
      </div>

      <section className={styles.section} aria-labelledby="agenda-title">
        <div className={styles.sectionHead}>
          <h2 id="agenda-title" className={styles.tags}><CalendarDays size={20} /> Agenda / {dateLabel(journey.date)}</h2>
          <span className={styles.tag}>{ranking.final ? 'Jornada final demo' : journey.status === 'closed' ? 'Cerrada / pendiente de resolucion' : 'Jornada provisional'}</span>
        </div>
        {scenario === 'loading' && <div role="status" aria-busy="true"><p>Cargando agenda...</p><div className={styles.loading} /><div className={styles.loading} /></div>}
        {scenario === 'error' && <div role="alert" className={styles.empty}><p className={styles.error}>No se pudo actualizar la agenda. No hay nuevos resultados confirmados.</p><button className={styles.primary} onClick={() => setScenario('normal')}><RefreshCw size={16} /> Reintentar</button></div>}
        {ready && events.length === 0 && <p className={styles.empty}>No hay eventos para esta jornada.</p>}
        {ready && [
          { title: 'Proximos', statuses: ['upcoming'] },
          { title: 'En curso', statuses: ['live'] },
          { title: 'Finalizados', statuses: ['finished'] },
          { title: 'Suspendidos, reprogramados y cancelados', statuses: ['suspended', 'cancelled', 'rescheduled', 'void', 'review'] },
        ].map(group => {
          const items = displayedEvents.filter(e => group.statuses.includes(e.status))
          return items.length > 0 ? <div className={styles.group} key={group.title}><h3>{group.title}</h3>{items.map(event => {
            const prediction = entry ? data.predictions.find(p => p.participationId === entry.id && p.eventId === event.id) : undefined
            const canEdit = Boolean(entry && journey.status === 'open' && room.eventIds.includes(event.id) && event.status === 'upcoming' && Date.parse(event.scheduledStart) > Date.parse(DEMO_NOW))
            return <EventCard key={room.id + event.id} event={event} prediction={prediction} canEdit={canEdit} onSave={pick => save(event, pick)} />
          })}</div> : null
        })}
      </section>

      {ready && <section className={styles.section} aria-labelledby="participation-title" id="participacion">
        <div className={styles.sectionHead}>
          <h2 id="participation-title">Mi participacion / {room.label}</h2>
          <span className={styles.tag}>{myRooms} salas en esta jornada</span>
        </div>
        <dl className={styles.stats}>
          <div><dt>Total acumulado</dt><dd data-testid="my-total">{me ? me.points + ' pts' : '--'}<small>{ranking.final ? 'Final demo' : 'Provisional / solo resultados resueltos'}</small></dd></div>
          <div><dt>Posicion en sala</dt><dd>{me ? '#' + me.position : '--'}<small>{ranking.standings.length} participantes</small></dd></div>
          <div><dt>Pozo estimado demo</dt><dd>{money(ranking.pot)}</dd></div>
          <div><dt>Premio estimado propio</dt><dd>{me?.prizeShare !== null && me?.prizeShare !== undefined ? money(me.prizeShare) : '--'}<small>{ranking.final ? 'Reparto ilustrativo, sin pagos' : 'Pendiente de cierre'}</small></dd></div>
        </dl>
        <div className={styles.participation}>
          <div>
            {!entry ? <div className={styles.empty}><p>Sin participacion en esta sala.</p>{journey.status === 'open' && events.length > 0 && <button className={styles.primary} onClick={() => setData(current => ({ ...current, entries: joinRoom(current.entries, room, DEMO_USER, 'Vos (demo)') }))}><Plus size={16} /> Participar en demo</button>}</div> :
              events.map(event => {
                const prediction = data.predictions.find(p => p.participationId === entry.id && p.eventId === event.id)
                const score = prediction ? scorePrediction(event, prediction.pick) : null
                return <article key={event.id} className={styles.prediction}>
                  <div className={styles.tags}><span className={styles.tag}>{sportLabel[event.sport]}</span><span className={styles.tag} data-state={event.status}>{eventLabel[event.status]}</span></div>
                  <h3>{event.participants.home.name} vs {event.participants.away.name}</h3>
                  <span className={styles.tag} data-state={score?.status ?? 'pending'}>{score ? predictionLabel[score.status] : 'Sin pronostico'}</span>
                  <dl>
                    <div><dt>Pronostico realizado</dt><dd>{prediction ? pickLabel(event, prediction.pick) : 'Sin cargar'}</dd></div>
                    <div><dt>Resultado actual</dt><dd>{resultLabel(event)}</dd></div>
                    <div><dt>Puntos</dt><dd className={styles.points}>{score?.points ?? '--'}{score?.provisionalRule ? ' demo*' : ''}{score?.pendingCriteria?.includes('qualifier') ? ' / clasificado pendiente' : ''}</dd></div>
                  </dl>
                </article>
              })}
          </div>
          <aside aria-label="Clasificacion de la sala">
            <div className={styles.sectionHead}><h2 className={styles.tags}><Trophy size={20} /> Clasificacion</h2><span className={styles.tag} data-state={ranking.final ? 'final' : 'pending'}>{ranking.final ? 'Final demo' : 'Provisional'}</span></div>
            <p className={styles.muted}>El primer puesto recibe el pozo. Si hay empate en el primer puesto, se reparte en partes iguales.</p>
            {ranking.final && ranking.leaders > 1 && <p className={styles.result}>Empate en el primer puesto / {ranking.leaders} ganadores</p>}
            <ol className={styles.rankList}>
              {ranking.standings.map(p => <li key={p.id} className={styles.rankRow} data-user={p.userId === DEMO_USER}>
                <strong>{p.position}</strong><div>{p.name}{p.winner && <p>Premio demo: {money(p.prizeShare!)}</p>}{p.unresolved > 0 && <p>{p.unresolved} pendientes</p>}</div><strong>{p.points} pts</strong>
              </li>)}
            </ol>
            {ranking.standings.length === 0 && <p className={styles.empty}>Todavia no hay participantes.</p>}
          </aside>
        </div>
      </section>}
      <section className={styles.section}>
        <details className={styles.details}><summary>Reglas de esta jornada</summary>
          <p>Futbol: exacto {SCORING.football.exact}, resultado general {SCORING.football.general}, incorrecto {SCORING.football.wrong} puntos.</p>
          <p>Tenis: sets exactos {SCORING.tennis.exact}, ganador correcto {SCORING.tennis.winner}, incorrecto {SCORING.tennis.wrong} puntos.</p>
          <p>Boxeo (propuesta): ganador, metodo y round {SCORING.boxing.exact}; ganador y metodo {SCORING.boxing.method}; solo ganador {SCORING.boxing.winner}; incorrecto {SCORING.boxing.wrong}. Decision correcta: {SCORING.boxing.decision} puntos demo.</p>
          <p>Eliminacion: {SCORING.knockout.label}; alargue y penales se muestran por separado. El puntaje por clasificado queda pendiente. Empates de boxeo y eventos excepcionales quedan pendientes de resolucion.</p>
          <p>Una participacion por sala y jornada. Se puede participar en varias salas. Solo el primer puesto recibe premio.</p>
        </details>
      </section>
    </div>
  )
}

function EventCard({ event, prediction, canEdit, onSave }: { event: DailyEvent; prediction?: Prediction; canEdit: boolean; onSave: (pick: Pick) => void }) {
  return <article className={styles.event} data-event-id={event.id}>
    <div className={styles.eventTop}>
      <div><p className={styles.time}>{time(event.scheduledStart)}</p><p className={styles.muted}>Inicio</p><p className={styles.muted}>{dateLabel(event.scheduledStart.slice(0, 10))}</p></div>
      <div>
        <div className={styles.tags}><span className={styles.tag}>{sportLabel[event.sport]}</span><span className={styles.tag} data-state={event.status}>{eventLabel[event.status]}</span>
          {event.sport === 'tennis' && <span className={styles.tag}>Mejor de {event.format.bestOf}</span>}
          {event.sport === 'football' && event.format.knockout && <span className={styles.tag}>Eliminacion / {event.format.leg === 'return' ? 'vuelta' : 'partido unico'}</span>}
        </div>
        <h4>{event.participants.home.name} vs {event.participants.away.name}</h4>
        <p className={styles.muted}>{event.competition}</p>
        <p className={styles.result}>{resultLabel(event)}{event.resultState === 'partial' ? ' / Parcial' : ''}</p>
        <p className={styles.muted}>Fuente: {event.source.provider} / Actualizado: {time(event.source.updatedAt)}</p>
      </div>
    </div>
    <details className={styles.details}><summary>Horarios y fuente</summary><dl>
      <div><dt>Inicio programado</dt><dd>{time(event.scheduledStart)} (Buenos Aires)</dd></div>
      <div><dt>Inicio real</dt><dd>{event.actualStart ? time(event.actualStart) : 'Sin informar'}</dd></div>
      <div><dt>Transmision</dt><dd>{event.broadcastStart ? time(event.broadcastStart) : 'Sin informar'}</dd></div>
      {event.previousScheduledStart && <div><dt>Horario anterior</dt><dd>{time(event.previousScheduledStart)}</dd></div>}
      <div><dt>Ultima sincronizacion</dt><dd>{dateLabel(event.source.syncedAt.slice(0, 10))} / {time(event.source.syncedAt)}</dd></div>
    </dl></details>
    {canEdit && <details className={styles.editorDetails}><summary>{prediction ? 'Editar pronostico' : 'Pronosticar'}</summary><DailyPredictionEditor event={event} initial={prediction?.pick} onSave={onSave} /></details>}
  </article>
}

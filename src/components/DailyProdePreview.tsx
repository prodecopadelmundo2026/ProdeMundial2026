'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, CircleDot, Filter, Medal, Plus, RefreshCw, Target } from 'lucide-react'
import { DailyVisualAtmosphere } from '@/components/DailyVisualAtmosphere'
import { createDemoParticipation, dailyEvents, demoJourneys, demoRooms, DEMO_NOW, DEMO_USER } from '@/lib/daily-prode-demo'
import { isEligibleDailyEvent } from '@/lib/daily-prode/competition-catalog'
import { agendaOrder, dateLabel, eventLabel, money, pickLabel, predictionLabel, resultLabel, sportLabel, time } from '@/lib/daily-prode/display'
import { joinRoom, roomRanking, savePrediction } from '@/lib/daily-prode/rooms'
import { SCORING, scorePrediction } from '@/lib/daily-prode/scoring'
import type { DailyEvent, Pick, Prediction } from '@/lib/daily-prode/model'
import { DailyPredictionEditor } from './DailyPredictionEditor'
import styles from './DailyProdePreview.module.css'

type Scenario = 'normal' | 'many' | 'loading' | 'error'

export function DailyProdePreview({ initialDate, mode = 'summary' }: { initialDate?: string; mode?: 'summary' | 'workspace' }) {
  const [journeyId, setJourneyId] = useState(demoJourneys.find((journey) => journey.date === initialDate)?.id ?? demoJourneys[1].id)
  const [fee, setFee] = useState(5000)
  const [data, setData] = useState(() => createDemoParticipation())
  const [scenario, setScenario] = useState<Scenario>('normal')
  const [selectedSports, setSelectedSports] = useState<DailyEvent['sport'][]>(['football', 'tennis', 'boxing'])
  const [competitionFilter, setCompetitionFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'live' | 'finished'>('all')
  const [mineOnly, setMineOnly] = useState(false)

  const journey = demoJourneys.find((item) => item.id === journeyId)!
  const rooms = demoRooms.filter((item) => item.journeyId === journeyId)
  const room = rooms.find((item) => item.entryFee === fee) ?? rooms[0]
  const events = dailyEvents.filter((item) => item.journeyId === journeyId && isEligibleDailyEvent(item).eligible).sort(agendaOrder)
  const displayedEvents = scenario === 'many'
    ? [...events, ...events.filter((item) => item.status === 'upcoming').flatMap((item) => Array.from({ length: 4 }, (_, index) => ({ ...item, id: `${item.id}-extra-${index}` })))].sort(agendaOrder)
    : events
  const ranking = roomRanking(room, journey, data.entries, data.predictions, dailyEvents)
  const entry = data.entries.find((item) => item.roomId === room.id && item.journeyId === journeyId && item.userId === DEMO_USER)
  const me = ranking.standings.find((item) => item.userId === DEMO_USER)
  const leader = ranking.standings[0]
  const dateIndex = demoJourneys.findIndex((item) => item.id === journeyId)
  const ready = scenario !== 'loading' && scenario !== 'error'
  const myRooms = data.entries.filter((item) => item.journeyId === journeyId && item.userId === DEMO_USER).length
  const filteredEvents = displayedEvents.filter((event) => {
    if (!selectedSports.includes(event.sport)) return false
    if (competitionFilter !== 'all' && event.competition !== competitionFilter) return false
    if (statusFilter !== 'all' && event.status !== statusFilter) return false
    return !mineOnly || Boolean(entry && data.predictions.some((prediction) => prediction.participationId === entry.id && prediction.eventId === event.id))
  })
  const featuredEvent = filteredEvents.find((item) => item.status === 'live') ?? filteredEvents.find((item) => item.status === 'upcoming') ?? filteredEvents[0]
  const secondaryEvents = filteredEvents.filter((item) => item.id !== featuredEvent?.id && (item.status === 'upcoming' || item.status === 'live')).slice(0, 3)
  const finishedEvents = filteredEvents.filter((item) => item.status === 'finished').length
  const competitions = [...new Set(events.map((event) => event.competition))]
  const predictionRows = entry ? events.map((event) => {
    const prediction = data.predictions.find((item) => item.participationId === entry.id && item.eventId === event.id)
    return { event, prediction, score: prediction ? scorePrediction(event, prediction.pick) : null }
  }) : []
  const correctCount = predictionRows.filter((item) => item.score?.status === 'exact' || item.score?.status === 'partial').length
  const missedCount = predictionRows.filter((item) => item.score?.status === 'miss').length
  const pendingCount = predictionRows.filter((item) => !item.score || item.score.status === 'pending' || item.score.status === 'live' || item.score.status === 'review').length

  function save(event: DailyEvent, pick: Pick) {
    if (!entry || journey.status !== 'open') throw new Error('La sala no admite este pronostico.')
    const predictions = savePrediction(data.predictions, entry, room, event, pick, DEMO_NOW)
    setData((current) => ({ ...current, predictions }))
  }

  function changeScenario(next: Scenario) {
    setScenario(next)
    if (next === 'many') setData(createDemoParticipation(true))
    if (next === 'normal') setData(createDemoParticipation())
  }

  function toggleSport(sport: DailyEvent['sport']) {
    setSelectedSports((current) => current.includes(sport) ? current.filter((item) => item !== sport) : [...current, sport])
  }

  return (
    <div className={styles.page}>
      <section className={styles.stage} aria-labelledby="daily-title">
        <DailyVisualAtmosphere />
        <div className={styles.stageContent}>
          <div className={styles.intro}>
            <span className={styles.sourceBadge}>Datos de demostracion · fuente manual</span>
            <p className={styles.kicker}>PRODE DIARIO / {dateLabel(journey.date).toUpperCase()}</p>
            <h1 id="daily-title" className={styles.title}>La jornada <em>se juega hoy.</em></h1>
            <p className={styles.lead}>Pronosticos diarios para futbol, tenis y boxeo. Elegi una sala, segui la agenda y disputá el primer puesto de la jornada.</p>
          </div>

          <div className={styles.controls}>
            <div className={styles.dateNav} aria-label="Navegacion de jornadas">
              <button className={styles.iconButton} aria-label="Jornada anterior" title="Jornada anterior" disabled={dateIndex === 0} onClick={() => setJourneyId(demoJourneys[dateIndex - 1].id)}><ChevronLeft size={18} /></button>
              <label>Jornada<select aria-label="Jornada" value={journeyId} onChange={(event) => setJourneyId(event.target.value)}>
                {demoJourneys.map((item) => <option value={item.id} key={item.id}>{dateLabel(item.date)}{item.status === 'closed' ? ' / Cerrada' : ''}</option>)}
              </select></label>
              <button className={styles.iconButton} aria-label="Jornada siguiente" title="Jornada siguiente" disabled={dateIndex === demoJourneys.length - 1} onClick={() => setJourneyId(demoJourneys[dateIndex + 1].id)}><ChevronRight size={18} /></button>
            </div>
            <fieldset className={styles.rooms} id="salas">
              <legend>Salas de la jornada / importes demo</legend>
              {rooms.map((item) => <label key={item.id}><input type="radio" name="room" checked={fee === item.entryFee} onChange={() => setFee(item.entryFee)} />{money(item.entryFee)}</label>)}
            </fieldset>
          </div>
          <div className={styles.quickFilters} aria-label="Filtros rápidos por deporte">
            <span>Deportes</span>
            <button type="button" data-active={selectedSports.length === 3} onClick={() => setSelectedSports(['football', 'tennis', 'boxing'])}>Todos</button>
            <button type="button" data-active={selectedSports.includes('football')} onClick={() => toggleSport('football')}>Fútbol</button>
            <button type="button" data-active={selectedSports.includes('tennis')} onClick={() => toggleSport('tennis')}>Tenis</button>
            <button type="button" data-active={selectedSports.includes('boxing')} onClick={() => toggleSport('boxing')}>Boxeo</button>
            <span className={styles.comingSoon}>MMA próximamente</span>
          </div>

          <div className={styles.metrics} aria-label="Resumen de la sala">
            <MetricCard label="Participantes de la sala" value={ranking.standings.length} detail={room.label} live />
            <MetricCard label="Eventos visibles" value={`${finishedEvents} / ${filteredEvents.length}`} detail={selectedSports.length === 3 && competitionFilter === 'all' && statusFilter === 'all' ? 'Total de la jornada' : 'Según filtros activos'} />
            <MetricCard label="Pozo de la sala" value={money(ranking.pot)} detail="Estimado demo · sin pagos" compact />
            <MetricCard label="Mi puntaje" value={me ? `${me.points} pts` : 'Sin participación'} detail={me ? `${me.position}° puesto provisional` : 'Sumate para pronosticar'} compact />
            <MetricCard label="Lider del dia" value={leader ? leader.name : 'Sin participantes'} detail={leader ? `${leader.points} pts${ranking.leaders > 1 ? ` · empate x${ranking.leaders}` : ''}` : room.label} compact />
          </div>

          {ready && featuredEvent ? <section className={styles.heroGrid} aria-label="Destacado de la jornada">
            <article className={styles.featured}>
              <div className={styles.featuredHeader}>
                <div className={styles.tags}><span className={styles.tag} data-state={featuredEvent.status}>{featuredEvent.status === 'live' ? <CircleDot size={13} /> : <CalendarDays size={13} />}{eventLabel[featuredEvent.status]}</span><span className={styles.tag}>{sportLabel[featuredEvent.sport]}</span></div>
                <span className={styles.heroTime}>{time(featuredEvent.scheduledStart)}</span>
              </div>
              <p className={styles.kicker}>{featuredEvent.competition}</p>
              <h2>{featuredEvent.participants.home.name}<span>vs</span>{featuredEvent.participants.away.name}</h2>
              <p className={styles.heroResult}>{heroResult(featuredEvent)}</p>
              <div className={styles.heroFacts}><span>{dateLabel(featuredEvent.scheduledStart.slice(0, 10))} · Buenos Aires</span><span>{formatNote(featuredEvent)}</span></div>
              <div className={styles.heroActions}>
                <Link href={mode === 'summary' ? '/diario' : entry ? '#agenda' : '#participacion'} className={styles.primaryLink}>{mode === 'summary' ? 'Ir al Prode diario' : entry ? 'Ver mi pronostico' : 'Participar en demo'} <ArrowRight size={17} /></Link>
                {mode === 'summary' && <Link href="/mi-prode" className={styles.secondaryLink}>Mi Prode <ArrowRight size={16} /></Link>}
              </div>
            </article>

            <aside className={styles.dailyRanking} aria-labelledby="daily-ranking-title">
              <div className={styles.rankingHead}><div><p className={styles.kicker}>RANKING DEL DIA</p><h2 id="daily-ranking-title">{room.label}</h2></div><Medal size={23} className={styles.orangeIcon} /></div>
              <p className={styles.rankingNote}>{ranking.final ? 'Clasificacion final demo.' : 'Clasificacion provisional mientras haya eventos pendientes.'}</p>
              {ranking.leaders > 1 && <p className={styles.tie}>Empate en el primer puesto · {ranking.leaders} participantes</p>}
              <ol className={styles.heroRankList}>{ranking.standings.slice(0, 5).map((item) => <li key={item.id} data-user={item.userId === DEMO_USER}><strong>{item.position}</strong><span>{item.name}{item.userId === DEMO_USER && <small>Vos</small>}</span><b>{item.points} pts</b></li>)}</ol>
              {ranking.standings.length === 0 && <p className={styles.empty}>Todavia no hay participantes en esta sala.</p>}
              <Link href={mode === 'summary' ? '/ranking' : '#ranking'} className={styles.secondaryLink}>Ver ranking total <ArrowRight size={16} /></Link>
            </aside>
          </section> : ready ? <section className={styles.noFeatured}><p className={styles.kicker}>JORNADA SIN EVENTOS</p><h2>No hay eventos programados para esta jornada.</h2><p>Elegí otra fecha para consultar la agenda demo.</p></section> : null}

          {ready && secondaryEvents.length > 0 && <div className={styles.secondaryEvents} aria-label="Siguientes eventos">
            {secondaryEvents.map((event) => <EventTeaser key={event.id} event={event} hasPrediction={Boolean(entry && data.predictions.some((item) => item.participationId === entry.id && item.eventId === event.id))} />)}
          </div>}
        </div>
      </section>

      <div className={styles.content}>
        {mode === 'workspace' && <fieldset className={styles.filters} aria-label="Filtros de agenda">
          <legend><Filter size={16} /> Filtrar agenda</legend>
          <label>Competencia<select value={competitionFilter} onChange={(event) => setCompetitionFilter(event.target.value)}><option value="all">Todas las competencias</option>{competitions.map((competition) => <option key={competition} value={competition}>{competition}</option>)}</select></label>
          <label>Estado<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}><option value="all">Todos los estados</option><option value="upcoming">Próximos</option><option value="live">En curso</option><option value="finished">Finalizados</option></select></label>
          <label className={styles.filterCheck}><input type="checkbox" checked={mineOnly} onChange={(event) => setMineOnly(event.target.checked)} /> Solo mis pronosticos</label>
        </fieldset>}

        {mode === 'workspace' && <section className={styles.section} id="agenda" aria-labelledby="agenda-title">
          <div className={styles.sectionHead}><div><p className={styles.kicker}>AGENDA DIARIA</p><h2 id="agenda-title">Todo lo que pasa <em>hoy.</em></h2></div><span className={styles.sourceBadge}>Fuente manual · demo</span></div>
          {scenario === 'loading' && <div role="status" aria-busy="true" className={styles.loadingWrap}><p>Cargando agenda de la jornada...</p><div className={styles.loading} /><div className={styles.loading} /></div>}
          {scenario === 'error' && <div role="alert" className={styles.empty}><p className={styles.error}>No se pudo actualizar la agenda. No hay nuevos resultados confirmados.</p><button className={styles.primaryButton} onClick={() => changeScenario('normal')}><RefreshCw size={16} /> Reintentar</button></div>}
          {ready && !events.length && <p className={styles.empty}>No hay eventos para esta jornada.</p>}
          {ready && events.length > 0 && !filteredEvents.length && <p className={styles.empty}>No hay eventos que coincidan con estos filtros.</p>}
          {ready && [
            { title: 'En curso', statuses: ['live'] },
            { title: 'Proximos', statuses: ['upcoming'] },
            { title: 'Finalizados', statuses: ['finished'] },
            { title: 'Estados a revisar', statuses: ['suspended', 'cancelled', 'rescheduled', 'void', 'review'] },
          ].map((group) => {
            const items = filteredEvents.filter((event) => group.statuses.includes(event.status))
            return items.length > 0 ? <div className={styles.group} key={group.title}><h3>{group.title}<span>{items.length}</span></h3><div className={styles.eventGrid}>{items.map((event) => {
              const prediction = entry ? data.predictions.find((item) => item.participationId === entry.id && item.eventId === event.id) : undefined
              const canEdit = Boolean(entry && journey.status === 'open' && room.eventIds.includes(event.id) && event.status === 'upcoming' && Date.parse(event.scheduledStart) > Date.parse(DEMO_NOW))
              return <EventCard key={event.id} event={event} prediction={prediction} canEdit={canEdit} onSave={(pick) => save(event, pick)} />
            })}</div></div> : null
          })}
        </section>}

        {ready && <section className={styles.section} id="participacion" aria-labelledby="participation-title">
          <div className={styles.sectionHead}><div><p className={styles.kicker}>MI PRODE</p><h2 id="participation-title">Tu seguimiento en <em>{room.label}.</em></h2></div><span className={styles.tag}>{myRooms} salas en esta jornada</span></div>
          <div className={styles.myStats}><Stat label="Pronosticos" value={entry ? `${predictionRows.filter((item) => item.prediction).length} / ${events.length}` : 'Sin participación'} /><Stat label="Acertados" value={entry ? correctCount : '—'} /><Stat label="No acertados" value={entry ? missedCount : '—'} /><Stat label="Pendientes" value={entry ? pendingCount : '—'} /><Stat label="Posicion" value={me ? `${me.position}°` : '—'} /><Stat label="Diferencia con lider" value={me && leader ? `${Math.max(leader.points - me.points, 0)} pts` : '—'} /></div>
          {mode === 'summary' ? <Link href="/mi-prode" className={styles.secondaryLink}>Ver detalle de Mi Prode <ArrowRight size={16} /></Link> : !entry ? <div className={styles.empty}><p>Sin participación en esta sala. Podés sumarte a este escenario demo mientras la jornada esté abierta.</p>{journey.status === 'open' && events.length > 0 && <button className={styles.primaryButton} onClick={() => setData((current) => ({ ...current, entries: joinRoom(current.entries, room, DEMO_USER, 'Vos (demo)') }))}><Plus size={16} /> Participar en demo</button>}</div> : <div className={styles.predictionList}>
            {predictionRows.map(({ event, prediction, score }) => <article key={event.id} className={styles.prediction}><div><div className={styles.tags}><span className={styles.tag}>{sportLabel[event.sport]}</span><span className={styles.tag} data-state={score?.status ?? 'pending'}>{score ? predictionLabel[score.status] : 'Sin pronostico'}</span></div><h3>{event.participants.home.name} vs {event.participants.away.name}</h3><p>{prediction ? pickLabel(event, prediction.pick) : 'Todavia no cargaste un pronostico.'}</p></div><div className={styles.predictionScore}><strong>{score?.points ?? '—'}</strong><span>{score?.points === 1 ? 'punto' : 'puntos'}</span></div></article>)}
          </div>}
        </section>}

        {mode === 'workspace' && ready && <section id="ranking" className={styles.section} aria-labelledby="ranking-title">
          <div className={styles.sectionHead}><div><p className={styles.kicker}>CLASIFICACION COMPLETA</p><h2 id="ranking-title">Ranking de la <em>sala.</em></h2></div><span className={styles.tag} data-state={ranking.final ? 'final' : 'pending'}>{ranking.final ? 'Final demo' : 'Provisional'}</span></div>
          <p className={styles.rankingNote}>El pozo demo se reparte solo en el primer puesto cuando la jornada queda resuelta. Los empates se muestran y se dividen en partes iguales.</p>
          <ol className={styles.fullRankList}>{ranking.standings.map((item) => <li key={item.id} data-user={item.userId === DEMO_USER}><strong>{item.position}</strong><span>{item.name}{item.unresolved > 0 && <small>{item.unresolved} pendientes</small>}</span><b>{item.points} pts</b><em>{item.winner ? `Pozo demo ${money(item.prizeShare ?? 0)}` : ''}</em></li>)}</ol>
        </section>}

        {mode === 'workspace' && <section className={styles.rules}><details><summary>Reglas y fuente de esta demostracion</summary><p>Fútbol: exacto {SCORING.football.exact}, resultado general {SCORING.football.general}, incorrecto {SCORING.football.wrong} puntos. Tenis: sets exactos {SCORING.tennis.exact}, ganador correcto {SCORING.tennis.winner}, incorrecto {SCORING.tennis.wrong}. Boxeo conserva la propuesta 3/2/1/0.</p><p>Los marcadores de fútbol a 90 minutos, alargue, penales y clasificado se mantienen separados. La fuente manual, los bloqueos y la auditoría del modo demo continúan sin persistencia.</p></details></section>}
      </div>
    </div>
  )
}

function MetricCard({ label, value, detail, compact = false, live = false }: { label: string; value: string | number; detail: string; compact?: boolean; live?: boolean }) {
  return <article className={styles.metricCard}><p>{live && <span className={styles.liveDot} />} {label}</p><strong data-compact={compact}>{value}</strong><small>{detail}</small></article>
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div><dt>{label}</dt><dd>{value}</dd></div>
}

function EventTeaser({ event, hasPrediction }: { event: DailyEvent; hasPrediction: boolean }) {
  return <article className={styles.eventTeaser}><div><span className={styles.tag} data-state={event.status}>{eventLabel[event.status]}</span><strong>{time(event.scheduledStart)}</strong></div><p>{sportLabel[event.sport]} · {event.participants.home.name} vs {event.participants.away.name}</p><small>{hasPrediction ? 'Pronostico cargado' : 'Pronostico disponible'}</small></article>
}

function EventCard({ event, prediction, canEdit, onSave }: { event: DailyEvent; prediction?: Prediction; canEdit: boolean; onSave: (pick: Pick) => void }) {
  return <article className={styles.event} data-event-id={event.id}>
    <div className={styles.eventTop}><div className={styles.eventTime}><strong>{time(event.scheduledStart)}</strong><span>{dateLabel(event.scheduledStart.slice(0, 10))}</span></div><div className={styles.eventBody}><div className={styles.tags}><span className={styles.tag}>{sportLabel[event.sport]}</span><span className={styles.tag} data-state={event.status}>{eventLabel[event.status]}</span><span className={styles.tag}>Manual · demo</span>{event.sport === 'tennis' && <span className={styles.tag}>Mejor de {event.format.bestOf}</span>}{event.sport === 'football' && event.format.knockout && <span className={styles.tag}>Eliminación {event.format.requiresResolution ? '· define clasificado' : ''}</span>}{event.sport === 'boxing' && event.result?.sport === 'boxing' && event.result.methodDetail && <span className={styles.tag}>{event.result.methodDetail.toUpperCase()}{event.result.round ? ` · R${event.result.round}` : ''}</span>}</div><h4>{event.participants.home.name} <span>vs</span> {event.participants.away.name}</h4><p className={styles.competition}>{event.competition}</p><p className={styles.result}>{heroResult(event)}{event.resultState === 'partial' ? ' · Parcial' : ''}</p></div></div>
    <div className={styles.eventFooter}><span>Actualizado {time(event.source.updatedAt)} · fuente manual</span><span>{formatNote(event)}</span></div>
    <details className={styles.details}><summary>Detalle de horarios y fuente</summary><dl><div><dt>Inicio programado</dt><dd>{time(event.scheduledStart)} · Buenos Aires</dd></div><div><dt>Inicio real</dt><dd>{event.actualStart ? time(event.actualStart) : 'No informado'}</dd></div><div><dt>Transmision</dt><dd>{event.broadcastStart ? time(event.broadcastStart) : 'No informado'}</dd></div>{event.previousScheduledStart && <div><dt>Horario anterior</dt><dd>{time(event.previousScheduledStart)}</dd></div>}<div><dt>Ultima actualizacion</dt><dd>{dateLabel(event.source.syncedAt.slice(0, 10))} · {time(event.source.syncedAt)}</dd></div></dl></details>
    {canEdit && <details className={styles.editorDetails}><summary>{prediction ? 'Editar pronostico demo' : 'Cargar pronostico demo'} <Target size={15} /></summary><DailyPredictionEditor event={event} initial={prediction?.pick} onSave={onSave} /></details>}
  </article>
}

function heroResult(event: DailyEvent) {
  if (event.status === 'upcoming') return 'Pronostico abierto hasta el inicio del evento'
  if (event.status === 'live' && event.sport === 'tennis' && event.result?.sport === 'tennis') {
    const currentSet = event.result.sets?.at(-1)
    return currentSet ? `En curso · 6-${event.result.sets?.[0]?.away ?? 0} / segundo set ${currentSet.home}-${currentSet.away}` : 'En juego · parcial pendiente de carga manual'
  }
  if (event.status === 'live' && !event.result) return 'En juego · marcador parcial pendiente de carga manual'
  return resultLabel(event)
}

function formatNote(event: DailyEvent) {
  if (event.sport === 'football') return event.format.knockout ? 'Eliminación · 90 min y clasificación separados' : 'Marcador a 90 minutos'
  if (event.sport === 'tennis') return `Mejor de ${event.format.bestOf}`
  return `${event.format.rounds} rounds · KO/TKO o decisión`
}

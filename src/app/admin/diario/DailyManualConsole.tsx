'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, CirclePause, Clock3, History, Lock, Pencil, Plus, RefreshCw, ShieldAlert, Unlock } from 'lucide-react'
import { dailyEvents, demoJourneys, SYNTHETIC_FIXTURE_NOTICE } from '@/lib/daily-prode-demo'
import { competitionFor, competitionsFor } from '@/lib/daily-prode/competition-catalog'
import { agendaOrder, eventLabel, resultLabel, sportLabel, time } from '@/lib/daily-prode/display'
import { canCloseManualJourney, confirmManualRecord, createManualEvent, createManualRecord, setManualLock, sideName, simulateAutomaticUpdate, updateManualRecord } from '@/lib/daily-prode/manual'
import type { DailyEvent, EventStatus, ScorePair } from '@/lib/daily-prode/model'
import type { EventRecord } from '@/lib/daily-prode/provider'
import styles from './daily-manual.module.css'

type Props = { actor: string }
type FootballFields = { home: string; away: string; extraHome: string; extraAway: string; penaltyHome: string; penaltyAway: string; qualifier: '' | 'home' | 'away'; resolution: 'regular' | 'extra-time' | 'penalties' }

const manualStatuses: Array<{ value: EventStatus | 'retired' | 'walkover'; label: string }> = [
  { value: 'upcoming', label: 'Abierto / próximo' }, { value: 'live', label: 'En curso' }, { value: 'finished', label: 'Finalizado' },
  { value: 'review', label: 'Pendiente de revisión' }, { value: 'suspended', label: 'Suspendido' }, { value: 'cancelled', label: 'Cancelado' },
  { value: 'rescheduled', label: 'Reprogramado' }, { value: 'void', label: 'Anulado' }, { value: 'retired', label: 'Retiro (tenis)' }, { value: 'walkover', label: 'Walkover (tenis)' },
]

function cloneInitial(actor: string) {
  return dailyEvents.filter(event => event.journeyId === demoJourneys[1].id).map(event => createManualRecord(structuredClone(event), actor))
}

function toInputDate(value: string) {
  const date = new Date(value)
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16)
}

function fromInputDate(value: string) {
  return value ? new Date(value).toISOString() : ''
}

function score(home: string, away: string): ScorePair | undefined {
  if (home === '' || away === '') return undefined
  return { home: Number(home), away: Number(away) }
}

export function DailyManualConsole({ actor }: Props) {
  const [records, setRecords] = useState<EventRecord[]>(() => cloneInitial(actor))
  const [journeyStatus, setJourneyStatus] = useState<'open' | 'in-progress' | 'pending-results' | 'review' | 'closed' | 'void'>('open')
  const [selectedId, setSelectedId] = useState(records[0]?.event.id ?? '')
  const [reason, setReason] = useState('Actualización manual de desarrollo.')
  const [notice, setNotice] = useState('Laboratorio local iniciado. Los cambios se perderán al recargar.')
  const [error, setError] = useState('')
  const [newSport, setNewSport] = useState<DailyEvent['sport']>('football')
  const selected = records.find(record => record.event.id === selectedId) ?? records[0]
  const [homeName, setHomeName] = useState(selected?.event.participants.home.name ?? '')
  const [awayName, setAwayName] = useState(selected?.event.participants.away.name ?? '')
  const [scheduledStart, setScheduledStart] = useState(selected ? toInputDate(selected.event.scheduledStart) : '')
  const [football, setFootball] = useState<FootballFields>({ home: '', away: '', extraHome: '', extraAway: '', penaltyHome: '', penaltyAway: '', qualifier: '', resolution: 'regular' })
  const [boxingMethod, setBoxingMethod] = useState('ko')
  const [boxingOutcome, setBoxingOutcome] = useState<'home' | 'away' | 'draw' | 'no-contest'>('home')
  const [boxingRound, setBoxingRound] = useState('1')
  const [competition, setCompetition] = useState(selected?.event.competition ?? '')
  const [editorSport, setEditorSport] = useState<DailyEvent['sport']>(selected?.event.sport ?? 'football')
  const [formatChoice, setFormatChoice] = useState('football-normal')
  const [sourceReference, setSourceReference] = useState(selected?.event.source.sourceReference ?? '')
  const [consultedAt, setConsultedAt] = useState(selected?.event.source.consultedAt ? toInputDate(selected.event.source.consultedAt) : '')
  const [verificationStatus, setVerificationStatus] = useState<'draft' | 'verified' | 'rejected'>(selected?.event.source.verificationStatus ?? 'draft')

  const events = useMemo(() => records.map(record => record.event).sort(agendaOrder), [records])
  const selectedJourneyRecords = records

  function syncDraft(event: DailyEvent) {
    setHomeName(event.participants.home.name)
    setAwayName(event.participants.away.name)
    setScheduledStart(toInputDate(event.scheduledStart))
    setCompetition(event.competition)
    setEditorSport(event.sport)
    setSourceReference(event.source.sourceReference ?? '')
    setConsultedAt(event.source.consultedAt ? toInputDate(event.source.consultedAt) : '')
    setVerificationStatus(event.source.verificationStatus ?? 'draft')
    setFormatChoice(event.sport === 'football' ? event.format.knockout ? 'football-knockout' : 'football-normal' : event.sport === 'tennis' ? `tennis-${event.format.bestOf}` : `boxing-${event.format.rounds}`)
    if (event.sport === 'football' && event.result?.sport === 'football') {
      setFootball({ home: String(event.result.scoreAt90.home), away: String(event.result.scoreAt90.away), extraHome: event.result.extraTimeScore ? String(event.result.extraTimeScore.home) : '', extraAway: event.result.extraTimeScore ? String(event.result.extraTimeScore.away) : '', penaltyHome: event.result.penaltyScore ? String(event.result.penaltyScore.home) : '', penaltyAway: event.result.penaltyScore ? String(event.result.penaltyScore.away) : '', qualifier: event.result.qualifier ?? '', resolution: event.result.resolution ?? 'regular' })
      return
    }
    setFootball({ home: '', away: '', extraHome: '', extraAway: '', penaltyHome: '', penaltyAway: '', qualifier: '', resolution: 'regular' })
  }

  function selectEvent(id: string) {
    const event = records.find(record => record.event.id === id)?.event
    if (!event) return
    setSelectedId(id)
    syncDraft(event)
  }

  function run(operation: (record: EventRecord) => EventRecord, success: string) {
    if (!selected) return
    if (!reason.trim()) return setError('El motivo de corrección es obligatorio para conservar la auditoría.')
    try {
      setRecords(current => current.map(record => record.event.id === selected.event.id ? operation(record) : record))
      setError('')
      setNotice(success)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo aplicar la operación manual.')
    }
  }

  function update(draft: DailyEvent, action: string) {
    run(record => updateManualRecord(record, draft, actor, reason), action)
  }

  function updateStatus(value: string) {
    if (!selected) return
    const providerStatus = value
    const status = providerStatus === 'retired' || providerStatus === 'walkover' ? 'review' : providerStatus as EventStatus
    const resultState = status === 'live' ? 'partial' : ['suspended', 'cancelled', 'rescheduled', 'void', 'review'].includes(status) ? 'review' : selected.event.result ? selected.event.resultState : 'missing'
    update({ ...selected.event, status, resultState, source: { ...selected.event.source, providerStatus } }, `Estado manual actualizado a ${manualStatuses.find(item => item.value === value)?.label ?? value}.`)
  }

  function saveBasics() {
    if (!selected) return
    const nextStart = fromInputDate(scheduledStart)
    if (!nextStart) return setError('La fecha y hora son obligatorias.')
    const nextConsultedAt = fromInputDate(consultedAt)
    if (!sourceReference.trim() || !nextConsultedAt) return setError('La referencia o URL de fuente y la fecha de consulta son obligatorias.')
    if (!homeName.trim() || !awayName.trim() || !competition.trim()) return setError('Participantes y competencia son obligatorios.')
    if (!competitionFor(editorSport, competition)) return setError('La competencia no pertenece al catálogo permitido para este deporte; no se puede publicar como evento elegible.')
    const format = editorSport === 'football' ? { knockout: formatChoice === 'football-knockout', ...(formatChoice === 'football-knockout' ? { leg: 'single' as const, requiresResolution: true } : {}) } : editorSport === 'tennis' ? { bestOf: formatChoice === 'tennis-5' ? 5 as const : 3 as const } : { rounds: formatChoice === 'boxing-12' ? 12 : 10 }
    const replacement = createManualEvent(editorSport, selected.event.journeyId, records.length + 100, selected.event.scheduledStart)
    update({ ...replacement, id: selected.event.id, competition: competition.trim(), participants: { home: { ...replacement.participants.home, id: selected.event.participants.home.id, name: homeName.trim() }, away: { ...replacement.participants.away, id: selected.event.participants.away.id, name: awayName.trim() } }, scheduledStart: nextStart, format, source: { ...replacement.source, ...selected.event.source, sourceType: 'manual', providerStatus: 'upcoming', sourceReference: sourceReference.trim(), consultedAt: nextConsultedAt, verificationStatus } } as DailyEvent, 'Datos, fuente, verificación, deporte, competencia o formato actualizados; el resultado se reinició para validarlo de nuevo.')
  }

  function saveFootball(live = false) {
    if (!selected || selected.event.sport !== 'football') return
    const scoreAt90 = score(football.home, football.away)
    if (!scoreAt90) return setError('El marcador a 90 minutos requiere dos valores.')
    const extraTimeScore = score(football.extraHome, football.extraAway)
    const penaltyScore = score(football.penaltyHome, football.penaltyAway)
    const requiresQualifier = selected.event.format.knockout && selected.event.format.requiresResolution
    if (!live && requiresQualifier && !football.qualifier) return setError('La eliminatoria requiere un clasificado explícito para confirmarse.')
    const result = { sport: 'football' as const, scoreAt90, ...(extraTimeScore ? { extraTimeScore } : {}), ...(penaltyScore ? { penaltyScore } : {}), ...(football.qualifier ? { qualifier: football.qualifier } : {}), resolution: football.resolution }
    update({ ...selected.event, status: live ? 'live' : 'finished', resultState: live ? 'partial' : 'confirmed', result, source: { ...selected.event.source, providerStatus: live ? 'live' : 'finished' } }, live ? 'Marcador parcial guardado en el laboratorio.' : 'Resultado de fútbol manual guardado; pendiente de confirmación administrativa.')
  }

  function applyTennis(outcome: 'completed' | 'retired' | 'walkover' | 'suspended' | 'cancelled' | 'rescheduled') {
    if (!selected || selected.event.sport !== 'tennis') return
    if (outcome !== 'completed') {
      update({ ...selected.event, status: outcome === 'cancelled' ? 'cancelled' : outcome === 'rescheduled' ? 'rescheduled' : outcome === 'suspended' ? 'suspended' : 'review', resultState: 'review', result: undefined, source: { ...selected.event.source, providerStatus: outcome } }, `${outcome} registrado como resultado no puntuable y pendiente de revisión.`)
      return
    }
    const sets = selected.event.format.bestOf === 3 ? [{ home: 6, away: 4 }, { home: 7, away: 6, tiebreak: { home: 7, away: 5 } }] : [{ home: 6, away: 4 }, { home: 3, away: 6 }, { home: 6, away: 2 }, { home: 6, away: 3 }]
    update({ ...selected.event, status: 'finished', resultState: 'confirmed', result: { sport: 'tennis', winner: 'home', loserSets: selected.event.format.bestOf === 3 ? 0 : 1, sets }, source: { ...selected.event.source, providerStatus: 'finished' } }, 'Sets detallados de tenis guardados; pendiente de confirmación.')
  }

  function saveBoxing() {
    if (!selected || selected.event.sport !== 'boxing') return
    if (boxingMethod === 'unknown') return setError('El contrato neutral rechaza un método de boxeo desconocido; el resultado queda pendiente.')
    const isWinner = boxingOutcome === 'home' || boxingOutcome === 'away'
    const method = boxingMethod === 'decision' ? 'decision' as const : 'ko' as const
    const round = method === 'ko' ? Number(boxingRound) : undefined
    const result = isWinner ? { sport: 'boxing' as const, outcome: boxingOutcome, method, methodDetail: boxingMethod === 'tko' ? 'tko' as const : method, methodRaw: boxingMethod.toUpperCase(), ...(round ? { round } : {}) } : { sport: 'boxing' as const, outcome: boxingOutcome }
    update({ ...selected.event, status: 'finished', resultState: 'confirmed', result, source: { ...selected.event.source, providerStatus: 'finished' } }, 'Resultado de boxeo manual guardado; pendiente de confirmación.')
  }

  function reset() {
    const next = cloneInitial(actor)
    setRecords(next)
    setSelectedId(next[0]?.event.id ?? '')
    setJourneyStatus('open')
    setNotice('Datos demo restablecidos. No se escribió nada fuera de esta sesión.')
    setError('')
  }

  function addEvent() {
    const event = createManualEvent(newSport, demoJourneys[1].id, records.length + 1)
    const record = createManualRecord(event, actor)
    setRecords(current => [...current, record])
    setSelectedId(event.id)
    syncDraft(event)
    setNotice(`${sportLabel[newSport]} creado como evento manual de desarrollo.`)
    setError('')
  }

  function closeJourney() {
    if (!canCloseManualJourney(selectedJourneyRecords)) return setError('La jornada no puede cerrarse: hay eventos pendientes, ambiguos, suspendidos o sin confirmación.')
    setJourneyStatus('closed')
    setNotice('Jornada cerrada manualmente en esta sesión de desarrollo.')
    setError('')
  }

  if (!selected) return null
  const sourceStatus = selected.event.source.providerStatus ?? selected.event.status
  const lastAudit = selected.audit.at(-1)
  return <main className={styles.page}>
    <header className={styles.header}>
      <div><p className={styles.eyebrow}>ADMINISTRACIÓN PROTEGIDA / DESARROLLO</p><h1>Jornada manual</h1><p>Fuente: <strong>sourceType: manual</strong>. Estado local, sintético y descartable al recargar. Actor de auditoría: <strong>{actor}</strong>.</p></div>
      <Link className={styles.link} href="/admin">Volver al panel histórico</Link>
    </header>

    <section className={styles.warning}><ShieldAlert size={20} /><div><strong>Modo manual de desarrollo — cambios no persistentes</strong><p>{SYNTHETIC_FIXTURE_NOTICE}. Datos de demostración — fuente manual. No hay proveedor integrado, sincronización automática, escritura en Supabase ni operación de premios reales.</p></div></section>
    {error && <p className={styles.error} role="alert"><AlertTriangle size={16} /> {error}</p>}
    <p className={styles.notice} role="status"><Clock3 size={16} /> {notice}</p>

    <section className={styles.overview} aria-label="Controles de jornada">
      <div><span>Estado de jornada</span><strong>{journeyStatus === 'in-progress' ? 'En curso' : journeyStatus === 'pending-results' ? 'Pendiente de resultados' : journeyStatus === 'review' ? 'Pendiente de revisión' : journeyStatus === 'void' ? 'Anulada' : journeyStatus === 'closed' ? 'Cerrada' : 'Abierta'}</strong></div>
      <label>Actualizar jornada<select value={journeyStatus} onChange={event => setJourneyStatus(event.target.value as typeof journeyStatus)}><option value="open">Abierta</option><option value="in-progress">En curso</option><option value="pending-results">Pendiente de resultados</option><option value="review">Pendiente de revisión</option><option value="void">Anulada</option><option value="closed">Cerrada</option></select></label>
      <button className={styles.command} onClick={closeJourney} title="Cerrar jornada solo sin pendientes"><CheckCircle2 size={17} /> Cerrar jornada</button>
      <button className={styles.secondary} onClick={reset} title="Restablecer fixtures de desarrollo"><RefreshCw size={17} /> Restablecer demo</button>
    </section>

    <section className={styles.workspace}>
      <aside className={styles.list} aria-label="Eventos manuales">
        <div className={styles.listHeader}><h2>Eventos</h2><span>{events.length}</span></div>
        {events.map(event => <button key={event.id} className={event.id === selected.event.id ? styles.selectedEvent : styles.eventButton} onClick={() => selectEvent(event.id)}><span>{sportLabel[event.sport]} · {time(event.scheduledStart)}</span><strong>{event.participants.home.name} vs {event.participants.away.name}</strong><small>{eventLabel[event.status]} · {event.resultState}</small></button>)}
        <div className={styles.create}><label>Nuevo evento<select value={newSport} onChange={event => setNewSport(event.target.value as DailyEvent['sport'])}><option value="football">Fútbol</option><option value="tennis">Tenis</option><option value="boxing">Boxeo</option></select></label><button className={styles.command} onClick={addEvent}><Plus size={17} /> Crear demo</button></div>
      </aside>

      <div className={styles.editor}>
        <div className={styles.editorHeader}><div><p className={styles.eyebrow}>{sportLabel[selected.event.sport]} / {sourceStatus}</p><h2>{selected.event.participants.home.name} vs {selected.event.participants.away.name}</h2><p>{resultLabel(selected.event)} · Última actualización local: {time(selected.event.source.updatedAt)}</p></div><span className={selected.manualLock ? styles.locked : styles.unlocked}>{selected.manualLock ? <Lock size={15} /> : <Unlock size={15} />}{selected.manualLock ? 'Bloqueado manualmente' : 'Sin bloqueo'}</span></div>
        <label className={styles.reason}>Motivo de la acción<input value={reason} onChange={event => setReason(event.target.value)} /></label>

        <fieldset><legend>Datos del evento y fuente</legend><div className={styles.grid}><label>Participante local<input value={homeName} onChange={event => setHomeName(event.target.value)} /></label><label>Participante visitante<input value={awayName} onChange={event => setAwayName(event.target.value)} /></label><label>Competencia<select value={competition} onChange={event => setCompetition(event.target.value)}>{competitionsFor(editorSport).map(item => <option key={item.id} value={item.label}>{item.label} (demo)</option>)}</select></label><label>Deporte<select value={editorSport} onChange={event => { const sport = event.target.value as DailyEvent['sport']; setEditorSport(sport); setCompetition(competitionsFor(sport)[0]?.label ?? '') }}><option value="football">Fútbol</option><option value="tennis">Tenis</option><option value="boxing">Boxeo</option></select></label><label>Formato<select value={formatChoice} onChange={event => setFormatChoice(event.target.value)}>{editorSport === 'football' && <><option value="football-normal">Partido normal</option><option value="football-knockout">Eliminación</option></>}{editorSport === 'tennis' && <><option value="tennis-3">Mejor de 3</option><option value="tennis-5">Mejor de 5</option></>}{editorSport === 'boxing' && <><option value="boxing-10">10 rounds</option><option value="boxing-12">12 rounds</option></>}</select></label><label>Fecha y hora<input type="datetime-local" value={scheduledStart} onChange={event => setScheduledStart(event.target.value)} /></label><label>URL o referencia de fuente<input value={sourceReference} onChange={event => setSourceReference(event.target.value)} placeholder="URL o referencia interna" /></label><label>Fecha de consulta<input type="datetime-local" value={consultedAt} onChange={event => setConsultedAt(event.target.value)} /></label><label>Verificación<select value={verificationStatus} onChange={event => setVerificationStatus(event.target.value as typeof verificationStatus)}><option value="draft">Borrador</option><option value="verified">Verificado</option><option value="rejected">Rechazado</option></select></label><label>Estado operativo<select value={sourceStatus} onChange={event => updateStatus(event.target.value)}>{manualStatuses.map(status => <option value={status.value} key={status.value}>{status.label}</option>)}</select></label></div><p className={styles.help}>La referencia, fecha de consulta, verificación y motivo de corrección son obligatorios antes de guardar. La fuente manual nunca se publica: sólo una fuente autorizada verificada puede entrar a la agenda pública.</p><button className={styles.secondary} onClick={saveBasics}><Pencil size={17} /> Guardar configuración</button></fieldset>

        {selected.event.sport === 'football' && <fieldset><legend>Resultado de fútbol {selected.event.format.knockout ? '/ eliminación' : '/ partido normal'}</legend><p className={styles.help}>El marcador a 90, alargue, penales y clasificado se guardan por separado. El clasificado no asigna puntos.</p><div className={styles.grid}><label>90 min local<input inputMode="numeric" value={football.home} onChange={event => setFootball(current => ({ ...current, home: event.target.value }))} /></label><label>90 min visitante<input inputMode="numeric" value={football.away} onChange={event => setFootball(current => ({ ...current, away: event.target.value }))} /></label><label>Alargue local<input inputMode="numeric" value={football.extraHome} onChange={event => setFootball(current => ({ ...current, extraHome: event.target.value }))} /></label><label>Alargue visitante<input inputMode="numeric" value={football.extraAway} onChange={event => setFootball(current => ({ ...current, extraAway: event.target.value }))} /></label><label>Penales local<input inputMode="numeric" value={football.penaltyHome} onChange={event => setFootball(current => ({ ...current, penaltyHome: event.target.value }))} /></label><label>Penales visitante<input inputMode="numeric" value={football.penaltyAway} onChange={event => setFootball(current => ({ ...current, penaltyAway: event.target.value }))} /></label>{selected.event.format.knockout && <><label>Resolución<select value={football.resolution} onChange={event => setFootball(current => ({ ...current, resolution: event.target.value as FootballFields['resolution'] }))}><option value="regular">Reglamentario</option><option value="extra-time">Alargue</option><option value="penalties">Penales</option></select></label><label>Clasificado<select value={football.qualifier} onChange={event => setFootball(current => ({ ...current, qualifier: event.target.value as FootballFields['qualifier'] }))}><option value="">Sin declarar</option><option value="home">{sideName('home')}</option><option value="away">{sideName('away')}</option></select></label></>}</div><div className={styles.actions}><button className={styles.secondary} onClick={() => saveFootball(true)}><CirclePause size={17} /> Guardar parcial</button><button className={styles.command} onClick={() => saveFootball(false)}><CheckCircle2 size={17} /> Guardar final</button></div></fieldset>}

        {selected.event.sport === 'tennis' && <fieldset><legend>Resultado de tenis / mejor de {selected.event.format.bestOf}</legend><p className={styles.help}>Los resultados completos usan sets detallados; retiro y walkover no se transforman en victorias puntuables.</p><div className={styles.actions}><button className={styles.command} onClick={() => applyTennis('completed')}>Cargar sets completos</button><button className={styles.secondary} onClick={() => applyTennis('retired')}>Registrar retiro</button><button className={styles.secondary} onClick={() => applyTennis('walkover')}>Registrar walkover</button><button className={styles.secondary} onClick={() => applyTennis('suspended')}>Suspender</button><button className={styles.secondary} onClick={() => applyTennis('cancelled')}>Cancelar</button><button className={styles.secondary} onClick={() => applyTennis('rescheduled')}>Reprogramar</button></div></fieldset>}

        {selected.event.sport === 'boxing' && <fieldset><legend>Resultado de boxeo</legend><p className={styles.help}>KO/TKO exige round; decisión no admite round; empate y no contest quedan pendientes.</p><div className={styles.grid}><label>Outcome<select value={boxingOutcome} onChange={event => setBoxingOutcome(event.target.value as typeof boxingOutcome)}><option value="home">Gana local</option><option value="away">Gana visitante</option><option value="draw">Empate</option><option value="no-contest">No contest</option></select></label><label>Método<select value={boxingMethod} onChange={event => setBoxingMethod(event.target.value)}><option value="ko">KO</option><option value="tko">TKO</option><option value="decision">Decisión</option><option value="unknown">Desconocido (rechazar)</option></select></label><label>Round<input inputMode="numeric" value={boxingRound} onChange={event => setBoxingRound(event.target.value)} /></label></div><button className={styles.command} onClick={saveBoxing}>Guardar resultado</button></fieldset>}

        <fieldset><legend>Confirmación y bloqueo</legend><div className={styles.actions}><button className={styles.command} onClick={() => run(record => confirmManualRecord(record, actor, reason), 'Resultado confirmado administrativamente y bloqueado.')}>Confirmar resultado</button><button className={styles.secondary} onClick={() => run(record => setManualLock(record, true, actor, reason), 'Bloqueo manual registrado.')}><Lock size={17} /> Bloquear</button><button className={styles.secondary} onClick={() => run(record => setManualLock(record, false, actor, reason), 'Desbloqueo explícito registrado con motivo.')}><Unlock size={17} /> Desbloquear</button><button className={styles.secondary} onClick={() => run(record => simulateAutomaticUpdate(record), selected.manualLock ? 'Actualización automática simulada y rechazada por el bloqueo manual.' : 'Actualización automática simulada sobre un evento sin bloqueo.')}><AlertTriangle size={17} /> Simular actualización automática</button></div>{selected.pending && <p className={styles.conflict}>Una actualización automática quedó pendiente: el bloqueo manual conservó el dato auditado.</p>}</fieldset>

        <section className={styles.audit}><div className={styles.auditTitle}><History size={18} /><h2>Auditoría local</h2></div><ol>{[...selected.audit].reverse().map((entry, index) => <li key={`${entry.at}-${index}`}><strong>{entry.kind === 'automatic' ? 'Automática simulada' : entry.kind === 'administrative_confirmation' ? 'Confirmación administrativa' : 'Acción manual'}</strong><span>{entry.action === 'conflict' ? 'Rechazada por bloqueo' : 'Aplicada'} · {entry.actor} · {new Date(entry.at).toLocaleString('es-AR')}</span><p>{entry.reason}</p><small>Anterior: {entry.before ? `${eventLabel[entry.before.status]} · ${resultLabel(entry.before)}` : 'sin evento'} → Nuevo: {eventLabel[entry.after.status]} · {resultLabel(entry.after)}</small></li>)}</ol>{lastAudit?.action === 'conflict' && <p className={styles.conflict}>La interfaz conservó el valor manual; no sobrescribió la corrección auditada.</p>}</section>
      </div>
    </section>
  </main>
}

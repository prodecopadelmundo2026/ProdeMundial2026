import { confirmEvent, correctEvent, reconcileEvent, type AuditEntry, type EventRecord } from './provider'
import type { DailyEvent, Journey, Side } from './model'
import { normalizeProviderContract, ProviderContractError, validateProviderContract, type ProviderContractEvent, type ProviderStatus } from './providers/contract'

export const MANUAL_SOURCE_TYPE = 'manual' as const
export const MANUAL_PROVIDER_ID = 'manual-development'
export type ManualJourneyStatus = Journey['status']

function nowIso() {
  return new Date().toISOString()
}

function manualStatus(event: DailyEvent): ProviderStatus {
  const status = event.source.providerStatus
  if (status === 'retired' || status === 'walkover') return status
  return event.status
}

function toManualContract(event: DailyEvent, revision = event.source.revision, receivedAt = nowIso()): ProviderContractEvent {
  const base = {
    sourceType: MANUAL_SOURCE_TYPE,
    provider: MANUAL_PROVIDER_ID,
    externalEventId: event.source.externalId || event.id,
    externalCompetitionId: event.source.externalCompetitionId,
    externalSeasonId: event.source.externalSeasonId,
    externalSeriesId: event.source.externalSeriesId,
    externalParticipantIds: event.source.externalParticipantIds ?? { home: event.participants.home.id, away: event.participants.away.id },
    competition: event.competition,
    participants: event.participants,
    providerStatus: manualStatus(event),
    scheduledAt: event.scheduledStart,
    ...(event.actualStart ? { startedAt: event.actualStart } : {}),
    receivedAt,
    providerUpdatedAt: receivedAt,
    revision,
    payloadHash: `sha256:manual-${event.id}-r${revision}`,
    ...(event.source.replacementEventId ? { replacementEventId: event.source.replacementEventId } : {}),
  }
  if (event.sport === 'football') return {
    ...base, sport: 'football', format: event.format,
    ...(event.result ? { result: {
      scoreAt90: event.result.scoreAt90,
      ...(event.result.extraTimeScore ? { extraTimeScore: event.result.extraTimeScore } : {}),
      ...(event.result.penaltyScore ? { penaltyScore: event.result.penaltyScore } : {}),
      ...(event.result.qualifier ? { qualifier: { side: event.result.qualifier, evidence: 'explicit' as const } } : {}),
      ...(event.result.resolution ? { resolution: event.result.resolution } : {}),
    } } : {}),
  }
  if (event.sport === 'tennis') return {
    ...base, sport: 'tennis', format: event.format,
    ...(event.result ? { result: { outcome: event.status === 'finished' ? 'completed' as const : manualStatus(event) as Extract<ProviderStatus, 'retired' | 'walkover' | 'suspended' | 'cancelled' | 'rescheduled'>, winner: event.result.winner, sets: event.result.sets } } : {}),
  }
  return {
    ...base, sport: 'boxing', format: event.format,
    ...(event.result ? { result: {
      outcome: event.result.outcome,
      ...(event.result.methodDetail ? { method: event.result.methodDetail } : event.result.method ? { method: event.result.method } : {}),
      ...(event.result.methodRaw ? { methodRaw: event.result.methodRaw } : {}),
      ...(event.result.round !== undefined ? { round: event.result.round } : {}),
    } } : {}),
  }
}

export function normalizeManualEvent(event: DailyEvent, revision = event.source.revision, at = nowIso()): DailyEvent {
  const contract = toManualContract(event, revision, at)
  const normalized = normalizeProviderContract(contract, (_provider, externalId) => event.id || `manual:${externalId}`)
  return {
    ...normalized,
    id: event.id,
    journeyId: event.journeyId,
    source: { ...normalized.source, sourceType: MANUAL_SOURCE_TYPE },
  }
}

function audit(event: DailyEvent, actor: string, reason: string, at: string): AuditEntry {
  return { eventId: event.id, before: null, after: event, actor, at, reason, source: MANUAL_SOURCE_TYPE, kind: 'manual', action: 'applied' }
}

export function createManualRecord(event: DailyEvent, actor = 'admin-demo', at = nowIso()): EventRecord {
  const normalized = normalizeManualEvent(event, 1, at)
  return { event: normalized, manualLock: false, audit: [audit(normalized, actor, 'Evento manual de demostracion restaurado.', at)] }
}

export function updateManualRecord(current: EventRecord, draft: DailyEvent, actor: string, reason: string, at = nowIso()): EventRecord {
  if (!reason.trim()) throw new Error('La edicion manual requiere un motivo.')
  const revision = current.event.source.revision + 1
  const normalized = normalizeManualEvent({ ...draft, source: { ...draft.source, revision } }, revision, at)
  return correctEvent(current, normalized, actor, reason, at)
}

export function confirmManualRecord(current: EventRecord, actor: string, reason: string, at = nowIso()): EventRecord {
  normalizeManualEvent(current.event, current.event.source.revision, at)
  return confirmEvent(current, actor, reason, at)
}

export function setManualLock(current: EventRecord, locked: boolean, actor: string, reason: string, at = nowIso()): EventRecord {
  if (!reason.trim()) throw new Error(locked ? 'El bloqueo requiere un motivo.' : 'El desbloqueo requiere un motivo explicito.')
  return {
    ...current,
    manualLock: locked,
    audit: [...current.audit, { eventId: current.event.id, before: current.event, after: current.event, actor, at, reason, source: MANUAL_SOURCE_TYPE, kind: 'manual', action: 'applied' }],
  }
}

export function simulateAutomaticUpdate(current: EventRecord, actor = 'provider:simulation', at = nowIso()): EventRecord {
  const incoming = normalizeManualEvent(current.event, current.event.source.revision + 1, at)
  const source = { ...incoming.source, sourceType: 'provider' as const, provider: current.event.source.provider, externalId: current.event.source.externalId }
  const updated = reconcileEvent(current, { ...incoming, source }, at)
  const latest = updated.audit.at(-1)
  if (latest) latest.actor = actor
  return updated
}

export function manualValidationMessage(event: DailyEvent): string | null {
  const validation = validateProviderContract(toManualContract(event))
  return validation.valid ? null : validation.errors.map(error => error.message).join(' ')
}

export function createManualEvent(sport: DailyEvent['sport'], journeyId: string, ordinal: number, at = nowIso()): DailyEvent {
  const id = `manual-new-${ordinal}`
  const base = {
    id, journeyId, competition: 'Laboratorio manual de desarrollo',
    participants: { home: { id: `${id}-home`, name: 'Participante local' }, away: { id: `${id}-away`, name: 'Participante visitante' } },
    scheduledStart: at, status: 'upcoming' as const, resultState: 'missing' as const,
    source: { sourceType: MANUAL_SOURCE_TYPE, provider: MANUAL_PROVIDER_ID, externalId: id, updatedAt: at, syncedAt: at, revision: 1, providerStatus: 'upcoming', payloadHash: `sha256:manual-${id}-r1`, externalParticipantIds: { home: `${id}-home`, away: `${id}-away` } },
  }
  if (sport === 'football') return { ...base, sport, format: { knockout: false } }
  if (sport === 'tennis') return { ...base, sport, format: { bestOf: 3 } }
  return { ...base, sport, format: { rounds: 10 } }
}

export function canCloseManualJourney(records: EventRecord[]) {
  return records.every(({ event }) => {
    if (event.status !== 'finished' || event.resultState !== 'confirmed' || !event.result) return false
    if (event.sport === 'boxing' && (event.result.outcome === 'draw' || event.result.outcome === 'no-contest' || !event.result.method)) return false
    return true
  })
}

export function sideName(side: Side) {
  return side === 'home' ? 'Local' : 'Visitante'
}

export { ProviderContractError }

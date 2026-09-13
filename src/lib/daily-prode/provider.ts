import type { DailyEvent, Sport } from './model'

export interface EventProvider<Payload> {
  id: string
  sports: Sport[]
  fetchEvents(from: string, to: string): Promise<Payload[]>
  normalize(payload: Payload, resolveId: (provider: string, externalId: string) => string): DailyEvent
}
export type AuditEntry = {
  eventId: string; before: DailyEvent | null; after: DailyEvent; actor: string; at: string
  reason: string; source: string; kind: 'manual' | 'automatic' | 'administrative_confirmation'; action: 'applied' | 'conflict'
}
export type EventRecord = { event: DailyEvent; manualLock: boolean; pending?: DailyEvent; audit: AuditEntry[] }

export function reconcileEvent(current: EventRecord | undefined, incoming: DailyEvent, at: string): EventRecord {
  const source = incoming.source
  if (!Number.isInteger(source.revision) || source.revision < 0 || !Number.isFinite(Date.parse(at)) || (source.payloadHash !== undefined && !source.payloadHash.trim())) throw new Error('Actualizacion invalida.')
  if (current) {
    if (current.event.id !== incoming.id || current.event.source.provider !== source.provider || current.event.source.externalId !== source.externalId || current.event.sport !== incoming.sport) throw new Error('La fuente requiere un mapeo de identidad verificado.')
    const revision = Math.max(current.event.source.revision, current.pending?.source.revision ?? -1)
    if (source.revision <= revision) {
      const sameRevision = [current.event, current.pending].find(event => event?.source.revision === source.revision)
      if (sameRevision?.source.payloadHash && source.payloadHash && sameRevision.source.payloadHash !== source.payloadHash) throw new Error('La revision duplicada tiene un payloadHash incompatible.')
      return current
    }
  }
  const next = { ...incoming, source: { ...source, syncedAt: at } } as DailyEvent
  const conflict = current?.manualLock === true
  const audit: AuditEntry = { eventId: incoming.id, before: current?.event ?? null, after: next, actor: `provider:${source.provider}`, at, reason: conflict ? 'Correccion manual protegida; requiere revision.' : 'Sincronizacion de fuente.', source: source.provider, kind: 'automatic', action: conflict ? 'conflict' : 'applied' }
  return { event: conflict ? current.event : next, manualLock: conflict, pending: conflict ? next : undefined, audit: [...(current?.audit ?? []), audit] }
}
export function correctEvent(current: EventRecord, next: DailyEvent, actor: string, reason: string, at: string): EventRecord {
  if (!actor.trim() || !reason.trim() || !Number.isFinite(Date.parse(at)) || current.event.id !== next.id || current.event.sport !== next.sport || current.event.source.provider !== next.source.provider || current.event.source.externalId !== next.source.externalId || current.event.source.sourceType !== next.source.sourceType) throw new Error('La correccion requiere identidad, autor, motivo y fecha validos.')
  return { ...current, event: next, manualLock: true, audit: [...current.audit, { eventId: next.id, before: current.event, after: next, actor, reason, at, source: 'administration', kind: 'manual', action: 'applied' }] }
}

export function confirmEvent(current: EventRecord, actor: string, reason: string, at: string): EventRecord {
  if (!current.event.result || !actor.trim() || !reason.trim() || !Number.isFinite(Date.parse(at))) throw new Error('La confirmacion requiere resultado, autor, motivo y fecha validos.')
  const next = { ...current.event, resultState: 'confirmed' } as DailyEvent
  return {
    ...current,
    event: next,
    manualLock: true,
    audit: [...current.audit, { eventId: next.id, before: current.event, after: next, actor, reason, at, source: 'administration', kind: 'administrative_confirmation', action: 'applied' }],
  }
}

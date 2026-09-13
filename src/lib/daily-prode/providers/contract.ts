import type { DailyEvent, EventStatus, ScorePair, Side, TennisSet } from '../model'

export const SYNTHETIC_FIXTURE_ORIGIN = 'synthetic fixture — not supplied by provider'

export type ProviderStatus = EventStatus | 'retired' | 'walkover'
export type ContractError = { field: string; message: string }
export type ContractValidation = { valid: boolean; errors: ContractError[] }

type ProviderBase = {
  fixtureOrigin?: typeof SYNTHETIC_FIXTURE_ORIGIN
  provider: string
  externalEventId: string
  externalCompetitionId?: string
  externalSeasonId?: string
  externalSeriesId?: string
  externalParticipantIds: { home: string; away: string }
  competition: string
  participants: { home: { id: string; name: string }; away: { id: string; name: string } }
  providerStatus: string
  scheduledAt: string
  startedAt?: string
  receivedAt: string
  providerUpdatedAt: string
  revision: number
  payloadHash: string
  replacementEventId?: string
}

export type FootballContractEvent = ProviderBase & {
  sport: 'football'
  format: { knockout: boolean; leg?: 'single' | 'return'; legNumber?: number; requiresResolution?: boolean; aggregateScore?: ScorePair }
  result?: {
    scoreAt90?: ScorePair
    extraTimeScore?: ScorePair
    penaltyScore?: ScorePair
    winner?: Side
    qualifier?: { side: Side; evidence: 'explicit' | 'inferred' }
    resolution?: 'regular' | 'extra-time' | 'penalties'
    penaltyIncludedInScoreAt90?: boolean
  }
}

export type TennisContractEvent = ProviderBase & {
  sport: 'tennis'
  format: { bestOf: 3 | 5 }
  result?: {
    outcome: 'pending' | 'completed' | 'retired' | 'walkover' | 'suspended' | 'cancelled' | 'rescheduled' | 'corrected'
    winner?: Side
    sets?: TennisSet[]
  }
}

export type BoxingContractEvent = ProviderBase & {
  sport: 'boxing'
  format: { rounds: number }
  result?: {
    outcome: Side | 'draw' | 'no-contest' | 'pending' | 'void' | 'suspended' | 'rescheduled'
    methodRaw?: string
    method?: 'ko' | 'tko' | 'decision'
    round?: number
  }
}

export type ProviderContractEvent = FootballContractEvent | TennisContractEvent | BoxingContractEvent

export class ProviderContractError extends Error {
  constructor(readonly errors: ContractError[]) {
    super(errors.map(error => error.field + ': ' + error.message).join(' '))
    this.name = 'ProviderContractError'
  }
}

const PROVIDER_STATUSES = new Set<ProviderStatus>(['upcoming', 'live', 'finished', 'suspended', 'cancelled', 'rescheduled', 'void', 'review', 'retired', 'walkover'])
const SIDES = new Set<Side>(['home', 'away'])

function isDate(value: string | undefined) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
}

function validScore(score: ScorePair | undefined) {
  return !!score && Number.isInteger(score.home) && score.home >= 0 && Number.isInteger(score.away) && score.away >= 0
}

function errorsForBase(event: ProviderContractEvent) {
  const errors: ContractError[] = []
  if (event.fixtureOrigin !== undefined && event.fixtureOrigin !== SYNTHETIC_FIXTURE_ORIGIN) errors.push({ field: 'fixtureOrigin', message: 'El fixture debe declarar el origen sintetico exacto.' })
  if (!event.provider.trim()) errors.push({ field: 'provider', message: 'El proveedor es obligatorio.' })
  if (!event.externalEventId.trim()) errors.push({ field: 'externalEventId', message: 'El ID externo es obligatorio.' })
  if (!event.externalParticipantIds.home.trim() || !event.externalParticipantIds.away.trim()) errors.push({ field: 'externalParticipantIds', message: 'Cada participante debe conservar su ID externo.' })
  if (!event.participants.home.id.trim() || !event.participants.away.id.trim()) errors.push({ field: 'participants', message: 'Cada participante debe tener un ID interno resuelto.' })
  if (!event.competition.trim()) errors.push({ field: 'competition', message: 'La competencia es obligatoria.' })
  if (!PROVIDER_STATUSES.has(event.providerStatus as ProviderStatus)) errors.push({ field: 'providerStatus', message: 'Estado de proveedor desconocido: ' + event.providerStatus + '.' })
  if (!isDate(event.scheduledAt) || !isDate(event.receivedAt) || !isDate(event.providerUpdatedAt) || (event.startedAt !== undefined && !isDate(event.startedAt))) errors.push({ field: 'timestamps', message: 'scheduledAt, receivedAt, providerUpdatedAt y startedAt deben ser fechas UTC validas.' })
  if (!Number.isInteger(event.revision) || event.revision < 0) errors.push({ field: 'revision', message: 'La revision debe ser un entero no negativo.' })
  if (!event.payloadHash.trim()) errors.push({ field: 'payloadHash', message: 'El hash del payload es obligatorio.' })
  return errors
}

function errorsForFootball(event: FootballContractEvent) {
  const errors: ContractError[] = []
  const result = event.result
  if (event.format.legNumber !== undefined && (!Number.isInteger(event.format.legNumber) || event.format.legNumber < 1)) errors.push({ field: 'legNumber', message: 'El numero de partido de la serie debe ser positivo.' })
  if (event.format.aggregateScore && !validScore(event.format.aggregateScore)) errors.push({ field: 'aggregateScore', message: 'El marcador agregado es invalido.' })
  if (!result) return errors
  if (result.scoreAt90 && !validScore(result.scoreAt90)) errors.push({ field: 'scoreAt90', message: 'El marcador a 90 minutos es invalido.' })
  if (result.extraTimeScore && !validScore(result.extraTimeScore)) errors.push({ field: 'extraTimeScore', message: 'El marcador de alargue es invalido.' })
  if (result.penaltyScore && !validScore(result.penaltyScore)) errors.push({ field: 'penaltyScore', message: 'La tanda de penales es invalida.' })
  if (result.penaltyScore && result.extraTimeScore && result.extraTimeScore.home !== result.extraTimeScore.away) errors.push({ field: 'penaltyScore', message: 'No puede existir tanda si el alargue ya tiene un ganador.' })
  if (result.penaltyIncludedInScoreAt90) errors.push({ field: 'scoreAt90', message: 'Los penales no pueden mezclarse con el marcador a 90 minutos.' })
  if (result.winner !== undefined && !SIDES.has(result.winner)) errors.push({ field: 'winner', message: 'El ganador debe ser local o visitante.' })
  if (result.qualifier?.evidence === 'inferred') errors.push({ field: 'qualifier', message: 'El clasificado requiere evidencia explicita; no puede inferirse.' })
  if (result.qualifier && !SIDES.has(result.qualifier.side)) errors.push({ field: 'qualifier', message: 'El clasificado debe identificar un participante valido.' })
  if (event.providerStatus === 'finished' && !result.scoreAt90) errors.push({ field: 'scoreAt90', message: 'Un partido finalizado requiere marcador a 90 minutos.' })
  if (event.format.knockout && event.format.requiresResolution && event.providerStatus === 'finished' && !result.qualifier) errors.push({ field: 'qualifier', message: 'La eliminatoria requiere un clasificado explicito.' })
  return errors
}

function errorsForTennis(event: TennisContractEvent) {
  const errors: ContractError[] = []
  const result = event.result
  if (!result) return errors
  const needed = Math.ceil(event.format.bestOf / 2)
  if (result.sets?.length && result.sets.length > event.format.bestOf) errors.push({ field: 'sets', message: 'Hay mas sets que el formato permitido.' })
  result.sets?.forEach((set, index) => {
    if (!validScore(set)) errors.push({ field: 'sets[' + index + ']', message: 'El set es invalido.' })
    if (set.home === set.away) errors.push({ field: 'sets[' + index + ']', message: 'Un set finalizado no puede quedar empatado.' })
    if (set.tiebreak && !validScore(set.tiebreak)) errors.push({ field: 'sets[' + index + '].tiebreak', message: 'El tiebreak es invalido.' })
  })
  if (result.outcome === 'completed') {
    if (!result.winner || !SIDES.has(result.winner)) errors.push({ field: 'winner', message: 'Un resultado de tenis finalizado requiere ganador.' })
    if (!result.sets?.length) errors.push({ field: 'sets', message: 'Un resultado de tenis finalizado requiere sets detallados.' })
    if (result.sets?.length) {
      const homeWins = result.sets.filter(set => set.home > set.away).length
      const awayWins = result.sets.length - homeWins
      const winnerWins = result.winner === 'home' ? homeWins : awayWins
      if (winnerWins !== needed) errors.push({ field: 'sets', message: 'Los sets no coinciden con el formato ni el ganador declarado.' })
    }
  }
  if (['retired', 'walkover', 'suspended', 'cancelled', 'rescheduled'].includes(result.outcome) && result.winner) errors.push({ field: 'winner', message: 'Un resultado excepcional no se normaliza como victoria puntuable.' })
  return errors
}

function errorsForBoxing(event: BoxingContractEvent) {
  const errors: ContractError[] = []
  const result = event.result
  if (!Number.isInteger(event.format.rounds) || event.format.rounds < 1) errors.push({ field: 'rounds', message: 'La cantidad de rounds pactados es invalida.' })
  if (!result) return errors
  if (SIDES.has(result.outcome as Side)) {
    if (!result.method) errors.push({ field: 'method', message: 'Una victoria requiere metodo estructurado.' })
    if ((result.method === 'ko' || result.method === 'tko') && (!Number.isInteger(result.round) || result.round! < 1 || result.round! > event.format.rounds)) errors.push({ field: 'round', message: 'KO/TKO requiere un round valido.' })
    if (result.method === 'decision' && result.round !== undefined) errors.push({ field: 'round', message: 'Una decision no puede inventar un round de finalizacion.' })
  } else if (['draw', 'no-contest', 'pending', 'void', 'suspended', 'rescheduled'].includes(result.outcome)) {
    if (result.method || result.round !== undefined) errors.push({ field: 'result', message: 'Un resultado excepcional no puede declarar metodo ni round puntuable.' })
  } else errors.push({ field: 'outcome', message: 'El resultado de boxeo es desconocido.' })
  return errors
}

export function validateProviderContract(event: ProviderContractEvent): ContractValidation {
  const errors = errorsForBase(event)
  if (event.sport === 'football') errors.push(...errorsForFootball(event))
  if (event.sport === 'tennis') errors.push(...errorsForTennis(event))
  if (event.sport === 'boxing') errors.push(...errorsForBoxing(event))
  return { valid: errors.length === 0, errors }
}

function statusFromProvider(status: string): EventStatus {
  return status === 'retired' || status === 'walkover' ? 'review' : status as EventStatus
}

function resultState(status: string, hasResult: boolean): DailyEvent['resultState'] {
  if (status === 'live') return 'partial'
  if (status === 'finished' && hasResult) return 'confirmed'
  if (['retired', 'walkover', 'suspended', 'cancelled', 'rescheduled', 'void', 'review'].includes(status)) return 'review'
  return 'missing'
}

function tennisResult(event: TennisContractEvent) {
  const result = event.result
  if (!result || result.outcome !== 'completed' || !result.winner || !result.sets) return undefined
  const loserSets = result.sets.filter(set => result.winner === 'home' ? set.away > set.home : set.home > set.away).length
  const tiebreaks = result.sets.flatMap((set, index) => set.tiebreak ? [{ set: index + 1, score: set.tiebreak }] : [])
  return { sport: 'tennis' as const, winner: result.winner, loserSets, sets: result.sets, ...(tiebreaks.length ? { tiebreaks } : {}) }
}

export function normalizeProviderContract(event: ProviderContractEvent, resolveId: (provider: string, externalId: string) => string): DailyEvent {
  const validation = validateProviderContract(event)
  if (!validation.valid) throw new ProviderContractError(validation.errors)
  const status = statusFromProvider(event.providerStatus)
  const source = {
    provider: event.provider,
    externalId: event.externalEventId,
    updatedAt: event.providerUpdatedAt,
    syncedAt: event.receivedAt,
    revision: event.revision,
    ...(event.externalCompetitionId ? { externalCompetitionId: event.externalCompetitionId } : {}),
    ...(event.externalSeasonId ? { externalSeasonId: event.externalSeasonId } : {}),
    ...(event.externalSeriesId ? { externalSeriesId: event.externalSeriesId } : {}),
    externalParticipantIds: event.externalParticipantIds,
    providerStatus: event.providerStatus,
    payloadHash: event.payloadHash,
    ...(event.replacementEventId ? { replacementEventId: event.replacementEventId } : {}),
  }
  const base = {
    id: resolveId(event.provider, event.externalEventId), journeyId: 'synthetic-contract', competition: event.competition,
    participants: event.participants, scheduledStart: event.scheduledAt, ...(event.startedAt ? { actualStart: event.startedAt } : {}), status, source,
  }
  if (event.sport === 'football') {
    const result = event.result?.scoreAt90 ? {
      sport: 'football' as const, scoreAt90: event.result.scoreAt90,
      ...(event.result.extraTimeScore ? { extraTimeScore: event.result.extraTimeScore } : {}),
      ...(event.result.penaltyScore ? { penaltyScore: event.result.penaltyScore } : {}),
      ...(event.result.qualifier ? { qualifier: event.result.qualifier.side } : {}),
      ...(event.result.resolution ? { resolution: event.result.resolution } : {}),
    } : undefined
    return { ...base, sport: 'football', format: event.format, resultState: resultState(event.providerStatus, !!result), ...(result ? { result } : {}) }
  }
  if (event.sport === 'tennis') {
    const result = tennisResult(event)
    return { ...base, sport: 'tennis', format: event.format, resultState: resultState(event.providerStatus, !!result), ...(result ? { result } : {}) }
  }
  const boxing = event.result
  const result = boxing && boxing.outcome !== 'pending' && boxing.outcome !== 'void' && boxing.outcome !== 'suspended' && boxing.outcome !== 'rescheduled' ? {
    sport: 'boxing' as const, outcome: boxing.outcome,
    ...(boxing.method ? { method: boxing.method === 'decision' ? 'decision' as const : 'ko' as const, methodDetail: boxing.method, methodRaw: boxing.methodRaw ?? boxing.method.toUpperCase() } : {}),
    ...(boxing.round !== undefined ? { round: boxing.round } : {}),
  } : undefined
  return { ...base, sport: 'boxing', format: event.format, resultState: resultState(event.providerStatus, !!result), ...(result ? { result } : {}) }
}

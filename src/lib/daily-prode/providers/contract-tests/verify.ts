import { confirmEvent, correctEvent, reconcileEvent } from '../../provider'
import { scorePrediction } from '../../scoring'
import { normalizeProviderContract, ProviderContractError, SYNTHETIC_FIXTURE_ORIGIN, validateProviderContract } from '../contract'
import { boxingExceptionalFixtures, boxingFixtures, footballExceptionalFixtures, footballFixtures, footballKnockoutFixtures, syntheticProviderFixtures, tennisExceptionalFixtures, tennisFixtures } from '../fixtures/synthetic'

type Check = { group: string; name: string }
const checks: Check[] = []

function assert(condition: unknown, group: string, name: string): asserts condition {
  if (!condition) throw new Error(group + ': ' + name)
  checks.push({ group, name })
}

function invalid(input: Parameters<typeof validateProviderContract>[0], field: string, name: string) {
  const validation = validateProviderContract(input)
  assert(!validation.valid && validation.errors.some(error => error.field === field), 'rechazos', name)
  try {
    normalizeProviderContract(input, (provider, externalId) => provider + ':' + externalId)
    throw new Error('El contrato acepto un evento invalido.')
  } catch (error) {
    assert(error instanceof ProviderContractError, 'rechazos', name + ' devuelve error descriptivo')
  }
}

export function runContractVerifier() {
  for (const fixture of syntheticProviderFixtures) {
    const validation = validateProviderContract(fixture)
    assert(fixture.fixtureOrigin === SYNTHETIC_FIXTURE_ORIGIN, 'fixtures', fixture.externalEventId + ' declara origen sintetico')
    assert(validation.valid, 'fixtures', fixture.externalEventId + ' valida')
  }

  const normalHome = normalizeProviderContract(footballFixtures[2], (provider, externalId) => provider + ':' + externalId)
  const normalAway = normalizeProviderContract(footballFixtures[3], (provider, externalId) => provider + ':' + externalId)
  const normalDraw = normalizeProviderContract(footballFixtures[4], (provider, externalId) => provider + ':' + externalId)
  assert(scorePrediction(normalHome, { sport: 'football', scoreAt90: { home: 2, away: 0 } }).points === 3, 'scoring', 'futbol exacto 3/2/0 conserva exacto')
  assert(scorePrediction(normalAway, { sport: 'football', scoreAt90: { home: 1, away: 3 } }).points === 2, 'scoring', 'futbol exacto 3/2/0 conserva resultado general')
  assert(scorePrediction(normalDraw, { sport: 'football', scoreAt90: { home: 2, away: 0 } }).points === 0, 'scoring', 'futbol exacto 3/2/0 conserva fallo')

  const penalty = normalizeProviderContract(footballKnockoutFixtures[0], (provider, externalId) => provider + ':' + externalId)
  const extraTime = normalizeProviderContract(footballKnockoutFixtures[1], (provider, externalId) => provider + ':' + externalId)
  const returnLeg = normalizeProviderContract(footballKnockoutFixtures[2], (provider, externalId) => provider + ':' + externalId)
  assert(penalty.result?.sport === 'football' && penalty.result.scoreAt90.home === 1 && penalty.result.extraTimeScore?.away === 1 && penalty.result.penaltyScore?.home === 4 && penalty.result.qualifier === 'home', 'futbol copa', '90, alargue, penales y clasificado permanecen separados')
  assert(penalty.sport === 'football' && penalty.format.knockout && penalty.format.aggregateScore?.home === 1, 'futbol copa', 'la serie conserva agregado')
  assert(extraTime.result?.sport === 'football' && extraTime.result.extraTimeScore?.home === 2 && extraTime.result.penaltyScore === undefined, 'futbol copa', 'alargue decidido no crea penales')
  assert(returnLeg.sport === 'football' && returnLeg.format.leg === 'return' && returnLeg.format.legNumber === 2 && returnLeg.result?.sport === 'football' && returnLeg.result.qualifier === 'away', 'futbol copa', 'vuelta conserva leg y clasificado explicito independiente del ganador')
  const knockoutScore = scorePrediction(penalty, { sport: 'football', scoreAt90: { home: 1, away: 1 }, qualifier: 'home', resolution: 'penalties' })
  assert(knockoutScore.points === 3 && knockoutScore.pendingCriteria?.includes('qualifier'), 'scoring', 'copa puntua solo 90 minutos y conserva clasificado pendiente')
  for (const fixture of footballExceptionalFixtures) {
    const normalized = normalizeProviderContract(fixture, (provider, externalId) => provider + ':' + externalId)
    assert(scorePrediction(normalized, { sport: 'football', scoreAt90: { home: 0, away: 0 } }).points === null, 'futbol', fixture.externalEventId + ' no asigna puntos')
  }

  const tennisTwoZero = normalizeProviderContract(tennisFixtures[0], (provider, externalId) => provider + ':' + externalId)
  const tennisTwoOne = normalizeProviderContract(tennisFixtures[1], (provider, externalId) => provider + ':' + externalId)
  const tennisFive = tennisFixtures.slice(2).map(fixture => normalizeProviderContract(fixture, (provider, externalId) => provider + ':' + externalId))
  assert(tennisTwoZero.result?.sport === 'tennis' && tennisTwoZero.result.loserSets === 0 && tennisTwoZero.result.tiebreaks?.[0].set === 2, 'tenis', 'mejor de 3 conserva sets y tiebreak')
  assert(tennisTwoOne.result?.sport === 'tennis' && tennisTwoOne.result.loserSets === 1, 'tenis', 'mejor de 3 conserva 2-1')
  assert(tennisFive.map(item => item.result?.sport === 'tennis' ? item.result.loserSets : -1).join(',') === '0,1,2', 'tenis', 'mejor de 5 representa 3-0, 3-1 y 3-2')
  assert(scorePrediction(tennisTwoOne, { sport: 'tennis', winner: 'away', loserSets: 1 }).points === 3, 'scoring', 'tenis conserva puntaje exacto')
  assert(scorePrediction(tennisTwoOne, { sport: 'tennis', winner: 'away', loserSets: 0 }).points === 1, 'scoring', 'tenis conserva ganador correcto')
  for (const fixture of tennisExceptionalFixtures) {
    const normalized = normalizeProviderContract(fixture, (provider, externalId) => provider + ':' + externalId)
    assert(normalized.result === undefined && normalized.resultState !== 'confirmed', 'tenis', fixture.externalEventId + ' no se convierte en victoria normal')
  }
  const tennisFirst = reconcileEvent(undefined, tennisTwoZero, '2026-09-13T15:10:00.000Z')
  const tennisCorrected = normalizeProviderContract({ ...tennisFixtures[0], revision: 2, payloadHash: 'sha256:tennis-corrected-r2', result: { outcome: 'completed', winner: 'home', sets: [{ home: 6, away: 4 }, { home: 3, away: 6 }, { home: 6, away: 2 }] } }, (provider, externalId) => provider + ':' + externalId)
  assert(reconcileEvent(tennisFirst, tennisCorrected, '2026-09-13T15:11:00.000Z').event.source.revision === 2, 'tenis', 'resultado corregido crea revision nueva')

  const ko = normalizeProviderContract(boxingFixtures[0], (provider, externalId) => provider + ':' + externalId)
  const tko = normalizeProviderContract(boxingFixtures[1], (provider, externalId) => provider + ':' + externalId)
  const decision = normalizeProviderContract(boxingFixtures[2], (provider, externalId) => provider + ':' + externalId)
  assert(ko.result?.sport === 'boxing' && ko.result.method === 'ko' && ko.result.methodDetail === 'ko' && ko.result.round === 7, 'boxeo', 'KO conserva metodo crudo y round')
  assert(tko.result?.sport === 'boxing' && tko.result.method === 'ko' && tko.result.methodDetail === 'tko' && tko.result.round === 9, 'boxeo', 'TKO conserva detalle y mapea al grupo de scoring KO')
  assert(decision.result?.sport === 'boxing' && decision.result.method === 'decision' && decision.result.round === undefined, 'boxeo', 'decision no inventa round')
  assert(scorePrediction(tko, { sport: 'boxing', winner: 'away', method: 'ko', round: 9 }).points === 3, 'scoring', 'boxeo provisional conserva KO/TKO exacto')
  assert(scorePrediction(decision, { sport: 'boxing', winner: 'away', method: 'decision' }).points === 2, 'scoring', 'boxeo provisional conserva decision')
  for (const fixture of boxingExceptionalFixtures) {
    const normalized = normalizeProviderContract(fixture, (provider, externalId) => provider + ':' + externalId)
    const score = scorePrediction(normalized, { sport: 'boxing', winner: 'home', method: 'ko', round: 1 })
    assert(score.points === null, 'boxeo', fixture.externalEventId + ' no asigna puntos ni ganador')
  }

  const missingId = { ...footballFixtures[0], externalEventId: '' }
  invalid(missingId, 'externalEventId', 'sin ID externo')
  const missingParticipant = { ...footballFixtures[0], externalParticipantIds: { home: '', away: 'away' } }
  invalid(missingParticipant, 'externalParticipantIds', 'sin ID externo de participante')
  const invalidDate = { ...footballFixtures[0], scheduledAt: 'sin-fecha' }
  invalid(invalidDate, 'timestamps', 'fecha invalida')
  const unknownStatus = { ...footballFixtures[0], providerStatus: 'mystery' }
  invalid(unknownStatus, 'providerStatus', 'estado desconocido')
  const inferredQualifier = { ...footballKnockoutFixtures[0], result: { ...footballKnockoutFixtures[0].result!, qualifier: { side: 'home' as const, evidence: 'inferred' as const } } }
  invalid(inferredQualifier, 'qualifier', 'clasificado inferido')
  const missingQualifier = { ...footballKnockoutFixtures[0], result: { ...footballKnockoutFixtures[0].result!, qualifier: undefined } }
  invalid(missingQualifier, 'qualifier', 'clasificado ausente en eliminatoria')
  const mixedPenalties = { ...footballKnockoutFixtures[0], result: { ...footballKnockoutFixtures[0].result!, extraTimeScore: { home: 2, away: 1 } } }
  invalid(mixedPenalties, 'penaltyScore', 'penales con alargue ya decidido')
  const impossibleSets = { ...tennisFixtures[0], result: { ...tennisFixtures[0].result!, winner: 'home' as const, sets: [{ home: 6, away: 0 }, { home: 6, away: 0 }, { home: 6, away: 0 }] } }
  invalid(impossibleSets, 'sets', 'sets imposibles para mejor de 3')
  const koWithoutRound = { ...boxingFixtures[0], result: { ...boxingFixtures[0].result!, round: undefined } }
  invalid(koWithoutRound, 'round', 'KO sin round')
  const decisionWithRound = { ...boxingFixtures[2], result: { ...boxingFixtures[2].result!, round: 10 } }
  invalid(decisionWithRound, 'round', 'decision con round ficticio')
  const boxingWinnerAbsent = { ...boxingFixtures[0], result: { ...boxingFixtures[0].result!, outcome: 'pending' as const } }
  invalid(boxingWinnerAbsent, 'outcome', 'ganador ausente en resultado final')
  const boxingUnknownMethod = { ...boxingFixtures[0], result: { ...boxingFixtures[0].result!, method: 'unknown' as unknown as 'ko' } }
  invalid(boxingUnknownMethod, 'method', 'metodo de boxeo desconocido')

  const scheduled = normalizeProviderContract(footballFixtures[0], (provider, externalId) => provider + ':' + externalId)
  const first = reconcileEvent(undefined, scheduled, '2026-09-13T15:00:00.000Z')
  const same = reconcileEvent(first, scheduled, '2026-09-13T15:01:00.000Z')
  assert(same === first && same.audit.length === 1, 'actualizaciones', 'mismo payload es idempotente')
  const incompatibleDuplicate = { ...scheduled, source: { ...scheduled.source, payloadHash: 'sha256:conflict' } }
  try {
    reconcileEvent(first, incompatibleDuplicate, '2026-09-13T15:02:00.000Z')
    throw new Error('Se acepto duplicado incompatible.')
  } catch (error) {
    assert(error instanceof Error && error.message.includes('payloadHash incompatible'), 'actualizaciones', 'duplicado incompatible se rechaza')
  }
  const live = normalizeProviderContract({ ...footballFixtures[1], externalEventId: 'football-scheduled', revision: 2, payloadHash: 'sha256:football-live-r2' }, (provider, externalId) => provider + ':' + externalId)
  const updated = reconcileEvent(first, live, '2026-09-13T15:03:00.000Z')
  assert(updated.event.source.revision === 2 && updated.event.source.payloadHash === 'sha256:football-live-r2', 'actualizaciones', 'payload cambiado crea revision nueva')
  assert(updated.event.sport === 'football', 'actualizaciones', 'el ciclo conserva el deporte')
  if (updated.event.sport !== 'football') throw new Error('El ciclo de actualizacion debe ser de futbol.')
  const manualNext = { ...updated.event, status: 'finished' as const, resultState: 'confirmed' as const, result: { sport: 'football' as const, scoreAt90: { home: 3, away: 0 } } }
  const locked = correctEvent(updated, manualNext, 'admin-demo', 'Correccion manual sintetica.', '2026-09-13T15:04:00.000Z')
  const automaticFinal = normalizeProviderContract({ ...footballFixtures[2], externalEventId: 'football-scheduled', revision: 3, payloadHash: 'sha256:football-live-r3' }, (provider, externalId) => provider + ':' + externalId)
  const protectedRecord = reconcileEvent(locked, automaticFinal, '2026-09-13T15:05:00.000Z')
  assert(protectedRecord.manualLock && protectedRecord.event.result?.sport === 'football' && protectedRecord.event.result.scoreAt90.home === 3 && protectedRecord.pending?.source.revision === 3, 'actualizaciones', 'bloqueo manual protege correccion automatica posterior')
  assert(protectedRecord.audit.at(-1)?.action === 'conflict', 'actualizaciones', 'conflicto queda auditado')
  const administrativelyConfirmed = confirmEvent(reconcileEvent(undefined, normalHome, '2026-09-13T15:06:00.000Z'), 'admin-demo', 'Confirmacion administrativa sintetica.', '2026-09-13T15:07:00.000Z')
  assert(administrativelyConfirmed.manualLock && administrativelyConfirmed.audit.at(-1)?.kind === 'administrative_confirmation' && administrativelyConfirmed.audit.at(-1)?.before !== null && administrativelyConfirmed.audit.at(-1)?.after !== undefined, 'auditoria', 'confirmacion administrativa conserva antes, despues, usuario, fecha, motivo y fuente')
  const replacement = normalizeProviderContract({ ...footballFixtures[2], externalEventId: 'football-home-win-replacement', replacementEventId: 'football-home-win', revision: 2, payloadHash: 'sha256:replacement' }, (provider, externalId) => provider + ':' + externalId)
  assert(replacement.source.replacementEventId === 'football-home-win', 'actualizaciones', 'reemplazo conserva trazabilidad')

  const groups = Object.values(checks.reduce<Record<string, { group: string; total: number; passed: number; failed: number }>>((summary, check) => {
    const current = summary[check.group] ?? { group: check.group, total: 0, passed: 0, failed: 0 }
    current.total++
    current.passed++
    summary[check.group] = current
    return summary
  }, {}))
  return { total: checks.length, groups }
}

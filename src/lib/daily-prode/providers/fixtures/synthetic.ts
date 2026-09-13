import type { BoxingContractEvent, FootballContractEvent, ProviderContractEvent, TennisContractEvent } from '../contract'
import { SYNTHETIC_FIXTURE_ORIGIN } from '../contract'

const RECEIVED_AT = '2026-09-13T15:00:00.000Z'

function base(id: string, providerStatus: string) {
  return {
    fixtureOrigin: SYNTHETIC_FIXTURE_ORIGIN as typeof SYNTHETIC_FIXTURE_ORIGIN,
    provider: 'synthetic-provider', externalEventId: id, externalCompetitionId: 'competition-2026', externalSeasonId: 'season-2026',
    externalParticipantIds: { home: id + '-home', away: id + '-away' }, competition: 'Synthetic competition',
    participants: { home: { id: 'internal-' + id + '-home', name: 'Home ' + id }, away: { id: 'internal-' + id + '-away', name: 'Away ' + id } },
    providerStatus, scheduledAt: '2026-09-13T14:00:00.000Z', receivedAt: RECEIVED_AT, providerUpdatedAt: RECEIVED_AT,
    revision: 1, payloadHash: 'sha256:synthetic-' + id + '-r1',
  }
}

export const footballFixtures: FootballContractEvent[] = [
  { ...base('football-scheduled', 'upcoming'), sport: 'football', format: { knockout: false } },
  { ...base('football-live', 'live'), sport: 'football', startedAt: '2026-09-13T14:03:00.000Z', format: { knockout: false }, result: { scoreAt90: { home: 1, away: 0 } } },
  { ...base('football-home-win', 'finished'), sport: 'football', format: { knockout: false }, result: { scoreAt90: { home: 2, away: 0 }, winner: 'home', resolution: 'regular' } },
  { ...base('football-away-win', 'finished'), sport: 'football', format: { knockout: false }, result: { scoreAt90: { home: 0, away: 2 }, winner: 'away', resolution: 'regular' } },
  { ...base('football-draw', 'finished'), sport: 'football', format: { knockout: false }, result: { scoreAt90: { home: 1, away: 1 }, resolution: 'regular' } },
]

export const footballKnockoutFixtures: FootballContractEvent[] = [
  {
    ...base('cup-single-penalties', 'finished'), sport: 'football', externalSeriesId: 'series-single-1',
    format: { knockout: true, leg: 'single', legNumber: 1, requiresResolution: true, aggregateScore: { home: 1, away: 1 } },
    result: { scoreAt90: { home: 1, away: 1 }, extraTimeScore: { home: 1, away: 1 }, penaltyScore: { home: 4, away: 3 }, winner: 'home', qualifier: { side: 'home', evidence: 'explicit' }, resolution: 'penalties' },
  },
  {
    ...base('cup-single-extra-time', 'finished'), sport: 'football', externalSeriesId: 'series-single-2',
    format: { knockout: true, leg: 'single', legNumber: 1, requiresResolution: true, aggregateScore: { home: 2, away: 1 } },
    result: { scoreAt90: { home: 1, away: 1 }, extraTimeScore: { home: 2, away: 1 }, winner: 'home', qualifier: { side: 'home', evidence: 'explicit' }, resolution: 'extra-time' },
  },
  {
    ...base('cup-return', 'finished'), sport: 'football', externalSeriesId: 'series-return-1',
    format: { knockout: true, leg: 'return', legNumber: 2, requiresResolution: true, aggregateScore: { home: 2, away: 3 } },
    result: { scoreAt90: { home: 1, away: 0 }, winner: 'home', qualifier: { side: 'away', evidence: 'explicit' }, resolution: 'regular' },
  },
]

export const footballExceptionalFixtures: FootballContractEvent[] = [
  { ...base('football-cancelled', 'cancelled'), sport: 'football', format: { knockout: false } },
  { ...base('football-rescheduled', 'rescheduled'), sport: 'football', format: { knockout: false } },
]

export const tennisFixtures: TennisContractEvent[] = [
  {
    ...base('tennis-best-of-three-2-0', 'finished'), sport: 'tennis', format: { bestOf: 3 },
    result: { outcome: 'completed', winner: 'home', sets: [{ home: 6, away: 4 }, { home: 7, away: 6, tiebreak: { home: 7, away: 5 } }] },
  },
  {
    ...base('tennis-best-of-three-2-1', 'finished'), sport: 'tennis', format: { bestOf: 3 },
    result: { outcome: 'completed', winner: 'away', sets: [{ home: 6, away: 2 }, { home: 3, away: 6 }, { home: 4, away: 6 }] },
  },
  {
    ...base('tennis-best-of-five-3-0', 'finished'), sport: 'tennis', format: { bestOf: 5 },
    result: { outcome: 'completed', winner: 'home', sets: [{ home: 6, away: 4 }, { home: 6, away: 3 }, { home: 7, away: 6, tiebreak: { home: 10, away: 8 } }] },
  },
  {
    ...base('tennis-best-of-five-3-1', 'finished'), sport: 'tennis', format: { bestOf: 5 },
    result: { outcome: 'completed', winner: 'away', sets: [{ home: 6, away: 4 }, { home: 4, away: 6 }, { home: 1, away: 6 }, { home: 2, away: 6 }] },
  },
  {
    ...base('tennis-best-of-five-3-2', 'finished'), sport: 'tennis', format: { bestOf: 5 },
    result: { outcome: 'completed', winner: 'home', sets: [{ home: 6, away: 4 }, { home: 3, away: 6 }, { home: 6, away: 2 }, { home: 4, away: 6 }, { home: 7, away: 6, tiebreak: { home: 7, away: 3 } }] },
  },
]

export const tennisExceptionalFixtures: TennisContractEvent[] = [
  { ...base('tennis-live-partial', 'live'), sport: 'tennis', format: { bestOf: 3 }, result: { outcome: 'pending', sets: [{ home: 6, away: 4 }, { home: 2, away: 3 }] } },
  { ...base('tennis-retired', 'retired'), sport: 'tennis', format: { bestOf: 3 }, result: { outcome: 'retired', sets: [{ home: 6, away: 3 }] } },
  { ...base('tennis-walkover', 'walkover'), sport: 'tennis', format: { bestOf: 3 }, result: { outcome: 'walkover' } },
  { ...base('tennis-suspended', 'suspended'), sport: 'tennis', format: { bestOf: 3 }, result: { outcome: 'suspended' } },
  { ...base('tennis-cancelled', 'cancelled'), sport: 'tennis', format: { bestOf: 3 }, result: { outcome: 'cancelled' } },
  { ...base('tennis-rescheduled', 'rescheduled'), sport: 'tennis', format: { bestOf: 3 }, result: { outcome: 'rescheduled' } },
]

export const boxingFixtures: BoxingContractEvent[] = [
  { ...base('boxing-ko', 'finished'), sport: 'boxing', format: { rounds: 12 }, result: { outcome: 'home', method: 'ko', methodRaw: 'Knockout', round: 7 } },
  { ...base('boxing-tko', 'finished'), sport: 'boxing', format: { rounds: 12 }, result: { outcome: 'away', method: 'tko', methodRaw: 'Technical knockout', round: 9 } },
  { ...base('boxing-decision', 'finished'), sport: 'boxing', format: { rounds: 10 }, result: { outcome: 'away', method: 'decision', methodRaw: 'Unanimous decision' } },
]

export const boxingExceptionalFixtures: BoxingContractEvent[] = [
  { ...base('boxing-draw', 'finished'), sport: 'boxing', format: { rounds: 12 }, result: { outcome: 'draw' } },
  { ...base('boxing-no-contest', 'void'), sport: 'boxing', format: { rounds: 12 }, result: { outcome: 'no-contest' } },
  { ...base('boxing-void', 'void'), sport: 'boxing', format: { rounds: 12 }, result: { outcome: 'void' } },
  { ...base('boxing-suspended', 'suspended'), sport: 'boxing', format: { rounds: 12 }, result: { outcome: 'suspended' } },
  { ...base('boxing-rescheduled', 'rescheduled'), sport: 'boxing', format: { rounds: 12 }, result: { outcome: 'rescheduled' } },
]

export const syntheticProviderFixtures: ProviderContractEvent[] = [
  ...footballFixtures, ...footballKnockoutFixtures, ...footballExceptionalFixtures, ...tennisFixtures, ...tennisExceptionalFixtures, ...boxingFixtures, ...boxingExceptionalFixtures,
]

import type { DailyEvent, Journey, Participation, Pick, Prediction, Room } from './daily-prode/model'
import { joinRoom } from './daily-prode/rooms'

// This module is private development data. It must never be imported by public routes.
export const SYNTHETIC_FIXTURE_NOTICE = 'Fixture sintético de demostración — no corresponde a un evento real'
export const DEMO_TIMEZONE = 'America/Buenos_Aires'
export const DEMO_NOW = '2026-09-13T12:00:00-03:00'
export const DEMO_USER = 'demo-you'
export const demoJourneys: Journey[] = [
  { id: 'demo-2026-09-12', date: '2026-09-12', status: 'closed', timezone: DEMO_TIMEZONE },
  { id: 'demo-2026-09-13', date: '2026-09-13', status: 'open', timezone: DEMO_TIMEZONE },
  { id: 'demo-2026-09-14', date: '2026-09-14', status: 'open', timezone: DEMO_TIMEZONE },
]
function base(id: string, hour: string, home: string, away: string) {
  return {
    id: 'demo-' + id, journeyId: demoJourneys[1].id, competition: 'ATP Masters 1000 (demo)',
    participants: { home: { id: id + '-h', name: home }, away: { id: id + '-a', name: away } },
    scheduledStart: '2026-09-13T' + hour + ':00-03:00',
    status: 'upcoming' as const, resultState: 'missing' as const,
    source: { sourceType: 'manual' as const, provider: 'manual-development', externalId: id, updatedAt: DEMO_NOW, syncedAt: DEMO_NOW, revision: 1, providerStatus: 'upcoming', payloadHash: 'sha256:manual-demo-' + id + '-r1' },
  }
}
export const dailyEvents: DailyEvent[] = [
  { ...base('football', '14:00', 'Equipo local demo', 'Equipo visitante demo'), sport: 'football', format: { knockout: false }, competition: 'Liga Profesional de Fútbol (demo)', broadcastStart: '2026-09-13T13:30:00-03:00' },
  { ...base('cup', '15:00', 'Equipo A demo', 'Equipo B demo'), sport: 'football', format: { knockout: true, leg: 'return', requiresResolution: true }, competition: 'Copa Argentina (demo)' },
  { ...base('tennis3', '16:00', 'Jugador A demo', 'Jugador B demo'), sport: 'tennis', format: { bestOf: 3 } },
  { ...base('tennis5', '17:00', 'Jugador C demo', 'Jugador D demo'), sport: 'tennis', format: { bestOf: 5 }, competition: 'ATP 500 (demo)' },
  { ...base('live', '11:00', 'Jugador E demo', 'Jugador F demo'), sport: 'tennis', format: { bestOf: 3 }, status: 'live', resultState: 'partial', actualStart: '2026-09-13T11:07:00-03:00', result: { sport: 'tennis', winner: 'home', loserSets: 0, sets: [{ home: 6, away: 3 }, { home: 2, away: 4 }] } },
  { ...base('exact', '09:00', 'Equipo C demo', 'Equipo D demo'), sport: 'football', format: { knockout: false }, competition: 'Liga Profesional de Fútbol (demo)', status: 'finished', resultState: 'confirmed', result: { sport: 'football', scoreAt90: { home: 2, away: 1 } } },
  { ...base('sets', '09:10', 'Jugador G demo', 'Jugador H demo'), sport: 'tennis', format: { bestOf: 3 }, status: 'finished', resultState: 'confirmed', result: { sport: 'tennis', winner: 'home', loserSets: 1, sets: [{ home: 6, away: 4 }, { home: 3, away: 6 }, { home: 6, away: 2 }] } },
  { ...base('penalties', '09:40', 'Equipo E demo', 'Equipo F demo'), sport: 'football', format: { knockout: true, leg: 'single', requiresResolution: true }, competition: 'Copa Argentina (demo)', status: 'finished', resultState: 'confirmed', result: { sport: 'football', scoreAt90: { home: 1, away: 1 }, extraTimeScore: { home: 1, away: 1 }, qualifier: 'away', resolution: 'penalties', penaltyScore: { home: 3, away: 4 } } },
  { ...base('suspended', '18:00', 'Equipo G demo', 'Equipo H demo'), sport: 'football', format: { knockout: false }, competition: 'Liga Profesional de Fútbol (demo)', status: 'suspended' },
  { ...base('cancelled', '19:00', 'Jugador I demo', 'Jugador J demo'), sport: 'tennis', format: { bestOf: 3 }, status: 'cancelled' },
  { ...base('rescheduled', '20:00', 'Equipo I demo', 'Equipo J demo'), sport: 'football', format: { knockout: false }, competition: 'Liga Profesional de Fútbol (demo)', status: 'rescheduled', previousScheduledStart: '2026-09-13T18:00:00-03:00' },
]
const closedEvents: DailyEvent[] = dailyEvents.filter(e => ['demo-exact', 'demo-sets'].includes(e.id)).map(e => ({
  ...e, id: e.id + '-closed', journeyId: demoJourneys[0].id,
  scheduledStart: e.scheduledStart.replace('2026-09-13', '2026-09-12'),
  source: { ...e.source, externalId: e.source.externalId + '-closed' },
}))
dailyEvents.push(...closedEvents)
export const demoRooms: Room[] = demoJourneys.flatMap(journey => [5000, 10000, 20000].map(fee => ({
  id: journey.id + '-' + fee, journeyId: journey.id, entryFee: fee, currency: 'ARS' as const,
  label: 'Sala ' + fee.toLocaleString('es-AR'), eventIds: dailyEvents.filter(e => e.journeyId === journey.id).map(e => e.id),
})))

export function defaultPick(event: DailyEvent): Pick {
  if (event.sport === 'football') return { sport: 'football', scoreAt90: { home: 2, away: 1 }, ...(event.format.knockout ? { qualifier: 'home' as const, resolution: 'regular' as const } : {}) }
  if (event.sport === 'tennis') return { sport: 'tennis', winner: 'home', loserSets: 0 }
  return { sport: 'boxing', winner: 'home', method: 'ko', round: 7 }
}
export function createDemoParticipation(many = false) {
  let entries: Participation[] = []
  const predictions: Prediction[] = []
  for (const room of demoRooms.filter(r => r.eventIds.length > 0)) {
    const names = many ? Array.from({ length: 36 }, (_, i) => 'Participante de demostracion con nombre extenso ' + (i + 1)) : ['Sol Demo', 'Alex Demo', 'Vera Demo']
    names.forEach((name, index) => { entries = joinRoom(entries, room, 'demo-person-' + index, name) })
    if (room.entryFee !== 20000) entries = joinRoom(entries, room, DEMO_USER, 'Vos (demo)')
    for (const entry of entries.filter(p => p.roomId === room.id)) {
      for (const event of dailyEvents.filter(e => room.eventIds.includes(e.id))) {
        let pick = defaultPick(event)
        if (entry.userId === DEMO_USER && event.sport === 'boxing' && event.id === 'demo-decision') pick = { sport: 'boxing', winner: 'away', method: 'decision' }
        if (entry.userId === 'demo-person-1') {
          if (pick.sport === 'football') pick = { ...pick, scoreAt90: { home: 0, away: 2 } }
          else pick = { ...pick, winner: 'away' }
        }
        if (entry.userId === 'demo-person-2' && pick.sport === 'football') pick = { ...pick, scoreAt90: { home: 1, away: 0 } }
        predictions.push({ participationId: entry.id, eventId: event.id, pick })
      }
    }
  }
  return { entries, predictions }
}

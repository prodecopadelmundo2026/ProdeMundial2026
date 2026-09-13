import type { DailyEvent, Journey, Participation, Prediction, Room, Standing } from './model'
import { scorePrediction, validPick } from './scoring'

export function joinRoom(entries: Participation[], room: Room, userId: string, name: string): Participation[] {
  if (entries.some(p => p.journeyId === room.journeyId && p.roomId === room.id && p.userId === userId)) return entries
  return [...entries, { id: JSON.stringify([room.journeyId, room.id, userId]), journeyId: room.journeyId, roomId: room.id, userId, name }]
}
export function savePrediction(predictions: Prediction[], entry: Participation, room: Room, event: DailyEvent, pick: Prediction['pick'], now: string): Prediction[] {
  if (entry.roomId !== room.id || entry.journeyId !== room.journeyId || event.journeyId !== room.journeyId || !room.eventIds.includes(event.id)) throw new Error('El evento no pertenece a esta participacion.')
  if (event.status !== 'upcoming' || !Number.isFinite(Date.parse(now)) || Date.parse(now) >= Date.parse(event.scheduledStart) || !validPick(event, pick)) throw new Error('El pronostico no es valido o el evento ya cerro.')
  return [...predictions.filter(p => p.participationId !== entry.id || p.eventId !== event.id), { participationId: entry.id, eventId: event.id, pick }]
}
export function roomRanking(room: Room, journey: Journey, entries: Participation[], predictions: Prediction[], events: DailyEvent[]) {
  const participants = entries.filter(p => p.roomId === room.id && p.journeyId === room.journeyId)
  if (new Set(participants.map(p => p.userId)).size !== participants.length) throw new Error('Participacion duplicada en la sala.')
  const rows = participants.map(entry => {
    let unresolved = 0
    const points = room.eventIds.reduce((total, id) => {
      const event = events.find(e => e.id === id && e.journeyId === room.journeyId)
      const matches = predictions.filter(p => p.participationId === entry.id && p.eventId === id)
      if (matches.length > 1) throw new Error('Pronostico duplicado.')
      const prediction = matches[0]
      if (!event) { unresolved++; return total }
      if (!prediction) {
        // Missing picks score zero only once the event is settled.
        if (event.status !== 'finished' || event.resultState !== 'confirmed') unresolved++
        return total
      }
      const score = scorePrediction(event, prediction.pick)
      if (score.points === null) unresolved++
      return total + (score.points ?? 0)
    }, 0)
    return { ...entry, points, unresolved }
  }).sort((a, b) => b.points - a.points || a.id.localeCompare(b.id))
  const final = journey.id === room.journeyId && journey.status === 'closed' && room.eventIds.length > 0 && rows.length > 0 && rows.every(p => p.unresolved === 0)
  const pot = participants.length * room.entryFee
  const leaders = rows.filter(p => p.points === rows[0]?.points).length
  const standings: Standing[] = rows.map((row, index) => ({
    ...row,
    position: rows.findIndex(p => p.points === row.points) + 1,
    winner: final && row.points === rows[0].points,
    prizeShare: final ? (index < leaders ? pot / leaders : 0) : null,
  }))
  return { standings, pot, final, leaders }
}

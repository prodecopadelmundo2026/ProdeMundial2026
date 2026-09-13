import type { DailyEvent, EventStatus, Pick, PredictionStatus } from './model'
export const sportLabel = { football: 'Futbol', tennis: 'Tenis', boxing: 'Boxeo' }
export const eventLabel: Record<EventStatus, string> = { upcoming: 'Proximo', live: 'En curso', finished: 'Finalizado', suspended: 'Suspendido', cancelled: 'Cancelado', rescheduled: 'Reprogramado', void: 'Anulado', review: 'Pendiente de revision' }
export const predictionLabel: Record<PredictionStatus, string> = { pending: 'Pendiente', live: 'En curso', partial: 'Acertado parcialmente', exact: 'Acertado exactamente', miss: 'No acertado', suspended: 'Suspendido', cancelled: 'Cancelado', void: 'Anulado', review: 'Pendiente de revision' }
export const resolutionLabel = { regular: 'Tiempo reglamentario', 'extra-time': 'Alargue', penalties: 'Penales' }
export function money(value: number) {
  const [integer, decimal] = value.toFixed(2).split('.')
  const grouped = integer.replace(/\\B(?=(\\d{3})+(?!\\d))/g, '.')
  return decimal === '00' ? '$' + grouped : '$' + grouped + ',' + decimal
}
export function time(value: string) {
  const match = value.match(/T(\\d{2}:\\d{2})/)
  return match?.[1] ?? '--:--'
}
export function dateLabel(value: string) {
  const match = value.match(/(\\d{4})-(\\d{2})-(\\d{2})/)
  if (!match) return 'Fecha pendiente'
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return match[3] + ' ' + months[Number(match[2]) - 1]
}
export function pickLabel(event: DailyEvent, pick: Pick) {
  if (pick.sport === 'football') return pick.scoreAt90.home + '-' + pick.scoreAt90.away + ' (90 min)' + (pick.qualifier ? ' / Clasifica: ' + event.participants[pick.qualifier].name : '') + (pick.resolution ? ' / ' + resolutionLabel[pick.resolution] : '')
  const winner = event.participants[pick.winner].name
  if (pick.sport === 'tennis' && event.sport === 'tennis') return winner + ' / ' + Math.ceil(event.format.bestOf / 2) + '-' + pick.loserSets + ' sets'
  if (pick.sport === 'boxing') return winner + ' / ' + (pick.method === 'ko' ? 'KO/TKO / Round ' + pick.round : 'Decision / no KO')
  return 'Pendiente de revision'
}
export function resultLabel(event: DailyEvent): string {
  if (!event.result) return event.status === 'live' ? 'En juego / marcador pendiente' : 'Sin resultado'
  const result = event.result
  if (result.sport === 'football') return result.scoreAt90.home + '-' + result.scoreAt90.away + ' (90 min)' + (result.extraTimeScore ? ' / ' + result.extraTimeScore.home + '-' + result.extraTimeScore.away + ' (120 min)' : '') + (result.penaltyScore ? ' / Penales ' + result.penaltyScore.home + '-' + result.penaltyScore.away : '') + (result.qualifier ? ' / Clasifica: ' + event.participants[result.qualifier].name : '') + (result.resolution ? ' / ' + resolutionLabel[result.resolution] : '')
  if (result.sport === 'tennis') return pickLabel(event, result)
  if (result.outcome === 'draw') return 'Empate / resolucion pendiente'
  if (result.outcome === 'no-contest') return 'Sin decision / anulado'
  return event.participants[result.outcome].name + ' / ' + (result.method === 'ko' ? 'KO/TKO / Round ' + (result.round ?? 'pendiente') : result.method === 'decision' ? 'Decision / no KO' : 'Metodo pendiente')
}
export function agendaOrder(a: DailyEvent, b: DailyEvent) {
  const priority = (event: DailyEvent) => event.status === 'upcoming' ? 0 : event.status === 'live' ? 1 : event.status === 'finished' ? 2 : 3
  return priority(a) - priority(b) || Date.parse(a.scheduledStart) - Date.parse(b.scheduledStart) || a.id.localeCompare(b.id)
}

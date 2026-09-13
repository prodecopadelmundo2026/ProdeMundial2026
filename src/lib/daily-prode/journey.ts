import type { DailyEvent } from './model'

export const DAILY_TIMEZONE = 'America/Argentina/Buenos_Aires'

function dateParts(date: Date) {
  const values = new Intl.DateTimeFormat('en-CA', { timeZone: DAILY_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  const get = (type: string) => values.find((part) => part.type === type)?.value ?? ''
  return { year: get('year'), month: get('month'), day: get('day') }
}

export function journeyDate(now = new Date()) { const { year, month, day } = dateParts(now); return `${year}-${month}-${day}` }
export function addJourneyDays(date: string, amount: number) { const next = new Date(`${date}T12:00:00.000Z`); next.setUTCDate(next.getUTCDate() + amount); return next.toISOString().slice(0, 10) }
export function eventJourneyDate(event: DailyEvent) { return journeyDate(new Date(event.scheduledStart)) }
export function journeyEvents(events: DailyEvent[], date: string) { return events.filter((event) => eventJourneyDate(event) === date) }
export function lockAtForJourney(events: DailyEvent[], date: string) {
  const first = journeyEvents(events, date).filter((event) => event.status !== 'cancelled' && event.status !== 'void').map((event) => Date.parse(event.scheduledStart)).filter(Number.isFinite).sort((a, b) => a - b)[0]
  return first === undefined ? null : new Date(first - 5 * 60_000).toISOString()
}
export function journeyIsLocked(events: DailyEvent[], date: string, now = new Date()) { const lockAt = lockAtForJourney(events, date); return Boolean(lockAt && now.getTime() >= Date.parse(lockAt)) }
export function journeyTitle(date: string, now = new Date()) { const today = journeyDate(now); if (date === today) return 'EVENTOS DE HOY'; if (date === addJourneyDays(today, 1)) return 'EVENTOS DE MAÑANA'; if (date === addJourneyDays(today, -1)) return 'JORNADA CERRADA'; const label = new Intl.DateTimeFormat('es-AR', { timeZone: DAILY_TIMEZONE, day: 'numeric', month: 'long' }).format(new Date(`${date}T12:00:00Z`)).toUpperCase(); return `EVENTOS DEL ${label}` }
export type CountdownState = 'future' | 'now' | 'live' | 'finished' | 'pending' | 'rescheduled'
export function countdownState(event: DailyEvent | undefined, now = new Date()): CountdownState {
  if (!event || !Number.isFinite(Date.parse(event.scheduledStart))) return 'pending'
  if (event.status === 'rescheduled') return 'rescheduled'
  if (event.status === 'finished') return 'finished'
  if (event.status === 'live') return 'live'
  return Date.parse(event.scheduledStart) <= now.getTime() ? 'now' : 'future'
}
export function countdownText(event: DailyEvent | undefined, now = new Date()) {
  const state = countdownState(event, now); if (state !== 'future') return ({ now: 'Comienza ahora', live: 'En curso', finished: 'Finalizado', pending: 'Horario pendiente', rescheduled: 'Reprogramado' } as const)[state]
  const remaining = Math.max(0, Date.parse(event!.scheduledStart) - now.getTime()); const days = Math.floor(remaining / 86_400_000); const hours = Math.floor((remaining % 86_400_000) / 3_600_000); const minutes = Math.floor((remaining % 3_600_000) / 60_000); const seconds = Math.floor((remaining % 60_000) / 1_000)
  return days ? `${days}d ${hours}h` : `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

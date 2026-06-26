export const ARGENTINA_TIME_ZONE = 'America/Argentina/Buenos_Aires'

function dateParts(value: string | Date) {
  const parts = new Intl.DateTimeFormat('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23',
    timeZone: ARGENTINA_TIME_ZONE,
  }).formatToParts(new Date(value))

  return Object.fromEntries(parts.map((part) => [part.type, part.value]))
}

type ScheduledMatch = { scheduled_at: string }

export function getMatchProductOrderKey(value: string | Date) {
  const parts = dateParts(value)
  const month = Number(new Intl.DateTimeFormat('en-US', {
    month: '2-digit',
    timeZone: ARGENTINA_TIME_ZONE,
  }).format(new Date(value)))
  const hour = Number(parts.hour)
  const minute = Number(parts.minute)
  const productMinute = (hour === 0 || hour === 24) && minute === 0 ? 24 * 60 : hour * 60 + minute

  return Date.UTC(Number(parts.year), month - 1, Number(parts.day)) + productMinute * 60_000
}

export function compareMatchesByProductScheduleAsc(a: ScheduledMatch, b: ScheduledMatch) {
  return getMatchProductOrderKey(a.scheduled_at) - getMatchProductOrderKey(b.scheduled_at)
}

export function compareMatchesByProductScheduleDesc(a: ScheduledMatch, b: ScheduledMatch) {
  return compareMatchesByProductScheduleAsc(b, a)
}

function clean(value: unknown) {
  return String(value ?? '').replace('.', '').toLowerCase()
}

function pad(value: unknown) {
  return String(value ?? '').padStart(2, '0')
}

export function formatMatchDateTimeArgentina(
  value: string | Date,
  options: { includeYear?: boolean; separator?: string } = {}
) {
  const parts = dateParts(value)
  const month = clean(parts.month)
  const date = options.includeYear
    ? `${parts.day} ${month} ${parts.year}`
    : `${parts.day} ${month}`
  const time = `${pad(parts.hour)}:${pad(parts.minute)}`

  return `${date}${options.separator ?? ' - '}${time}`
}

export function formatMatchTimeArgentina(value: string | Date) {
  const parts = dateParts(value)
  const hour = Number(parts.hour) === 24 ? 0 : parts.hour
  return `${pad(hour)}:${pad(parts.minute)}`
}

export function formatMatchKickoffArgentina(value: string | Date) {
  const parts = dateParts(value)
  return `${clean(parts.weekday)} ${parts.day} ${clean(parts.month)} · ${formatMatchTimeArgentina(value)}`
}

export function formatMatchDayKeyArgentina(value: string | Date) {
  const parts = dateParts(value)
  const monthNumber = new Intl.DateTimeFormat('en-US', {
    month: '2-digit',
    timeZone: ARGENTINA_TIME_ZONE,
  }).format(new Date(value))

  return `${parts.year}-${monthNumber}-${pad(parts.day)}`
}

export function formatMatchDayLabelArgentina(dayKey: string) {
  const [year, month, day] = dayKey.split('-').map(Number)
  const argentinaNoon = new Date(Date.UTC(year, month - 1, day, 15, 0, 0))
  const parts = new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: ARGENTINA_TIME_ZONE,
  }).formatToParts(argentinaNoon)
  const keyed = Object.fromEntries(parts.map((part) => [part.type, part.value]))

  return `${clean(keyed.weekday)} ${keyed.day} de ${clean(keyed.month)}`
}

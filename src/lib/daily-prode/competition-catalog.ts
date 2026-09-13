import type { DailyEvent, Sport } from './model'

export type CompetitionCatalogEntry = {
  id: string
  sport: Sport
  label: string
  category: 'league' | 'national-cup' | 'continental-cup' | 'atp' | 'grand-slam' | 'boxing'
  publicEligible: boolean
}

export const COMPETITION_CATALOG: CompetitionCatalogEntry[] = [
  { id: 'arg-lpf', sport: 'football', label: 'Liga Profesional de Fútbol', category: 'league', publicEligible: true },
  { id: 'arg-primera-nacional', sport: 'football', label: 'Primera Nacional', category: 'league', publicEligible: true },
  { id: 'arg-copa', sport: 'football', label: 'Copa Argentina', category: 'national-cup', publicEligible: true },
  { id: 'arg-supercopa', sport: 'football', label: 'Supercopa Argentina', category: 'national-cup', publicEligible: true },
  { id: 'conmebol-libertadores', sport: 'football', label: 'Copa Libertadores', category: 'continental-cup', publicEligible: true },
  { id: 'conmebol-sudamericana', sport: 'football', label: 'Copa Sudamericana', category: 'continental-cup', publicEligible: true },
  { id: 'atp-masters', sport: 'tennis', label: 'ATP Masters 1000', category: 'atp', publicEligible: true },
  { id: 'atp-500', sport: 'tennis', label: 'ATP 500', category: 'atp', publicEligible: true },
  { id: 'atp-250', sport: 'tennis', label: 'ATP 250', category: 'atp', publicEligible: true },
  { id: 'ao', sport: 'tennis', label: 'Australian Open', category: 'grand-slam', publicEligible: true },
  { id: 'rg', sport: 'tennis', label: 'Roland Garros', category: 'grand-slam', publicEligible: true },
  { id: 'wimbledon', sport: 'tennis', label: 'Wimbledon', category: 'grand-slam', publicEligible: true },
  { id: 'us-open', sport: 'tennis', label: 'US Open', category: 'grand-slam', publicEligible: true },
  { id: 'boxing-identified', sport: 'boxing', label: 'Cartelera de boxeo identificada', category: 'boxing', publicEligible: true },
]

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
}

export function competitionFor(sport: Sport, competition: string) {
  const value = normalize(competition)
  return COMPETITION_CATALOG.find((entry) => entry.sport === sport && value.startsWith(normalize(entry.label)))
}

export function competitionsFor(sport: Sport) {
  return COMPETITION_CATALOG.filter((entry) => entry.sport === sport)
}

export type DailyEventEligibility = { eligible: true } | { eligible: false; reason: string }

export function isEligibleDailyEvent(event: DailyEvent): DailyEventEligibility {
  if (!['football', 'tennis', 'boxing'].includes(event.sport)) return { eligible: false, reason: 'Deporte no reconocido por el catálogo diario.' }
  if (!event.participants.home.name.trim() || !event.participants.away.name.trim()) return { eligible: false, reason: 'Faltan participantes.' }
  if (!Number.isFinite(Date.parse(event.scheduledStart))) return { eligible: false, reason: 'Falta fecha u horario válido.' }
  if (!event.source?.sourceType) return { eligible: false, reason: 'Falta identificar la fuente.' }
  const competition = competitionFor(event.sport, event.competition)
  if (!competition?.publicEligible) return { eligible: false, reason: 'La competencia no pertenece al catálogo permitido.' }
  return { eligible: true }
}

/** Public listings need an authorized provider record, not a development fixture. */
export function isPublicDailyEvent(event: DailyEvent): DailyEventEligibility {
  const eligibility = isEligibleDailyEvent(event)
  if (!eligibility.eligible) return eligibility
  if (event.source.sourceType !== 'provider') return { eligible: false, reason: 'La fuente manual no se publica.' }
  if (event.source.verificationStatus !== 'verified') return { eligible: false, reason: 'El evento todavía no está verificado.' }
  if (!event.source.sourceReference?.trim() || !Number.isFinite(Date.parse(event.source.consultedAt ?? ''))) return { eligible: false, reason: 'Falta referencia o fecha de consulta de la fuente.' }
  return { eligible: true }
}

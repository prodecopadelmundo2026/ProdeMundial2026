export type Sport = 'football' | 'tennis' | 'boxing'
export type Side = 'home' | 'away'
export type EventStatus = 'upcoming' | 'live' | 'finished' | 'suspended' | 'cancelled' | 'rescheduled' | 'void' | 'review'
export type PredictionStatus = 'pending' | 'live' | 'partial' | 'exact' | 'miss' | 'suspended' | 'cancelled' | 'void' | 'review'
export type ScorePair = { home: number; away: number }
export type FootballPick = { sport: 'football'; scoreAt90: ScorePair; qualifier?: Side; resolution?: 'regular' | 'extra-time' | 'penalties' }
export type TennisPick = { sport: 'tennis'; winner: Side; loserSets: number }
export type BoxingPick = { sport: 'boxing'; winner: Side; method: 'ko' | 'decision'; round?: number }
export type Pick = FootballPick | TennisPick | BoxingPick
export type FootballResult = {
  sport: 'football'
  scoreAt90: ScorePair
  extraTimeScore?: ScorePair
  penaltyScore?: ScorePair
  qualifier?: Side
  resolution?: FootballPick['resolution']
}
export type TennisSet = { home: number; away: number; tiebreak?: ScorePair }
export type TennisResult = { sport: 'tennis'; winner: Side; loserSets: number; sets?: TennisSet[]; tiebreaks?: Array<{ set: number; score: ScorePair }> }
export type BoxingResult = { sport: 'boxing'; outcome: Side | 'draw' | 'no-contest'; method?: 'ko' | 'decision'; round?: number; methodRaw?: string; methodDetail?: 'ko' | 'tko' | 'decision' }
export type Result = FootballResult | TennisResult | BoxingResult

export type ProviderSource = {
  sourceType?: 'manual' | 'provider'
  provider: string
  externalId: string
  updatedAt: string
  syncedAt: string
  revision: number
  externalCompetitionId?: string
  externalSeasonId?: string
  externalSeriesId?: string
  externalParticipantIds?: { home: string; away: string }
  providerStatus?: string
  payloadHash?: string
  replacementEventId?: string
}

type EventBase = {
  id: string
  journeyId: string
  competition: string
  participants: { home: { id: string; name: string }; away: { id: string; name: string } }
  scheduledStart: string
  broadcastStart?: string
  actualStart?: string
  previousScheduledStart?: string
  status: EventStatus
  resultState: 'missing' | 'partial' | 'confirmed' | 'review'
  source: ProviderSource
}
export type DailyEvent = EventBase & (
  | { sport: 'football'; format: { knockout: boolean; leg?: 'single' | 'return'; legNumber?: number; requiresResolution?: boolean; aggregateScore?: ScorePair }; result?: FootballResult }
  | { sport: 'tennis'; format: { bestOf: 3 | 5 }; result?: TennisResult }
  | { sport: 'boxing'; format: { rounds: number }; result?: BoxingResult }
)
export type Journey = { id: string; date: string; status: 'open' | 'in-progress' | 'pending-results' | 'review' | 'closed' | 'void'; timezone: string }
export type Room = { id: string; journeyId: string; entryFee: number; currency: 'ARS'; label: string; eventIds: string[] }
export type Participation = { id: string; journeyId: string; roomId: string; userId: string; name: string }
export type Prediction = { participationId: string; eventId: string; pick: Pick }
export type Score = {
  points: number | null
  status: PredictionStatus
  ruleVersion: string
  provisionalRule?: boolean
  pendingCriteria?: Array<'qualifier'>
}
export type Standing = Participation & { points: number; position: number; unresolved: number; winner: boolean; prizeShare: number | null }

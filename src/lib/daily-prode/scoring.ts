import type { DailyEvent, Pick, Score, ScorePair } from './model'

export type ScoringConfig = {
  version: string
  football: { exact: number; general: number; wrong: number }
  tennis: { exact: number; winner: number; wrong: number }
  boxing: { exact: number; method: number; winner: number; wrong: number; decision: number }
  knockout: { scoreBasis: '90'; qualifierScoring: 'pending'; label: string }
}
export const SCORING: ScoringConfig = {
  version: 'P002-demo-1',
  football: { exact: 3, general: 2, wrong: 0 },
  tennis: { exact: 3, winner: 1, wrong: 0 },
  boxing: { exact: 3, method: 2, winner: 1, wrong: 0, decision: 2 },
  knockout: { scoreBasis: '90', qualifierScoring: 'pending', label: 'Marcador exacto a 90 minutos' },
}
export function generalResult(score: ScorePair) {
  return score.home === score.away ? 'draw' : score.home > score.away ? 'home' : 'away'
}
function validScore(score: ScorePair) {
  return [score.home, score.away].every(n => Number.isInteger(n) && n >= 0)
}
export function validPick(event: DailyEvent, pick: Pick): boolean {
  if (event.sport === 'football' && pick.sport === 'football') {
    return validScore(pick.scoreAt90) && (!event.format.knockout || (
      (pick.qualifier === 'home' || pick.qualifier === 'away') &&
      (!event.format.requiresResolution || ['regular', 'extra-time', 'penalties'].includes(pick.resolution ?? ''))
    ))
  }
  if (event.sport === 'tennis' && pick.sport === 'tennis') {
    return ['home', 'away'].includes(pick.winner) && Number.isInteger(pick.loserSets) && pick.loserSets >= 0 && pick.loserSets < Math.ceil(event.format.bestOf / 2)
  }
  if (event.sport === 'boxing' && pick.sport === 'boxing') {
    return ['home', 'away'].includes(pick.winner) && (pick.method === 'decision' ? pick.round === undefined : pick.method === 'ko' && Number.isInteger(pick.round) && pick.round! >= 1 && pick.round! <= event.format.rounds)
  }
  return false
}
export function scorePrediction(event: DailyEvent, pick: Pick, config = SCORING): Score {
  const pending = (status: Score['status']): Score => ({ points: null, status, ruleVersion: config.version })
  const awarded = (points: number, status: Score['status']): Score => ({ points, status, ruleVersion: config.version, provisionalRule: event.sport === 'boxing' })
  if (['suspended', 'cancelled', 'void', 'review'].includes(event.status)) return pending(event.status as Score['status'])
  if (event.resultState === 'review') return pending('review')
  if (event.status === 'live') return pending('live')
  if (event.status !== 'finished') return pending('pending')
  if (event.resultState !== 'confirmed' || !event.result || !validPick(event, pick)) return pending('review')
  if (event.sport === 'football' && pick.sport === 'football') {
    if (!validScore(event.result.scoreAt90)) return pending('review')
    const exact = event.result.scoreAt90.home === pick.scoreAt90.home && event.result.scoreAt90.away === pick.scoreAt90.away
    const general = generalResult(event.result.scoreAt90) === generalResult(pick.scoreAt90)
    const score = awarded(exact ? config.football.exact : general ? config.football.general : config.football.wrong, exact ? 'exact' : general ? 'partial' : 'miss')
    return event.format.knockout ? { ...score, pendingCriteria: ['qualifier'] } : score
  }
  if (event.sport === 'tennis' && pick.sport === 'tennis') {
    if (!validPick(event, event.result)) return pending('review')
    const winner = event.result.winner === pick.winner
    const exact = winner && event.result.loserSets === pick.loserSets
    return awarded(exact ? config.tennis.exact : winner ? config.tennis.winner : config.tennis.wrong, exact ? 'exact' : winner ? 'partial' : 'miss')
  }
  if (event.sport === 'boxing' && pick.sport === 'boxing') {
    const result = event.result
    if (result.outcome === 'no-contest') return pending('void')
    if (result.outcome === 'draw' || !result.method) return pending('review')
    if (!validPick(event, { sport: 'boxing', winner: result.outcome, method: result.method, round: result.round })) return pending('review')
    if (result.outcome !== pick.winner) return awarded(config.boxing.wrong, 'miss')
    if (result.method !== pick.method) return awarded(config.boxing.winner, 'partial')
    if (result.method === 'decision') return awarded(config.boxing.decision, 'partial')
    const exact = result.round === pick.round
    return awarded(exact ? config.boxing.exact : config.boxing.method, exact ? 'exact' : 'partial')
  }
  return pending('review')
}

import type { Match, Prediction, RankingEntry } from '@/types'
import {
  assignBestThirdsToSlots,
  buildKnockoutMap,
  buildProjectedKnockoutMatches,
  computeAllStandings,
  computeBestThirdsGroups,
  KNOCKOUT_FIXTURES,
  knockoutPNum,
  resolveTeamFull,
} from '@/lib/bracket'
import { buildRoundOf32BonusLedger, getDisplayedTrajectoryRoundForStage, getQualifiedTeamPointsForStage } from '@/lib/knockout-bonus'

type ScoreMap = Record<string, { home_score: number; away_score: number }>
type TiebreakerMap = Record<string, string>

export type AuditStatus = 'exact' | 'partial' | 'incorrect' | 'pending' | 'missing'

export type MatchAuditRow = {
  match: Match
  prediction?: Prediction
  stage: Match['stage']
  predictedHome: string
  predictedAway: string
  officialHome: string
  officialAway: string
  predictedScore: string
  officialScore: string
  status: AuditStatus
  points: number | null
  resultPoints: number | null
  qualifiedPoints: number
  crossMatches: boolean | null
  crossingKind: 'exact' | 'both_teams_other_crossing' | 'one_team_other_crossing' | 'different_crossing' | 'pending'
  trajectoryTeams: string[]
  trajectoryPoints: number
  explanation: string
  hasOfficialTeams: boolean
}

export type RankingAuditSummary = {
  total_points: number
  exact_predictions: number
  correct_result_predictions: number
  incorrect_predictions: number
}

function sign(value: number) {
  if (value > 0) return 1
  if (value < 0) return -1
  return 0
}

function sameTeam(left: string | null | undefined, right: string | null | undefined) {
  return String(left ?? '').trim().localeCompare(String(right ?? '').trim(), undefined, { sensitivity: 'base' }) === 0
}

function scorePoints(prediction: Prediction, match: Match) {
  if (match.status !== 'finished' || match.home_score == null || match.away_score == null) return null
  if (prediction.home_score === match.home_score && prediction.away_score === match.away_score) return 3
  if (sign(prediction.home_score - prediction.away_score) === sign(match.home_score - match.away_score)) return 1
  return 0
}

function formatScore(home: number | null | undefined, away: number | null | undefined) {
  return home == null || away == null ? 'Pendiente de resultado' : `${home} - ${away}`
}

function buildScoreMap(matches: Match[]): ScoreMap {
  return Object.fromEntries(
    matches
      .filter((match) => match.home_score != null && match.away_score != null)
      .map((match) => [match.id, { home_score: match.home_score!, away_score: match.away_score! }])
  )
}

function areAllMatchesScored(matches: Match[], predMap: ScoreMap) {
  return matches.length > 0 && matches.every((match) => Boolean(predMap[match.id]))
}

function completeGroupMatchesForResolution(groupMatches: Match[], predMap: ScoreMap) {
  const byGroup: Record<string, Match[]> = {}
  for (const match of groupMatches) {
    if (!match.group) continue
    if (!byGroup[match.group]) byGroup[match.group] = []
    byGroup[match.group].push(match)
  }

  return Object.values(byGroup).flatMap((matches) =>
    areAllMatchesScored(matches, predMap) ? matches : []
  )
}

function isUnresolvedTeam(team: string) {
  return (
    /\bGrupo\s+[A-L]/.test(team) ||
    team.startsWith('Ganador') ||
    team.startsWith('Perdedor') ||
    team.includes('Mejor 3')
  )
}

function virtualMatchIdFor(match: Match) {
  const pNum = knockoutPNum(match)
  return pNum == null ? null : `virtual-p${pNum}`
}

function predictionForMatch(match: Match, predictionByMatch: Map<string, Prediction>) {
  const virtualMatchId = virtualMatchIdFor(match)
  return predictionByMatch.get(match.id) ?? (virtualMatchId ? predictionByMatch.get(virtualMatchId) : undefined)
}

function tiebreakerForMatch(match: Match, tiebreakerMap: TiebreakerMap, prediction?: Prediction) {
  const virtualMatchId = virtualMatchIdFor(match)
  return tiebreakerMap[match.id] ?? (virtualMatchId ? tiebreakerMap[virtualMatchId] : undefined) ?? prediction?.tiebreaker_team ?? null
}

function buildResolvedTeams(
  match: Match,
  allMatches: Match[],
  predMap: ScoreMap,
  tiebreakerMap: TiebreakerMap,
  mode: 'official' | 'prediction'
) {
  if (match.stage === 'group') {
    return { home: match.home_team, away: match.away_team }
  }

  if (
    mode === 'official' &&
    !isUnresolvedTeam(match.home_team) &&
    !isUnresolvedTeam(match.away_team)
  ) {
    return { home: match.home_team, away: match.away_team }
  }

  const groupMatches = allMatches.filter((item) => item.stage === 'group')
  const knockoutMatches = allMatches.filter((item) => item.stage !== 'group')
  const scopedGroupMatches = mode === 'official'
    ? completeGroupMatchesForResolution(groupMatches, predMap)
    : groupMatches

  const standings = computeAllStandings(scopedGroupMatches, predMap, tiebreakerMap)

  const canResolveThirds = mode === 'official'
    ? areAllMatchesScored(groupMatches, predMap)
    : groupMatches.length > 0

  const bestThirdsGroups = canResolveThirds
    ? computeBestThirdsGroups(groupMatches, predMap, tiebreakerMap)
    : new Set<string>()

  const thirdSlotAssignment = bestThirdsGroups.size > 0
    ? assignBestThirdsToSlots(bestThirdsGroups)
    : {}

  const projectedKnockoutMatches = buildProjectedKnockoutMatches(knockoutMatches)
  const pMap = buildKnockoutMap(
    mode === 'prediction'
      ? projectedKnockoutMatches.map((item) => ({
          ...item,
          home_score: null,
          away_score: null,
          status: 'upcoming' as const,
          qualified_team: null,
        }))
      : projectedKnockoutMatches
  )

  const pNum = knockoutPNum(match)
  const fixture = pNum ? KNOCKOUT_FIXTURES[pNum] : null

  const [homeSeed, awaySeed] = fixture && (mode === 'prediction' || isUnresolvedTeam(match.home_team) || isUnresolvedTeam(match.away_team))
    ? fixture
    : [match.home_team, match.away_team]

  return {
    home: resolveTeamFull(
      homeSeed,
      standings,
      pMap,
      predMap,
      tiebreakerMap,
      0,
      bestThirdsGroups,
      thirdSlotAssignment,
      mode
    ),
    away: resolveTeamFull(
      awaySeed,
      standings,
      pMap,
      predMap,
      tiebreakerMap,
      0,
      bestThirdsGroups,
      thirdSlotAssignment,
      mode
    ),
  }
}

export function buildMatchAuditRows(
  matches: Match[],
  predictions: Prediction[],
  extraTiebreakers: TiebreakerMap = {}
): MatchAuditRow[] {
  const officialScoreMap = buildScoreMap(matches.filter((match) => match.status === 'finished'))
  const predictionByMatch = new Map(predictions.map((prediction) => [prediction.match_id, prediction]))

  const predMap: ScoreMap = Object.fromEntries(
    predictions.map((prediction) => [
      prediction.match_id,
      { home_score: prediction.home_score, away_score: prediction.away_score },
    ])
  )

  const tiebreakerMap: TiebreakerMap = {
    ...Object.fromEntries(
      predictions
        .filter((prediction) => prediction.tiebreaker_team)
        .map((prediction) => [prediction.match_id, prediction.tiebreaker_team!])
    ),
    ...extraTiebreakers,
  }
  const trajectoryLedger = buildRoundOf32BonusLedger({
    userId: predictions[0]?.user_id ?? '',
    matches,
    predictionMap: predMap,
    historicalTiebreakers: tiebreakerMap,
  })
  const predictedResolvedByMatch = new Map(
    matches.map((match) => [
      match.id,
      buildResolvedTeams(match, matches, predMap, tiebreakerMap, 'prediction'),
    ])
  )
  const predictedTeamsByStage = new Map<Match['stage'], Set<string>>()
  for (const match of matches) {
    if (!predictionForMatch(match, predictionByMatch)) continue
    const resolved = predictedResolvedByMatch.get(match.id)
    if (!resolved) continue
    const teams = predictedTeamsByStage.get(match.stage) ?? new Set<string>()
    if (!isUnresolvedTeam(resolved.home)) teams.add(resolved.home)
    if (!isUnresolvedTeam(resolved.away)) teams.add(resolved.away)
    predictedTeamsByStage.set(match.stage, teams)
  }

  return matches.map((match) => {
    const prediction = predictionForMatch(match, predictionByMatch)
    const officialTeams = buildResolvedTeams(match, matches, officialScoreMap, {}, 'official')
    const predictedTeams = prediction
      ? predictedResolvedByMatch.get(match.id)!
      : { home: match.home_team, away: match.away_team }

    const hasOfficialResult = match.status === 'finished' && match.home_score != null && match.away_score != null

    const hasOfficialTeams =
      match.stage === 'group' ||
      (!isUnresolvedTeam(officialTeams.home) && !isUnresolvedTeam(officialTeams.away))

    const hasPredictedTeams =
      match.stage === 'group' ||
      (!isUnresolvedTeam(predictedTeams.home) && !isUnresolvedTeam(predictedTeams.away))

    const crossMatches = match.stage === 'group'
      ? true
      : hasOfficialTeams &&
        hasPredictedTeams &&
        sameTeam(predictedTeams.home, officialTeams.home) &&
        sameTeam(predictedTeams.away, officialTeams.away)

    const predictedQualifiedTeam = prediction
      ? prediction.home_score > prediction.away_score
        ? predictedTeams.home
        : prediction.away_score > prediction.home_score
        ? predictedTeams.away
        : tiebreakerForMatch(match, tiebreakerMap, prediction)
      : null

    const requiresCorrectQualifier =
      match.stage !== 'group' &&
      match.home_score === match.away_score
    const qualifierMatches =
      Boolean(match.qualified_team) &&
      predictedQualifiedTeam === match.qualified_team
    const resultPoints = !prediction || !hasOfficialResult
      ? null
      : match.stage !== 'group' && !crossMatches
      ? 0
      : requiresCorrectQualifier && !qualifierMatches
      ? 0
      : scorePoints(prediction, match)

    const slotQualifiedPoints =
      prediction &&
      hasOfficialResult &&
      match.stage !== 'group' &&
      match.qualified_team &&
      predictedQualifiedTeam === match.qualified_team
        ? getQualifiedTeamPointsForStage(match.stage)
        : 0

    const displayedTrajectoryRound = getDisplayedTrajectoryRoundForStage(match.stage)
    const displayedTrajectoryTeams = [officialTeams.home, officialTeams.away]
    const trajectoryAwards = match.stage === 'group' || !displayedTrajectoryRound || !hasOfficialTeams
      ? []
      : trajectoryLedger.filter((item) =>
          item.awarded &&
          item.round === displayedTrajectoryRound &&
          displayedTrajectoryTeams.some((team) => sameTeam(team, item.team))
        )
    const trajectoryTeams = [...new Set(trajectoryAwards.map((item) => item.team))]
    const trajectoryPoints = trajectoryAwards.reduce((total, item) => total + item.points, 0)
    // El ledger es la fuente real del bonus: premia al equipo pronosticado para
    // esta ronda aunque haya sido ubicado en otro slot.
    const qualifiedPoints = trajectoryPoints
    const points = resultPoints == null
      ? qualifiedPoints > 0 ? qualifiedPoints : null
      : resultPoints + qualifiedPoints
    const predictedRoundTeams = predictedTeamsByStage.get(match.stage) ?? new Set<string>()
    const officialRoundTeamHits = [officialTeams.home, officialTeams.away]
      .filter((team) => predictedRoundTeams.has(team))
    const crossingKind = match.stage === 'group' || !hasOfficialTeams
      ? 'pending'
      : crossMatches
      ? 'exact'
      : officialRoundTeamHits.length === 2
      ? 'both_teams_other_crossing'
      : officialRoundTeamHits.length === 1
      ? 'one_team_other_crossing'
      : 'different_crossing'
    const trajectoryExplanation = qualifiedPoints > 0
      ? `Sumó +${qualifiedPoints} de trayectoria porque ${trajectoryTeams.join(' y ')} ${trajectoryTeams.length > 1 ? 'llegaron' : 'llegó'} a ${getDisplayedTrajectoryRoundForStage(match.stage) === 'third_place' ? 'tercer puesto' : getDisplayedTrajectoryRoundForStage(match.stage) === 'final' ? 'la final' : 'esta instancia'}.`
      : slotQualifiedPoints > 0
      ? 'Acertó el clasificado en este slot, pero la trayectoria real no otorgó puntos para este partido.'
      : 'Sin puntos por clasificado o trayectoria en esta ronda.'
    const explanation = !prediction
      ? qualifiedPoints > 0
        ? `No había un marcador directo cargado para este slot, pero la llave pronosticada ubicaba a ${trajectoryTeams.join(' y ')} en ${getDisplayedTrajectoryRoundForStage(match.stage) === 'third_place' ? 'tercer puesto' : getDisplayedTrajectoryRoundForStage(match.stage) === 'final' ? 'la final' : 'esta instancia'}. ${trajectoryExplanation}`
        : 'Sin pronóstico cargado para este slot.'
      : match.stage === 'group'
      ? !hasOfficialResult
        ? 'El resultado oficial todavía está pendiente.'
        : resultPoints === 3 ? '+3 resultado exacto.' : resultPoints === 1 ? '+1 por acertar ganador/empate sin marcador exacto.' : '0 puntos: no acertó el resultado.'
      : [
          !hasOfficialResult
            ? 'El resultado oficial todavía está pendiente.'
            : crossingKind === 'exact'
            ? 'Acertó el cruce exacto.'
            : crossingKind === 'both_teams_other_crossing'
            ? 'Pronosticó ambos equipos en esta ronda, pero en otro cruce.'
            : crossingKind === 'one_team_other_crossing'
            ? `Pronosticó a ${officialRoundTeamHits[0]} en esta ronda, pero no acertó el cruce.`
            : 'No acertó el cruce oficial.',
          !hasOfficialResult
            ? '0 por marcador hasta que se cargue el resultado.'
            : requiresCorrectQualifier && !qualifierMatches
            ? '0 por marcador: en un empate también debía acertar el clasificado.'
            : resultPoints === 3
            ? '+3 resultado exacto.'
            : resultPoints === 1
            ? '+1 por acertar ganador/empate sin marcador exacto.'
            : '0 por marcador.',
          trajectoryExplanation,
        ].join(' ')

    const status: AuditStatus = !prediction
      ? qualifiedPoints > 0 ? 'pending' : 'missing'
      : !hasOfficialResult
      ? 'pending'
      : resultPoints === 3
      ? 'exact'
      : resultPoints === 1
      ? 'partial'
      : 'incorrect'

    return {
      match,
      prediction,
      stage: match.stage,
      predictedHome: predictedTeams.home,
      predictedAway: predictedTeams.away,
      officialHome: officialTeams.home,
      officialAway: officialTeams.away,
      predictedScore: prediction ? formatScore(prediction.home_score, prediction.away_score) : 'Sin cargar',
      officialScore: formatScore(match.home_score, match.away_score),
      status,
      points,
      resultPoints,
      qualifiedPoints,
      crossMatches: match.stage === 'group' || !prediction || !hasOfficialTeams ? null : crossMatches,
      crossingKind,
      trajectoryTeams,
      trajectoryPoints,
      explanation,
      hasOfficialTeams,
    }
  })
}

export function calculateAuditedPredictionPoints(match: Match, allMatches: Match[], userPredictions: Prediction[]) {
  const row = buildMatchAuditRows(allMatches, userPredictions).find((item) => item.match.id === match.id)
  return row?.points ?? null
}

export function summarizeAuditRows(rows: MatchAuditRow[]): RankingAuditSummary {
  return {
    total_points: rows.reduce((total, row) => total + (row.points ?? 0), 0),
    exact_predictions: rows.filter((row) => row.status === 'exact').length,
    correct_result_predictions: rows.filter((row) => row.status === 'partial').length,
    incorrect_predictions: rows.filter((row) => row.status === 'incorrect').length,
  }
}

export function buildAuditedRankingEntries(
  matches: Match[],
  predictions: Prediction[],
  participants: Array<{ user_id: string; name: string; avatar_url: string | null }>,
  tiebreakersByUser: Map<string, TiebreakerMap> = new Map()
): RankingEntry[] {
  const predictionsByUser = new Map<string, Prediction[]>()
  for (const prediction of predictions) {
    if (!predictionsByUser.has(prediction.user_id)) predictionsByUser.set(prediction.user_id, [])
    predictionsByUser.get(prediction.user_id)!.push(prediction)
  }

  const sortedEntries = participants
    .map((participant) => {
      const rows = buildMatchAuditRows(
        matches,
        predictionsByUser.get(participant.user_id) ?? [],
        tiebreakersByUser.get(participant.user_id) ?? {}
      )
      const summary = summarizeAuditRows(rows)
      return {
        user_id: participant.user_id,
        name: participant.name,
        avatar_url: participant.avatar_url,
        ...summary,
        rank: 0,
      }
    })
    .sort((a, b) => {
      if (b.total_points !== a.total_points) return b.total_points - a.total_points
      if (b.exact_predictions !== a.exact_predictions) return b.exact_predictions - a.exact_predictions
      if (b.correct_result_predictions !== a.correct_result_predictions) return b.correct_result_predictions - a.correct_result_predictions
      if (a.incorrect_predictions !== b.incorrect_predictions) return a.incorrect_predictions - b.incorrect_predictions
      return a.name.localeCompare(b.name)
    })

  let currentRank = 0
  return sortedEntries.map((entry, index, sorted) => {
    const previous = sorted[index - 1]
    if (
      !previous ||
      previous.total_points !== entry.total_points ||
      previous.exact_predictions !== entry.exact_predictions ||
      previous.correct_result_predictions !== entry.correct_result_predictions ||
      previous.incorrect_predictions !== entry.incorrect_predictions
    ) {
      currentRank += 1
    }
    return { ...entry, rank: currentRank }
  })
}

import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  emptyPredictionInsights,
  type PredictionInsights,
} from '@/lib/prediction-insights'
import type { Match } from '@/types'
import {
  buildRoundOf32BonusLedger,
  getKnockoutStageLabel,
  getQualifiedTeamPointsForStage,
  getQualifiedTeamRoundLabelForStage,
  getTrajectoryTeamPointsForStage,
  summarizeKnockoutBonus,
  type KnockoutBonusRound,
} from '@/lib/knockout-bonus'
import { buildMatchAuditRows } from '@/lib/ranking-audit'
import { getTournamentVisibleMatches } from '@/lib/tournament-state'
import type { Prediction } from '@/types'

type ScoreRow = {
  user_id?: string
  match_id: string
  home_score: number
  away_score: number
}

type TiebreakerRow = { user_id: string; tiebreaker_key: string; team: string }
type ProfileRow = { id: string; name: string }
type VirtualPredictionRow = {
  user_id: string
  virtual_match_id: string
  home_score: number
  away_score: number
  tiebreaker_team: string | null
}

export type VirtualTrajectoryParticipant = {
  userId: string
  name: string
  prediction: {
    homeScore: number
    awayScore: number
    tiebreakerTeam: string | null
    classifiedTeam: string | null
  } | null
}

export type VirtualMatchTrajectoryInsights = {
  instanceLabel: string
  nextRoundLabel: string
  trajectoryPoints: number
  advancePoints: number
  exactCrossing: VirtualTrajectoryParticipant[]
  bothTeamsOtherCrossing: VirtualTrajectoryParticipant[]
  homeTeamOnly: VirtualTrajectoryParticipant[]
  awayTeamOnly: VirtualTrajectoryParticipant[]
  homeTeamAdvancing: VirtualTrajectoryParticipant[]
  awayTeamAdvancing: VirtualTrajectoryParticipant[]
}

export type VirtualMatchResultPointsParticipant = {
  user_id: string
  name: string
  home_score: number
  away_score: number
  points: number
}

export type OfficialMatchTrajectoryBonusParticipant = {
  userId: string
  name: string
  points: number
}

export type OfficialMatchTrajectoryBonusInsights = {
  team: string
  round: KnockoutBonusRound
  roundLabel: string
  points: number
  participants: OfficialMatchTrajectoryBonusParticipant[]
}

export type RankingWithTrajectoryEntry = {
  user_id: string | null
  participant_status?: string
  total_points: number
  exact_predictions: number
  correct_result_predictions: number
  incorrect_predictions?: number
  rank: number
  base_points?: number
  group_points?: number
  knockout_points?: number
  trajectory_bonus?: number
}

const loadPhysicalPredictionRows = unstable_cache(
  async () => {
    const admin = createAdminClient()
    const rows: Required<ScoreRow>[] = []
    const pageSize = 1000
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await admin
        .from('predictions')
        .select('user_id, match_id, home_score, away_score')
        .range(from, from + pageSize - 1)
      if (error) throw error
      const page = (data ?? []) as Required<ScoreRow>[]
      rows.push(...page)
      if (page.length < pageSize) break
    }
    return rows
  },
  ['public-physical-prediction-rows'],
  { revalidate: 60 }
)

function teamKey(team: string | null | undefined) {
  return String(team ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function getActualQualifiedTeam(match: Match) {
  if (match.status !== 'finished') return null
  if (match.qualified_team) return match.qualified_team
  if (match.home_score == null || match.away_score == null) return null
  if (match.home_score > match.away_score) return match.home_team
  if (match.away_score > match.home_score) return match.away_team
  return null
}

function bonusRoundForQualifiedStage(stage: Match['stage']): KnockoutBonusRound | null {
  if (stage === 'round_of_32') return 'round_of_16'
  if (stage === 'round_of_16') return 'quarterfinal'
  if (stage === 'quarter') return 'semifinal'
  if (stage === 'semi') return 'final'
  if (stage === 'final') return 'champion'
  return null
}

function bonusRoundLabel(round: KnockoutBonusRound) {
  if (round === 'round_of_32') return '16avos'
  if (round === 'round_of_16') return 'Octavos'
  if (round === 'quarterfinal') return 'Cuartos'
  if (round === 'semifinal') return 'Semis'
  if (round === 'final') return 'Final'
  return 'Campeón'
}

export async function getPredictionInsightsByMatch(): Promise<Record<string, PredictionInsights>> {
  const rows = await loadPhysicalPredictionRows()
  const grouped = new Map<string, ScoreRow[]>()
  for (const row of rows) {
    const bucket = grouped.get(row.match_id) ?? []
    bucket.push(row)
    grouped.set(row.match_id, bucket)
  }

  return Object.fromEntries([...grouped].map(([matchId, predictions]) => {
    const insights = emptyPredictionInsights()
    const scores = new Map<string, number>()
    for (const prediction of predictions) {
      if (prediction.home_score > prediction.away_score) insights.home_count++
      else if (prediction.home_score < prediction.away_score) insights.away_count++
      else insights.draw_count++
      insights.avg_home_score += prediction.home_score
      insights.avg_away_score += prediction.away_score
      if (prediction.away_score > 0) insights.away_goal_count++
      if (prediction.away_score === 0) insights.clean_sheet_home_count++
      const key = `${prediction.home_score}-${prediction.away_score}`
      scores.set(key, (scores.get(key) ?? 0) + 1)
    }
    insights.total_count = predictions.length
    insights.distinct_results_count = scores.size
    if (predictions.length) {
      insights.avg_home_score /= predictions.length
      insights.avg_away_score /= predictions.length
    }
    const orderedScores = [...scores.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    const most = orderedScores[0]
    const least = [...orderedScores].sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))[0]
    if (most) {
      const [home, away] = most[0].split('-').map(Number)
      insights.most_picked_home_score = home
      insights.most_picked_away_score = away
      insights.most_picked_count = most[1]
    }
    if (least) {
      const [home, away] = least[0].split('-').map(Number)
      insights.least_picked_home_score = home
      insights.least_picked_away_score = away
      insights.least_picked_count = least[1]
    }
    return [matchId, insights]
  }))
}

const loadTrajectoryRows = unstable_cache(
  async () => {
    const admin = createAdminClient()
    const [predictions, tiebreakers, profiles, virtualPredictions] = await Promise.all([
      loadPhysicalPredictionRows(),
      admin.from('user_prediction_tiebreakers').select('user_id, tiebreaker_key, team'),
      admin.from('profiles').select('id, name'),
      (async () => {
        const rows: VirtualPredictionRow[] = []
        const pageSize = 1000
        for (let from = 0; ; from += pageSize) {
          const { data, error } = await admin
            .from('virtual_knockout_predictions')
            .select('user_id, virtual_match_id, home_score, away_score, tiebreaker_team')
            .range(from, from + pageSize - 1)
          // El bloque sigue funcionando sin marcador virtual mientras el grant
          // nuevo todavía no haya sido aplicado en un entorno existente.
          if (error?.code === '42501') return []
          if (error) throw error
          const page = (data ?? []) as VirtualPredictionRow[]
          rows.push(...page)
          if (page.length < pageSize) break
        }
        return rows
      })(),
    ])
    if (tiebreakers.error) throw tiebreakers.error
    if (profiles.error) throw profiles.error
    return {
      predictions,
      tiebreakers: (tiebreakers.data ?? []) as TiebreakerRow[],
      profiles: (profiles.data ?? []) as ProfileRow[],
      virtualPredictions,
    }
  },
  ['public-round-of-32-trajectory-rows-v3'],
  { revalidate: 60 }
)

export async function getVirtualMatchTrajectoryInsights(
  matches: Match[],
  matchId: string
): Promise<VirtualMatchTrajectoryInsights | null> {
  const official = matches.find((match) => match.id === matchId)
  if (!official || official.stage === 'group' || official.stage === 'third_place') return null

  const rows = await loadTrajectoryRows()
  const nameById = new Map(rows.profiles.map((profile) => [profile.id, profile.name]))
  const predictionsByUser = new Map<string, Required<ScoreRow>[]>()
  for (const prediction of rows.predictions) {
    const bucket = predictionsByUser.get(prediction.user_id) ?? []
    bucket.push(prediction)
    predictionsByUser.set(prediction.user_id, bucket)
  }
  const tiebreakersByUser = new Map<string, TiebreakerRow[]>()
  for (const tiebreaker of rows.tiebreakers) {
    const bucket = tiebreakersByUser.get(tiebreaker.user_id) ?? []
    bucket.push(tiebreaker)
    tiebreakersByUser.set(tiebreaker.user_id, bucket)
  }

  const virtualPredictionByUser = new Map(
    rows.virtualPredictions
      .filter((prediction) => prediction.virtual_match_id === matchId)
      .map((prediction) => [prediction.user_id, prediction])
  )
  const exactCrossing: VirtualTrajectoryParticipant[] = []
  const bothTeamsOtherCrossing: VirtualTrajectoryParticipant[] = []
  const homeTeamOnly: VirtualTrajectoryParticipant[] = []
  const awayTeamOnly: VirtualTrajectoryParticipant[] = []
  const homeTeamAdvancing: VirtualTrajectoryParticipant[] = []
  const awayTeamAdvancing: VirtualTrajectoryParticipant[] = []
  const userIds = new Set([
    ...predictionsByUser.keys(),
    ...rows.virtualPredictions.map((prediction) => prediction.user_id),
  ])

  for (const userId of userIds) {
    const predictions = predictionsByUser.get(userId) ?? []
    const userVirtualPredictions = rows.virtualPredictions.filter(
      (prediction) => prediction.user_id === userId
    )
    const tiebreakerMap = Object.fromEntries(
      [
        ...(tiebreakersByUser.get(userId) ?? []).map((row) => [row.tiebreaker_key, row.team] as const),
        ...userVirtualPredictions
          .filter((prediction) => prediction.tiebreaker_team)
          .map((prediction) => [prediction.virtual_match_id, prediction.tiebreaker_team!] as const),
      ]
    )
    const auditPredictions: Prediction[] = [
      ...predictions.map((prediction) => ({
        id: `${userId}-${prediction.match_id}`,
        user_id: userId,
        match_id: prediction.match_id,
        home_score: prediction.home_score,
        away_score: prediction.away_score,
        points: null,
        tiebreaker_team: null,
        created_at: '',
        updated_at: '',
      })),
      ...userVirtualPredictions.map((prediction) => ({
        id: `${userId}-${prediction.virtual_match_id}`,
        user_id: userId,
        match_id: prediction.virtual_match_id,
        home_score: prediction.home_score,
        away_score: prediction.away_score,
        points: null,
        tiebreaker_team: prediction.tiebreaker_team,
        created_at: '',
        updated_at: '',
      })),
    ]
    const auditRows = buildMatchAuditRows(matches, auditPredictions, tiebreakerMap)
    const crossing = auditRows.find((row) => row.match.id === matchId)
    if (!crossing) continue

    const stageRows = auditRows.filter(
      (row) => row.stage === official.stage && row.prediction
    )
    const predictedStageTeams = new Set(
      stageRows.flatMap((row) => [teamKey(row.predictedHome), teamKey(row.predictedAway)])
    )
    const predictedAdvancingTeams = new Set(
      stageRows.flatMap((row) => {
        if (!row.prediction) return []
        if (row.prediction.home_score > row.prediction.away_score) return [teamKey(row.predictedHome)]
        if (row.prediction.away_score > row.prediction.home_score) return [teamKey(row.predictedAway)]
        const tiebreaker = tiebreakerMap[row.match.id] ?? row.prediction.tiebreaker_team
        return tiebreaker ? [teamKey(tiebreaker)] : []
      })
    )
    const homeHit = predictedStageTeams.has(teamKey(official.home_team))
    const awayHit = predictedStageTeams.has(teamKey(official.away_team))
    const userName = nameById.get(userId) ?? 'Participante'
    const savedPrediction = virtualPredictionByUser.get(userId)
    const classifiedTeam = savedPrediction
      ? savedPrediction.home_score > savedPrediction.away_score
        ? official.home_team
        : savedPrediction.away_score > savedPrediction.home_score
        ? official.away_team
        : savedPrediction.tiebreaker_team
      : null
    const participant: VirtualTrajectoryParticipant = {
      userId,
      name: userName,
      prediction: savedPrediction
        ? {
            homeScore: savedPrediction.home_score,
            awayScore: savedPrediction.away_score,
            tiebreakerTeam: savedPrediction.tiebreaker_team,
            classifiedTeam,
          }
        : null,
    }
    if (crossing.crossMatches === true) exactCrossing.push(participant)
    else if (homeHit && awayHit) bothTeamsOtherCrossing.push(participant)
    else if (homeHit) homeTeamOnly.push(participant)
    else if (awayHit) awayTeamOnly.push(participant)

    if (predictedAdvancingTeams.has(teamKey(official.home_team))) homeTeamAdvancing.push(participant)
    if (predictedAdvancingTeams.has(teamKey(official.away_team))) awayTeamAdvancing.push(participant)
  }

  const sort = (items: VirtualTrajectoryParticipant[]) =>
    items.sort((a, b) => a.name.localeCompare(b.name, 'es'))
  return {
    instanceLabel: getKnockoutStageLabel(official.stage),
    nextRoundLabel: getQualifiedTeamRoundLabelForStage(official.stage),
    trajectoryPoints: getTrajectoryTeamPointsForStage(official.stage),
    advancePoints: getQualifiedTeamPointsForStage(official.stage),
    exactCrossing: sort(exactCrossing),
    bothTeamsOtherCrossing: sort(bothTeamsOtherCrossing),
    homeTeamOnly: sort(homeTeamOnly),
    awayTeamOnly: sort(awayTeamOnly),
    homeTeamAdvancing: sort(homeTeamAdvancing),
    awayTeamAdvancing: sort(awayTeamAdvancing),
  }
}

export async function getVirtualMatchResultPointsBreakdown(
  matches: Match[],
  matchId: string
): Promise<VirtualMatchResultPointsParticipant[]> {
  const official = matches.find((match) => match.id === matchId)
  if (!official || official.stage === 'group' || official.status !== 'finished') return []

  const rows = await loadTrajectoryRows()
  const nameById = new Map(rows.profiles.map((profile) => [profile.id, profile.name]))
  const targetPredictions = rows.virtualPredictions.filter(
    (prediction) => prediction.virtual_match_id === matchId
  )

  return targetPredictions.flatMap((targetPrediction) => {
    const userId = targetPrediction.user_id
    const physicalPredictions = rows.predictions.filter((prediction) => prediction.user_id === userId)
    const virtualPredictions = rows.virtualPredictions.filter((prediction) => prediction.user_id === userId)
    const predictions: Prediction[] = [
      ...physicalPredictions.map((prediction) => ({
        id: `physical-${prediction.match_id}-${userId}`,
        user_id: userId,
        match_id: prediction.match_id,
        home_score: prediction.home_score,
        away_score: prediction.away_score,
        points: null,
        tiebreaker_team: null,
        created_at: '',
        updated_at: '',
      })),
      ...virtualPredictions.map((prediction) => ({
        id: `virtual-${prediction.virtual_match_id}-${userId}`,
        user_id: userId,
        match_id: prediction.virtual_match_id,
        home_score: prediction.home_score,
        away_score: prediction.away_score,
        points: null,
        tiebreaker_team: prediction.tiebreaker_team,
        created_at: '',
        updated_at: '',
      })),
    ]
    const tiebreakers = Object.fromEntries([
      ...rows.tiebreakers
        .filter((row) => row.user_id === userId)
        .map((row) => [row.tiebreaker_key, row.team]),
      ...virtualPredictions
        .filter((prediction) => prediction.tiebreaker_team?.trim())
        .map((prediction) => [prediction.virtual_match_id, prediction.tiebreaker_team!.trim()]),
    ])
    const auditRow = buildMatchAuditRows(matches, predictions, tiebreakers)
      .find((row) => row.match.id === matchId)

    if (!auditRow || auditRow.crossMatches !== true || auditRow.resultPoints == null) return []

    return [{
      user_id: userId,
      name: nameById.get(userId) ?? 'Participante',
      home_score: targetPrediction.home_score,
      away_score: targetPrediction.away_score,
      points: auditRow.resultPoints,
    }]
  }).sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

export async function getOfficialMatchTrajectoryBonusInsights(
  matches: Match[],
  matchId: string
): Promise<OfficialMatchTrajectoryBonusInsights | null> {
  const official = matches.find((match) => match.id === matchId)
  if (!official) return null
  if (official.stage === 'group' || official.stage === 'third_place') return null
  if (official.status !== 'finished') return null

  const actualQualifiedTeam = getActualQualifiedTeam(official)
  if (!actualQualifiedTeam) return null

  const round = bonusRoundForQualifiedStage(official.stage)
  if (!round) return null

  const points = getQualifiedTeamPointsForStage(official.stage)
  if (points <= 0) return null

  const rows = await loadTrajectoryRows()
  const nameById = new Map(rows.profiles.map((profile) => [profile.id, profile.name]))
  const predictionsByUser = new Map<string, Required<ScoreRow>[]>()
  for (const prediction of rows.predictions) {
    const bucket = predictionsByUser.get(prediction.user_id) ?? []
    bucket.push(prediction)
    predictionsByUser.set(prediction.user_id, bucket)
  }
  const tiebreakersByUser = new Map<string, TiebreakerRow[]>()
  for (const tiebreaker of rows.tiebreakers) {
    const bucket = tiebreakersByUser.get(tiebreaker.user_id) ?? []
    bucket.push(tiebreaker)
    tiebreakersByUser.set(tiebreaker.user_id, bucket)
  }

  const userIds = new Set<string>([
    ...predictionsByUser.keys(),
    ...rows.virtualPredictions.map((prediction) => prediction.user_id),
  ])
  const participants: OfficialMatchTrajectoryBonusParticipant[] = []

  for (const userId of userIds) {
    const userPredictions = predictionsByUser.get(userId) ?? []
    const userVirtualPredictions = rows.virtualPredictions.filter((prediction) => prediction.user_id === userId)

    const predictionMap = Object.fromEntries([
      ...userPredictions.map((prediction) => [
        prediction.match_id,
        { home_score: prediction.home_score, away_score: prediction.away_score },
      ]),
      ...userVirtualPredictions.map((prediction) => [
        prediction.virtual_match_id,
        { home_score: prediction.home_score, away_score: prediction.away_score },
      ]),
    ])
    const historicalTiebreakers = Object.fromEntries([
      ...(tiebreakersByUser.get(userId) ?? []).map((row) => [row.tiebreaker_key, row.team]),
      ...userVirtualPredictions
        .filter((prediction) => prediction.tiebreaker_team?.trim())
        .map((prediction) => [prediction.virtual_match_id, prediction.tiebreaker_team!.trim()]),
    ])

    const ledger = buildRoundOf32BonusLedger({
      userId,
      matches,
      predictionMap,
      historicalTiebreakers,
    })

    const awarded = ledger.find((item) =>
      item.awarded &&
      item.round === round &&
      item.points === points &&
      teamKey(item.team) === teamKey(actualQualifiedTeam)
    )

    if (!awarded) continue

    participants.push({
      userId,
      name: nameById.get(userId) ?? 'Participante',
      points: awarded.points,
    })
  }

  participants.sort((a, b) => a.name.localeCompare(b.name, 'es'))

  return {
    team: actualQualifiedTeam,
    round,
    roundLabel: bonusRoundLabel(round),
    points,
    participants,
  }
}

export async function addConfirmedTrajectoryToRanking<T extends RankingWithTrajectoryEntry>(
  entries: T[],
  matches: Match[],
  options: { includeKnockoutScoring?: boolean } = {}
): Promise<T[]> {
  const rows = await loadTrajectoryRows()
  const visibleMatches = getTournamentVisibleMatches(matches)
  const predictionsByUser = new Map<string, Required<ScoreRow>[]>()
  for (const prediction of rows.predictions) {
    const bucket = predictionsByUser.get(prediction.user_id) ?? []
    bucket.push(prediction)
    predictionsByUser.set(prediction.user_id, bucket)
  }
  const tiebreakersByUser = new Map<string, TiebreakerRow[]>()
  for (const tiebreaker of rows.tiebreakers) {
    const bucket = tiebreakersByUser.get(tiebreaker.user_id) ?? []
    bucket.push(tiebreaker)
    tiebreakersByUser.set(tiebreaker.user_id, bucket)
  }

  const enriched = entries.map((entry) => {
    const currentBasePoints = Number(entry.base_points ?? entry.total_points ?? 0)
    if (!entry.user_id) {
      return {
        ...entry,
        base_points: currentBasePoints,
        group_points: currentBasePoints,
        knockout_points: 0,
        trajectory_bonus: 0,
        total_points: currentBasePoints,
      }
    }
    const userPredictions = predictionsByUser.get(entry.user_id) ?? []
    const userVirtualPredictions = rows.virtualPredictions.filter((prediction) => prediction.user_id === entry.user_id)

    const predictionMap = Object.fromEntries([
      ...userPredictions.map((prediction) => [
        prediction.match_id,
        { home_score: prediction.home_score, away_score: prediction.away_score },
      ]),
      ...userVirtualPredictions.map((prediction) => [
        prediction.virtual_match_id,
        { home_score: prediction.home_score, away_score: prediction.away_score },
      ]),
    ])
    const historicalTiebreakers = Object.fromEntries([
      ...(tiebreakersByUser.get(entry.user_id) ?? []).map((row) => [row.tiebreaker_key, row.team]),
      ...userVirtualPredictions
        .filter((prediction) => prediction.tiebreaker_team?.trim())
        .map((prediction) => [prediction.virtual_match_id, prediction.tiebreaker_team!.trim()]),
    ])
    const auditPredictions: Prediction[] = [
      ...userPredictions.map((prediction) => ({
        id: `${entry.user_id}-${prediction.match_id}`,
        user_id: entry.user_id!,
        match_id: prediction.match_id,
        home_score: prediction.home_score,
        away_score: prediction.away_score,
        points: null,
        tiebreaker_team: null,
        created_at: '',
        updated_at: '',
      })),
      ...userVirtualPredictions.map((prediction) => ({
        id: `${prediction.user_id}-${prediction.virtual_match_id}`,
        user_id: prediction.user_id,
        match_id: prediction.virtual_match_id,
        home_score: prediction.home_score,
        away_score: prediction.away_score,
        points: null,
        tiebreaker_team: prediction.tiebreaker_team,
        created_at: '',
        updated_at: '',
      })),
    ]
    const knockoutRows = options.includeKnockoutScoring === false
      ? []
      : buildMatchAuditRows(visibleMatches, auditPredictions, historicalTiebreakers)
          .filter((row) => row.stage !== 'group' && row.points != null)
    // El bonus de trayectoria se suma abajo desde el ledger. Acá sólo entra el
    // puntaje de marcador para evitar contabilizar el avance dos veces.
    const knockoutPoints = knockoutRows.reduce((total, row) => total + (row.resultPoints ?? 0), 0)
    const basePoints = currentBasePoints + knockoutPoints
    const bonus = summarizeKnockoutBonus(buildRoundOf32BonusLedger({
      userId: entry.user_id,
      matches: visibleMatches,
      predictionMap,
      historicalTiebreakers,
    })).points
    return {
      ...entry,
      base_points: basePoints,
      group_points: currentBasePoints,
      knockout_points: knockoutPoints,
      trajectory_bonus: bonus,
      total_points: basePoints + bonus,
      exact_predictions: entry.exact_predictions + knockoutRows.filter((row) => row.status === 'exact').length,
      correct_result_predictions: entry.correct_result_predictions + knockoutRows.filter((row) => row.status === 'partial').length,
      incorrect_predictions: (entry.incorrect_predictions ?? 0) + knockoutRows.filter((row) => row.status === 'incorrect').length,
    }
  })

  const byStatus = new Map<string, typeof enriched>()
  for (const entry of enriched) {
    const status = entry.participant_status ?? 'confirmed'
    const bucket = byStatus.get(status) ?? []
    bucket.push(entry)
    byStatus.set(status, bucket)
  }
  const ranked: typeof enriched = []
  for (const bucket of byStatus.values()) {
    bucket.sort((a, b) =>
      b.total_points - a.total_points ||
      b.exact_predictions - a.exact_predictions ||
      b.correct_result_predictions - a.correct_result_predictions ||
      (a.incorrect_predictions ?? 0) - (b.incorrect_predictions ?? 0)
    )
    let rank = 0
    let previousKey = ''
    for (const entry of bucket) {
      const key = `${entry.total_points}:${entry.exact_predictions}:${entry.correct_result_predictions}:${entry.incorrect_predictions ?? 0}`
      if (key !== previousKey) {
        rank += 1
        previousKey = key
      }
      ranked.push({ ...entry, rank })
    }
  }
  return ranked.sort((a, b) =>
    String(a.participant_status ?? '').localeCompare(String(b.participant_status ?? '')) ||
    a.rank - b.rank
  ) as T[]
}

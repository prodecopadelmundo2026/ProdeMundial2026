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
import { knockoutPNum } from '@/lib/bracket'
import { SPECIAL_AWARD_CATEGORIES, SPECIAL_AWARDS_TOURNAMENT_KEY, type SpecialAwardCategory } from '@/lib/special-awards'
import { buildSpecialAwardPreviews, type SpecialAwardPreviewWinner } from '@/lib/special-awards-preview'

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
type SpecialBetRow = { user_id: string; balon: string | null; bota: string | null; guante: string | null }
type SpecialAwardNormalizationRow = {
  category: SpecialAwardCategory
  raw_normalized: string
  player_id: string | null
  status: 'matched' | 'no_match' | 'review'
}
type SpecialAwardPlayerRow = {
  id: string
  display_name: string
  country_name: string | null
  country_code: string | null
}
type SpecialAwardResultRow = {
  id: string
  category: SpecialAwardCategory
  status: 'draft' | 'confirmed' | 'locked'
}
type SpecialAwardWinnerRow = {
  special_bet_result_id: string
  player_id: string
}
type AuthorizedEmailRow = {
  email: string
  active: boolean | null
  status: 'trial' | 'confirmed' | 'disabled' | null
  deleted_at: string | null
}
type ProfileEmailRow = {
  id: string
  email: string | null
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
  status: Match['status']
  qualifiedTeam: string | null
  instanceLabel: string
  nextRoundLabel: string
  trajectoryPoints: number
  advancePoints: number
  totalEvaluated: number
  exactCrossing: VirtualTrajectoryParticipant[]
  bothTeamsOtherCrossing: VirtualTrajectoryParticipant[]
  homeTeamOnly: VirtualTrajectoryParticipant[]
  awayTeamOnly: VirtualTrajectoryParticipant[]
  noTeamMatch: VirtualTrajectoryParticipant[]
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
  name?: string
  total_points: number
  exact_predictions: number
  correct_result_predictions: number
  incorrect_predictions?: number
  rank: number
  base_points?: number
  group_points?: number
  knockout_points?: number
  trajectory_bonus?: number
  special_awards_bonus?: number
  special_awards_breakdown?: SpecialAwardsBreakdown
}

export type SpecialAwardsBreakdown = Record<SpecialAwardCategory, number> & { total: number }

function emptySpecialAwardsBreakdown(): SpecialAwardsBreakdown {
  return { balon: 0, bota: 0, guante: 0, total: 0 }
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

function isUnresolvedTeam(team: string | null | undefined) {
  const key = teamKey(team)
  return (
    !key ||
    /\bgrupo\s+[a-l]/.test(key) ||
    key.startsWith('ganador ') ||
    key.startsWith('perdedor ') ||
    key.includes('mejor 3')
  )
}

function pNumFromMatchId(matchId: string) {
  const match = matchId.match(/^virtual-p(\d+)$/)
  return match ? Number(match[1]) : null
}

function virtualMatchIdFor(match: Match) {
  const pNum = knockoutPNum(match)
  return pNum == null ? match.id : `virtual-p${pNum}`
}

function sameLogicalMatch(match: Match, matchId: string) {
  const requestedPNum = pNumFromMatchId(matchId)
  const matchPNum = knockoutPNum(match)
  return (
    match.id === matchId ||
    match.database_id === matchId ||
    (requestedPNum != null && matchPNum === requestedPNum)
  )
}

function predictedWinnerFromAuditRow(
  row: ReturnType<typeof buildMatchAuditRows>[number],
  tiebreakerMap: Record<string, string>
) {
  if (!row.prediction || isUnresolvedTeam(row.predictedHome) || isUnresolvedTeam(row.predictedAway)) return null
  if (row.prediction.home_score > row.prediction.away_score) return row.predictedHome
  if (row.prediction.away_score > row.prediction.home_score) return row.predictedAway
  const rowVirtualMatchId = virtualMatchIdFor(row.match)
  const tiebreaker = tiebreakerMap[row.match.id] ?? tiebreakerMap[rowVirtualMatchId] ?? row.prediction.tiebreaker_team
  if (teamKey(tiebreaker) === teamKey(row.predictedHome)) return row.predictedHome
  if (teamKey(tiebreaker) === teamKey(row.predictedAway)) return row.predictedAway
  return null
}

function predictedLoserFromAuditRow(
  row: ReturnType<typeof buildMatchAuditRows>[number],
  tiebreakerMap: Record<string, string>
) {
  const winner = predictedWinnerFromAuditRow(row, tiebreakerMap)
  if (!winner) return null
  if (teamKey(winner) === teamKey(row.predictedHome)) return row.predictedAway
  if (teamKey(winner) === teamKey(row.predictedAway)) return row.predictedHome
  return null
}

function personalTeamsForTargetSlot(
  official: Match,
  crossing: ReturnType<typeof buildMatchAuditRows>[number],
  auditRows: ReturnType<typeof buildMatchAuditRows>,
  tiebreakerMap: Record<string, string>
) {
  if (
    crossing.prediction &&
    !isUnresolvedTeam(crossing.predictedHome) &&
    !isUnresolvedTeam(crossing.predictedAway)
  ) {
    return { home: crossing.predictedHome, away: crossing.predictedAway }
  }

  const pNum = knockoutPNum(official)
  if (pNum !== 103 && pNum !== 104) return null

  const p101 = auditRows.find((row) => knockoutPNum(row.match) === 101)
  const p102 = auditRows.find((row) => knockoutPNum(row.match) === 102)
  if (!p101?.prediction || !p102?.prediction) return null

  const home = pNum === 103
    ? predictedLoserFromAuditRow(p101, tiebreakerMap)
    : predictedWinnerFromAuditRow(p101, tiebreakerMap)
  const away = pNum === 103
    ? predictedLoserFromAuditRow(p102, tiebreakerMap)
    : predictedWinnerFromAuditRow(p102, tiebreakerMap)

  if (!home || !away || isUnresolvedTeam(home) || isUnresolvedTeam(away)) return null
  return { home, away }
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
  if (round === 'third_place') return 'Tercer puesto'
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
  const official = matches.find((match) => sameLogicalMatch(match, matchId))
  if (!official || official.stage === 'group') return null
  const virtualMatchId = virtualMatchIdFor(official)

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
      .filter((prediction) => prediction.virtual_match_id === virtualMatchId)
      .map((prediction) => [prediction.user_id, prediction])
  )
  const exactCrossing: VirtualTrajectoryParticipant[] = []
  const bothTeamsOtherCrossing: VirtualTrajectoryParticipant[] = []
  const homeTeamOnly: VirtualTrajectoryParticipant[] = []
  const awayTeamOnly: VirtualTrajectoryParticipant[] = []
  const noTeamMatch: VirtualTrajectoryParticipant[] = []
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
    const crossing = auditRows.find(
      (row) => row.match.id === official.id || row.match.id === virtualMatchId || row.match.database_id === matchId || sameLogicalMatch(row.match, virtualMatchId)
    )
    if (!crossing) continue
    const targetTeams = personalTeamsForTargetSlot(official, crossing, auditRows, tiebreakerMap)
    if (!targetTeams) continue

    const stageRows = auditRows.filter(
      (row) =>
        row.stage === official.stage &&
        row.prediction &&
        !isUnresolvedTeam(row.predictedHome) &&
        !isUnresolvedTeam(row.predictedAway)
    )
    const predictedStageTeams = new Set(
      stageRows.flatMap((row) => [teamKey(row.predictedHome), teamKey(row.predictedAway)])
    )
    predictedStageTeams.add(teamKey(targetTeams.home))
    predictedStageTeams.add(teamKey(targetTeams.away))
    const predictedAdvancingTeams = new Set(
      stageRows.flatMap((row) => {
        if (!row.prediction) return []
        if (row.prediction.home_score > row.prediction.away_score) return [teamKey(row.predictedHome)]
        if (row.prediction.away_score > row.prediction.home_score) return [teamKey(row.predictedAway)]
        const rowVirtualMatchId = virtualMatchIdFor(row.match)
        const tiebreaker = tiebreakerMap[row.match.id] ?? tiebreakerMap[rowVirtualMatchId] ?? row.prediction.tiebreaker_team
        return tiebreaker ? [teamKey(tiebreaker)] : []
      })
    )
    const homeHit = predictedStageTeams.has(teamKey(official.home_team))
    const awayHit = predictedStageTeams.has(teamKey(official.away_team))
    const exactCrossingHit =
      teamKey(targetTeams.home) === teamKey(official.home_team) &&
      teamKey(targetTeams.away) === teamKey(official.away_team)
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
    if (exactCrossingHit) exactCrossing.push(participant)
    else if (homeHit && awayHit) bothTeamsOtherCrossing.push(participant)
    else if (homeHit) homeTeamOnly.push(participant)
    else if (awayHit) awayTeamOnly.push(participant)
    else noTeamMatch.push(participant)

    if (predictedAdvancingTeams.has(teamKey(official.home_team))) homeTeamAdvancing.push(participant)
    if (predictedAdvancingTeams.has(teamKey(official.away_team))) awayTeamAdvancing.push(participant)
  }

  const sort = (items: VirtualTrajectoryParticipant[]) =>
    items.sort((a, b) => a.name.localeCompare(b.name, 'es'))
  const totalEvaluated =
    exactCrossing.length +
    bothTeamsOtherCrossing.length +
    homeTeamOnly.length +
    awayTeamOnly.length +
    noTeamMatch.length
  return {
    status: official.status,
    qualifiedTeam: official.qualified_team ?? null,
    instanceLabel: getKnockoutStageLabel(official.stage),
    nextRoundLabel: getQualifiedTeamRoundLabelForStage(official.stage),
    trajectoryPoints: getTrajectoryTeamPointsForStage(official.stage),
    advancePoints: getQualifiedTeamPointsForStage(official.stage),
    totalEvaluated,
    exactCrossing: sort(exactCrossing),
    bothTeamsOtherCrossing: sort(bothTeamsOtherCrossing),
    homeTeamOnly: sort(homeTeamOnly),
    awayTeamOnly: sort(awayTeamOnly),
    noTeamMatch: sort(noTeamMatch),
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

  const enrichedWithTrajectory = entries.map((entry) => {
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

  const enriched = await addConfirmedSpecialAwardsToRanking(enrichedWithTrajectory)
  return rankRankingEntries(enriched)
}

export async function addConfirmedSpecialAwardsToRanking<T extends RankingWithTrajectoryEntry>(entries: T[]): Promise<T[]> {
  if (entries.length === 0) return []

  const admin = createAdminClient()
  const [
    { data: specialBets, error: specialBetsError },
    { data: normalizations, error: normalizationsError },
    { data: players, error: playersError },
    { data: results, error: resultsError },
    { data: authorizedEmails, error: authorizedEmailsError },
    { data: profiles, error: profilesError },
  ] = await Promise.all([
    admin.from('special_bets').select('user_id, balon, bota, guante'),
    admin
      .from('special_bet_normalizations')
      .select('category, raw_normalized, player_id, status')
      .eq('tournament_key', SPECIAL_AWARDS_TOURNAMENT_KEY),
    admin.from('players').select('id, display_name, country_name, country_code'),
    admin
      .from('special_bet_results')
      .select('id, category, status')
      .eq('tournament_key', SPECIAL_AWARDS_TOURNAMENT_KEY)
      .in('status', ['confirmed', 'locked']),
    admin
      .from('authorized_emails')
      .select('email, active, status, deleted_at')
      .eq('active', true)
      .eq('status', 'confirmed')
      .is('deleted_at', null),
    admin.from('profiles').select('id, email'),
  ])

  if (specialBetsError) throw specialBetsError
  if (normalizationsError) throw normalizationsError
  if (playersError) throw playersError
  if (resultsError) throw resultsError
  if (authorizedEmailsError) throw authorizedEmailsError
  if (profilesError) throw profilesError

  const confirmedResults = (results ?? []) as SpecialAwardResultRow[]
  const resultIds = confirmedResults.map((result) => result.id)
  const { data: winners, error: winnersError } = resultIds.length > 0
    ? await admin
        .from('special_bet_result_winners')
        .select('special_bet_result_id, player_id')
        .in('special_bet_result_id', resultIds)
    : { data: [], error: null }

  if (winnersError) throw winnersError

  const playersById = new Map(((players ?? []) as SpecialAwardPlayerRow[]).map((player) => [player.id, player]))
  const winnersByResultId = new Map<string, SpecialAwardPreviewWinner[]>()
  for (const winner of (winners ?? []) as SpecialAwardWinnerRow[]) {
    const player = playersById.get(winner.player_id)
    if (!player) continue
    const bucket = winnersByResultId.get(winner.special_bet_result_id) ?? []
    bucket.push({
      playerId: player.id,
      displayName: player.display_name,
      countryName: player.country_name ?? '',
      countryCode: player.country_code ?? '',
    })
    winnersByResultId.set(winner.special_bet_result_id, bucket)
  }

  const resultInput = Object.fromEntries(
    SPECIAL_AWARD_CATEGORIES.map((category) => {
      const result = confirmedResults.find((item) => item.category === category) ?? null
      return [category, {
        status: result?.status ?? 'pending',
        winners: result ? (winnersByResultId.get(result.id) ?? []) : [],
      }]
    })
  ) as Parameters<typeof buildSpecialAwardPreviews>[0]['results']
  const eligibleEmails = new Set(
    ((authorizedEmails ?? []) as AuthorizedEmailRow[])
      .filter((row) => row.active === true && row.status === 'confirmed' && !row.deleted_at)
      .map((row) => row.email.trim().toLowerCase())
      .filter(Boolean)
  )
  const eligibleUserIds = new Set(
    ((profiles ?? []) as ProfileEmailRow[])
      .filter((profile) => {
        const email = profile.email?.trim().toLowerCase()
        return Boolean(email && eligibleEmails.has(email))
      })
      .map((profile) => profile.id)
  )

  const previews = buildSpecialAwardPreviews({
    participants: entries
      .filter((entry) => entry.user_id && eligibleUserIds.has(entry.user_id))
      .map((entry) => ({
        userId: entry.user_id!,
        name: entry.name ?? 'Participante',
        email: null,
      })),
    bets: ((specialBets ?? []) as SpecialBetRow[]).map((bet) => ({
      userId: bet.user_id,
      balon: bet.balon,
      bota: bet.bota,
      guante: bet.guante,
    })),
    normalizations: ((normalizations ?? []) as SpecialAwardNormalizationRow[]).map((normalization) => ({
      category: normalization.category,
      rawNormalized: normalization.raw_normalized,
      playerId: normalization.player_id,
      status: normalization.status,
    })),
    players: ((players ?? []) as SpecialAwardPlayerRow[]).map((player) => ({
      id: player.id,
      displayName: player.display_name,
      countryName: player.country_name ?? '',
      countryCode: player.country_code ?? '',
    })),
    results: resultInput,
  })

  const breakdownByUser = new Map<string, SpecialAwardsBreakdown>()
  for (const category of SPECIAL_AWARD_CATEGORIES) {
    for (const hit of previews[category].hits) {
      const breakdown = breakdownByUser.get(hit.userId) ?? emptySpecialAwardsBreakdown()
      breakdown[category] = previews[category].pointsPerHit
      breakdown.total = breakdown.balon + breakdown.bota + breakdown.guante
      breakdownByUser.set(hit.userId, breakdown)
    }
  }

  return entries.map((entry) => {
    const breakdown = entry.user_id ? (breakdownByUser.get(entry.user_id) ?? emptySpecialAwardsBreakdown()) : emptySpecialAwardsBreakdown()
    const baseTotal = Number(entry.total_points ?? 0) - Number(entry.special_awards_bonus ?? 0)
    return {
      ...entry,
      special_awards_bonus: breakdown.total,
      special_awards_breakdown: breakdown,
      total_points: baseTotal + breakdown.total,
    }
  })
}

function rankRankingEntries<T extends RankingWithTrajectoryEntry>(entries: T[]): T[] {
  const byStatus = new Map<string, T[]>()
  for (const entry of entries) {
    const status = entry.participant_status ?? 'confirmed'
    const bucket = byStatus.get(status) ?? []
    bucket.push(entry)
    byStatus.set(status, bucket)
  }
  const ranked: T[] = []
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
  )
}

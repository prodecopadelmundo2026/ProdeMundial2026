import type { Match, Prediction, RankingEntry } from '@/types'
import { buildMatchAuditRows } from '@/lib/ranking-audit'
import { buildRoundOf32CrossingAudit } from '@/lib/knockout-bonus'

export type StatisticsParticipant = { user_id: string; name: string; avatar_url: string | null }
export type StatisticsPhase = 'all' | 'group' | 'knockout'
export type PhaseMetrics = { points: number; exact: number; signs: number; bonus: number }
export type StatisticsSnapshotEntry = {
  userId: string
  name: string
  rank: number
  rankChange: number
  ranks: Record<StatisticsPhase, number>
  rankChanges: Record<StatisticsPhase, number>
  metrics: Record<StatisticsPhase, PhaseMetrics>
  changes: Record<StatisticsPhase, PhaseMetrics>
}
export type DateMatchStat = {
  id: string
  homeTeam: string
  awayTeam: string
  homeScore: number
  awayScore: number
  stage: Match['stage']
  group: string | null
  exact: string[]
  partial: string[]
  incorrect: string[]
}
export type StatisticsSnapshot = { date: string; label: string; entries: StatisticsSnapshotEntry[]; matches: DateMatchStat[] }
export type StatisticsCard = {
  key: string
  title: string
  value: string
  detail: string
  winners: Array<{ userId: string; name: string; value: string }>
}
export type StatisticsData = {
  participants: StatisticsParticipant[]
  snapshots: StatisticsSnapshot[]
  serious: StatisticsCard[]
  curious: StatisticsCard[]
}

type TiebreakersByUser = Map<string, Record<string, string>>
type MetricRow = StatisticsParticipant & {
  exact: number; signs: number; drawsHit: number; winnersHit: number
  groupPoints: number; knockoutPoints: number; bonus: number; crosses: number
  goals: number; draws: number; conservative: number; goalDiffAverage: number
}

function argentinaDay(value: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date(value))
}

function dayLabel(value: string) {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires', day: '2-digit', month: 'short',
  }).format(new Date(`${value}T12:00:00-03:00`))
}

function emptyMetrics(): PhaseMetrics {
  return { points: 0, exact: 0, signs: 0, bonus: 0 }
}

function summarizeRows(rows: ReturnType<typeof buildMatchAuditRows>): PhaseMetrics {
  const scored = rows.filter((row) => row.prediction && row.match.status === 'finished')
  return {
    points: scored.reduce((sum, row) => sum + (row.points ?? 0), 0),
    exact: scored.filter((row) => row.status === 'exact').length,
    signs: scored.filter((row) => row.status === 'exact' || row.status === 'partial').length,
    bonus: scored.reduce((sum, row) => sum + row.qualifiedPoints, 0),
  }
}

function cutoffMatches(matches: Match[], date: string) {
  return matches.map((match) => match.status === 'finished' && argentinaDay(match.scheduled_at) <= date
    ? match
    : { ...match, status: 'upcoming' as const, home_score: null, away_score: null, qualified_team: null })
}

function rankEntries(entries: StatisticsSnapshotEntry[], phase: StatisticsPhase) {
  const sorted = [...entries].sort((a, b) => {
    const am = a.metrics[phase]
    const bm = b.metrics[phase]
    return bm.points - am.points || bm.exact - am.exact || bm.signs - am.signs || a.name.localeCompare(b.name)
  })
  let rank = 0
  return sorted.map((entry, index) => {
    const current = entry.metrics[phase]
    const prior = sorted[index - 1]?.metrics[phase]
    if (!prior || prior.points !== current.points || prior.exact !== current.exact || prior.signs !== current.signs) rank += 1
    return { ...entry, rank }
  })
}

function makeCard<T extends { user_id: string; name: string }>(
  key: string, title: string, items: T[], getValue: (item: T) => number,
  format: (value: number) => string, detail: string, mode: 'max' | 'min' = 'max'
): StatisticsCard {
  if (!items.length) return { key, title, value: '—', detail, winners: [] }
  const values = items.map(getValue)
  const best = mode === 'max' ? Math.max(...values) : Math.min(...values)
  return {
    key, title, value: format(best), detail,
    winners: items.filter((item) => getValue(item) === best).map((item) => ({
      userId: item.user_id, name: item.name, value: format(getValue(item)),
    })),
  }
}

export function buildStatisticsData({
  matches, predictions, participants, tiebreakersByUser,
}: {
  matches: Match[]
  predictions: Prediction[]
  participants: StatisticsParticipant[]
  tiebreakersByUser: TiebreakersByUser
}): StatisticsData {
  const predictionsByUser = new Map<string, Prediction[]>()
  for (const prediction of predictions) {
    const bucket = predictionsByUser.get(prediction.user_id) ?? []
    bucket.push(prediction)
    predictionsByUser.set(prediction.user_id, bucket)
  }
  const active = participants.filter((participant) => (predictionsByUser.get(participant.user_id)?.length ?? 0) > 0)
  const finishedDays = [...new Set(matches.filter((match) => match.status === 'finished').map((match) => argentinaDay(match.scheduled_at)))].sort()
  const previousByPhase: Record<StatisticsPhase, Map<string, { rank: number; metrics: PhaseMetrics }>> = {
    all: new Map(), group: new Map(), knockout: new Map(),
  }

  const snapshots = finishedDays.map((date) => {
    const dailyMatches = cutoffMatches(matches, date)
    const baseEntries = active.map((participant): StatisticsSnapshotEntry => {
      const rows = buildMatchAuditRows(
        dailyMatches, predictionsByUser.get(participant.user_id) ?? [], tiebreakersByUser.get(participant.user_id) ?? {}
      )
      const group = summarizeRows(rows.filter((row) => row.match.stage === 'group'))
      const knockout = summarizeRows(rows.filter((row) => row.match.stage !== 'group'))
      return {
        userId: participant.user_id, name: participant.name, rank: 0, rankChange: 0,
        ranks: { all: 0, group: 0, knockout: 0 },
        rankChanges: { all: 0, group: 0, knockout: 0 },
        metrics: {
          all: {
            points: group.points + knockout.points, exact: group.exact + knockout.exact,
            signs: group.signs + knockout.signs, bonus: group.bonus + knockout.bonus,
          },
          group, knockout,
        },
        changes: { all: emptyMetrics(), group: emptyMetrics(), knockout: emptyMetrics() },
      }
    })

    const rankedAll = rankEntries(baseEntries, 'all')
    for (const phase of ['all', 'group', 'knockout'] as const) {
      const rankedPhase = rankEntries(baseEntries, phase)
      const rankByUser = new Map(rankedPhase.map((entry) => [entry.userId, entry.rank]))
      for (const entry of rankedAll) {
        const prior = previousByPhase[phase].get(entry.userId)
        const metric = entry.metrics[phase]
        const previousMetric = prior?.metrics ?? emptyMetrics()
        const currentRank = rankByUser.get(entry.userId) ?? entry.rank
        entry.ranks[phase] = currentRank
        entry.rankChanges[phase] = prior ? prior.rank - currentRank : 0
        entry.changes[phase] = {
          points: metric.points - previousMetric.points,
          exact: metric.exact - previousMetric.exact,
          signs: metric.signs - previousMetric.signs,
          bonus: metric.bonus - previousMetric.bonus,
        }
        if (phase === 'all') entry.rankChange = entry.rankChanges.all
      }
      previousByPhase[phase] = new Map(rankedPhase.map((entry) => [
        entry.userId, { rank: entry.rank, metrics: entry.metrics[phase] },
      ]))
    }

    const matchesOfDate = matches.filter((match) => match.status === 'finished' && argentinaDay(match.scheduled_at) === date)
    const dateMatchStats = matchesOfDate.flatMap((match): DateMatchStat[] => {
      if (match.home_score == null || match.away_score == null) return []
      const exact: string[] = []
      const partial: string[] = []
      const incorrect: string[] = []
      for (const participant of active) {
        const row = buildMatchAuditRows(
          dailyMatches, predictionsByUser.get(participant.user_id) ?? [], tiebreakersByUser.get(participant.user_id) ?? {}
        ).find((item) => item.match.id === match.id)
        if (!row?.prediction) continue
        if (row.status === 'exact') exact.push(participant.name)
        else if (row.status === 'partial') partial.push(participant.name)
        else incorrect.push(participant.name)
      }
      return [{
        id: match.id, homeTeam: match.home_team, awayTeam: match.away_team,
        homeScore: match.home_score, awayScore: match.away_score, stage: match.stage, group: match.group,
        exact, partial, incorrect,
      }]
    })
    return { date, label: dayLabel(date), entries: rankedAll, matches: dateMatchStats }
  })

  const metrics: MetricRow[] = active.map((participant) => {
    const userPredictions = predictionsByUser.get(participant.user_id) ?? []
    const rows = buildMatchAuditRows(matches, userPredictions, tiebreakersByUser.get(participant.user_id) ?? {})
      .filter((row) => row.match.status === 'finished' && row.prediction)
    const groupRows = rows.filter((row) => row.match.stage === 'group')
    const knockoutRows = rows.filter((row) => row.match.stage !== 'group')
    const crossingAudit = buildRoundOf32CrossingAudit({
      matches,
      predictionMap: Object.fromEntries(userPredictions.map((prediction) => [
        prediction.match_id, { home_score: prediction.home_score, away_score: prediction.away_score },
      ])),
      historicalTiebreakers: tiebreakersByUser.get(participant.user_id) ?? {},
    })
    const raw = userPredictions.filter((prediction) =>
      matches.some((match) => match.id === prediction.match_id) || prediction.match_id.startsWith('virtual-p'))
    return {
      ...participant,
      exact: rows.filter((row) => row.status === 'exact').length,
      signs: rows.filter((row) => row.status === 'exact' || row.status === 'partial').length,
      drawsHit: rows.filter((row) => row.match.home_score === row.match.away_score && row.prediction!.home_score === row.prediction!.away_score).length,
      winnersHit: rows.filter((row) => row.match.home_score !== row.match.away_score &&
        Math.sign(Number(row.match.home_score) - Number(row.match.away_score)) === Math.sign(row.prediction!.home_score - row.prediction!.away_score)).length,
      groupPoints: groupRows.reduce((sum, row) => sum + (row.points ?? 0), 0),
      knockoutPoints: knockoutRows.reduce((sum, row) => sum + (row.points ?? 0), 0),
      bonus: knockoutRows.reduce((sum, row) => sum + row.qualifiedPoints, 0),
      crosses: crossingAudit.filter((row) => row.correct).length,
      goals: raw.reduce((sum, prediction) => sum + prediction.home_score + prediction.away_score, 0),
      draws: raw.filter((prediction) => prediction.home_score === prediction.away_score).length,
      conservative: raw.filter((prediction) =>
        (prediction.home_score === 1 && prediction.away_score === 0) ||
        (prediction.home_score === 0 && prediction.away_score === 1) ||
        (prediction.home_score === 1 && prediction.away_score === 1)).length,
      goalDiffAverage: raw.length
        ? raw.reduce((sum, prediction) => sum + Math.abs(prediction.home_score - prediction.away_score), 0) / raw.length : 0,
    }
  })

  const timelineRows = active.map((participant) => {
    const entries = snapshots.flatMap((snapshot) => {
      const entry = snapshot.entries.find((item) => item.userId === participant.user_id)
      return entry ? [entry] : []
    })
    return {
      ...participant,
      leaderDays: entries.filter((entry) => entry.rank === 1).length,
      top3Days: entries.filter((entry) => entry.rank <= 3).length,
      bestRise: Math.max(0, ...entries.map((entry) => entry.rankChange)),
      worstFall: Math.max(0, ...entries.map((entry) => -entry.rankChange)),
      bestDayPoints: Math.max(0, ...entries.map((entry) => entry.changes.all.points)),
      bestDayExact: Math.max(0, ...entries.map((entry) => entry.changes.all.exact)),
    }
  })

  const serious = [
    makeCard('leader-days', 'Líder más días', timelineRows, (m) => m.leaderDays, (v) => `${v} días`, 'Fechas cerradas en el primer puesto'),
    makeCard('best-rise', 'Mayor subida en un día', timelineRows, (m) => m.bestRise, (v) => `${v} puestos`, 'Mayor salto positivo entre fechas'),
    makeCard('worst-fall', 'Mayor caída en un día', timelineRows, (m) => m.worstFall, (v) => `${v} puestos`, 'Mayor retroceso entre fechas'),
    makeCard('best-day', 'Mejor día individual', timelineRows, (m) => m.bestDayPoints, (v) => `${v} pts`, 'Máximo puntaje obtenido en una fecha'),
    makeCard('day-points', 'Más puntos en una fecha', timelineRows, (m) => m.bestDayPoints, (v) => `${v} pts`, 'Récord diario de puntos'),
    makeCard('day-exact', 'Más exactas en una fecha', timelineRows, (m) => m.bestDayExact, String, 'Récord diario de resultados exactos'),
    makeCard('top3-days', 'Más veces en top 3', timelineRows, (m) => m.top3Days, (v) => `${v} días`, 'Presencias diarias en el podio'),
    makeCard('exact', 'Más resultados exactos', metrics, (m) => m.exact, String, 'Marcadores acertados al detalle'),
    makeCard('signs', 'Más signos acertados', metrics, (m) => m.signs, String, 'Exactas + resultados parciales'),
    makeCard('draws-hit', 'Más empates acertados', metrics, (m) => m.drawsHit, String, 'Empates oficiales bien previstos'),
    makeCard('winners-hit', 'Más ganadores acertados', metrics, (m) => m.winnersHit, String, 'Ganadores oficiales bien previstos'),
    makeCard('groups', 'Mejor en grupos', metrics, (m) => m.groupPoints, (v) => `${v} pts`, 'Puntaje acumulado en fase de grupos'),
    makeCard('knockout', 'Mejor en eliminatorias', metrics, (m) => m.knockoutPoints, (v) => `${v} pts`, 'Incluye los bonus aplicables'),
    makeCard('bonus', 'Más bonus de eliminatorias', metrics, (m) => m.bonus, (v) => `${v} pts`, 'Puntos por clasificados y trayectoria'),
    makeCard('crosses', 'Más cruces exactos', metrics, (m) => m.crosses, String, 'Cruces ubicados correctamente'),
    makeCard('fewest-crosses', 'Menos cruces exactos', metrics, (m) => m.crosses, String, 'Entre participantes con Prode cargado', 'min'),
  ]
  const curious = [
    makeCard('scorer', 'El más goleador', metrics, (m) => m.goals, (v) => `${v} goles`, 'Mayor suma de goles pronosticados'),
    makeCard('stingy', 'El más amarrete', metrics, (m) => m.goals, (v) => `${v} goles`, 'Menor suma de goles pronosticados', 'min'),
    makeCard('draw-king', 'Rey del empate', metrics, (m) => m.draws, String, 'Más empates pronosticados'),
    makeCard('anti-draw', 'Anti empate', metrics, (m) => m.draws, String, 'Menos empates pronosticados', 'min'),
    makeCard('conservative', 'El conservador', metrics, (m) => m.conservative, String, 'Más 1-0, 0-1 o 1-1'),
    makeCard('kamikaze', 'El kamikaze', metrics, (m) => m.goalDiffAverage, (v) => v.toFixed(2), 'Mayor diferencia de gol promedio'),
    makeCard('nostradamus', 'El nostradamus', metrics, (m) => m.exact, String, 'Más resultados exactos'),
    makeCard('cross-specialist', 'Especialista en cruces', metrics, (m) => m.crosses, String, 'Más cruces exactos'),
  ]
  return { participants: active, snapshots, serious, curious }
}

export function rankingMatchesLatestSnapshot(snapshot: StatisticsSnapshot | undefined, ranking: RankingEntry[]) {
  if (!snapshot) return true
  return ranking.filter((entry) => entry.user_id && snapshot.entries.some((item) => item.userId === entry.user_id))
    .every((entry) => snapshot.entries.find((item) => item.userId === entry.user_id)?.metrics.all.points === entry.total_points)
}

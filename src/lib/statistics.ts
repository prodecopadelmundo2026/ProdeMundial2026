import type { Match, Prediction, RankingEntry } from '@/types'
import { buildMatchAuditRows } from '@/lib/ranking-audit'
import { buildRoundOf32CrossingAudit } from '@/lib/knockout-bonus'

export type StatisticsParticipant = {
  user_id: string
  name: string
  avatar_url: string | null
}

export type StatisticsSnapshotEntry = {
  userId: string
  name: string
  rank: number
  points: number
  rankChange: number
  pointsChange: number
  exact: number
  signs: number
  bonus: number
}

export type StatisticsSnapshot = {
  date: string
  label: string
  entries: StatisticsSnapshotEntry[]
}

export type StatisticsCard = {
  key: string
  title: string
  name: string
  value: string
  detail: string
}

export type StatisticsData = {
  snapshots: StatisticsSnapshot[]
  serious: StatisticsCard[]
  curious: StatisticsCard[]
}

type TiebreakersByUser = Map<string, Record<string, string>>

function argentinaDay(value: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value))
}

function dayLabel(value: string) {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit',
    month: 'short',
  }).format(new Date(`${value}T12:00:00-03:00`))
}

function rankRows(rows: Omit<StatisticsSnapshotEntry, 'rank' | 'rankChange' | 'pointsChange'>[]) {
  const sorted = [...rows].sort((a, b) =>
    b.points - a.points ||
    b.exact - a.exact ||
    b.signs - a.signs ||
    a.name.localeCompare(b.name)
  )
  let rank = 0
  return sorted.map((row, index) => {
    const previous = sorted[index - 1]
    if (!previous || previous.points !== row.points || previous.exact !== row.exact || previous.signs !== row.signs) {
      rank += 1
    }
    return { ...row, rank, rankChange: 0, pointsChange: 0 }
  })
}

function cutoffMatches(matches: Match[], date: string) {
  return matches.map((match) => {
    const belongsToCutoff = match.status === 'finished' && argentinaDay(match.scheduled_at) <= date
    return belongsToCutoff
      ? match
      : { ...match, status: 'upcoming' as const, home_score: null, away_score: null, qualified_team: null }
  })
}

function names(items: Array<{ name: string }>) {
  return items.map((item) => item.name).join(', ') || 'Sin datos'
}

function card<T extends { name: string }>(
  key: string,
  title: string,
  items: T[],
  value: (item: T) => number,
  format: (best: number) => string,
  detail: string,
  mode: 'max' | 'min' = 'max'
): StatisticsCard {
  if (!items.length) return { key, title, name: 'Sin datos', value: '—', detail }
  const values = items.map(value)
  const best = mode === 'max' ? Math.max(...values) : Math.min(...values)
  return { key, title, name: names(items.filter((item) => value(item) === best)), value: format(best), detail }
}

export function buildStatisticsData({
  matches,
  predictions,
  participants,
  tiebreakersByUser,
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

  const activeParticipants = participants.filter((participant) => (predictionsByUser.get(participant.user_id)?.length ?? 0) > 0)
  const finishedDays = [...new Set(
    matches.filter((match) => match.status === 'finished').map((match) => argentinaDay(match.scheduled_at))
  )].sort()

  let previous = new Map<string, StatisticsSnapshotEntry>()
  const snapshots = finishedDays.map((date) => {
    const dailyMatches = cutoffMatches(matches, date)
    const ranked = rankRows(activeParticipants.map((participant) => {
      const rows = buildMatchAuditRows(
        dailyMatches,
        predictionsByUser.get(participant.user_id) ?? [],
        tiebreakersByUser.get(participant.user_id) ?? {}
      )
      return {
        userId: participant.user_id,
        name: participant.name,
        points: rows.reduce((sum, row) => sum + (row.points ?? 0), 0),
        exact: rows.filter((row) => row.status === 'exact').length,
        signs: rows.filter((row) => row.status === 'exact' || row.status === 'partial').length,
        bonus: rows.reduce((sum, row) => sum + row.qualifiedPoints, 0),
      }
    })).map((entry) => {
      const prior = previous.get(entry.userId)
      return {
        ...entry,
        rankChange: prior ? prior.rank - entry.rank : 0,
        pointsChange: prior ? entry.points - prior.points : entry.points,
      }
    })
    previous = new Map(ranked.map((entry) => [entry.userId, entry]))
    return { date, label: dayLabel(date), entries: ranked }
  })

  const metrics = activeParticipants.map((participant) => {
    const userPredictions = predictionsByUser.get(participant.user_id) ?? []
    const rows = buildMatchAuditRows(matches, userPredictions, tiebreakersByUser.get(participant.user_id) ?? {})
      .filter((row) => row.match.status === 'finished')
    const scoredRows = rows.filter((row) => row.prediction)
    const groupRows = scoredRows.filter((row) => row.match.stage === 'group')
    const knockoutRows = scoredRows.filter((row) => row.match.stage !== 'group')
    const crossingAudit = buildRoundOf32CrossingAudit({
      matches,
      predictionMap: Object.fromEntries(userPredictions.map((prediction) => [
        prediction.match_id,
        { home_score: prediction.home_score, away_score: prediction.away_score },
      ])),
      historicalTiebreakers: tiebreakersByUser.get(participant.user_id) ?? {},
    })
    const raw = userPredictions.filter((prediction) => {
      const match = matches.find((item) => item.id === prediction.match_id)
      return Boolean(match) || prediction.match_id.startsWith('virtual-p')
    })
    const goals = raw.reduce((sum, prediction) => sum + prediction.home_score + prediction.away_score, 0)
    const conservative = raw.filter((prediction) =>
      (prediction.home_score === 1 && prediction.away_score === 0) ||
      (prediction.home_score === 0 && prediction.away_score === 1) ||
      (prediction.home_score === 1 && prediction.away_score === 1)
    ).length
    return {
      ...participant,
      exact: scoredRows.filter((row) => row.status === 'exact').length,
      signs: scoredRows.filter((row) => row.status === 'exact' || row.status === 'partial').length,
      drawsHit: scoredRows.filter((row) =>
        row.match.home_score === row.match.away_score &&
        row.prediction!.home_score === row.prediction!.away_score
      ).length,
      winnersHit: scoredRows.filter((row) =>
        row.match.home_score !== row.match.away_score &&
        Math.sign(Number(row.match.home_score) - Number(row.match.away_score)) ===
          Math.sign(row.prediction!.home_score - row.prediction!.away_score)
      ).length,
      groupPoints: groupRows.reduce((sum, row) => sum + (row.points ?? 0), 0),
      knockoutPoints: knockoutRows.reduce((sum, row) => sum + (row.points ?? 0), 0),
      bonus: knockoutRows.reduce((sum, row) => sum + row.qualifiedPoints, 0),
      crosses: crossingAudit.filter((row) => row.correct).length,
      goals,
      draws: raw.filter((prediction) => prediction.home_score === prediction.away_score).length,
      conservative,
      goalDiffAverage: raw.length
        ? raw.reduce((sum, prediction) => sum + Math.abs(prediction.home_score - prediction.away_score), 0) / raw.length
        : 0,
      predictions: raw.length,
    }
  })

  const serious = [
    card('exact', 'Más resultados exactos', metrics, (m) => m.exact, String, 'Marcadores acertados al detalle'),
    card('signs', 'Más signos acertados', metrics, (m) => m.signs, String, 'Exactas + resultados parciales'),
    card('draws-hit', 'Más empates acertados', metrics, (m) => m.drawsHit, String, 'Empates oficiales bien previstos'),
    card('winners-hit', 'Más ganadores acertados', metrics, (m) => m.winnersHit, String, 'Ganadores oficiales bien previstos'),
    card('groups', 'Más puntos en grupos', metrics, (m) => m.groupPoints, (v) => `${v} pts`, 'Puntaje acumulado en fase de grupos'),
    card('knockout', 'Más puntos en eliminatorias', metrics, (m) => m.knockoutPoints, (v) => `${v} pts`, 'Incluye los bonus aplicables'),
    card('bonus', 'Más bonus de eliminatorias', metrics, (m) => m.bonus, (v) => `${v} pts`, 'Puntos por clasificados y trayectoria'),
    card('crosses', 'Más cruces exactos', metrics, (m) => m.crosses, String, 'Cruces de 16avos ubicados correctamente'),
    card('fewest-crosses', 'Menos cruces exactos', metrics, (m) => m.crosses, String, 'Entre participantes con Prode cargado', 'min'),
  ]

  const curious = [
    card('scorer', 'El más goleador', metrics, (m) => m.goals, (v) => `${v} goles`, 'Mayor suma de goles pronosticados'),
    card('stingy', 'El más amarrete', metrics, (m) => m.goals, (v) => `${v} goles`, 'Menor suma de goles pronosticados', 'min'),
    card('draw-king', 'Rey del empate', metrics, (m) => m.draws, String, 'Más empates pronosticados'),
    card('anti-draw', 'Anti empate', metrics, (m) => m.draws, String, 'Menos empates pronosticados', 'min'),
    card('conservative', 'El conservador', metrics, (m) => m.conservative, String, 'Más 1-0, 0-1 o 1-1'),
    card('kamikaze', 'El kamikaze', metrics, (m) => m.goalDiffAverage, (v) => v.toFixed(2), 'Mayor diferencia de gol promedio'),
    card('nostradamus', 'El nostradamus', metrics, (m) => m.exact, String, 'Más resultados exactos'),
    card('cross-specialist', 'Especialista en cruces', metrics, (m) => m.crosses, String, 'Más cruces exactos'),
  ]

  return { snapshots, serious, curious }
}

export function rankingMatchesLatestSnapshot(snapshot: StatisticsSnapshot | undefined, ranking: RankingEntry[]) {
  if (!snapshot) return true
  return ranking
    .filter((entry) => entry.user_id && snapshot.entries.some((item) => item.userId === entry.user_id))
    .every((entry) => snapshot.entries.find((item) => item.userId === entry.user_id)?.points === entry.total_points)
}

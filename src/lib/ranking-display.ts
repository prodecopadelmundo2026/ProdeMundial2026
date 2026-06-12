import type { RankingEntry } from '@/types'

type RankingDisplayEntry = Pick<
  RankingEntry,
  'user_id' | 'rank' | 'total_points' | 'exact_predictions' | 'correct_result_predictions' | 'incorrect_predictions'
>

export const RANK_MEDALS: Record<number, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
}

export const PRIZE_TIE_RULES = [
  'Orden: puntos y, si empatan, mayor cantidad de exactas.',
  'Si siguen empatados, comparten el bloque de premio que corresponda.',
  'Si el empate empieza en 3°, comparten solo el tercer premio.',
] as const

export function isSameRankingLine(a: RankingDisplayEntry, b: RankingDisplayEntry) {
  return (
    a.total_points === b.total_points &&
    a.exact_predictions === b.exact_predictions &&
    a.correct_result_predictions === b.correct_result_predictions &&
    (a.incorrect_predictions ?? 0) === (b.incorrect_predictions ?? 0)
  )
}

export function isSharedRank(entry: RankingDisplayEntry, entries: RankingDisplayEntry[]) {
  return entries.some((other) => other.user_id !== entry.user_id && other.rank === entry.rank && isSameRankingLine(other, entry))
}

export function formatRank(entry: RankingDisplayEntry, entries: RankingDisplayEntry[]) {
  const sharedEntries = entries.filter((other) => isSameRankingLine(other, entry))
  if (sharedEntries.length <= 1) return `#${entry.rank}`
  return `#${entry.rank}`
}

export function rankMedal(rank: number, totalPoints = 1) {
  if (totalPoints <= 0) return null
  return RANK_MEDALS[rank] ?? null
}

export function hasPrizeTie(entries: RankingDisplayEntry[]) {
  return entries.some((entry) => {
    const sharedEntries = entries.filter((other) => isSameRankingLine(other, entry))
    if (sharedEntries.length <= 1) return false
    return entry.rank <= 3 && entry.total_points > 0
  })
}

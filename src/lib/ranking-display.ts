import type { RankingEntry } from '@/types'

type RankingDisplayEntry = Pick<
  RankingEntry,
  'user_id' | 'rank' | 'total_points' | 'exact_predictions' | 'correct_result_predictions'
>

export const RANK_MEDALS: Record<number, string> = {
  1: '🥇',
  2: '🥈',
  3: '🥉',
}

export const PRIZE_TIE_RULES = [
  'Empate en 1°: se divide 1° + 2° y el siguiente puesto pasa a 3°.',
  'Empate en 2°: se divide 2° + 3°.',
  'Empate múltiple: se suman los premios involucrados y se dividen entre los empatados.',
] as const

export function isSameRankingLine(a: RankingDisplayEntry, b: RankingDisplayEntry) {
  return (
    a.total_points === b.total_points &&
    a.exact_predictions === b.exact_predictions &&
    a.correct_result_predictions === b.correct_result_predictions
  )
}

export function isSharedRank(entry: RankingDisplayEntry, entries: RankingDisplayEntry[]) {
  return entries.some((other) => other.user_id !== entry.user_id && other.rank === entry.rank && isSameRankingLine(other, entry))
}

export function formatRank(entry: RankingDisplayEntry, entries: RankingDisplayEntry[]) {
  return `${isSharedRank(entry, entries) ? 'T' : '#'}${entry.rank}`
}

export function rankMedal(rank: number) {
  return RANK_MEDALS[rank] ?? null
}

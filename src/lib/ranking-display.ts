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
  'Orden: puntos y, si empatan, mayor cantidad de exactas.',
  'Si siguen empatados, comparten el bloque de premio que corresponda.',
  'Si el empate empieza en 3°, comparten solo el tercer premio.',
] as const

export function isSameRankingLine(a: RankingDisplayEntry, b: RankingDisplayEntry) {
  return (
    a.total_points === b.total_points &&
    a.exact_predictions === b.exact_predictions
  )
}

export function isSharedRank(entry: RankingDisplayEntry, entries: RankingDisplayEntry[]) {
  return entries.some((other) => other.user_id !== entry.user_id && other.rank === entry.rank && isSameRankingLine(other, entry))
}

export function formatRank(entry: RankingDisplayEntry, entries: RankingDisplayEntry[]) {
  const sharedEntries = entries.filter((other) => isSameRankingLine(other, entry))
  if (sharedEntries.length <= 1) return `#${entry.rank}`

  const endRank = entry.rank + sharedEntries.length - 1
  if (entry.rank < 3 && endRank <= 3) return `#${entry.rank}-${endRank}`
  return `#${entry.rank}`
}

export function rankMedal(rank: number) {
  return RANK_MEDALS[rank] ?? null
}

export function hasPrizeTie(entries: RankingDisplayEntry[]) {
  return entries.some((entry) => {
    const sharedEntries = entries.filter((other) => isSameRankingLine(other, entry))
    if (sharedEntries.length <= 1) return false
    return entry.rank <= 3
  })
}

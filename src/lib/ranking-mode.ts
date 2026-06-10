export type RankingMode = 'pre_world_cup' | 'live_world_cup'

export function getRankingMode(finishedMatchesCount: number | null | undefined): RankingMode {
  return (finishedMatchesCount ?? 0) > 0 ? 'live_world_cup' : 'pre_world_cup'
}

export function isLiveRankingMode(mode: RankingMode) {
  return mode === 'live_world_cup'
}

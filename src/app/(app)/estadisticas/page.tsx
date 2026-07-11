import type { Match, Prediction, RankingEntry } from '@/types'
import { createClient } from '@/lib/supabase/server'
import { buildStatisticsData, rankingMatchesLatestSnapshot, type StatisticsParticipant } from '@/lib/statistics'
import { addConfirmedTrajectoryToRanking } from '@/lib/public-prediction-data'
import { StatisticsDashboard } from './StatisticsDashboard'

export const dynamic = 'force-dynamic'

type VirtualPrediction = Omit<Prediction, 'match_id' | 'points'> & {
  virtual_match_id: string
}

type Tiebreaker = {
  user_id: string
  tiebreaker_key: string
  team: string
}

type PublicDetail = {
  participants?: StatisticsParticipant[]
  predictions?: Prediction[]
  virtual_predictions?: VirtualPrediction[]
  tiebreakers?: Tiebreaker[]
}

export default async function StatisticsPage() {
  const supabase = await createClient()
  const [
    { data: { user } },
    { data: rankingData, error: rankingError },
    { data: matchesData, error: matchesError },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.rpc('get_public_ranking'),
    supabase.from('matches').select('*').order('scheduled_at', { ascending: true }),
  ])
  if (rankingError) throw rankingError
  if (matchesError) throw matchesError

  const matches = (matchesData ?? []) as Match[]
  const baseRanking = (rankingData ?? []) as RankingEntry[]
  const ranking = user
    ? await addConfirmedTrajectoryToRanking(baseRanking, matches)
    : baseRanking
  const seedUserId = ranking.find((entry) => entry.user_id)?.user_id
  let detail: PublicDetail = {}
  if (seedUserId) {
    const { data, error } = await supabase.rpc('get_public_prediction_detail', { p_user_id: seedUserId })
    if (error) throw error
    detail = (data ?? {}) as PublicDetail
  }

  const predictions: Prediction[] = [
    ...(detail.predictions ?? []),
    ...(detail.virtual_predictions ?? []).map((prediction) => ({
      ...prediction,
      match_id: prediction.virtual_match_id,
      points: null,
    })),
  ]
  const tiebreakersByUser = new Map<string, Record<string, string>>()
  for (const item of detail.tiebreakers ?? []) {
    const bucket = tiebreakersByUser.get(item.user_id) ?? {}
    bucket[item.tiebreaker_key] = item.team
    tiebreakersByUser.set(item.user_id, bucket)
  }

  const data = buildStatisticsData({
    matches,
    predictions,
    participants: detail.participants ?? [],
    tiebreakersByUser,
    officialRanking: ranking,
  })
  const consistent = rankingMatchesLatestSnapshot(data.snapshots.at(-1), ranking)

  return (
    <div className="px-4 pb-24 pt-10 sm:px-5 sm:pt-14">
      <div className="mx-auto max-w-[1120px]">
        <header className="mb-10 sm:mb-14">
          <span className="font-mono text-[11px] font-extrabold uppercase tracking-[0.22em] text-muted">El Mundial en números</span>
          <h1 className="mt-4 font-display text-[clamp(48px,10vw,104px)] uppercase leading-[.86] tracking-[-0.04em]">
            <em className="not-italic text-orange">Estadísticas</em>
          </h1>
          <p className="mt-5 max-w-[680px] text-[13px] font-medium leading-relaxed text-muted">
            La película completa del Prode: cómo se movió el ranking, quién acertó más y qué audacias quedaron retratadas en los pronósticos.
          </p>
          <div className="mt-5 inline-flex max-w-full items-center gap-2 rounded-full border border-[#A8F0D8]/20 bg-[#A8F0D8]/5 px-3 py-2 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-[#A8F0D8]">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#A8F0D8]" />
            Solo lectura · calculado desde datos existentes{consistent ? '' : ' · histórico estimado'}
          </div>
        </header>
        <StatisticsDashboard data={data} currentUserId={user?.id ?? null} />
      </div>
    </div>
  )
}

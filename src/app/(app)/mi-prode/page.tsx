import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Match } from '@/types'
import { MiProdeTabs } from './MiProdeTabs'
import { SpecialsBanner } from './SpecialsBanner'

type PredRow = {
  match_id: string
  home_score: number
  away_score: number
  points: number | null
  tiebreaker_team: string | null
  match: { status: string } | { status: string }[]
}

export default async function MiProdePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: allMatches }, { data: predictions }] = await Promise.all([
    supabase.from('matches').select('*').order('scheduled_at', { ascending: true }),
    supabase
      .from('predictions')
      .select('match_id, home_score, away_score, points, tiebreaker_team, match:matches(status)')
      .eq('user_id', user.id),
  ])

  const matches = (allMatches ?? []) as Match[]
  const userPredictions = (predictions ?? []) as PredRow[]

  const groupMatches = matches.filter((m) => m.stage === 'group')
  const knockoutMatches = matches.filter((m) => m.stage !== 'group')

  const predMap = Object.fromEntries(
    userPredictions.map((p) => [
      p.match_id,
      { home_score: p.home_score, away_score: p.away_score },
    ])
  )

  const tiebreakerMap = Object.fromEntries(
    userPredictions
      .filter((p) => p.tiebreaker_team)
      .map((p) => [p.match_id, p.tiebreaker_team!])
  )

  const totalPoints = userPredictions.reduce((sum, p) => sum + (p.points ?? 0), 0)
  const finishedCount = userPredictions.filter((p) => {
    const m = Array.isArray(p.match) ? p.match[0] : p.match
    return m?.status === 'finished'
  }).length

  return (
    <div style={{ padding: '32px 20px 100px' }}>
      <div className="max-w-[1280px] mx-auto">
        <SpecialsBanner />

        <MiProdeTabs
          groupMatches={groupMatches}
          knockoutMatches={knockoutMatches}
          predMap={predMap}
          tiebreakerMap={tiebreakerMap}
          totalPoints={totalPoints}
          totalPredictions={userPredictions.length}
          finishedCount={finishedCount}
        />
      </div>
    </div>
  )
}

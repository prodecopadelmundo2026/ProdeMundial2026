import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Match, RankingEntry } from '@/types'
import { MiProdeTabs } from './MiProdeTabs'
import { UserHeader } from './UserHeader'

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

  const [{ data: allMatches }, { data: predictions }, { data: profile }, { data: rankingRow }] = await Promise.all([
    supabase.from('matches').select('*').order('scheduled_at', { ascending: true }),
    supabase
      .from('predictions')
      .select('match_id, home_score, away_score, points, tiebreaker_team, match:matches(status)')
      .eq('user_id', user.id),
    supabase.from('profiles').select('is_admin, name').eq('id', user.id).maybeSingle(),
    supabase.from('ranking_entries').select('*').eq('user_id', user.id).maybeSingle(),
  ])

  const matches = (allMatches ?? []) as Match[]
  const userPredictions = (predictions ?? []) as PredRow[]
  const ranking = rankingRow as RankingEntry | null

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

  const finishedMatchesCount = matches.filter((m) => m.status === 'finished').length

  return (
    <div style={{ padding: '20px 16px clamp(40px, 8vw, 72px)' }}>
      <div className="max-w-[1280px] mx-auto">

        {/* Page head */}
        <div style={{ marginBottom: '20px' }}>
          <span
            className="inline-block font-sans text-[11px] font-extrabold tracking-[0.22em] uppercase text-muted"
            style={{ marginBottom: '10px' }}
          >
            Tus pronósticos
          </span>
          <h1
            className="font-display uppercase leading-[.9] tracking-[-0.04em]"
            style={{ fontSize: 'clamp(40px, 8vw, 96px)' }}
          >
            Mi <em className="not-italic italic" style={{ color: '#FF6B00' }}>Prode</em>
          </h1>
          <p className="font-mono text-[12px] font-bold text-muted tracking-[0.04em] mt-[8px]">
            Mundial 2026 · USA · Canadá · México
          </p>
        </div>

        {/* User stats header */}
        <UserHeader
          name={profile?.name ?? user.email ?? 'Participante'}
          totalPoints={ranking?.total_points ?? 0}
          rank={ranking?.rank ?? null}
          exactPredictions={ranking?.exact_predictions ?? 0}
          partialPredictions={ranking?.correct_result_predictions ?? 0}
          finishedMatchesCount={finishedMatchesCount}
          filledCount={userPredictions.length}
          totalCount={matches.length}
        />

        <MiProdeTabs
          groupMatches={groupMatches}
          knockoutMatches={knockoutMatches}
          predMap={predMap}
          tiebreakerMap={tiebreakerMap}
          isAdmin={Boolean(profile?.is_admin)}
        />
      </div>
    </div>
  )
}

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Match, Prediction } from '@/types'
import { MiProdeTabs } from './MiProdeTabs'

type PredictionWithMatch = Prediction & { match: Match }

export default async function MiProdePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: allMatches }, { data: predictions }] = await Promise.all([
    supabase.from('matches').select('*').order('scheduled_at', { ascending: true }),
    supabase
      .from('predictions')
      .select('*, match:matches(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true }),
  ])

  const matches = (allMatches ?? []) as Match[]
  const userPredictions = (predictions ?? []) as PredictionWithMatch[]

  const groupMatches = matches.filter((m) => m.stage === 'group')
  const knockoutMatches = matches.filter((m) => m.stage !== 'group')

  const predMap = Object.fromEntries(
    userPredictions.map((p) => [
      p.match_id,
      { home_score: p.home_score, away_score: p.away_score },
    ])
  )

  const totalPoints = userPredictions.reduce((sum, p) => sum + (p.points ?? 0), 0)
  const finishedCount = userPredictions.filter((p) => p.match.status === 'finished').length

  return (
    <div className="space-y-8">
      <div className="border-b border-[#272727] pb-6">
        <p className="text-xs tracking-[0.25em] uppercase text-[#c8a84a] mb-2">Mis picks</p>
        <h1
          className="text-4xl font-bold text-[#ede8dc]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Mi Prode
        </h1>
      </div>

      {userPredictions.length === 0 ? (
        <div className="text-center py-16 text-[#7a7266]">
          <p className="text-lg font-medium">Todavía no hiciste ninguna predicción.</p>
          <p className="text-sm mt-1">Entrá al Fixture para predecir resultados.</p>
        </div>
      ) : (
        <MiProdeTabs
          groupMatches={groupMatches}
          knockoutMatches={knockoutMatches}
          predictions={userPredictions}
          predMap={predMap}
          totalPoints={totalPoints}
          totalPredictions={userPredictions.length}
          finishedCount={finishedCount}
        />
      )}
    </div>
  )
}

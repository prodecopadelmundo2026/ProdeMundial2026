import { createClient } from '@/lib/supabase/server'
import type { Match, MatchStage, Prediction } from '@/types'
import { FixtureTabs } from './FixtureTabs'

const STAGE_LABELS: Record<MatchStage, string> = {
  group: 'Grupos',
  round_of_32: '32avos',
  round_of_16: 'Octavos',
  quarter: 'Cuartos',
  semi: 'Semifinal',
  third_place: '3° Puesto',
  final: 'Final',
}

function groupMatches(matches: Match[]): Record<string, Match[]> {
  const grouped: Record<string, Match[]> = {}
  for (const match of matches) {
    const key =
      match.stage === 'group' && match.group
        ? `Grupo ${match.group}`
        : STAGE_LABELS[match.stage]
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(match)
  }
  return grouped
}

export default async function FixturePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const matchesResult = await supabase
    .from('matches')
    .select('*')
    .order('scheduled_at', { ascending: true })

  const predictionsResult = user
    ? await supabase
        .from('predictions')
        .select('match_id, home_score, away_score')
        .eq('user_id', user.id)
    : { data: [] }

  const matchesError = matchesResult.error
  const matches = matchesResult.data
  const predictions = predictionsResult.data

  if (matchesError) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Fixture</h1>
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <p className="font-semibold text-red-700 mb-1">Error al cargar los partidos</p>
          <p className="text-sm text-red-600 font-mono break-all">
            {matchesError.message}
          </p>
          {matchesError.code && (
            <p className="text-xs text-red-400 mt-1">Código: {matchesError.code}</p>
          )}
        </div>
      </div>
    )
  }

  if (!matches || matches.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Fixture</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
          <p className="font-semibold text-yellow-700 mb-1">El fixture se publicará próximamente</p>
          <p className="text-sm text-yellow-600">
            Volvé cuando arranque el torneo para empezar a predecir.
          </p>
        </div>
      </div>
    )
  }

  const predictionMap: Record<string, { home_score: number; away_score: number }> =
    Object.fromEntries(
      ((predictions as Pick<Prediction, 'match_id' | 'home_score' | 'away_score'>[]) ?? []).map(
        (p) => [p.match_id, { home_score: p.home_score!, away_score: p.away_score! }]
      )
    )

  const grouped = groupMatches(matches as Match[])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Fixture</h1>
      <FixtureTabs grouped={grouped} predictions={predictionMap} />
    </div>
  )
}

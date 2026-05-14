import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import clsx from 'clsx'
import type { Match, Prediction } from '@/types'
import { StatusBadge } from '@/components/StatusBadge'

type PredictionWithMatch = Prediction & { match: Match }

function PointsBadge({ points }: { points: number | null }) {
  if (points === null) return null
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums',
        points === 3 && 'bg-green-100 text-green-700',
        points === 1 && 'bg-blue-100 text-blue-700',
        points === 0 && 'bg-gray-100 text-gray-500'
      )}
    >
      {points === 3 ? '⭐ 3 pts' : points === 1 ? '1 pt' : '0 pts'}
    </span>
  )
}

export default async function MiProdePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: predictions } = await supabase
    .from('predictions')
    .select('*, match:matches(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (!predictions?.length) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Mi Prode</h1>
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">Todavía no hiciste ninguna predicción.</p>
          <p className="text-sm mt-1">
            Entrá al Fixture para predecir resultados.
          </p>
        </div>
      </div>
    )
  }

  const totalPoints = (predictions as PredictionWithMatch[]).reduce(
    (sum, p) => sum + (p.points ?? 0),
    0
  )
  const finished = (predictions as PredictionWithMatch[]).filter(
    (p) => p.match.status === 'finished'
  ).length

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Mi Prode</h1>
        <p className="text-sm text-gray-500">
          {predictions.length} predicciones{' '}
          {finished > 0 && (
            <>
              ·{' '}
              <span className="font-semibold text-gray-900">
                {totalPoints} pts
              </span>
            </>
          )}
        </p>
      </div>

      <div className="space-y-3">
        {(predictions as PredictionWithMatch[]).map((pred) => {
          const isFinished = pred.match.status === 'finished'
          return (
            <div
              key={pred.id}
              className="bg-white rounded-xl px-5 py-4 shadow-sm border border-gray-100"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-400">
                  {format(
                    new Date(pred.match.scheduled_at),
                    'd MMM · HH:mm',
                    { locale: es }
                  )}
                </span>
                <StatusBadge match={pred.match} />
              </div>

              {/* Teams */}
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <p className="font-semibold text-gray-800">
                  {pred.match.home_team}{' '}
                  <span className="text-gray-300 font-normal">vs</span>{' '}
                  {pred.match.away_team}
                </p>

                <div className="flex items-center gap-3 text-sm">
                  <span className="text-gray-500">
                    Mi pronóstico:{' '}
                    <span className="font-semibold text-gray-900 tabular-nums">
                      {pred.home_score} - {pred.away_score}
                    </span>
                  </span>

                  {isFinished && (
                    <>
                      <span className="text-gray-200">·</span>
                      <span className="text-gray-500">
                        Real:{' '}
                        <span className="font-semibold text-gray-900 tabular-nums">
                          {pred.match.home_score} - {pred.match.away_score}
                        </span>
                      </span>
                      <PointsBadge points={pred.points} />
                    </>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

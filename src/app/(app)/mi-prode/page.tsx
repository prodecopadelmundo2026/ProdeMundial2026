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
        'inline-flex items-center rounded-sm px-2.5 py-0.5 text-xs font-bold tabular-nums border',
        points === 3 && 'bg-[#c8a84a]/10 border-[#c8a84a]/30 text-[#c8a84a]',
        points === 1 && 'bg-[#1c1c1c] border-[#272727] text-[#7a7266]',
        points === 0 && 'bg-[#1c1c1c] border-[#272727] text-[#3a3630]'
      )}
    >
      {points === 3 ? '3 pts' : points === 1 ? '1 pt' : '0 pts'}
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
        <div className="text-center py-16 text-[#7a7266]">
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
    <div className="space-y-8">
      <div className="border-b border-[#272727] pb-6 flex items-end justify-between">
        <div>
          <p className="text-xs tracking-[0.25em] uppercase text-[#c8a84a] mb-2">Mis picks</p>
          <h1
            className="text-4xl font-bold text-[#ede8dc]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Mi Prode
          </h1>
        </div>
        <p className="text-sm text-[#7a7266] mb-1">
          {predictions.length} predicciones
          {finished > 0 && (
            <>
              {' '}·{' '}
              <span className="font-bold text-[#c8a84a]">
                {totalPoints} pts
              </span>
            </>
          )}
        </p>
      </div>

      <div className="space-y-2">
        {(predictions as PredictionWithMatch[]).map((pred) => {
          const isFinished = pred.match.status === 'finished'
          return (
            <div
              key={pred.id}
              className="bg-[#131313] border border-[#272727] px-5 py-4"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-[#7a7266]">
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
                <p className="font-medium text-[#ede8dc]">
                  {pred.match.home_team}{' '}
                  <span className="text-[#3a3630] font-normal">vs</span>{' '}
                  {pred.match.away_team}
                </p>

                <div className="flex items-center gap-3 text-sm">
                  <span className="text-[#7a7266]">
                    Mi pronóstico:{' '}
                    <span className="font-semibold text-[#ede8dc] tabular-nums">
                      {pred.home_score} - {pred.away_score}
                    </span>
                  </span>

                  {isFinished && (
                    <>
                      <span className="text-[#272727]">·</span>
                      <span className="text-[#7a7266]">
                        Real:{' '}
                        <span className="font-semibold text-[#ede8dc] tabular-nums">
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

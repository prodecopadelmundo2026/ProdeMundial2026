import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { RankingEntry } from '@/types'
import clsx from 'clsx'

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-lg">🥇</span>
  if (rank === 2) return <span className="text-lg">🥈</span>
  if (rank === 3) return <span className="text-lg">🥉</span>
  return <span className="text-gray-400 font-medium tabular-nums">{rank}</span>
}

export default async function RankingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const currentUserId = user.id

  const { data: ranking } = await supabase
    .from('ranking_entries')
    .select('*')
    .order('rank', { ascending: true })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Ranking</h1>

      {!ranking?.length ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">Aún no hay resultados.</p>
          <p className="text-sm mt-1">
            El ranking se actualiza cuando se cargan los resultados.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 text-xs uppercase tracking-wide">
                <th className="px-4 py-3 text-left w-12">#</th>
                <th className="px-4 py-3 text-left">Jugador</th>
                <th className="px-4 py-3 text-right font-semibold">Pts</th>
                <th className="px-4 py-3 text-right hidden sm:table-cell">
                  Exactas
                </th>
                <th className="px-4 py-3 text-right hidden sm:table-cell">
                  Resultado
                </th>
              </tr>
            </thead>
            <tbody>
              {(ranking as RankingEntry[]).map((entry) => {
                const isMe = entry.user_id === currentUserId
                return (
                  <tr
                    key={entry.user_id}
                    className={clsx(
                      'border-b border-gray-50 last:border-0 transition',
                      isMe ? 'bg-green-50' : 'hover:bg-gray-50'
                    )}
                  >
                    <td className="px-4 py-3">
                      <RankIcon rank={entry.rank} />
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {entry.name}
                      {isMe && (
                        <span className="ml-2 text-xs text-green-600 font-normal">
                          (vos)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900 tabular-nums">
                      {entry.total_points}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 hidden sm:table-cell tabular-nums">
                      {entry.exact_predictions}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 hidden sm:table-cell tabular-nums">
                      {entry.correct_result_predictions}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

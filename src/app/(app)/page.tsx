import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/server'
import { hasSupabaseConfig } from '@/lib/supabase/env'
import { StatusBadge } from '@/components/StatusBadge'
import type { Match, RankingEntry } from '@/types'

function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string | number
  sub?: string
}) {
  return (
    <div className="bg-white rounded-xl px-5 py-4 shadow-sm border border-gray-100">
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default async function DashboardPage() {
  if (!hasSupabaseConfig()) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Prode Mundial 2026
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Modo local sin base de datos
          </p>
        </div>

        <section className="rounded-xl border border-yellow-200 bg-yellow-50 p-5">
          <p className="font-semibold text-yellow-800">
            Todavia no esta conectado Supabase.
          </p>
          <p className="mt-1 text-sm text-yellow-700">
            Podes revisar las pantallas publicas: Login, Reglas y Ranking.
          </p>
        </section>
      </div>
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: rankEntry }, { data: upcoming }] = await Promise.all([
    supabase.from('profiles').select('name').eq('id', user.id).maybeSingle(),
    supabase.from('ranking_entries').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('matches').select('*').eq('status', 'upcoming').order('scheduled_at', { ascending: true }).limit(5),
  ])

  const entry = rankEntry as RankingEntry | null

  return (
    <div className="space-y-8">
      {/* Bienvenida */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Hola, {profile?.name ?? 'jugador'} 👋
        </h1>
        <p className="text-gray-400 mt-1 text-sm">
          Mundial 2026 — USA · Canadá · México
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Posición"
          value={entry?.rank ? `#${entry.rank}` : '—'}
        />
        <StatCard
          label="Puntos"
          value={entry?.total_points ?? 0}
        />
        <StatCard
          label="Exactas"
          value={entry?.exact_predictions ?? 0}
          sub="3 puntos c/u"
        />
        <StatCard
          label="Resultado"
          value={entry?.correct_result_predictions ?? 0}
          sub="1 punto c/u"
        />
      </div>

      {/* Próximos partidos */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Próximos partidos
        </h2>

        {!upcoming?.length ? (
          <p className="text-gray-400 text-sm">
            No hay partidos cargados aún.
          </p>
        ) : (
          <div className="space-y-3">
            {(upcoming as Match[]).map((match) => (
              <div
                key={match.id}
                className="bg-white rounded-xl px-5 py-4 shadow-sm border border-gray-100 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 font-semibold text-gray-800 min-w-0">
                  <span className="truncate">{match.home_team}</span>
                  <span className="text-gray-300 text-sm font-normal shrink-0">
                    vs
                  </span>
                  <span className="truncate">{match.away_team}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <StatusBadge match={match} />
                  <span className="text-xs text-gray-400">
                    {format(new Date(match.scheduled_at), 'd MMM · HH:mm', {
                      locale: es,
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

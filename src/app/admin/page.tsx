import Link from 'next/link'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/server'
import type { Match } from '@/types'
import { AdminMatchForm } from './AdminMatchForm'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) redirect('/')

  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .order('scheduled_at', { ascending: true })

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
          <h1 className="text-2xl font-bold text-gray-900">Panel Admin</h1>
          <p className="text-gray-500 text-sm mt-1">Carga de resultados — Prode Mundial 2026</p>
          </div>
          <Link
            href="/admin/whitelist"
            className="inline-flex min-h-10 items-center rounded-lg px-4 text-sm font-bold text-white"
            style={{ backgroundColor: '#0a3d1f' }}
          >
            Lista blanca
          </Link>
        </div>

        {!matches?.length ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
            <p className="text-yellow-700 font-medium">No hay partidos cargados.</p>
            <p className="text-sm text-yellow-600 mt-1">
              Insertá los partidos en Supabase usando el SQL del schema.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {(matches as Match[]).map((match) => (
              <div key={match.id} className="bg-white rounded-xl px-5 py-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {match.home_team} <span className="text-gray-400 font-normal">vs</span> {match.away_team}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {format(new Date(match.scheduled_at), "d MMM yyyy · HH:mm", { locale: es })}
                      {match.home_score !== null && match.away_score !== null && (
                        <span className="ml-2 font-semibold text-gray-600">
                          {match.home_score} - {match.away_score}
                        </span>
                      )}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    match.status === 'finished' ? 'bg-gray-100 text-gray-500' :
                    match.status === 'live' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {match.status === 'finished' ? 'Finalizado' : match.status === 'live' ? 'En vivo' : 'Próximo'}
                  </span>
                </div>
                <AdminMatchForm match={match} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

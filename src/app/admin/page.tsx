import Link from 'next/link'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/server'
import type { Match } from '@/types'
import { AdminMatchForm } from './AdminMatchForm'
import { AdminTestTools } from './AdminTestTools'

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

  const groups: Record<string, Match[]> = {}
  for (const m of (matches ?? []) as Match[]) {
    const key = m.group ? `Grupo ${m.group}` : m.stage.replace('_', ' ')
    if (!groups[key]) groups[key] = []
    groups[key].push(m)
  }

  return (
    <div style={{ padding: '20px 16px clamp(40px, 8vw, 72px)' }}>
      <div className="max-w-[860px] mx-auto">

        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <span
            className="inline-block font-sans text-[11px] font-extrabold tracking-[0.22em] uppercase text-muted"
            style={{ marginBottom: '10px' }}
          >
            Herramienta admin
          </span>
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <h1
              className="font-display uppercase leading-[.9] tracking-[-0.04em]"
              style={{ fontSize: 'clamp(36px, 6vw, 72px)' }}
            >
              Panel <em className="not-italic italic" style={{ color: '#FF6B00' }}>Admin</em>
            </h1>
            <Link
              href="/admin/whitelist"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-extrabold text-[12px] uppercase transition-all duration-150"
              style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', color: '#cfcfcf' }}
            >
              Lista blanca
            </Link>
          </div>
          <p className="font-mono text-[12px] font-bold text-muted tracking-[0.04em] mt-[8px]">
            Carga de resultados · Mundial 2026
          </p>
        </div>

        <AdminTestTools />

        {!matches?.length ? (
          <div
            className="px-5 py-4 rounded-[16px] text-[13px]"
            style={{ background: 'rgba(255,177,92,0.08)', border: '1px solid rgba(255,177,92,0.2)', color: '#FFB15C' }}
          >
            <p className="font-extrabold">No hay partidos cargados.</p>
            <p className="mt-1 text-muted text-[12px]">Insertá los partidos en Supabase usando el SQL del schema.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groups).map(([groupName, groupMatches]) => (
              <div key={groupName}>
                <p
                  className="text-[10px] font-extrabold tracking-[0.2em] uppercase mb-3"
                  style={{ color: '#4a4a4a' }}
                >
                  {groupName.toUpperCase()}
                </p>
                <div className="space-y-2">
                  {groupMatches.map((match) => (
                    <div
                      key={match.id}
                      className="rounded-[16px] overflow-hidden"
                      style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.07)' }}
                    >
                      {/* Match header */}
                      <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <div>
                          <p className="font-extrabold text-[13px] text-white">
                            {match.home_team} <span className="text-muted font-normal">vs</span> {match.away_team}
                          </p>
                          <p className="font-mono text-[11px] text-muted mt-0.5">
                            {format(new Date(match.scheduled_at), "EEE d MMM yyyy · HH:mm", { locale: es })}
                            {match.home_score !== null && match.away_score !== null && (
                              <span className="ml-2 font-extrabold" style={{ color: '#A8F0D8' }}>
                                {match.home_score} — {match.away_score}
                              </span>
                            )}
                          </p>
                        </div>
                        <span
                          className="text-[10px] font-extrabold px-2.5 py-1 rounded-full tracking-[0.08em] uppercase shrink-0"
                          style={
                            match.status === 'finished'
                              ? { background: '#1a1a1a', color: '#4a4a4a' }
                              : match.status === 'live'
                              ? { background: 'rgba(255,59,59,0.12)', color: '#FF6B6B', border: '1px solid rgba(255,59,59,0.2)' }
                              : { background: 'rgba(255,107,0,0.1)', color: '#FF6B00', border: '1px solid rgba(255,107,0,0.2)' }
                          }
                        >
                          {match.status === 'finished' ? 'Finalizado' : match.status === 'live' ? 'En vivo' : 'Próximo'}
                        </span>
                      </div>
                      {/* Form */}
                      <div className="px-5 py-3">
                        <AdminMatchForm match={match} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

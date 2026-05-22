import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { WhitelistForm, type AuthorizedEmailRow } from './WhitelistForm'

type Props = {
  searchParams: Promise<{ q?: string }>
}

export default async function AdminWhitelistPage({ searchParams }: Props) {
  const { q } = await searchParams
  const query = q?.trim() ?? ''

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.is_admin) redirect('/')

  const { data, error } = await supabase.rpc('admin_list_authorized_emails', {
    p_query: query,
  })

  const rows = Array.isArray(data) ? (data as AuthorizedEmailRow[]) : []

  return (
    <div style={{ padding: '20px 16px clamp(40px, 8vw, 72px)' }}>
      <div className="max-w-[860px] mx-auto">
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
              Participantes <em className="not-italic italic" style={{ color: '#FF6B00' }}>Habilitados</em>
            </h1>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-extrabold text-[12px] uppercase transition-all duration-150"
                style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', color: '#cfcfcf' }}
              >
                Volver al inicio
              </Link>
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-extrabold text-[12px] uppercase transition-all duration-150"
                style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', color: '#cfcfcf' }}
              >
                Panel Admin
              </Link>
            </div>
          </div>
          <p className="font-mono text-[12px] font-bold text-muted tracking-[0.04em] mt-[8px]">
            Emails habilitados para participar
          </p>
        </div>

        {error && (
          <div
            className="mb-6 px-5 py-4 rounded-[16px] text-[13px] font-bold"
            style={{ background: 'rgba(255,59,59,0.1)', border: '1px solid rgba(255,59,59,0.2)', color: '#FF6B6B' }}
          >
            Error al cargar participantes: {error.message}
          </div>
        )}

        <WhitelistForm rows={rows} query={query} />
      </div>
    </div>
  )
}

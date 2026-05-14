import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { NavLinks } from './NavLinks'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: rank }] = await Promise.all([
    supabase.from('profiles').select('name').eq('id', user.id).maybeSingle(),
    supabase.from('ranking_entries').select('rank').eq('user_id', user.id).maybeSingle(),
  ])
  const userRank: number | null = (rank as { rank: number } | null)?.rank ?? null

  return (
    <div className="min-h-full flex flex-col">
      <nav
        className="text-white shadow-lg sticky top-0 z-10"
        style={{ backgroundColor: '#0a3d1f' }}
      >
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-6">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-lg shrink-0"
          >
            <Trophy size={20} className="text-yellow-400" />
            <span>Prode 2026</span>
          </Link>

          <div className="flex items-center gap-6">
            <NavLinks />
          </div>

          <div className="flex items-center gap-2 text-sm shrink-0">
            <span className="text-green-300 hidden sm:block">
              {profile?.name}
            </span>
            {userRank && (
              <span className="text-yellow-400 font-bold tabular-nums">
                #{userRank}
              </span>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}

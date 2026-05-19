import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { NavLinks } from './NavLinks'
import { UserMenu } from '@/components/UserMenu'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: profile }, { data: rankRow }] = user
    ? await Promise.all([
        supabase.from('profiles').select('name, is_admin').eq('id', user.id).maybeSingle(),
        supabase
          .from('ranking_entries')
          .select('rank, total_points')
          .eq('user_id', user.id)
          .maybeSingle(),
      ])
    : [{ data: null }, { data: null }]

  const userName = profile?.name ?? 'U'
  const entry = rankRow as { rank: number; total_points: number } | null
  const initial = userName[0]?.toUpperCase() ?? 'U'

  return (
    <div className="min-h-full flex flex-col">
      <header
        className="sticky top-0 z-50 border-b"
        style={{
          background: 'rgba(10,10,10,0.78)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderColor: 'rgba(255,255,255,0.08)',
        }}
      >
        <div className="max-w-[1280px] mx-auto px-5 h-[60px] flex items-center justify-between gap-[18px]">
          {/* Brand */}
          <Link
            href="/"
            className="flex items-center font-display text-[18px] tracking-[-0.02em] shrink-0"
          >
            PRODE <b className="text-orange ml-[6px]">26'</b>
          </Link>

          <NavLinks isLoggedIn={!!user} />

          {/* Right side */}
          <div className="flex items-center gap-[10px] shrink-0">
            {user ? (
              <UserMenu
                initial={initial}
                name={userName}
                pts={entry?.total_points}
                rank={entry?.rank}
                isAdmin={Boolean(profile?.is_admin)}
              />
            ) : (
              <Link
                href="/login"
                className="px-5 py-2 rounded-full font-extrabold text-[14px] tracking-[0.01em] transition-all duration-150"
                style={{
                  background: '#FF6B00',
                  color: '#0A0A0A',
                  boxShadow: '0 6px 18px -8px rgba(255,107,0,.6)',
                }}
              >
                Entrar
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  )
}

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildAuditedRankingEntries } from '@/lib/ranking-audit'
import type { Match, Prediction } from '@/types'
import { NavLinks } from './NavLinks'
import { UserMenu } from '@/components/UserMenu'
import { isSharedRank } from '@/lib/ranking-display'
import { getCurrentProfile } from '@/lib/current-profile'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const admin = user ? createAdminClient() : null

  const [profile, { data: participants }, { data: matches }, { data: predictions }] = user
    ? await Promise.all([
        getCurrentProfile(user),
        supabase.from('ranking_entries').select('user_id, name, avatar_url'),
        supabase.from('matches').select('*').order('scheduled_at', { ascending: true }),
        admin!.from('predictions').select('*'),
      ])
    : [{ data: null }, { data: null }, { data: null }, { data: null }]

  const metadataName =
    typeof user?.user_metadata?.full_name === 'string'
      ? user.user_metadata.full_name
      : typeof user?.user_metadata?.name === 'string'
      ? user.user_metadata.name
      : null
  const emailName = user?.email?.split('@')[0] ?? null
  const userName = profile?.name?.trim() || metadataName?.trim() || emailName || 'Usuario'
  const auditedEntries = user
    ? buildAuditedRankingEntries(
        (matches ?? []) as Match[],
        (predictions ?? []) as Prediction[],
        (participants ?? []).map((participant) => ({
          user_id: participant.user_id,
          name: participant.name,
          avatar_url: participant.avatar_url,
        }))
      )
    : []
  const entry = user ? auditedEntries.find((rankingEntry) => rankingEntry.user_id === user.id) ?? null : null
  const initial = userName[0]?.toUpperCase() ?? 'U'
  const userIsAdmin = Boolean(profile?.is_admin)

  console.info('[app-layout] navbar profile', {
    userId: user?.id ?? null,
    userEmail: user?.email ?? null,
    profile: profile ? { id: profile.id, email: profile.email, name: profile.name, is_admin: profile.is_admin } : null,
    userIsAdmin,
  })

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
        <div className="relative max-w-[1280px] mx-auto px-4 h-[56px] flex items-center justify-between">
          <NavLinks isLoggedIn={!!user} />

          {/* Right side */}
          <div className="flex items-center gap-[10px] shrink-0">
            {user ? (
              <UserMenu
                initial={initial}
                name={userName}
                pts={entry?.total_points}
                rank={entry?.rank}
                sharedRank={entry ? isSharedRank(entry, auditedEntries) : false}
                exact={entry?.exact_predictions}
                isAdmin={userIsAdmin}
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

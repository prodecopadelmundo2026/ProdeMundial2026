import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { RankingEntry } from '@/types'
import { NavLinks } from './NavLinks'
import { UserMenu } from '@/components/UserMenu'
import { ProdeStatusModal } from '@/components/ProdeStatusModal'
import { BonusPollModal } from '@/components/BonusPoll'
import { isSharedRank } from '@/lib/ranking-display'
import { getCurrentProfile } from '@/lib/current-profile'
import { calculatePredictionProgress, type ProdeCompletionStatus } from '@/lib/prode-progress'
import { getBonusPollState } from '@/lib/bonus-poll'

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [profile, { data: publicRanking }, { data: metricsData }, bonusPoll] = user
    ? await Promise.all([
        getCurrentProfile(user),
        supabase.rpc('get_public_ranking'),
        supabase.rpc('get_public_home_metrics'),
        getBonusPollState(supabase),
      ])
    : [null, { data: null }, { data: null }, null]

  const metadataName =
    typeof user?.user_metadata?.full_name === 'string'
      ? user.user_metadata.full_name
      : typeof user?.user_metadata?.name === 'string'
      ? user.user_metadata.name
      : null
  const emailName = user?.email?.split('@')[0] ?? null
  const userName = profile?.name?.trim() || metadataName?.trim() || emailName || 'Usuario'
  const auditedEntries = user ? (publicRanking ?? []) as RankingEntry[] : []
  const entry = user ? auditedEntries.find((rankingEntry) => rankingEntry.user_id === user.id) ?? null : null
  const metricsRows = metricsData as Array<{
    competitors_count?: number
    prodes_completed_count?: number
    prodes_pending_count?: number
    prize_pool_ars?: number
  }> | null
  const metrics = Array.isArray(metricsRows) ? metricsRows[0] : metricsRows
  const rawStatus = entry?.prode_status === 'complete' ? 'completed' : entry?.prode_status
  const progressStatus = (
    rawStatus === 'completed' ||
    rawStatus === 'almost_done' ||
    rawStatus === 'in_progress' ||
    rawStatus === 'not_started'
      ? rawStatus
      : undefined
  ) as ProdeCompletionStatus | undefined
  const fallbackProgress = calculatePredictionProgress({
    groupLoadedCount: entry?.predictions_count ?? 0,
    groupExpectedCount: entry?.predictions_count ? 104 : 0,
  })
  const userProgress = {
    loadedCount: entry?.loaded_count ?? entry?.predictions_count ?? fallbackProgress.loadedCount,
    expectedCount: entry?.expected_count ?? fallbackProgress.expectedCount,
    percentage: entry?.progress_percentage ?? fallbackProgress.percentage,
    status: progressStatus ?? fallbackProgress.status,
    missingSections: entry?.missing_sections ?? fallbackProgress.missingSections,
  }
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
                Ingresar
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>
      {bonusPoll && <BonusPollModal poll={bonusPoll} />}
      {user && entry?.participant_status && (
        <ProdeStatusModal
          userId={user.id}
          participantStatus={entry.participant_status}
          progress={userProgress}
          metrics={{
            confirmedPlayers: metrics?.competitors_count ?? 0,
            prizePoolArs: metrics?.prize_pool_ars ?? 0,
            completedProdes: metrics?.prodes_completed_count ?? 0,
            pendingProdes: metrics?.prodes_pending_count ?? 0,
          }}
        />
      )}
    </div>
  )
}

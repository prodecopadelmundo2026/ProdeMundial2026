import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { MatchCard } from '@/components/MatchCard'
import { CountdownTimer } from '@/components/CountdownTimer'
import type { Match } from '@/types'
import { formatRank, rankMedal } from '@/lib/ranking-display'
import { ReferralShareButton } from '@/components/ReferralShareButton'
import {
  TOURNAMENT_TOTAL_MATCHES,
  TOURNAMENT_TOTAL_TEAMS,
} from '@/lib/tournament-config'
import { WelcomeModal } from '@/components/WelcomeModal'
import { SALES_CONTACTS, whatsappHref } from '@/lib/sales-contacts'
import {
  computeAllStandings,
  computeBestThirdsGroups,
  getPendingGroupTiebreakers,
} from '@/lib/bracket'

export const dynamic = 'force-dynamic'

/* ─── Sub-components ───────────────────────────────────────────── */

function StatItem({ num, label, live }: { num: number | string; label: string; live?: boolean }) {
  const compoundValue = typeof num === 'string' ? num.match(/^(.+)\s+de\s+(.+)$/) : null

  return (
    <div className="min-w-0 flex flex-col gap-1 border-l-[3px] border-bg pl-3 min-[720px]:pl-[14px]">
      <div
        className={
          compoundValue
            ? 'font-display whitespace-nowrap text-[clamp(22px,6vw,30px)] leading-none tracking-[-0.02em] min-[720px]:text-[clamp(30px,4vw,46px)]'
            : 'font-display whitespace-nowrap text-[clamp(24px,7vw,38px)] leading-none tracking-[-0.02em] min-[720px]:text-[clamp(30px,4vw,46px)]'
        }
      >
        {compoundValue ? (
          <>
            <span>{compoundValue[1]}</span>
            <span className="mx-1 align-[0.08em] font-sans text-[0.48em] font-black tracking-[0.02em]">de</span>
            <span>{compoundValue[2]}</span>
          </>
        ) : (
          num
        )}
      </div>
      <div className="max-w-full break-words text-[10px] font-extrabold leading-[1.35] tracking-[0.08em] uppercase min-[720px]:text-[11px] min-[720px]:tracking-[0.16em] min-[1100px]:tracking-[0.22em]">
        {live && (
          <span
            className="inline-block w-[7px] h-[7px] rounded-full bg-bg mr-1.5 align-middle"
            style={{ animation: 'blink 1.2s infinite' }}
          />
        )}
        {label}
      </div>
    </div>
  )
}

function SectionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 font-bold text-[14px] px-[18px] py-3 rounded-full bg-panel transition-colors hover:bg-panel-2 shrink-0"
      style={{ border: '1px solid rgba(255,255,255,0.08)' }}
    >
      {label}
      <svg
        className="w-[18px] h-[18px]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 12h14M13 5l7 7-7 7" />
      </svg>
    </Link>
  )
}

function SectionHead({ title, orange, sub, link }: { title: string; orange: string; sub?: string; link?: { href: string; label: string } }) {
  return (
    <div className="flex items-end justify-between gap-6 flex-wrap mb-9">
      <div>
        <h2
          className="font-display uppercase leading-[0.92] tracking-[-0.03em]"
          style={{ fontSize: 'clamp(36px, 6vw, 68px)' }}
        >
          {title} <em className="italic text-orange">{orange}</em>
        </h2>
        {sub && <p className="text-muted text-[15px] max-w-[420px] leading-relaxed mt-[14px]">{sub}</p>}
      </div>
      {link && <SectionLink href={link.href} label={link.label} />}
    </div>
  )
}

function ContactLinks({ message = 'Hola! Quiero participar del Prode Mundial 2026.' }: { message?: string }) {
  return (
    <div className="grid gap-3 min-[640px]:grid-cols-2">
      {SALES_CONTACTS.map((contact) => (
        <a
          key={contact.phone}
          href={whatsappHref(contact.phone, message)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-[68px] items-center justify-between gap-3 rounded-[16px] border border-mint/20 bg-mint/10 px-4 py-3 text-mint transition-colors hover:bg-mint/15"
        >
          <span className="min-w-0">
            <span className="block truncate text-[14px] font-extrabold text-white">{contact.name}</span>
            <span className="mt-0.5 block truncate text-[12px] font-semibold text-mint">WhatsApp</span>
          </span>
          <span className="shrink-0 rounded-full bg-mint px-3 py-2 text-[12px] font-extrabold text-bg">Escribir</span>
        </a>
      ))}
    </div>
  )
}

type RankingEntry = {
  user_id: string
  name: string
  total_points: number
  rank: number
  exact_predictions: number
  correct_result_predictions: number
  predictions_count?: number
  prode_status?: 'empty' | 'in_progress' | 'complete'
}

type MatchSummary = Pick<Match, 'home_team' | 'away_team' | 'home_score' | 'away_score' | 'stage' | 'status'>
type AuthorizedEmailSummary = {
  email: string
  active: boolean | null
  status: 'trial' | 'confirmed' | 'disabled' | null
  deleted_at: string | null
}
type ProfileSummary = {
  id: string
  email: string | null
}

const PLACEHOLDER_TEAM_PATTERN = /^(ganador|perdedor|winner|loser|\d+\s*(?:[°º]|Â°)?\s*(grupo|group)|[123][a-l]$)/i

function isRealTeamName(team: string) {
  const normalized = team.trim()
  return normalized.length > 0 && !PLACEHOLDER_TEAM_PATTERN.test(normalized)
}

function matchWinner(match: MatchSummary) {
  if (
    match.status !== 'finished' ||
    match.home_score === null ||
    match.away_score === null ||
    match.home_score === match.away_score
  ) {
    return null
  }

  return match.home_score > match.away_score ? match.home_team : match.away_team
}

function hasOfficialScore(match: Match) {
  return match.status === 'finished' && match.home_score != null && match.away_score != null
}

function participantStatus(row: AuthorizedEmailSummary) {
  if (row.status === 'confirmed' || row.status === 'trial' || row.status === 'disabled') return row.status
  return row.active ? 'confirmed' : 'disabled'
}

function countAliveTeams(matches: Match[]) {
  const knockoutMatches = matches.filter((match) => match.stage !== 'group')
  const finishedKnockoutMatches = knockoutMatches.filter(hasOfficialScore)

  if (finishedKnockoutMatches.length > 0) {
    const aliveTeams = new Set<string>()
    for (const match of knockoutMatches) {
      if (!hasOfficialScore(match)) {
        if (isRealTeamName(match.home_team)) aliveTeams.add(match.home_team)
        if (isRealTeamName(match.away_team)) aliveTeams.add(match.away_team)
        continue
      }

      const winner = matchWinner(match)
      if (winner && isRealTeamName(winner)) aliveTeams.add(winner)
    }

    if (aliveTeams.size > 0) return aliveTeams.size
  }

  const groupMatches = matches.filter((match) => match.stage === 'group')
  const officialScoreMap = Object.fromEntries(
    groupMatches
      .filter(hasOfficialScore)
      .map((match) => [match.id, { home_score: match.home_score!, away_score: match.away_score! }])
  )
  const groupsComplete = groupMatches.length > 0 && groupMatches.every(hasOfficialScore)
  const groupsResolved = groupsComplete && getPendingGroupTiebreakers(groupMatches, officialScoreMap).length === 0

  if (groupsResolved) {
    const standings = computeAllStandings(groupMatches, officialScoreMap)
    const bestThirdsGroups = computeBestThirdsGroups(groupMatches, officialScoreMap)
    const aliveTeams = new Set<string>()

    for (const [group, teams] of Object.entries(standings)) {
      for (const team of teams.slice(0, 2)) aliveTeams.add(team)
      const third = teams[2]
      if (third && bestThirdsGroups.has(group.replace('Grupo ', ''))) aliveTeams.add(third)
    }

    if (aliveTeams.size > 0) return aliveTeams.size
  }

  return TOURNAMENT_TOTAL_TEAMS
}

function countFinishedMatches(matches: MatchSummary[]) {
  return matches.filter((match) => match.status === 'finished').length
}

function addStartedProdesFromRows(rows: Array<{ user_id: string }>, allowedUserIds: Set<string>, target: Set<string>) {
  for (const row of rows) {
    if (allowedUserIds.has(row.user_id)) target.add(row.user_id)
  }
}

function addStartedSpecialBets(
  rows: Array<{ user_id: string; balon: string | null; bota: string | null; guante: string | null }>,
  allowedUserIds: Set<string>,
  target: Set<string>
) {
  for (const row of rows) {
    if (allowedUserIds.has(row.user_id) && (row.balon || row.bota || row.guante)) target.add(row.user_id)
  }
}

function countPredictionsByUser(
  predictionRows: Array<{ user_id: string }>,
  virtualPredictionRows: Array<{ user_id: string }>,
  tiebreakerRows: Array<{ user_id: string }>,
  specialBetRows: Array<{ user_id: string; balon: string | null; bota: string | null; guante: string | null }>
) {
  const predictionCounts = new Map<string, number>()
  for (const prediction of predictionRows) {
    predictionCounts.set(prediction.user_id, (predictionCounts.get(prediction.user_id) ?? 0) + 1)
  }
  for (const prediction of virtualPredictionRows) {
    predictionCounts.set(prediction.user_id, (predictionCounts.get(prediction.user_id) ?? 0) + 1)
  }
  for (const tiebreaker of tiebreakerRows) {
    predictionCounts.set(tiebreaker.user_id, (predictionCounts.get(tiebreaker.user_id) ?? 0) + 1)
  }
  for (const specialBet of specialBetRows) {
    if (specialBet.balon || specialBet.bota || specialBet.guante) {
      predictionCounts.set(specialBet.user_id, (predictionCounts.get(specialBet.user_id) ?? 0) + 1)
    }
  }

  return predictionCounts
}

function RankMark({
  entry,
  entries,
  color,
  active = true,
}: {
  entry: RankingEntry
  entries: RankingEntry[]
  color: string
  active?: boolean
}) {
  if (!active) {
    return (
      <span className="font-mono text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted min-[720px]:text-[11px]">
        Sin puntos
      </span>
    )
  }

  const medal = rankMedal(entry.rank)
  return (
    <span className="flex min-w-0 items-center gap-1.5 whitespace-nowrap leading-none" style={{ color }}>
      {medal && <span className="text-[16px] leading-none min-[720px]:text-[18px]" aria-hidden="true">{medal}</span>}
      <span className="font-display text-[20px] leading-none tabular-nums min-[720px]:text-[22px]">
        {formatRank(entry, entries)}
      </span>
    </span>
  )
}

/* ─── Page ─────────────────────────────────────────────────────── */

export default async function HomePage() {
  const supabase = await createClient()
  const admin = createAdminClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)

  const [
    { count: competitorCount },
    { count: guestCount },
    { data: authorizedRows },
    { count: myPredsCount },
    { data: upcoming },
    { data: topRanking },
    { data: profile },
    { data: predictionRows },
    { data: virtualPredictionRows },
    { data: tiebreakerRows },
    { data: specialBetRows },
    { data: allMatchRows },
  ] = await Promise.all([
    admin
      .from('authorized_emails')
      .select('email', { count: 'exact', head: true })
      .eq('active', true)
      .eq('status', 'confirmed')
      .is('deleted_at', null)
      .throwOnError(),
    admin
      .from('authorized_emails')
      .select('email', { count: 'exact', head: true })
      .eq('active', true)
      .eq('status', 'trial')
      .is('deleted_at', null)
      .throwOnError(),
    admin
      .from('authorized_emails')
      .select('email, active, status, deleted_at')
      .eq('active', true)
      .in('status', ['confirmed', 'trial'])
      .is('deleted_at', null)
      .throwOnError(),
    user
      ? supabase.from('predictions').select('*', { count: 'exact', head: true }).limit(1)
      : Promise.resolve({ count: 0 }),
    supabase
      .from('matches')
      .select('*')
      .gte('scheduled_at', todayStart.toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(16),
    supabase
      .from('ranking_entries')
      .select('user_id, name, total_points, rank, exact_predictions, correct_result_predictions')
      .order('rank', { ascending: true })
      .limit(10),
    user
      ? supabase.from('profiles').select('name').eq('id', user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    admin.from('predictions').select('user_id').throwOnError(),
    admin.from('virtual_knockout_predictions').select('user_id').throwOnError(),
    admin.from('user_prediction_tiebreakers').select('user_id').throwOnError(),
    admin.from('special_bets').select('user_id, balon, bota, guante').throwOnError(),
    admin.from('matches').select('*').throwOnError(),
  ])

  const publicAuthorizedRows = ((authorizedRows ?? []) as AuthorizedEmailSummary[])
    .filter((row) => row.active && !row.deleted_at && participantStatus(row) !== 'disabled')
  const competidores = competitorCount ?? 0
  const invitados = guestCount ?? 0
  const authorizedEmails = publicAuthorizedRows.map((row) => row.email.toLowerCase().trim())
  const { data: authorizedProfiles } = authorizedEmails.length > 0
    ? await admin
      .from('profiles')
      .select('id, email')
      .in('email', authorizedEmails)
      .throwOnError()
    : { data: [] }
  const publicProfileIds = new Set(
    ((authorizedProfiles ?? []) as ProfileSummary[])
      .map((profile) => profile.id)
      .filter(Boolean)
  )
  const typedPredictionRows = (predictionRows ?? []) as Array<{ user_id: string }>
  const typedVirtualPredictionRows = (virtualPredictionRows ?? []) as Array<{ user_id: string }>
  const typedTiebreakerRows = (tiebreakerRows ?? []) as Array<{ user_id: string }>
  const typedSpecialBetRows = (specialBetRows ?? []) as Array<{
    user_id: string
    balon: string | null
    bota: string | null
    guante: string | null
  }>
  const predictionCounts = countPredictionsByUser(
    typedPredictionRows,
    typedVirtualPredictionRows,
    typedTiebreakerRows,
    typedSpecialBetRows
  )
  const prodeInProcessIds = new Set<string>()
  addStartedProdesFromRows(typedPredictionRows, publicProfileIds, prodeInProcessIds)
  addStartedProdesFromRows(typedVirtualPredictionRows, publicProfileIds, prodeInProcessIds)
  addStartedProdesFromRows(typedTiebreakerRows, publicProfileIds, prodeInProcessIds)
  addStartedSpecialBets(typedSpecialBetRows, publicProfileIds, prodeInProcessIds)

  const hasMyPredictions = user ? (predictionCounts.get(user.id) ?? 0) > 0 || (myPredsCount ?? 0) > 0 : false

  const matchRows = (allMatchRows ?? []) as Match[]
  const finishedMatches = countFinishedMatches(matchRows)
  const aliveTeams = countAliveTeams(matchRows)

  const typedTopRanking = ((topRanking ?? []) as RankingEntry[]).map((entry) => ({
    ...entry,
    predictions_count: predictionCounts.get(entry.user_id) ?? 0,
    prode_status: (predictionCounts.get(entry.user_id) ?? 0) > 0 ? 'in_progress' as const : 'empty' as const,
  }))
  const isInTop10 = user ? typedTopRanking.some(e => e.user_id === user.id) : false

  let myRanking: RankingEntry | null = null
  if (user && !isInTop10) {
    const { data } = await supabase
      .from('ranking_entries')
      .select('user_id, name, total_points, rank, exact_predictions, correct_result_predictions')
      .eq('user_id', user.id)
      .maybeSingle()
    myRanking = data
      ? {
          ...(data as RankingEntry),
          predictions_count: predictionCounts.get((data as RankingEntry).user_id) ?? 0,
          prode_status: (predictionCounts.get((data as RankingEntry).user_id) ?? 0) > 0 ? 'in_progress' as const : 'empty' as const,
        }
      : null
  }

  const allUpcoming = (upcoming ?? []) as Match[]
  const firstDay = allUpcoming[0]
    ? new Date(allUpcoming[0].scheduled_at).toDateString()
    : null
  const firstDayMatches = firstDay
    ? allUpcoming.filter((m) => new Date(m.scheduled_at).toDateString() === firstDay)
    : []
  // Up to 3 matches: fill from first day, complement with next day if needed
  const matches = firstDayMatches.length >= 3
    ? firstDayMatches.slice(0, 3)
    : [
        ...firstDayMatches,
        ...allUpcoming
          .filter((m) => new Date(m.scheduled_at).toDateString() !== firstDay)
          .slice(0, 3 - firstDayMatches.length),
      ]

  const predictionMap: Record<string, { home_score: number; away_score: number }> = {}
  if (user && matches.length > 0) {
    const { data: preds } = await supabase
      .from('predictions')
      .select('match_id, home_score, away_score')
      .eq('user_id', user.id)
      .in('match_id', matches.map((m) => m.id))
    for (const p of (preds ?? []) as Array<{
      match_id: string
      home_score: number
      away_score: number
    }>) {
      predictionMap[p.match_id] = { home_score: p.home_score, away_score: p.away_score }
    }
  }

  const rankColors: Record<number, string> = { 1: '#FFE040', 2: '#A8F0D8', 3: '#E8A87C' }
  const showPreTournamentBanner = typedTopRanking.every(e => e.total_points === 0)
  const rankingStarted = typedTopRanking.some(e => e.total_points > 0)
  const displayedRanking = myRanking ? [...typedTopRanking, myRanking] : typedTopRanking
  return (
    <>
      {!user && <WelcomeModal />}
      {/* ─── HERO ──────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden min-h-[420px] min-[980px]:min-h-[760px] flex items-center"
        style={{ padding: 'clamp(40px, 8vw, 64px) 20px clamp(48px, 10vw, 80px)', isolation: 'isolate' }}
      >
        {/* Animated blobs */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <span
            className="absolute w-[340px] h-[340px] rounded-full bg-purple"
            style={{ top: '-80px', left: '-60px', animation: 'float 22s ease-in-out infinite', animationDelay: '-2s' }}
          />
          <span
            className="absolute w-[280px] h-[280px] bg-yellow rounded-petal-1"
            style={{ top: '-40px', left: '38%', animation: 'float 28s ease-in-out infinite' }}
          />
          <span
            className="absolute w-[420px] h-[420px] bg-orange rounded-petal-2"
            style={{ top: '120px', right: '-80px', animation: 'float 30s ease-in-out infinite', animationDelay: '-7s' }}
          />
          <span
            className="absolute w-[300px] h-[300px] rounded-full bg-blue"
            style={{ bottom: '-100px', left: '-40px', animation: 'float 22s ease-in-out infinite', animationDelay: '-4s' }}
          />
          <span
            className="absolute w-[220px] h-[220px] bg-mint rounded-petal-3"
            style={{ bottom: '-60px', right: '18%', animation: 'float 26s ease-in-out infinite', animationDelay: '-11s' }}
          />
          <div className="absolute inset-0 bg-hero-vignette" />
          <div className="absolute inset-0 bg-grain opacity-40" />
        </div>

        {/* Hero inner: 1 col mobile → 2 cols at 980px */}
        <div className="relative z-10 max-w-[1280px] mx-auto w-full grid grid-cols-1 min-[980px]:grid-cols-[1.15fr_0.85fr] gap-12 items-center">
          {/* Left */}
          <div>
            <div
              className="inline-flex items-center gap-[10px] px-[14px] py-2 rounded-full text-[12px] font-extrabold tracking-[0.16em] uppercase mb-6"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.14)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <span className="w-2 h-2 rounded-full bg-mint" style={{ animation: 'pulse-dot 1.6s infinite' }} />
              Mundial 2026 · Inscripción $20.000 · Objetivo 65 competidores
            </div>

            <h1
              className="font-display uppercase leading-[0.86] tracking-[-0.04em]"
              style={{ fontSize: 'clamp(56px, 13vw, 168px)' }}
            >
              <span className="block text-white">Prode</span>
              <span className="block text-orange italic">mundial</span>
              <span
                className="inline-block bg-mint text-bg px-[0.18em] rounded-[14px]"
                style={{ transform: 'translateY(0.05em)' }}
              >
                2026
              </span>
            </h1>

            <p className="mt-6 text-[17px] leading-relaxed font-medium max-w-[520px]" style={{ color: '#d6d6d6' }}>
              Un torneo entre amigos para pronosticar todo el Mundial, seguir el ranking en vivo y competir por premios.
              Primero miralo, después probalo si te interesa y recién ahí decidí si participás oficialmente.
            </p>

            <div className="mt-8 flex flex-wrap gap-3 items-center">
              <Link
                href={user ? '/mi-prode' : '#contacto'}
                className="inline-flex items-center gap-[10px] px-[26px] py-[18px] rounded-full font-extrabold text-[15px] bg-orange text-bg transition-transform duration-150 hover:-translate-y-0.5 group shadow-[0_10px_28px_-10px_rgba(255,107,0,.6)] hover:shadow-[0_18px_36px_-10px_rgba(255,107,0,.8)]"
              >
                {user && hasMyPredictions ? 'Ver mi prode' : user ? 'Hacer mi prode' : 'Probar o participar'}
                <svg
                  className="w-[18px] h-[18px] transition-transform duration-200 group-hover:translate-x-1"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </Link>
              <Link
                href="/premios"
                className="inline-flex items-center gap-[10px] px-[26px] py-[18px] rounded-full font-extrabold text-[15px] text-white transition-colors duration-150 hover:bg-white/10"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.16)' }}
              >
                Ver premios
              </Link>
              <ReferralShareButton
                name={profile?.name}
                email={user?.email}
                userId={user?.id}
                className="inline-flex items-center gap-[10px] rounded-full px-[22px] py-[18px] text-[15px] font-extrabold transition-transform hover:-translate-y-0.5"
              />
            </div>
          </div>

          {/* Right — logo tile + countdown, hidden on mobile */}
          <aside className="hidden min-[980px]:flex flex-col gap-[22px]">
            <div
              className="relative aspect-square rounded-[28px] overflow-hidden grid place-items-center"
              style={{ background: '#A8F0D8', boxShadow: 'var(--shadow-tile)' }}
            >
              <div
                className="absolute"
                style={{ left: '-12%', top: '-12%', width: '60%', height: '60%', background: '#FF6B00', borderRadius: '0 0 100% 0' }}
              />
              <div
                className="absolute"
                style={{ right: '-10%', bottom: '-10%', width: '55%', height: '55%', background: '#5B2D8E', borderRadius: '100% 0 0 0' }}
              />
              <div className="relative z-10 text-center" style={{ color: '#0A0A0A' }}>
                <div
                  className="font-display leading-[0.82] tracking-[-0.07em]"
                  style={{ fontSize: 'clamp(120px, 14vw, 200px)' }}
                >
                  26&apos;
                </div>
                <div className="font-sans font-black tracking-[0.42em] mt-2 text-[clamp(13px,1.6vw,22px)]">
                  PRODE
                </div>
              </div>
            </div>

            <div
              className="bg-panel rounded-[24px]"
              style={{ border: '1px solid rgba(255,255,255,0.08)', padding: '22px 22px 20px' }}
            >
              <div className="flex items-center justify-between mb-[18px]">
                <span className="text-[11px] font-extrabold tracking-[0.22em] uppercase text-muted">
                  Arranca el mundial
                </span>
                <span className="font-mono text-[12px] font-bold text-orange">11 JUN · 16:00 ART</span>
              </div>
              <CountdownTimer />
            </div>
          </aside>
        </div>
      </section>

      {/* ─── STATS STRIP ────────────────────────────────────────── */}
      <div
        className="bg-orange text-bg overflow-hidden"
        style={{ borderTop: '2px solid #0A0A0A', borderBottom: '2px solid #0A0A0A' }}
      >
        <div className="max-w-[1280px] mx-auto px-5 py-6 grid grid-cols-1 gap-x-2 gap-y-6 min-[680px]:grid-cols-3 min-[720px]:gap-5 min-[1100px]:grid-cols-5">
          <StatItem num={competidores} label="Competidores" live />
          <StatItem num={prodeInProcessIds.size} label="Prodes cargados" />
          <StatItem num={invitados} label="Invitados" />
          <StatItem num={`${finishedMatches} de ${TOURNAMENT_TOTAL_MATCHES}`} label="Partidos jugados" />
          <StatItem num={aliveTeams} label="Selecciones disponibles" />
        </div>
      </div>

      {/* ─── UPCOMING MATCHES ───────────────────────────────────── */}
      <section id="como-funciona" style={{ padding: 'clamp(44px, 9vw, 84px) 20px' }}>
        <div className="max-w-[1280px] mx-auto">
          <SectionHead
            title="Primero"
            orange="entender"
            sub="No necesitás iniciar sesión para conocer el proyecto. La idea es que mires todo tranquilo, pidas una prueba si te interesa y después decidas si querés participar oficialmente."
          />
          <div className="grid grid-cols-1 gap-4 min-[760px]:grid-cols-3">
            {[
              ['1', 'Conocé el Prode', 'Visitá premios, reglas, ranking y fixture. Todo eso es público para que veas cómo funciona sin iniciar sesión.'],
              ['2', 'Probalo si te interesa', 'Nos escribís y podemos habilitar temporalmente tu correo para que cargues pronósticos, explores y se lo muestres a tus amigos.'],
              ['3', 'Decidí después', 'Si querés participar oficialmente, abonás la inscripción y quedás habilitado. Si no continuás, podemos deshabilitar el acceso.'],
            ].map(([step, title, desc]) => (
              <article key={step} className="rounded-[22px] bg-panel p-6" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                <span className="font-display text-[42px] leading-none text-orange">{step}</span>
                <h3 className="mt-4 font-display text-[20px] uppercase leading-none">{title}</h3>
                <p className="mt-3 text-[13px] font-medium leading-relaxed text-[#cfcfcf]">{desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="premios" style={{ padding: 'clamp(36px, 8vw, 76px) 20px' }}>
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 gap-5 min-[900px]:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-[12px] font-extrabold uppercase tracking-[0.22em] text-muted">Premios proyectados</p>
            <h2 className="mt-4 font-display text-[clamp(38px,6vw,76px)] uppercase leading-[0.9] tracking-[-0.03em]">
              Con 65 competidores, <em className="italic text-orange">hay podio</em>
            </h2>
            <p className="mt-4 max-w-[500px] text-[14px] font-medium leading-relaxed text-[#cfcfcf]">
              El objetivo es llegar a 65 competidores. Con ese piso, el premio proyectado es $800.000 al primero, $200.000 al segundo y $100.000 al tercero.
            </p>
            <div className="mt-5">
              <SectionLink href="/premios" label="Ver detalle de premios" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 min-[620px]:grid-cols-3">
            {[
              ['1°', '$800.000', '#FFE040', 'Primer puesto'],
              ['2°', '$200.000', '#A8F0D8', 'Segundo puesto'],
              ['3°', '$100.000', '#E8A87C', 'Tercer puesto'],
            ].map(([rank, amount, color, label]) => (
              <article key={rank} className="min-h-[180px] rounded-[22px] p-5 text-bg" style={{ background: color }}>
                <p className="font-mono text-[11px] font-extrabold uppercase tracking-[0.18em] opacity-70">{label}</p>
                <p className="mt-5 font-display text-[64px] leading-none">{rank}</p>
                <p className="mt-3 font-display text-[30px] leading-none italic">{amount}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="contacto" style={{ padding: 'clamp(36px, 8vw, 76px) 20px' }}>
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 gap-5 min-[900px]:grid-cols-[1.05fr_0.95fr]">
          <article className="rounded-[24px] bg-panel p-6 min-[760px]:p-8" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-[12px] font-extrabold uppercase tracking-[0.22em] text-mint">Contacto y prueba</p>
            <h2 className="mt-4 font-display text-[clamp(32px,5vw,54px)] uppercase leading-[0.92] tracking-[-0.02em]">
              ¿Querés participar o probar el sistema?
            </h2>
            <p className="mt-4 text-[14px] font-medium leading-relaxed text-[#cfcfcf]">
              Podemos habilitar temporalmente tu correo para que pruebes la plataforma antes de decidir. Durante esa prueba podés cargar pronósticos, navegar y mostrarle el Prode a tus amigos.
            </p>
            <div className="mt-6 grid gap-3">
              {[
                'Nos escribís por WhatsApp y nos pasás el correo que querés usar.',
                'Si querés probar, habilitamos temporalmente ese correo.',
                'Ingresás con Google: Google no registra, solo valida si el correo está autorizado.',
                'Si decidís participar oficialmente, abonás la inscripción de $20.000.',
                'Si no continuás, los administradores pueden deshabilitar el acceso.',
              ].map((item, index) => (
                <div key={item} className="flex items-start gap-3 rounded-[16px] bg-[#0f0f0f] px-4 py-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-orange text-[12px] font-extrabold text-bg">{index + 1}</span>
                  <p className="text-[13px] font-bold leading-relaxed text-[#dddddd]">{item}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[24px] bg-[#101010] p-6 min-[760px]:p-8" style={{ border: '1px solid rgba(168,240,216,0.18)' }}>
            <p className="text-[12px] font-extrabold uppercase tracking-[0.22em] text-muted">Organizadores</p>
            <h2 className="mt-4 font-display text-[clamp(32px,5vw,54px)] uppercase leading-[0.92] tracking-[-0.02em]">
              Hablá con <em className="italic text-mint">nosotros</em>
            </h2>
            <p className="mt-4 text-[14px] font-medium leading-relaxed text-[#cfcfcf]">
              La inscripción cuesta $20.000. Si una persona se inscribe utilizando tu referencia, $3.000 de esa inscripción pasan para vos como recompensa por referido. El resto se suma al pozo de premios y a la organización del torneo.
            </p>
            <div className="mt-6">
              <ContactLinks message="Hola! Quiero participar o probar el sistema del Prode Mundial 2026." />
            </div>
            <div className="mt-5 rounded-[18px] bg-mint/10 p-4 text-[13px] font-bold leading-relaxed text-mint">
              Primero conocé el Prode, después probalo si te interesa y recién ahí decidí si querés participar oficialmente.
            </div>
          </article>
        </div>
      </section>

      <section style={{ padding: 'clamp(40px, 10vw, 80px) 20px' }}>
        <div className="max-w-[1280px] mx-auto">
          <SectionHead
            title="Próximos"
            orange="partidos"
            sub="Pegále al resultado y sumá puntos al ranking partido a partido"
            link={{ href: '/fixture', label: 'Ver fixture completo' }}
          />
          {matches.length === 0 ? (
            <p className="text-muted text-[15px]">El fixture se publicará próximamente.</p>
          ) : (
            <div className="grid grid-cols-1 min-[720px]:grid-cols-2 min-[1100px]:grid-cols-3 gap-4">
              {matches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  prediction={predictionMap[match.id] ?? null}
                  readOnly
                  showPrediction={Boolean(user)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── TOP 10 RANKING ────────────────────────────────────── */}
      <section style={{ padding: 'clamp(40px, 10vw, 80px) 20px' }}>
        <div className="max-w-[1280px] mx-auto">
          <SectionHead
            title="Top"
            orange="10"
            sub="Los competidores que la están rompiendo. Tocá cualquier Prode para ver pronósticos, aciertos, errores y puntos partido por partido."
            link={{ href: '/ranking', label: 'Ver ranking completo' }}
          />

          {showPreTournamentBanner && (
            <div
              className="flex items-center gap-3 rounded-[16px] mb-[18px] text-[13px]"
              style={{
                background: 'rgba(168,240,216,.08)',
                border: '1px solid rgba(168,240,216,.18)',
                padding: '14px 18px',
                color: '#cfcfcf',
              }}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: '#A8F0D8', animation: 'pulse-dot 1.6s infinite' }}
              />
              <span>
                El conteo de puntos empieza cuando se carguen los primeros resultados oficiales. Hasta entonces podés revisar los Prodes cargados.
              </span>
            </div>
          )}

          {typedTopRanking.length > 0 && (
            <div
              className="flex flex-col gap-[6px] rounded-[24px]"
              style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)', padding: '10px' }}
            >
              {typedTopRanking.map((entry) => {
                const isMe = user?.id === entry.user_id
                const hasPredictions = (entry.predictions_count ?? 0) > 0
                const rankColor = rankColors[entry.rank] ?? (isMe ? '#FF6B00' : '#8A8A8A')
                return (
                  <Link
                    key={entry.user_id}
                    href={`/ranking/${entry.user_id}`}
                    className="grid grid-cols-[78px_minmax(0,1fr)_auto] items-center gap-2 rounded-[14px] px-3 py-3 transition-colors hover:bg-panel-2 min-[720px]:grid-cols-[96px_minmax(0,1fr)_auto] min-[720px]:gap-[14px] min-[720px]:px-[14px]"
                    style={{
                      cursor: 'pointer',
                      opacity: hasPredictions ? 1 : 0.82,
                      ...(isMe ? { background: 'rgba(255,107,0,.1)', border: '1px solid rgba(255,107,0,.22)' } : {}),
                    }}
                  >
                    <RankMark entry={entry} entries={typedTopRanking} color={rankColor} active={rankingStarted} />
                    <div className="flex min-w-0 items-center gap-2.5 min-[720px]:gap-3">
                      <div
                        className="w-9 h-9 rounded-full shrink-0 grid place-items-center font-display text-[14px] text-white"
                        style={{
                          background: isMe ? 'linear-gradient(135deg,#FF6B00,#FF9A3C)' : 'linear-gradient(135deg,#5B2D8E,#1565C0)',
                          border: '2px solid #2a2a2a',
                        }}
                      >
                        {entry.name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div className="flex flex-col min-w-0 gap-0.5">
                        <span className="truncate text-[14px] font-bold leading-tight">
                          {entry.name}
                          {isMe && (
                            <span
                              className="inline-block ml-2 font-mono font-extrabold rounded-[6px]"
                              style={{ fontSize: 9, letterSpacing: '.18em', padding: '2px 7px', background: '#FF6B00', color: '#0A0A0A', verticalAlign: '1px' }}
                            >
                              VOS
                            </span>
                          )}
                        </span>
                        <span
                          className="font-mono font-bold uppercase truncate"
                          style={{ fontSize: 10, color: '#8A8A8A', letterSpacing: '.16em' }}
                        >
                          {hasPredictions
                            ? `Prode en proceso · ${entry.exact_predictions ?? 0} exactas · ${entry.correct_result_predictions ?? 0} parciales`
                            : 'Todavia no cargo su Prode'}
                        </span>
                      </div>
                    </div>
                    <span
                      className={rankingStarted ? 'font-display text-right leading-none tracking-[-0.03em] tabular-nums' : 'font-mono text-right text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted'}
                      style={rankingStarted ? { fontSize: 22 } : undefined}
                    >
                      {rankingStarted ? (
                        <>
                          {entry.total_points}
                          <em
                            className="not-italic font-mono font-bold uppercase ml-[6px]"
                            style={{ fontSize: '0.55em', color: '#8A8A8A', letterSpacing: '.16em' }}
                          >
                            pts
                          </em>
                        </>
                      ) : 'Sin puntos'}
                    </span>
                  </Link>
                )
              })}

              {user && myRanking && (
                <>
                  <div
                    className="text-center font-mono"
                    style={{ fontSize: 10, letterSpacing: '.2em', color: '#3a3a3a', padding: '6px 0', marginTop: 6 }}
                  >
                    · · ·
                  </div>
                  <Link
                    href={`/ranking/${user.id}`}
                    className="grid grid-cols-[78px_minmax(0,1fr)_auto] items-center gap-2 rounded-[14px] px-3 py-3 transition-colors hover:bg-panel-2 min-[720px]:grid-cols-[96px_minmax(0,1fr)_auto] min-[720px]:gap-[14px] min-[720px]:px-[14px]"
                    style={{
                      background: 'rgba(255,107,0,.1)',
                      border: '1px solid rgba(255,107,0,.22)',
                      marginTop: 6,
                      cursor: 'pointer',
                    }}
                  >
                    <RankMark entry={myRanking} entries={displayedRanking} color="#FF6B00" active={rankingStarted} />
                    <div className="flex min-w-0 items-center gap-2.5 min-[720px]:gap-3">
                      <div
                        className="w-9 h-9 rounded-full shrink-0 grid place-items-center font-display text-[14px] text-white"
                        style={{ background: 'linear-gradient(135deg,#FF6B00,#FF9A3C)', border: '2px solid #2a2a2a' }}
                      >
                        {myRanking.name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div className="flex flex-col min-w-0 gap-0.5">
                        <span className="truncate text-[14px] font-bold leading-tight">
                          {myRanking.name}
                          <span
                            className="inline-block ml-2 font-mono font-extrabold rounded-[6px]"
                            style={{ fontSize: 9, letterSpacing: '.18em', padding: '2px 7px', background: '#FF6B00', color: '#0A0A0A', verticalAlign: '1px' }}
                          >
                            VOS
                          </span>
                        </span>
                        <span
                          className="font-mono font-bold uppercase truncate"
                          style={{ fontSize: 10, color: '#8A8A8A', letterSpacing: '.16em' }}
                        >
                          {(myRanking.predictions_count ?? 0) > 0
                            ? `Prode en proceso · ${myRanking.exact_predictions ?? 0} exactas · ${myRanking.correct_result_predictions ?? 0} parciales`
                            : 'Todavia no cargo su Prode'}
                        </span>
                      </div>
                    </div>
                    <span
                      className={rankingStarted ? 'font-display text-right leading-none tracking-[-0.03em] tabular-nums' : 'font-mono text-right text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted'}
                      style={rankingStarted ? { fontSize: 22 } : undefined}
                    >
                      {rankingStarted ? (
                        <>
                          {myRanking.total_points}
                          <em
                            className="not-italic font-mono font-bold uppercase ml-[6px]"
                            style={{ fontSize: '0.55em', color: '#8A8A8A', letterSpacing: '.16em' }}
                          >
                            pts
                          </em>
                        </>
                      ) : 'Sin puntos'}
                    </span>
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ─── FOOTER ─────────────────────────────────────────────── */}
      <footer
        className="bg-[#070707]"
        style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: 'clamp(32px, 6vw, 50px) 20px clamp(24px, 5vw, 40px)' }}
      >
        <div className="max-w-[1280px] mx-auto grid grid-cols-1 min-[780px]:grid-cols-[1.4fr_1fr_1fr] gap-[30px]">
          <div>
            <div className="font-display uppercase leading-[0.9] tracking-[-0.03em] text-[48px]">
              Prode
              <br />
              <em className="italic text-orange">26&apos;</em>
            </div>
            <p className="mt-[10px] text-muted text-[13px] max-w-[340px] leading-relaxed">
              Pronósticos del Mundial 2026.
            </p>
          </div>
          <div>
            <h5 className="font-display text-[13px] tracking-[0.18em] uppercase mb-[14px]">
              Producto
            </h5>
            <ul className="flex flex-col gap-[10px]">
              {[
                user ? { href: '/mi-prode', label: 'Mi Prode' } : { href: '/#contacto', label: 'Probar o participar' },
                { href: '/ranking', label: 'Ranking en vivo' },
                { href: '/premios', label: 'Premios' },
              ].map(({ href, label }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-[#cfcfcf] text-[14px] font-semibold hover:text-orange transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h5 className="font-display text-[13px] tracking-[0.18em] uppercase mb-[14px]">
              Soporte
            </h5>
            <ul className="flex flex-col gap-[10px]">
              {[
                { href: '/reglas', label: 'Reglas y puntaje' },
                { href: '/reglas', label: 'Preguntas frecuentes' },
              ].map(({ href, label }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-[#cfcfcf] text-[14px] font-semibold hover:text-orange transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div
          className="max-w-[1280px] mx-auto mt-[30px] pt-5 text-[#666] text-[12px] flex flex-wrap gap-[10px] justify-between"
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
        >
          <span>© 2026 Prode 26</span>
          <span>v1.0.0 · No afiliado a FIFA</span>
        </div>
      </footer>
    </>
  )
}

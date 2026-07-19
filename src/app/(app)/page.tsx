import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { Match } from '@/types'
import { formatRank, rankMedal } from '@/lib/ranking-display'
import { BonusPollHomeCard } from '@/components/BonusPoll'
import {
  TOURNAMENT_TOTAL_MATCHES,
  TOURNAMENT_TOTAL_TEAMS,
} from '@/lib/tournament-config'
import { getBonusPollState } from '@/lib/bonus-poll'
import { getRankingMode, isLiveRankingMode, type RankingMode } from '@/lib/ranking-mode'
import { formatMatchKickoffArgentina } from '@/lib/match-datetime'
import {
  formatAverageScore,
  formatPickedResult,
  normalizePredictionInsights,
} from '@/lib/prediction-insights'
import { computeFifaAllStandings, computeFifaBestThirds } from '@/lib/fifa-standings'
import { getTournamentVisibleMatches } from '@/lib/tournament-state'
import { addConfirmedTrajectoryToRanking, getVirtualMatchTrajectoryInsights } from '@/lib/public-prediction-data'
import { VirtualTrajectoryInsights } from '@/components/VirtualTrajectoryInsights'
import { CountdownTimer } from '@/components/CountdownTimer'
import { getTeam, flagUrl } from '@/lib/teams'

export const dynamic = 'force-dynamic'

const WORLD_CUP_FINAL_AT = '2026-07-19T16:00:00-03:00'
const FINAL_HOME_TEAM = 'Argentina'
const FINAL_AWAY_TEAM = 'España'

function SectionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 font-bold text-[14px] px-[18px] py-3 rounded-full bg-panel transition-colors hover:bg-panel-2 shrink-0 active:scale-[0.98]"
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

function SectionHead({
  title,
  orange,
  sub,
  link,
}: {
  title: string
  orange: string
  sub?: string
  link?: { href: string; label: string }
}) {
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

type RankingEntry = {
  user_id: string | null
  name: string
  total_points: number
  rank: number
  exact_predictions: number
  correct_result_predictions: number
  predictions_count?: number
  loaded_count?: number
  expected_count?: number
  progress_percentage?: number
  prode_status?: 'empty' | 'not_started' | 'in_progress' | 'almost_done' | 'complete' | 'completed'
  participant_status?: 'confirmed' | 'trial'
}

const OFFICIAL_PRIZES = {
  first: 600000,
  second: 150000,
  third: 50000,
} as const

function HomeMetricCard({
  value,
  label,
  detail,
  live,
  compact,
}: {
  value: ReactNode
  label: string
  detail?: string
  live?: boolean
  compact?: boolean
}) {
  return (
    <div className="tap-card flex min-h-[136px] min-w-0 flex-col rounded-[18px] bg-[#0A0A0A] px-4 py-4 text-white" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex items-center gap-2">
        {live && <span className="h-2 w-2 rounded-full bg-mint" style={{ animation: 'pulse-dot 1.6s infinite' }} />}
        <p className="font-mono text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted">{label}</p>
      </div>
      <div className={`mt-2 min-w-0 whitespace-nowrap font-display leading-none ${compact ? 'text-[clamp(28px,2.65vw,42px)]' : 'text-[clamp(28px,7vw,42px)]'}`}>
        {value}
      </div>
      {detail && <p className="mt-2 text-[12px] font-semibold leading-snug text-muted">{detail}</p>}
    </div>
  )
}

function PrizeValue({ amount }: { amount: number }) {
  return (
    <span className="inline-flex min-w-0 items-baseline gap-x-2 whitespace-nowrap">
      <span className="shrink-0 text-[0.82em]">$</span>
      <span className="min-w-0">{amount.toLocaleString('es-AR')}</span>
    </span>
  )
}

function FinalTeamFlag({ teamName }: { teamName: string }) {
  const team = getTeam(teamName)

  return (
    <span
      className="grid h-[58px] w-[58px] shrink-0 place-items-center overflow-hidden rounded-full bg-[#0A0A0A] min-[640px]:h-[72px] min-[640px]:w-[72px]"
      style={{ border: '1px solid rgba(255,255,255,0.16)' }}
    >
      {team.iso2 ? (
        <img
          src={flagUrl(team.iso2)}
          alt={teamName}
          className="h-[34px] w-[46px] object-contain min-[640px]:h-[42px] min-[640px]:w-[58px]"
        />
      ) : (
        <span className="text-[32px] min-[640px]:text-[40px]">{team.flag}</span>
      )}
    </span>
  )
}

function percent(value: number, total: number) {
  if (total <= 0) return 0
  return Math.round((value / total) * 100)
}

function PredictionBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const width = percent(value, total)

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[12px] font-extrabold text-[#d7d7d7]">{label}</span>
        <span className="font-display text-[24px] leading-none tabular-nums" style={{ color }}>
          {width}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full" style={{ width: `${width}%`, background: color }} />
      </div>
    </div>
  )
}

function InsightMiniCard({
  label,
  value,
  className = '',
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div
      className={`rounded-[14px] bg-white/[0.035] px-3 py-3 ${className}`}
      style={{ border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <p className="font-mono text-[9px] font-extrabold uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-1 text-[13px] font-extrabold leading-snug text-white">{value}</p>
    </div>
  )
}

function PublicRankingRowLink({
  userId,
  className,
  style,
  children,
}: {
  userId: string | null
  className: string
  style: CSSProperties
  children: ReactNode
}) {
  if (!userId) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    )
  }

  return (
    <Link href={`/ranking/${userId}`} className={className} style={style}>
      {children}
    </Link>
  )
}

type PublicHomeMetrics = {
  competitors_count: number
  invitees_count: number
  prodes_loaded_count: number
  prodes_completed_count?: number
  prodes_pending_count?: number
  prize_pool_ars?: number
  finished_matches_count: number
  ranking_mode?: RankingMode
  alive_teams_count: number
}

type MatchSummary = Pick<Match, 'home_team' | 'away_team' | 'home_score' | 'away_score' | 'stage' | 'status'>

const PLACEHOLDER_TEAM_PATTERN = /^(ganador|perdedor|winner|loser|\d+\s*(?:[°º]|°)?\s*(grupo|group)|[123][a-l]$)/i

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
  const fifaStandings = groupsComplete ? computeFifaAllStandings(groupMatches, officialScoreMap) : {}
  const fifaThirds = groupsComplete ? computeFifaBestThirds(groupMatches, officialScoreMap) : null
  const groupsResolved = groupsComplete &&
    Object.values(fifaStandings).every((result) => result.status === 'RESOLVED') &&
    fifaThirds?.status === 'RESOLVED'

  if (groupsResolved) {
    const aliveTeams = new Set<string>()

    for (const result of Object.values(fifaStandings)) {
      for (const team of result.standings.slice(0, 2)) aliveTeams.add(team.name)
    }
    for (const third of fifaThirds.standings.filter((team) => team.qualified)) aliveTeams.add(third.name)

    if (aliveTeams.size > 0) return aliveTeams.size
  }

  return TOURNAMENT_TOTAL_TEAMS
}

function rankingProgressPercentage(entry: RankingEntry) {
  if (typeof entry.progress_percentage === 'number') return Math.max(0, Math.min(100, entry.progress_percentage))
  if (entry.expected_count && entry.expected_count > 0) {
    return Math.min(100, Math.round(((entry.loaded_count ?? entry.predictions_count ?? 0) / entry.expected_count) * 100))
  }
  return (entry.predictions_count ?? 0) > 0 ? 1 : 0
}

function rankingProgressText(entry: RankingEntry) {
  const status = entry.prode_status === 'complete' ? 'completed' : entry.prode_status
  if (status === 'completed') return 'Prode terminado'
  if (status === 'almost_done') return 'Muy cerca'
  if (status === 'in_progress' || (entry.predictions_count ?? 0) > 0) return 'Prode en proceso'
  return 'Sin cargar'
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
        Previa
      </span>
    )
  }

  const medal = rankMedal(entry.rank, entry.total_points)
  return (
    <span className="flex min-w-0 items-center gap-1.5 whitespace-nowrap leading-none" style={{ color }}>
      {medal && <span className="text-[16px] leading-none min-[720px]:text-[18px]" aria-hidden="true">{medal}</span>}
      <span className="font-display text-[20px] leading-none tabular-nums min-[720px]:text-[22px]">
        {formatRank(entry, entries)}
      </span>
    </span>
  )
}

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)

  const [
    { data: metricsRows },
    { data: upcoming },
    { data: publicRanking },
    { data: allMatches },
    bonusPoll,
  ] = await Promise.all([
    supabase.rpc('get_public_home_metrics'),
    supabase
      .from('matches')
      .select('*')
      .gte('scheduled_at', todayStart.toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(16),
    supabase.rpc('get_public_ranking'),
    supabase.from('matches').select('*'),
    user ? getBonusPollState(supabase) : Promise.resolve(null),
  ])

  const allTournamentMatches = (allMatches ?? []) as Match[]
  const metrics = ((metricsRows ?? []) as PublicHomeMetrics[])[0] ?? {
    competitors_count: 0,
    invitees_count: 0,
    prodes_loaded_count: 0,
    prodes_completed_count: 0,
    prodes_pending_count: 0,
    prize_pool_ars: 0,
    finished_matches_count: 0,
    ranking_mode: 'pre_world_cup',
    alive_teams_count: countAliveTeams(allTournamentMatches),
  }

  const typedPublicRanking = await addConfirmedTrajectoryToRanking(
    (publicRanking ?? []) as RankingEntry[],
    allTournamentMatches
  )
  const typedTopRanking = typedPublicRanking
    .filter((entry) => entry.participant_status !== 'trial')
    .slice(0, 10)
    .map((entry) => ({
      ...entry,
      prode_status: entry.prode_status ?? ((entry.predictions_count ?? 0) > 0 ? 'in_progress' as const : 'empty' as const),
    }))

  const allUpcoming = (upcoming ?? []) as Match[]
  const visibleTournamentMatches = getTournamentVisibleMatches(allTournamentMatches)
  const nextMatch =
    visibleTournamentMatches
      .filter((match) => match.status !== 'finished')
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0]
    ?? allUpcoming.find((match) => match.status !== 'finished')
    ?? null
  const { data: nextMatchStatsRows } = nextMatch && !nextMatch.id.startsWith('virtual-p')
  ? await supabase.rpc('get_match_prediction_insights', {
      p_match_id: nextMatch.id,
    })
  : { data: null }

const nextMatchStatsRow = Array.isArray(nextMatchStatsRows) ? nextMatchStatsRows[0] : null

const nextMatchStats = normalizePredictionInsights(nextMatchStatsRow)
const nextMatchTrajectory = nextMatch?.id.startsWith('virtual-p')
  ? await getVirtualMatchTrajectoryInsights(visibleTournamentMatches, nextMatch.id)
  : null

  const liveRankColors: Record<number, string> = { 1: '#FFE040', 2: '#D7DADF', 3: '#E8A87C' }
  const liveRankingMode = metrics.ranking_mode ?? getRankingMode(metrics.finished_matches_count)
  const liveRankingStarted = isLiveRankingMode(liveRankingMode)
  return (
    <>
      {bonusPoll?.poll.isOpen && <BonusPollHomeCard poll={bonusPoll} />}

      <section
        className="relative overflow-hidden min-h-[420px] flex items-center"
        style={{ padding: 'clamp(42px, 8vw, 72px) 20px clamp(34px, 7vw, 58px)', isolation: 'isolate' }}
      >
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <span className="absolute w-[340px] h-[340px] rounded-full bg-purple" style={{ top: '-80px', left: '-60px', animation: 'float 22s ease-in-out infinite', animationDelay: '-2s' }} />
          <span className="absolute w-[280px] h-[280px] bg-yellow rounded-petal-1" style={{ top: '-40px', left: '38%', animation: 'float 28s ease-in-out infinite' }} />
          <span className="absolute w-[420px] h-[420px] bg-orange rounded-petal-2" style={{ top: '120px', right: '-80px', animation: 'float 30s ease-in-out infinite', animationDelay: '-7s' }} />
          <span className="absolute w-[300px] h-[300px] rounded-full bg-blue" style={{ bottom: '-100px', left: '-40px', animation: 'float 22s ease-in-out infinite', animationDelay: '-4s' }} />
          <span className="absolute w-[220px] h-[220px] bg-mint rounded-petal-3" style={{ bottom: '-60px', right: '18%', animation: 'float 26s ease-in-out infinite', animationDelay: '-11s' }} />
          <div className="absolute inset-0 bg-hero-vignette" />
          <div className="absolute inset-0 bg-grain opacity-40" />
        </div>

        <div className="relative z-10 max-w-[1280px] mx-auto w-full grid grid-cols-1 min-[980px]:grid-cols-[1.15fr_0.85fr] gap-12 items-center">
          <div>
            <div className="mb-6 inline-flex max-w-full items-center gap-[10px] rounded-full px-[14px] py-2 text-[11px] font-extrabold uppercase tracking-[0.14em] min-[420px]:text-[12px] min-[420px]:tracking-[0.16em]" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', backdropFilter: 'blur(8px)' }}>
              <span className="w-2 h-2 rounded-full bg-mint" style={{ animation: 'pulse-dot 1.6s infinite' }} />
              Ya se termina el Mundial
            </div>
            <div className="mb-5 flex max-w-full items-center gap-3 min-[640px]:gap-5">
              <FinalTeamFlag teamName={FINAL_HOME_TEAM} />
              <span className="font-display text-[28px] uppercase leading-none text-orange min-[640px]:text-[42px]">VS</span>
              <FinalTeamFlag teamName={FINAL_AWAY_TEAM} />
            </div>
            <h1 className="max-w-full break-words font-display uppercase leading-[0.86] tracking-[-0.04em]" style={{ fontSize: 'clamp(46px, 14vw, 128px)' }}>
              <span className="block text-white">Argentina</span>
              <span className="block text-orange italic">vs España</span>
            </h1>
            <p className="mt-5 max-w-[560px] font-mono text-[12px] font-extrabold uppercase tracking-[0.14em] text-mint">
              Final de la Copa del Mundo 2026
            </p>
            <p className="mt-4 max-w-[520px] text-[17px] font-medium leading-relaxed" style={{ color: '#d6d6d6' }}>
              Llegó el último partido. Vamos con todo.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/mi-prode" className="group inline-flex items-center gap-[10px] rounded-full bg-orange px-[26px] py-[18px] text-[15px] font-extrabold text-bg shadow-[0_10px_28px_-10px_rgba(255,107,0,.6)] transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-10px_rgba(255,107,0,.8)]">
                Ver mi prode
                <svg className="h-[18px] w-[18px] transition-transform duration-200 group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </Link>
              <Link href="/ranking" className="inline-flex items-center gap-[10px] rounded-full px-[26px] py-[18px] text-[15px] font-extrabold text-white transition-colors duration-150 hover:bg-white/10" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.16)' }}>
                Ver ranking
              </Link>
              <Link href="/fixture" className="inline-flex items-center gap-[10px] rounded-full px-[26px] py-[18px] text-[15px] font-extrabold text-white transition-colors duration-150 hover:bg-white/10" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.16)' }}>
                Ver fixture
              </Link>
              <Link href="/mundial-en-vivo" className="inline-flex items-center gap-[10px] rounded-full px-[26px] py-[18px] text-[15px] font-extrabold text-white transition-colors duration-150 hover:bg-white/10" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.16)' }}>
                Ver Mundial en Vivo
              </Link>
              <Link href="/pronosticos" className="inline-flex items-center gap-[10px] rounded-full px-[26px] py-[18px] text-[15px] font-extrabold text-white transition-colors duration-150 hover:bg-white/10" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.16)' }}>
                Ver pronósticos
              </Link>
            </div>
          </div>

          <aside className="hidden min-[980px]:flex flex-col gap-[22px]">
            <div className="relative grid aspect-square place-items-center overflow-hidden rounded-[28px] bg-[#0A0A0A] p-8" style={{ border: '1px solid rgba(255,255,255,0.12)', boxShadow: 'var(--shadow-tile)' }}>
              <div className="absolute inset-x-0 top-0 h-2 bg-orange" />
              <div className="relative z-10 w-full text-center">
                <div className="mb-7 flex items-center justify-center gap-5">
                  <FinalTeamFlag teamName={FINAL_HOME_TEAM} />
                  <span className="font-display text-[36px] uppercase leading-none text-orange">VS</span>
                  <FinalTeamFlag teamName={FINAL_AWAY_TEAM} />
                </div>
                <p className="font-mono text-[11px] font-extrabold uppercase tracking-[0.2em] text-muted">19 jul 2026 - 16:00 ART</p>
                <p className="mt-3 font-display text-[clamp(34px,4vw,54px)] uppercase leading-none text-white">La final</p>
                <div className="mt-6">
                  <CountdownTimer
                    targetAt={WORLD_CUP_FINAL_AT}
                    doneMessage="LA FINAL ESTÁ EN JUEGO"
                    showDays={false}
                  />
                </div>
              </div>
            </div>
            <div className="rounded-[24px] bg-panel" style={{ border: '1px solid rgba(255,255,255,0.08)', padding: '22px 22px 20px' }}>
              <div className="mb-[18px] flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.22em] text-muted">Estado del torneo</span>
                <span className="font-mono text-[12px] font-bold text-orange">{metrics.finished_matches_count} / {TOURNAMENT_TOTAL_MATCHES}</span>
              </div>
              <p className="font-display text-[clamp(24px,3vw,32px)] leading-none text-white">{liveRankingStarted ? 'Ranking en vivo' : 'Previa activa'}</p>
            </div>
          </aside>
        </div>
      </section>

      <section className="bg-orange text-bg" style={{ borderTop: '2px solid #0A0A0A', borderBottom: '2px solid #0A0A0A' }}>
        <div className="mx-auto max-w-[1280px] px-5 py-6">
          <div className="grid grid-cols-1 gap-3 min-[680px]:grid-cols-2 min-[1100px]:grid-cols-5">
            <HomeMetricCard value={metrics.competitors_count} label="Participantes" detail="Confirmados activos." live />
            <HomeMetricCard value={`${metrics.finished_matches_count} / ${TOURNAMENT_TOTAL_MATCHES}`} label="Partidos jugados" detail={`${metrics.alive_teams_count} selecciones disponibles.`} compact />
            <HomeMetricCard value={<PrizeValue amount={OFFICIAL_PRIZES.first} />} label="1er premio" detail="Oro." compact />
            <HomeMetricCard value={<PrizeValue amount={OFFICIAL_PRIZES.second} />} label="2do premio" detail="Plata." compact />
            <HomeMetricCard value={<PrizeValue amount={OFFICIAL_PRIZES.third} />} label="3er premio" detail="Bronce." compact />
          </div>
        </div>
      </section>

      <section style={{ padding: 'clamp(34px, 7vw, 64px) 20px' }}>
        <div className="mx-auto grid max-w-[1280px] gap-5 min-[980px]:grid-cols-[1.08fr_0.92fr]">
          <div>
            <SectionHead
              title="Top"
              orange="10"
              sub="Los competidores que la están rompiendo. Tocá cualquier Prode para ver pronósticos, aciertos, errores y puntos partido por partido."
              link={{ href: '/ranking', label: 'Ver ranking completo' }}
            />
            {typedTopRanking.length > 0 && (
              <div className="flex flex-col gap-[4px] rounded-[24px]" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)', padding: '8px' }}>
                {typedTopRanking.map((entry) => {
                  const isMe = user?.id === entry.user_id
                  const hasPredictions = (entry.predictions_count ?? 0) > 0
                  const rankColor = liveRankColors[entry.rank] ?? (isMe ? '#FF6B00' : '#8A8A8A')

                  return (
                    <PublicRankingRowLink
                      key={entry.user_id ?? `pending-${entry.name}`}
                      userId={entry.user_id}
                      className={`tap-card grid grid-cols-[74px_minmax(0,1fr)_auto] items-center gap-2 rounded-[14px] px-3 py-2.5 transition-colors min-[720px]:grid-cols-[88px_minmax(0,1fr)_auto] min-[720px]:gap-[12px] ${entry.user_id ? 'hover:bg-panel-2' : ''}`}
                      style={{ cursor: entry.user_id ? 'pointer' : 'default', opacity: hasPredictions ? 1 : 0.82, ...(isMe ? { background: 'rgba(255,107,0,.1)', border: '1px solid rgba(255,107,0,.22)' } : {}) }}
                    >
                      <RankMark entry={entry} entries={typedTopRanking} color={rankColor} active={liveRankingStarted} />
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full font-display text-[14px] text-white" style={{ background: isMe ? 'linear-gradient(135deg,#FF6B00,#FF9A3C)' : 'linear-gradient(135deg,#5B2D8E,#1565C0)', border: '2px solid #2a2a2a' }}>
                          {entry.name?.[0]?.toUpperCase() ?? '?'}
                        </div>
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className="truncate text-[14px] font-bold leading-tight">{entry.name}</span>
                          <span className="truncate font-mono text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: '#8A8A8A' }}>
                            {liveRankingStarted
                              ? hasPredictions
                                ? `Prode en proceso - ${entry.exact_predictions ?? 0} marcadores exactos - ${entry.correct_result_predictions ?? 0} ganador/empate sin marcador exacto`
                                : 'Todavía no cargó su Prode'
                              : `${rankingProgressText(entry)} - ${rankingProgressPercentage(entry)}% cargado`}
                          </span>
                        </div>
                      </div>
                      <span className={liveRankingStarted ? 'font-display text-right leading-none tracking-[-0.03em] tabular-nums' : 'font-mono text-right text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted'} style={liveRankingStarted ? { fontSize: 22 } : undefined}>
                        {liveRankingStarted ? (
                          <>
                            {entry.total_points}
                            <em className="ml-[6px] font-mono font-bold uppercase not-italic" style={{ fontSize: '0.55em', color: '#8A8A8A', letterSpacing: '.16em' }}>pts</em>
                          </>
                        ) : `${rankingProgressPercentage(entry)}%`}
                      </span>
                    </PublicRankingRowLink>
                  )
                })}
              </div>
            )}
          </div>

          <div className="grid content-start gap-5">
            <article className="rounded-[24px] bg-panel p-5 min-[760px]:p-6" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="mb-5 flex flex-col gap-4 min-[620px]:flex-row min-[620px]:items-start min-[620px]:justify-between">
                <div>
                  <p className="font-mono text-[11px] font-extrabold uppercase tracking-[0.18em] text-orange">Próximo partido</p>
                  {nextMatch ? (
                    <>
                      <h2 className="mt-3 font-display text-[clamp(28px,5vw,46px)] uppercase leading-[0.9] tracking-[-0.02em]">{nextMatch.home_team} vs {nextMatch.away_team}</h2>
                      <p className="mt-3 font-mono text-[12px] font-bold uppercase tracking-[0.08em] text-muted">{formatMatchKickoffArgentina(nextMatch.scheduled_at)} ART</p>
                    </>
                  ) : (
                    <h2 className="mt-3 font-display text-[clamp(28px,5vw,46px)] uppercase leading-[0.9] tracking-[-0.02em]">Fixture completo</h2>
                  )}
                </div>
                <div className="flex w-full max-w-[260px] shrink-0 flex-col gap-2 [&>a]:w-full [&>a]:justify-between min-[620px]:w-[220px]">
                  <SectionLink href="/fixture" label="Fixture" />
                  {nextMatch && <SectionLink href={`/pronosticos/${nextMatch.id}`} label="Cómo lo pronosticaron" />}
                </div>
              </div>

              <div className="rounded-[18px] bg-[#0A0A0A] p-4" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="font-extrabold text-white">Cómo lo pronosticaron</p>
                {nextMatch && nextMatchTrajectory ? (
                  <VirtualTrajectoryInsights
                    homeTeam={nextMatch.home_team}
                    awayTeam={nextMatch.away_team}
                    data={nextMatchTrajectory}
                    compact
                  />
                ) : nextMatch && nextMatchStats.total_count > 0 ? (
                  <div className="mt-4 grid gap-4">
                    <PredictionBar
                      label={`Gana ${nextMatch.home_team}`}
                      value={nextMatchStats.home_count}
                      total={nextMatchStats.total_count}
                      color="#A8F0D8"
                    />

                    <PredictionBar
                      label="Empate"
                      value={nextMatchStats.draw_count}
                      total={nextMatchStats.total_count}
                      color="#FFE040"
                    />

                    <PredictionBar
                      label={`Gana ${nextMatch.away_team}`}
                      value={nextMatchStats.away_count}
                      total={nextMatchStats.total_count}
                      color="#FF6B00"
                    />

                    <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
                      {nextMatchStats.total_count} pronósticos cargados
                    </p>

                    <div className="grid gap-3 min-[620px]:grid-cols-2">
                      <InsightMiniCard
                        label="Resultado más elegido"
                        value={formatPickedResult(
                          nextMatchStats.most_picked_home_score,
                          nextMatchStats.most_picked_away_score,
                          nextMatchStats.most_picked_count
                        )}
                      />
                      <InsightMiniCard
                        label="Resultado menos elegido"
                        value={formatPickedResult(
                          nextMatchStats.least_picked_home_score,
                          nextMatchStats.least_picked_away_score,
                          nextMatchStats.least_picked_count
                        )}
                      />
                      <InsightMiniCard
                        label="Gol visitante"
                        value={`${nextMatchStats.away_goal_count} ${
                          nextMatchStats.away_goal_count === 1 ? 'persona puso' : 'personas pusieron'
                        } gol de ${nextMatch.away_team}`}
                      />
                      <InsightMiniCard
                        label="Promedio esperado"
                        value={formatAverageScore(nextMatch.home_team, nextMatch.away_team, nextMatchStats)}
                      />
                      <InsightMiniCard
                        label="Resultados distintos"
                        value={`${nextMatchStats.distinct_results_count} ${
                          nextMatchStats.distinct_results_count === 1 ? 'combinación' : 'combinaciones'
                        }`}
                        className="min-[620px]:col-span-2"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-[13px] font-semibold leading-relaxed text-muted">Todavía no hay pronósticos cargados para este partido.</p>
                )}
              </div>
            </article>
          </div>
        </div>
      </section>

      {bonusPoll && !bonusPoll.poll.isOpen && <BonusPollHomeCard poll={bonusPoll} />}

      <footer className="bg-[#070707]" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: 'clamp(32px, 6vw, 50px) 20px clamp(24px, 5vw, 40px)' }}>
        <div className="mx-auto grid max-w-[1280px] grid-cols-1 gap-[30px] min-[780px]:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="font-display text-[48px] uppercase leading-[0.9] tracking-[-0.03em]">Prode<br /><em className="italic text-orange">26&apos;</em></div>
            <p className="mt-[10px] max-w-[340px] text-[13px] leading-relaxed text-muted">Pronósticos del Mundial 2026.</p>
          </div>
          <div>
            <h5 className="mb-[14px] font-display text-[13px] uppercase tracking-[0.18em]">Torneo</h5>
            <ul className="flex flex-col gap-[10px]">
              {[
                { href: '/mi-prode', label: 'Mi Prode' },
                { href: '/ranking', label: 'Ranking en vivo' },
                { href: '/premios', label: 'Premios' },
              ].map(({ href, label }) => (
                <li key={label}><Link href={href} className="text-[14px] font-semibold text-[#cfcfcf] transition-colors hover:text-orange">{label}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h5 className="mb-[14px] font-display text-[13px] uppercase tracking-[0.18em]">Info</h5>
            <ul className="flex flex-col gap-[10px]">
              {[
                { href: '/fixture', label: 'Fixture' },
                { href: '/reglas', label: 'Reglas y puntaje' },
              ].map(({ href, label }) => (
                <li key={label}><Link href={href} className="text-[14px] font-semibold text-[#cfcfcf] transition-colors hover:text-orange">{label}</Link></li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mx-auto mt-[30px] flex max-w-[1280px] flex-wrap justify-between gap-[10px] pt-5 text-[12px] text-[#666]" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <span>© 2026 Prode 26</span>
          <span>v1.0.0 - No afiliado a FIFA</span>
        </div>
      </footer>
    </>
  )
}

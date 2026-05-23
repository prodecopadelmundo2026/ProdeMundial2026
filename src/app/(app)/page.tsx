import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { MatchCard } from '@/components/MatchCard'
import { CountdownTimer } from '@/components/CountdownTimer'
import type { Match } from '@/types'
import { formatRank, rankMedal } from '@/lib/ranking-display'
import { ReferralShareButton } from '@/components/ReferralShareButton'

export const dynamic = 'force-dynamic'

/* ─── Sub-components ───────────────────────────────────────────── */

function StatItem({ num, label, live }: { num: number; label: string; live?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5 border-l-[3px] border-bg pl-[14px]">
      <div className="font-display text-[clamp(32px,5vw,48px)] leading-none tracking-[-0.03em]">
        {num}
      </div>
      <div className="text-[11px] font-extrabold tracking-[0.22em] uppercase">
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

type RankingEntry = {
  user_id: string
  name: string
  total_points: number
  rank: number
  exact_predictions: number
  correct_result_predictions: number
}

function RankMark({
  entry,
  entries,
  color,
}: {
  entry: RankingEntry
  entries: RankingEntry[]
  color: string
}) {
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
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)

  const [
    { count: participantes },
    { count: myPredsCount },
    { data: upcoming },
    { data: topRanking },
    { data: profile },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
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
  ])

  const hasMyPredictions = (myPredsCount ?? 0) > 0

  const typedTopRanking = (topRanking ?? []) as RankingEntry[]
  const isInTop10 = user ? typedTopRanking.some(e => e.user_id === user.id) : false

  let myRanking: RankingEntry | null = null
  if (user && !isInTop10) {
    const { data } = await supabase
      .from('ranking_entries')
      .select('user_id, name, total_points, rank, exact_predictions, correct_result_predictions')
      .eq('user_id', user.id)
      .maybeSingle()
    myRanking = data as RankingEntry | null
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
  const displayedRanking = myRanking ? [...typedTopRanking, myRanking] : typedTopRanking

  return (
    <>
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
              Mundial 2026 · USA · Canadá · México
            </div>

            <h1
              className="font-display uppercase leading-[0.86] tracking-[-0.04em]"
              style={{ fontSize: 'clamp(56px, 13vw, 168px)' }}
            >
              <span className="block text-white">Jugá el</span>
              <span className="block text-orange italic">mundial</span>
              <span
                className="inline-block bg-mint text-bg px-[0.18em] rounded-[14px]"
                style={{ transform: 'translateY(0.05em)' }}
              >
                con la banda
              </span>
            </h1>

            <p className="mt-6 text-[17px] leading-relaxed font-medium max-w-[520px]" style={{ color: '#d6d6d6' }}>
              Pronósticos partido a partido, ranking en vivo y premios para el podio.
              Cargá tu prode antes del inicio del Mundial.
            </p>

            <div className="mt-8 flex flex-wrap gap-3 items-center">
              <Link
                href="/mi-prode"
                className="inline-flex items-center gap-[10px] px-[26px] py-[18px] rounded-full font-extrabold text-[15px] bg-orange text-bg transition-transform duration-150 hover:-translate-y-0.5 group shadow-[0_10px_28px_-10px_rgba(255,107,0,.6)] hover:shadow-[0_18px_36px_-10px_rgba(255,107,0,.8)]"
              >
                {user && hasMyPredictions ? 'Ver mi prode' : 'Hacer mi prode'}
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
                href="/ranking"
                className="inline-flex items-center gap-[10px] px-[26px] py-[18px] rounded-full font-extrabold text-[15px] text-white transition-colors duration-150 hover:bg-white/10"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.16)' }}
              >
                Ver el ranking
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
                  26'
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
        <div className="max-w-[1280px] mx-auto px-5 py-7 grid grid-cols-3 gap-5">
          <StatItem num={participantes ?? 0} label="Participantes" live />
          <StatItem num={290} label="Puntos en juego" />
          <StatItem num={80} label="Partidos · 48 selecciones" />
        </div>
      </div>

      {/* ─── UPCOMING MATCHES ───────────────────────────────────── */}
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
            sub="Los que la están rompiendo. Tocá cualquier jugador para ver su Prode completo: pronósticos, aciertos, errores y puntos partido por partido."
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
                El ranking arranca con el primer pitazo · <strong className="text-white font-extrabold">11 de junio, 16:00</strong>
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
                const rankColor = rankColors[entry.rank] ?? (isMe ? '#FF6B00' : '#8A8A8A')
                return (
                  <Link
                    key={entry.user_id}
                    href={`/ranking/${entry.user_id}`}
                    className="grid grid-cols-[78px_minmax(0,1fr)_auto] items-center gap-2 rounded-[14px] px-3 py-3 transition-colors hover:bg-panel-2 min-[720px]:grid-cols-[96px_minmax(0,1fr)_auto] min-[720px]:gap-[14px] min-[720px]:px-[14px]"
                    style={{
                      ...(isMe ? { background: 'rgba(255,107,0,.1)', border: '1px solid rgba(255,107,0,.22)' } : {}),
                    }}
                  >
                    <RankMark entry={entry} entries={typedTopRanking} color={rankColor} />
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
                          {entry.exact_predictions ?? 0} exactas · {entry.correct_result_predictions ?? 0} parciales
                        </span>
                      </div>
                    </div>
                    <span
                      className="font-display text-right leading-none tracking-[-0.03em] tabular-nums"
                      style={{ fontSize: 22 }}
                    >
                      {entry.total_points}
                      <em
                        className="not-italic font-mono font-bold uppercase ml-[6px]"
                        style={{ fontSize: '0.55em', color: '#8A8A8A', letterSpacing: '.16em' }}
                      >
                        pts
                      </em>
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
                  <div
                    className="grid grid-cols-[78px_minmax(0,1fr)_auto] items-center gap-2 rounded-[14px] px-3 py-3 min-[720px]:grid-cols-[96px_minmax(0,1fr)_auto] min-[720px]:gap-[14px] min-[720px]:px-[14px]"
                    style={{
                      background: 'rgba(255,107,0,.1)',
                      border: '1px solid rgba(255,107,0,.22)',
                      marginTop: 6,
                    }}
                  >
                    <RankMark entry={myRanking} entries={displayedRanking} color="#FF6B00" />
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
                          {myRanking.exact_predictions ?? 0} exactas · {myRanking.correct_result_predictions ?? 0} parciales
                        </span>
                      </div>
                    </div>
                    <span
                      className="font-display text-right leading-none tracking-[-0.03em] tabular-nums"
                      style={{ fontSize: 22 }}
                    >
                      {myRanking.total_points}
                      <em
                        className="not-italic font-mono font-bold uppercase ml-[6px]"
                        style={{ fontSize: '0.55em', color: '#8A8A8A', letterSpacing: '.16em' }}
                      >
                        pts
                      </em>
                    </span>
                  </div>
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
              <em className="italic text-orange">26'</em>
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
                { href: '/mi-prode', label: 'Mi Prode' },
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

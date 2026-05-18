import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { MatchCard } from '@/components/MatchCard'
import { CountdownTimer } from '@/components/CountdownTimer'
import type { Match } from '@/types'

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

function PrizeCard({
  rank,
  sup,
  name,
  amount,
  bg,
  champion,
}: {
  rank: string
  sup: string
  name: string
  amount: React.ReactNode
  bg: string
  champion?: boolean
}) {
  return (
    <div
      className="relative rounded-[24px] overflow-hidden min-h-[280px] flex flex-col justify-between"
      style={{ background: bg, color: '#0A0A0A', padding: '32px 26px 28px' }}
    >
      {champion && (
        <span
          className="ribbon-corner bg-purple text-white"
          style={{ background: '#5B2D8E', color: '#fff' }}
        >
          CAMPEÓN
        </span>
      )}
      <div
        className="absolute right-[-30%] bottom-[-30%] w-[80%] h-[80%] rounded-full pointer-events-none"
        style={{ background: 'rgba(0,0,0,0.06)' }}
      />
      <div>
        <div className="font-display text-[80px] leading-[0.85] tracking-[-0.05em]">
          {rank}
          <sup className="text-[28px] ml-1 font-black" style={{ verticalAlign: '0.15em' }}>{sup}</sup>
        </div>
        <div className="font-display text-[24px] leading-none tracking-[-0.02em] uppercase mt-2">
          {name}
        </div>
      </div>
      <div className="font-display text-[38px] leading-[0.95] tracking-[-0.03em]">{amount}</div>
    </div>
  )
}

function RuleCard({ pts, title, desc, color }: { pts: string; title: string; desc: string; color: string }) {
  return (
    <div
      className="relative bg-panel rounded-[24px] p-6 flex flex-col gap-3 overflow-hidden"
      style={{ border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="font-display text-[64px] leading-none tracking-[-0.04em]" style={{ color }}>
        {pts}
      </div>
      <h4 className="font-display text-[18px] tracking-[-0.01em] uppercase">{title}</h4>
      <p className="text-muted text-[13px] leading-relaxed font-medium">{desc}</p>
    </div>
  )
}

/* ─── Page ─────────────────────────────────────────────────────── */

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const [
    { count: participantes },
    { count: misPronosticos },
    { data: upcoming },
    { data: topRanking },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    user
      ? supabase.from('predictions').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
      : Promise.resolve({ count: 0, data: null, error: null }),
    supabase
      .from('matches')
      .select('*')
      .in('status', ['upcoming', 'live'])
      .order('scheduled_at', { ascending: true })
      .limit(16),
    supabase
      .from('ranking_entries')
      .select('user_id, name, total_points, rank, exact_predictions, correct_result_predictions')
      .order('rank', { ascending: true })
      .limit(10),
  ])

  const allUpcoming = (upcoming ?? []) as Match[]
  // Only show matches from the first scheduled day
  const firstDay = allUpcoming[0]
    ? new Date(allUpcoming[0].scheduled_at).toDateString()
    : null
  const matches = firstDay
    ? allUpcoming.filter((m) => new Date(m.scheduled_at).toDateString() === firstDay)
    : []

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

  return (
    <>
      {/* ─── HERO ──────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden min-h-[760px] flex items-center"
        style={{ padding: '64px 20px 80px', isolation: 'isolate' }}
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
              Cargá tu prode antes del cierre de cada partido.
            </p>

            <div className="mt-8 flex flex-wrap gap-3 items-center">
              <Link
                href="/mi-prode"
                className="inline-flex items-center gap-[10px] px-[26px] py-[18px] rounded-full font-extrabold text-[15px] bg-orange text-bg transition-transform duration-150 hover:-translate-y-0.5 group shadow-[0_10px_28px_-10px_rgba(255,107,0,.6)] hover:shadow-[0_18px_36px_-10px_rgba(255,107,0,.8)]"
              >
                {user && (misPronosticos ?? 0) > 0 ? 'Ver mi prode' : 'Hacer mi prode'}
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
        <div className="max-w-[1280px] mx-auto px-5 py-7 grid grid-cols-2 min-[780px]:grid-cols-4 gap-5">
          <StatItem num={participantes ?? 0} label="Participantes" live />
          <StatItem num={misPronosticos ?? 0} label="Mis pronósticos" />
          <StatItem num={290} label="Puntos en juego" />
          <StatItem num={80} label="Partidos · 48 selecciones" />
        </div>
      </div>

      {/* ─── UPCOMING MATCHES ───────────────────────────────────── */}
      <section style={{ padding: '80px 20px' }}>
        <div className="max-w-[1280px] mx-auto">
          <SectionHead
            title="Próximos"
            orange="partidos"
            sub="Cargá tu pronóstico antes del cierre. Cada partido suma — y los nervios también."
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
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── PRIZES ─────────────────────────────────────────────── */}
      <section
        id="premios"
        style={{
          padding: '80px 20px',
          background: 'linear-gradient(180deg, #0a0a0a 0%, #0e0a18 100%)',
        }}
      >
        <div className="max-w-[1280px] mx-auto">
          <SectionHead
            title="Podio de"
            orange="premios"
          />

          {/* Pozo dinámico */}
          <div
            className="mb-8 rounded-[20px] px-6 py-5"
            style={{ background: 'rgba(255,224,64,0.07)', border: '1px solid rgba(255,224,64,0.2)' }}
          >
            <p className="font-extrabold text-[15px] tracking-[-0.01em] mb-1" style={{ color: '#FFE040' }}>
              El pozo crece con cada inscripción
            </p>
            <p className="text-[#bdbdbd] text-[13px] leading-relaxed">
              Los premios actuales son <strong className="text-white">base garantizada</strong>.
              Si llegamos a <strong className="text-white">más de 200 inscriptos</strong>, el pozo
              acumulado <strong className="text-white">aumenta proporcionalmente</strong> — cuanto
              más gente sume, más grande el premio.{' '}
              Además, por cada persona que referís y se inscribe,{' '}
              <strong className="text-white">ganás una comisión</strong>. Compartí el link y ganá por partida doble.
            </p>
          </div>

          <div className="grid grid-cols-1 min-[780px]:grid-cols-3 gap-4">
            <PrizeCard rank="1" sup="ER" name="Oro" amount="$800.000" bg="#FFE040" champion />
            <PrizeCard rank="2" sup="DO" name="Plata" amount="$200.000" bg="#A8F0D8" />
            <PrizeCard rank="3" sup="ER" name="Bronce" amount="$100.000" bg="#E8A87C" />
          </div>

          {/* Points rules */}
          <div className="mt-16" id="reglas">
            <h3
              className="font-display uppercase tracking-[-0.02em] leading-none mb-[22px]"
              style={{ fontSize: 'clamp(24px, 3.4vw, 32px)' }}
            >
              Puntaje <em className="italic text-orange">por partido</em>
            </h3>
            <div className="grid grid-cols-1 min-[780px]:grid-cols-3 gap-[14px]">
              <RuleCard
                pts="+3"
                title="Resultado exacto"
                color="#FFE040"
                desc="Le pegaste al resultado completo."
              />
              <RuleCard
                pts="+1"
                title="Ganador o Empate"
                color="#A8F0D8"
                desc="Le pegaste a quien pasaba pero no al resultado exacto. Igual sumás."
              />
              <RuleCard
                pts="0"
                title="Incorrecto"
                color="#3a3a3a"
                desc="El fútbol siempre da revancha."
              />
            </div>
          </div>

          {/* Special bets */}
          <div className="mt-16">
            <h3
              className="font-display uppercase tracking-[-0.02em] leading-none mb-3"
              style={{ fontSize: 'clamp(24px, 3.4vw, 32px)' }}
            >
              Apuestas <em className="italic text-orange">especiales</em>
            </h3>
            <p className="text-muted text-[14px] max-w-[520px] leading-relaxed mb-[22px]">
              Cargás una sola vez antes del Mundial. Si acertás, suman al final del torneo.
            </p>
            <div className="grid grid-cols-1 min-[780px]:grid-cols-3 gap-[14px]">
              <RuleCard
                pts="+20"
                title="Balón de Oro"
                color="#FFE040"
                desc="El mejor jugador del torneo."
              />
              <RuleCard
                pts="+15"
                title="Bota de Oro"
                color="#FF6B00"
                desc="El goleador del torneo."
              />
              <RuleCard
                pts="+15"
                title="Guante de Oro"
                color="#1565C0"
                desc="El mejor arquero del torneo."
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── TOP 10 RANKING ────────────────────────────────────── */}
      {topRanking && topRanking.length > 0 && (
        <section style={{ padding: '80px 20px' }}>
          <div className="max-w-[860px] mx-auto">
            <div className="flex items-end justify-between gap-4 mb-8 flex-wrap">
              <div>
                <div
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-3 text-[11px] font-extrabold tracking-[0.18em] uppercase"
                  style={{ background: 'rgba(168,240,216,0.1)', color: '#A8F0D8' }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-mint" style={{ animation: 'pulse-dot 1.6s infinite' }} />
                  EN VIVO
                </div>
                <h2 className="font-display text-[clamp(28px,4vw,40px)] leading-[.92] tracking-[-0.03em] uppercase">
                  Top 10
                </h2>
              </div>
              <Link
                href="/ranking"
                className="text-[13px] font-extrabold tracking-[0.08em] uppercase text-orange hover:text-white transition-colors"
              >
                Ver ranking completo →
              </Link>
            </div>

            <div className="flex flex-col gap-2">
              {(topRanking as Array<{ user_id: string; name: string; total_points: number; rank: number; exact_predictions: number; correct_result_predictions: number }>).map((entry) => {
                const isMe = user?.id === entry.user_id
                const medals: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }
                return (
                  <div
                    key={entry.user_id}
                    className="flex items-center gap-4 rounded-[18px] px-5 py-3.5"
                    style={{
                      background: isMe ? 'rgba(255,107,0,0.08)' : '#141414',
                      border: `1px solid ${isMe ? 'rgba(255,107,0,0.25)' : 'rgba(255,255,255,0.07)'}`,
                    }}
                  >
                    <div
                      className="w-9 shrink-0 text-center font-display text-[16px]"
                      style={{ color: entry.rank <= 3 ? ['#FFE040','#C0C0C0','#CD7F32'][entry.rank - 1] : '#4a4a4a' }}
                    >
                      {medals[entry.rank] ?? `#${entry.rank}`}
                    </div>
                    <div
                      className="w-8 h-8 rounded-full shrink-0 grid place-items-center font-bold text-[12px]"
                      style={{
                        background: isMe ? 'linear-gradient(135deg,#FF6B00,#FF9A3C)' : 'linear-gradient(135deg,#5B2D8E,#1565C0)',
                        border: '2px solid rgba(255,255,255,0.1)',
                      }}
                    >
                      {entry.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-[14px] truncate block">
                        {entry.name}
                        {isMe && <span className="ml-2 text-[10px] font-extrabold tracking-[0.1em] text-orange">VOS</span>}
                      </span>
                      <span className="text-muted text-[11px] font-semibold hidden min-[480px]:block">
                        {entry.exact_predictions ?? 0} exactas · {entry.correct_result_predictions ?? 0} resultado
                      </span>
                    </div>
                    <div className="shrink-0 font-display text-[24px] leading-none tracking-[-0.03em]"
                      style={{ color: entry.rank <= 3 ? ['#FFE040','#C0C0C0','#CD7F32'][entry.rank - 1] : isMe ? '#FF6B00' : '#fff' }}
                    >
                      {entry.total_points}
                      <span className="text-muted text-[10px] font-extrabold tracking-[0.1em] ml-1">pts</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ─── FOOTER ─────────────────────────────────────────────── */}
      <footer
        className="bg-[#070707]"
        style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '50px 20px 40px' }}
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
                { href: '/reglas', label: 'Reglas generales' },
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
                { href: '/reglas', label: 'Reglas generales' },
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
          <span>© 2026 Prode 26 · Hecho con mate en Buenos Aires</span>
          <span>v1.0.0 · No afiliado a FIFA</span>
        </div>
      </footer>
    </>
  )
}

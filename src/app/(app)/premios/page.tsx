import { PRIZE_TIE_RULES } from '@/lib/ranking-display'
import { createClient } from '@/lib/supabase/server'
import { ReferralShareButton } from '@/components/ReferralShareButton'
import { calculateProjectedPrizes, formatCurrency, formatPrizePool, PRIZE_TARGET_PLAYERS } from '@/lib/prode-progress'

type PublicHomeMetrics = {
  competitors_count?: number
  prize_pool_ars?: number
}

function formatPrizeNumber(amount: number) {
  return new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(amount)))
}

function PrizeCard({
  rank,
  suffix,
  metaLabel,
  name,
  prizeTag,
  cur,
  amount,
  bg,
  champion,
  minHeight,
  rankSize,
  nameSize,
  amountSize,
  decorBefore,
  decorAfter,
}: {
  rank: string
  suffix: string
  metaLabel: string
  name: string
  prizeTag: string
  cur: string
  amount: string
  bg: string
  champion?: boolean
  minHeight: number
  rankSize: number
  nameSize: number
  amountSize: number
  decorBefore: React.CSSProperties
  decorAfter?: React.CSSProperties
}) {
  return (
    <div
      className="relative rounded-[24px] overflow-hidden flex flex-col transition-transform duration-[250ms] hover:-translate-y-1"
      style={{ background: bg, color: '#0A0A0A', padding: '26px 26px 28px', minHeight, isolation: 'isolate' }}
    >
      {champion && (
        <span className="ribbon-corner text-white text-[10px] font-extrabold tracking-[0.2em]" style={{ background: '#5B2D8E' }}>
          CAMPEÓN
        </span>
      )}
      {/* decorative circles */}
      <div className="absolute pointer-events-none" style={{ zIndex: -1, ...decorBefore }} />
      {decorAfter && <div className="absolute pointer-events-none" style={{ zIndex: -1, ...decorAfter }} />}

      {/* head: meta pill + rank */}
      <div className="flex justify-between items-start gap-[10px] mb-[6px]">
        <span
          className="font-mono text-[10px] font-bold tracking-[0.24em] uppercase px-[10px] py-[6px] rounded-full shrink-0"
          style={{ background: 'rgba(0,0,0,.08)', color: 'rgba(0,0,0,.7)' }}
        >
          {metaLabel}
        </span>
        <span
          className="font-display leading-[0.85] tracking-[-0.06em] -mt-[6px]"
          style={{ fontSize: rankSize }}
        >
          {rank}
          <i
            className="not-italic font-black tracking-[0.04em]"
            style={{ fontSize: '0.3em', marginLeft: '0.04em', opacity: 0.55, verticalAlign: '0.85em' }}
          >
            {suffix}
          </i>
        </span>
      </div>

      {/* name pushed to bottom */}
      <div className="font-display tracking-[-0.02em] uppercase leading-none mt-auto" style={{ fontSize: nameSize }}>
        {name}
      </div>

      {/* amount */}
      <div className="mt-[10px] flex items-baseline gap-[6px] font-display">
        <span
          className="font-mono font-bold opacity-50 tracking-[-0.02em] self-start"
          style={{ fontSize: 18, marginTop: 14 }}
        >
          {cur}
        </span>
        <span
          className="italic leading-[0.9] tracking-[-0.05em] tabular-nums"
          style={{ fontSize: amountSize }}
        >
          {amount}
        </span>
      </div>

      {/* tag */}
      <div
        className="mt-[12px] font-mono text-[11px] font-bold tracking-[0.18em] uppercase inline-flex items-center gap-[6px]"
        style={{ color: 'rgba(0,0,0,.55)' }}
      >
        <span className="w-[14px] inline-block" style={{ height: 1, background: 'currentColor' }} />
        {prizeTag}
      </div>
    </div>
  )
}

export default async function PremiosPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const [{ data: profile }, { data: metricsData }] = await Promise.all([
    user
      ? supabase.from('profiles').select('name').eq('id', user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.rpc('get_public_home_metrics'),
  ])
  const metricsRows = metricsData as PublicHomeMetrics[] | PublicHomeMetrics | null
  const metrics = Array.isArray(metricsRows) ? metricsRows[0] : metricsRows
  const confirmedPlayers = metrics?.competitors_count ?? 0
  const projectedPrizes = calculateProjectedPrizes(confirmedPlayers)

  return (
    <div style={{ padding: '48px 20px 100px' }}>
      <div className="max-w-[1280px] mx-auto">

        {/* Header */}
        <div className="mb-10">
          <p className="text-[12px] font-extrabold tracking-[0.22em] uppercase text-muted mb-[18px]">
            Qué se gana
          </p>
          <h1
            className="font-display uppercase leading-[0.9] tracking-[-0.04em]"
            style={{ fontSize: 'clamp(48px,9vw,108px)' }}
          >
            Podio de <em className="italic text-orange">premios</em>
          </h1>
          <p className="font-mono text-[13px] font-bold text-muted tracking-[0.04em] mt-[14px]">
            Mundial 2026 · USA · Canadá · México
          </p>
          <p className="mt-4 max-w-[680px] text-[14px] font-medium leading-relaxed text-[#cfcfcf]">
            La inscripción cuesta <strong className="text-white">$20.000</strong>. Con <strong className="text-white">{confirmedPlayers} confirmados</strong>, los premios estimados se ajustan proporcionalmente contra el objetivo de <strong className="text-white">{PRIZE_TARGET_PLAYERS} competidores</strong>.
          </p>
        </div>

        {/* Pozo banner */}
        <aside
          className="mb-10 rounded-[20px] flex items-start gap-[14px]"
          style={{
            background: 'linear-gradient(90deg,rgba(255,224,64,.07),rgba(255,224,64,.02))',
            border: '1px solid rgba(255,224,64,.22)',
            padding: '20px 24px',
          }}
        >
          <div
            className="w-8 h-8 rounded-[10px] shrink-0 grid place-items-center"
            style={{ background: '#FFE040', color: '#0A0A0A' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-extrabold text-[14px] mb-1" style={{ color: '#FFE040' }}>
              Pozo actual: {formatPrizePool(confirmedPlayers)}
            </h4>
            <p className="text-[#cfcfcf] text-[13px] leading-relaxed font-medium">
              El objetivo de referencia es llegar a <strong className="text-white font-extrabold">{PRIZE_TARGET_PLAYERS} competidores</strong>.
              Con ese objetivo completo, el podio de referencia es {formatCurrency(800000)}, {formatCurrency(200000)} y {formatCurrency(100000)}.
              Si alguien se inscribe utilizando tu referencia,
              <strong className="text-white font-extrabold"> $3.000 de esa inscripción pasan para vos</strong> como recompensa por referido.
              El resto se suma al pozo de premios y a la organización del torneo.
            </p>
          </div>
        </aside>

        {/* Prize grid */}
        <div className="grid grid-cols-1 min-[780px]:grid-cols-3 gap-4 mb-[60px]">
          <PrizeCard
            rank="1" suffix="er" metaLabel="1º Puesto" name="Oro" prizeTag="Premio mayor"
            cur="$" amount={formatPrizeNumber(projectedPrizes.first)} bg="#FFE040" champion
            minHeight={360} rankSize={120} nameSize={26} amountSize={62}
            decorBefore={{ right: '-30%', bottom: '-30%', width: '80%', height: '80%', borderRadius: '50%', background: 'rgba(0,0,0,.07)' }}
            decorAfter={{ left: '-12%', top: '-12%', width: '38%', height: '38%', borderRadius: '50%', background: 'rgba(0,0,0,.05)' }}
          />
          <PrizeCard
            rank="2" suffix="do" metaLabel="2º Puesto" name="Plata" prizeTag="Subcampeón"
            cur="$" amount={formatPrizeNumber(projectedPrizes.second)} bg="#A8F0D8"
            minHeight={320} rankSize={84} nameSize={22} amountSize={46}
            decorBefore={{ right: '-25%', top: '-25%', width: '70%', height: '70%', borderRadius: '50% 0 50% 50%', background: 'rgba(0,0,0,.07)' }}
          />
          <PrizeCard
            rank="3" suffix="er" metaLabel="3º Puesto" name="Bronce" prizeTag="Tercer lugar"
            cur="$" amount={formatPrizeNumber(projectedPrizes.third)} bg="#E8A87C"
            minHeight={300} rankSize={72} nameSize={22} amountSize={40}
            decorBefore={{ left: '-20%', bottom: '-20%', width: '65%', height: '65%', borderRadius: '0 50% 50% 50%', background: 'rgba(0,0,0,.07)' }}
          />
        </div>

        <aside
          className="mb-[60px] rounded-[20px] px-5 py-4"
          style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <p className="font-extrabold text-white text-[13px]">Criterio para premios empatados</p>
          <div className="mt-3 grid gap-2">
            {PRIZE_TIE_RULES.map((rule) => (
              <p key={rule} className="text-[12px] font-bold leading-relaxed text-muted">
                {rule}
              </p>
            ))}
          </div>
        </aside>

        {/* Referral card */}
        <aside
          className="bg-panel rounded-[24px] grid gap-6 items-center"
          style={{ border: '1px solid rgba(255,255,255,0.08)', padding: '32px 28px', gridTemplateColumns: '1fr' }}
        >
          <div>
            <h3
              className="font-display leading-none tracking-[-0.02em] uppercase"
              style={{ fontSize: 'clamp(22px,3vw,30px)' }}
            >
              Más amigos, <em className="italic text-orange">más premio</em>
            </h3>
            <p className="mt-3 text-[#cfcfcf] text-[14px] leading-relaxed font-medium">
              Invitá a tu grupo por WhatsApp y que avisen que vienen de tu parte. No reemplaza a Consultas:
              este botón es solo para compartir tu invitación.
            </p>
          </div>
          <div className="flex items-center gap-[14px] flex-wrap">
            <ReferralShareButton
              name={profile?.name}
              email={user?.email}
              userId={user?.id}
            />
          </div>
        </aside>

      </div>
    </div>
  )
}

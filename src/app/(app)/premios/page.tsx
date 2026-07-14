import type { CSSProperties } from 'react'

function formatPrizeNumber(amount: number) {
  return new Intl.NumberFormat('es-AR', {
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(amount)))
}

const OFFICIAL_PRIZES = {
  first: 600000,
  second: 150000,
  third: 50000,
} as const

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
  decorBefore: CSSProperties
  decorAfter?: CSSProperties
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

      <div className="absolute pointer-events-none" style={{ zIndex: -1, ...decorBefore }} />
      {decorAfter && <div className="absolute pointer-events-none" style={{ zIndex: -1, ...decorAfter }} />}

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

      <div className="font-display tracking-[-0.02em] uppercase leading-none mt-auto" style={{ fontSize: nameSize }}>
        {name}
      </div>

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

export default function PremiosPage() {
  return (
    <div style={{ padding: '48px 20px 100px' }}>
      <div className="max-w-[1280px] mx-auto">
        <div className="mb-10">
          <p className="mb-[18px] text-[12px] font-extrabold uppercase tracking-[0.22em] text-muted">
            Premios oficiales del torneo
          </p>
          <h1
            className="font-display uppercase leading-[0.9] tracking-[-0.04em]"
            style={{ fontSize: 'clamp(48px,9vw,108px)' }}
          >
            Podio de <em className="italic text-orange">premios</em>
          </h1>
          <p className="mt-[14px] font-mono text-[13px] font-bold tracking-[0.04em] text-muted">
            Mundial 2026 · Estados Unidos · Canadá · México
          </p>
        </div>

        <div className="mb-[60px] grid grid-cols-1 gap-4 min-[780px]:grid-cols-3">
          <PrizeCard
            rank="1"
            suffix="er"
            metaLabel="1er puesto"
            name="Oro"
            prizeTag="Premio mayor"
            cur="$"
            amount={formatPrizeNumber(OFFICIAL_PRIZES.first)}
            bg="#FFE040"
            champion
            minHeight={360}
            rankSize={120}
            nameSize={26}
            amountSize={62}
            decorBefore={{ right: '-30%', bottom: '-30%', width: '80%', height: '80%', borderRadius: '50%', background: 'rgba(0,0,0,.07)' }}
            decorAfter={{ left: '-12%', top: '-12%', width: '38%', height: '38%', borderRadius: '50%', background: 'rgba(0,0,0,.05)' }}
          />
          <PrizeCard
            rank="2"
            suffix="do"
            metaLabel="2do puesto"
            name="Plata"
            prizeTag="Subcampeón"
            cur="$"
            amount={formatPrizeNumber(OFFICIAL_PRIZES.second)}
            bg="#D7DADF"
            minHeight={320}
            rankSize={84}
            nameSize={22}
            amountSize={46}
            decorBefore={{ right: '-25%', top: '-25%', width: '70%', height: '70%', borderRadius: '50% 0 50% 50%', background: 'rgba(0,0,0,.07)' }}
            decorAfter={{ left: '-18%', bottom: '-25%', width: '54%', height: '54%', borderRadius: '50%', background: 'rgba(255,255,255,.18)' }}
          />
          <PrizeCard
            rank="3"
            suffix="er"
            metaLabel="3er puesto"
            name="Bronce"
            prizeTag="Tercer lugar"
            cur="$"
            amount={formatPrizeNumber(OFFICIAL_PRIZES.third)}
            bg="#E8A87C"
            minHeight={300}
            rankSize={72}
            nameSize={22}
            amountSize={40}
            decorBefore={{ left: '-20%', bottom: '-20%', width: '65%', height: '65%', borderRadius: '0 50% 50% 50%', background: 'rgba(0,0,0,.07)' }}
          />
        </div>

        <aside
          className="rounded-[24px] px-6 py-6 min-[760px]:px-8 min-[760px]:py-7"
          style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <p className="font-display text-[clamp(24px,3vw,34px)] uppercase leading-none text-white">
            Criterio de desempate
          </p>
          <div className="mt-5 grid gap-4 text-[14px] font-bold leading-relaxed text-[#cfcfcf]">
            <p>El ranking ordena primero por puntos totales.</p>
            <p>Si hay empate en puntos, queda arriba quien tenga más resultados exactos.</p>
            <p>Si el empate continúa, se mantiene el empate en la posición correspondiente.</p>
            <p>Si varios participantes empatan en puestos con premio, comparten el premio correspondiente según la posición alcanzada.</p>
          </div>
        </aside>
      </div>
    </div>
  )
}

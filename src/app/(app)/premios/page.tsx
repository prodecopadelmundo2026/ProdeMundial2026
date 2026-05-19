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
  amount: string
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
          className="ribbon-corner text-white text-[10px] font-extrabold tracking-[0.12em]"
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

export default function PremiosPage() {
  return (
    <div style={{ padding: '48px 20px 80px' }}>
      <div className="max-w-[1060px] mx-auto">

        {/* Header */}
        <div className="mb-12">
          <p className="text-[11px] font-extrabold tracking-[0.22em] uppercase text-muted mb-3">
            Mundial 2026
          </p>
          <h1
            className="font-display uppercase leading-[0.9] tracking-[-0.03em]"
            style={{ fontSize: 'clamp(36px, 6vw, 64px)' }}
          >
            Podio de <em className="italic text-orange">premios</em>
          </h1>
          <p className="text-muted text-[14px] mt-3">
            USA · Canadá · México
          </p>
        </div>

        {/* Pozo dinámico */}
        <div
          className="mb-10 rounded-[20px] px-6 py-5"
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

        {/* Prize cards */}
        <section className="mb-16">
          <div className="grid grid-cols-1 min-[780px]:grid-cols-3 gap-4">
            <PrizeCard rank="1" sup="ER" name="Oro" amount="$800.000" bg="#FFE040" champion />
            <PrizeCard rank="2" sup="DO" name="Plata" amount="$200.000" bg="#A8F0D8" />
            <PrizeCard rank="3" sup="ER" name="Bronce" amount="$100.000" bg="#E8A87C" />
          </div>
        </section>

        {/* Puntaje por partido */}
        <div className="mt-16 mb-5">
          <h3
            className="font-display uppercase tracking-[-0.02em] leading-none"
            style={{ fontSize: 'clamp(24px,3.4vw,32px)' }}
          >
            Puntaje <em className="italic text-orange">por partido</em>
          </h3>
        </div>
        <div className="grid grid-cols-1 min-[780px]:grid-cols-3 gap-3 mb-16">
          {[
            { pts: '+3', title: 'Resultado exacto', desc: 'Le pegaste al marcador completo. Mostrá esto en la cena familiar.', color: '#FFE040' },
            { pts: '+1', title: 'Ganador o empate', desc: 'Acertaste quién la rompía aunque no el resultado exacto. Igual sumás.', color: '#A8F0D8' },
            { pts: '0',  title: 'Incorrecto',       desc: 'El fútbol es así. Mañana viene otro partido. No se sufre, se juega.', color: '#3a3a3a' },
          ].map(({ pts, title, desc, color }) => (
            <div
              key={pts}
              className="bg-panel rounded-[24px] p-6 flex flex-col gap-3"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="font-display text-[64px] leading-none tracking-[-0.04em]" style={{ color }}>{pts}</div>
              <h4 className="font-display text-[18px] tracking-[-0.01em] uppercase">{title}</h4>
              <p className="text-muted text-[13px] leading-relaxed font-medium">{desc}</p>
            </div>
          ))}
        </div>

        {/* Apuestas especiales */}
        <div className="mb-5">
          <h3
            className="font-display uppercase tracking-[-0.02em] leading-none"
            style={{ fontSize: 'clamp(24px,3.4vw,32px)' }}
          >
            Apuestas <em className="italic text-orange">especiales</em>
          </h3>
          <p className="text-muted text-[14px] mt-2 max-w-[520px] leading-relaxed">
            Cargás una sola vez antes del Mundial. Si acertás, suman al final del torneo.
          </p>
        </div>
        <div className="grid grid-cols-1 min-[780px]:grid-cols-3 gap-3">
          {[
            { pts: '+20', title: 'Balón de Oro',  desc: 'El mejor jugador del torneo. El más subjetivo de todos — por eso vale más.', color: '#5B2D8E' },
            { pts: '+15', title: 'Bota de Oro',   desc: 'El jugador con más goles al final del Mundial. El máximo artillero.',        color: '#FF6B00' },
            { pts: '+15', title: 'Guante de Oro', desc: 'El mejor arquero del torneo. El que menos comió, el que más voló.',          color: '#1565C0' },
          ].map(({ pts, title, desc, color }) => (
            <div
              key={title}
              className="bg-panel rounded-[24px] p-6 flex flex-col gap-3"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="font-display text-[64px] leading-none tracking-[-0.04em]" style={{ color }}>{pts}</div>
              <h4 className="font-display text-[18px] tracking-[-0.01em] uppercase">{title}</h4>
              <p className="text-muted text-[13px] leading-relaxed font-medium">{desc}</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}

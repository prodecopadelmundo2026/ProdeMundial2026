const MATCH_RULES = [
  {
    type: 'exact',
    meta: 'Acierto pleno',
    pts: '+3',
    name: 'Resultado exacto',
    desc: 'Le pegaste al marcador completo.',
    color: '#FFE040',
  },
  {
    type: 'partial',
    meta: 'Acierto parcial',
    pts: '+1',
    name: 'Ganador o empate',
    desc: 'Acertaste quién ganaba (o el empate) aunque no el resultado exacto.',
    color: '#A8F0D8',
  },
  {
    type: 'miss',
    meta: 'Sin acierto',
    pts: '0',
    name: 'Incorrecto',
    desc: 'El fútbol es así. Siempre da revancha.',
    color: '#3a3a3a',
  },
]

const SPECIAL_RULES = [
  {
    meta: 'Mejor jugador',
    pts: '+20',
    name: 'Balón de Oro',
    desc: 'El mejor jugador del torneo.',
    color: '#5B2D8E',
  },
  {
    meta: 'Máximo goleador',
    pts: '+15',
    name: 'Bota de Oro',
    desc: 'El jugador con más goles al final del Mundial. El goleador del torneo.',
    color: '#FF6B00',
  },
  {
    meta: 'Mejor arquero',
    pts: '+15',
    name: 'Guante de Oro',
    desc: 'El mejor arquero del torneo.',
    color: '#1565C0',
  },
]

const GENERAL_RULES = [
  {
    title: 'Cómo funciona el Prode',
    desc: 'Elegí TODO el Mundial 2026: cargá la fase de grupos, armá tus eliminatorias, decidí quién avanza, quién queda afuera y quién se consagra campeón. Cada acierto suma puntos durante el torneo y también podés sumar extra con las apuestas especiales.',
  },
  {
    title: 'Carga de pronósticos',
    desc: 'Cada apuesta se carga antes del inicio del partido o según el cierre que marque el sistema. Una vez que el partido queda bloqueado, no se puede modificar.',
  },
  {
    title: 'Premios',
    desc: 'Se premia el podio final del ranking. El pozo y los premios prometidos dependen de llegar al mínimo de 65 jugadores pagos/confirmados.',
  },
  {
    title: 'Mínimo de jugadores',
    desc: 'El objetivo es juntar al menos 65 jugadores. Por eso conviene invitar amigos: ayuda a completar el pozo y deja el Prode mejor armado para todos.',
  },
]

const TIE_EXAMPLES = [
  'Si el 1° queda definido y dos jugadores empatan abajo, comparten 2° y 3° premio entre los dos.',
  'Si dos jugadores empatan solo en el 3° puesto, comparten únicamente el premio del 3° puesto.',
]

function InfoCard({ title, desc }: { title: string; desc: string }) {
  return (
    <article
      className="rounded-[20px]"
      style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)', padding: '22px 22px 20px' }}
    >
      <h3 className="font-display uppercase leading-none" style={{ fontSize: 18, letterSpacing: '-0.01em' }}>
        {title}
      </h3>
      <p className="mt-3 text-[13px] font-medium leading-relaxed" style={{ color: '#cfcfcf' }}>
        {desc}
      </p>
    </article>
  )
}

function RuleCard({ meta, pts, name, desc, color }: {
  meta: string; pts: string; name: string; desc: string; color: string
}) {
  return (
    <article
      className="relative flex flex-col overflow-hidden"
      style={{
        background: '#141414',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 24,
        padding: '28px 26px 26px',
        minHeight: 230,
        transition: 'transform .2s ease, border-color .2s ease',
      }}
    >
      {/* Left color strip */}
      <div
        className="absolute left-0 top-0 bottom-0"
        style={{ width: 3, background: color, opacity: 0.85 }}
      />

      {/* Head row: meta pill + pts */}
      <div className="flex justify-between items-start gap-2.5 mb-auto">
        <span
          className="font-mono text-[10px] font-bold uppercase"
          style={{
            letterSpacing: '0.24em',
            padding: '6px 10px',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.06)',
            color: '#8A8A8A',
          }}
        >
          {meta}
        </span>
        <span
          className="font-display"
          style={{ fontSize: 72, lineHeight: 0.85, letterSpacing: '-0.05em', color, marginTop: -6 }}
        >
          {pts}
        </span>
      </div>

      <h4
        className="font-display uppercase"
        style={{ fontSize: 18, letterSpacing: '-0.01em', lineHeight: 1.05, marginTop: 20 }}
      >
        {name}
      </h4>
      <p
        className="font-medium"
        style={{ marginTop: 10, color: '#8A8A8A', fontSize: 13, lineHeight: 1.5 }}
      >
        {desc}
      </p>
    </article>
  )
}

export default function ReglasPage() {
  return (
    <div style={{ padding: '48px 20px 100px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 40 }}>
          <span
            className="font-sans font-extrabold uppercase"
            style={{ fontSize: 12, letterSpacing: '0.22em', color: '#8A8A8A', display: 'inline-block', marginBottom: 18 }}
          >
            Cómo jugar
          </span>
          <h1
            className="font-display uppercase"
            style={{ fontSize: 'clamp(48px, 9vw, 108px)', lineHeight: 0.9, letterSpacing: '-0.04em' }}
          >
            Reglas del <em className="italic" style={{ color: '#FF6B00' }}>juego</em>
          </h1>
          <p
            className="font-mono font-bold"
            style={{ marginTop: 14, color: '#8A8A8A', fontSize: 13, letterSpacing: '0.04em' }}
          >
            Mundial 2026 · USA · Canadá · México
          </p>
        </div>

        {/* ── Info banner ── */}
        <aside
          className="flex items-start gap-3.5"
          style={{
            marginBottom: 40,
            background: 'linear-gradient(90deg, rgba(168,240,216,.07), rgba(168,240,216,.02))',
            border: '1px solid rgba(168,240,216,.22)',
            borderRadius: 20,
            padding: '20px 24px',
          }}
        >
          <div
            className="shrink-0 grid place-items-center"
            style={{ width: 32, height: 32, borderRadius: 10, background: '#A8F0D8', color: '#0A0A0A' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h4
              className="font-sans font-extrabold"
              style={{ fontSize: 14, color: '#A8F0D8', marginBottom: 4 }}
            >
              El que más le pega, gana
            </h4>
            <p className="font-medium" style={{ fontSize: 13, lineHeight: 1.55, color: '#cfcfcf' }}>
              Elegí <strong style={{ color: '#fff', fontWeight: 800 }}>TODO el Mundial 2026</strong>: cargá la fase de grupos, armá tus eliminatorias, decidí quién avanza, quién queda afuera y quién se consagra campeón. Hay <strong style={{ color: '#fff', fontWeight: 800 }}>104 partidos</strong> en juego, cada acierto suma puntos durante el torneo y también podés sumar <strong style={{ color: '#fff', fontWeight: 800 }}>hasta 50 puntos extra</strong> con las apuestas especiales (Balón, Bota y Guante de Oro).
            </p>
          </div>
        </aside>

        {/* ── Funcionamiento general ── */}
        <section style={{ marginBottom: 60 }}>
          <div style={{ marginBottom: 22 }}>
            <h2
              className="font-display uppercase"
              style={{ fontSize: 'clamp(24px, 3.4vw, 32px)', letterSpacing: '-0.02em', lineHeight: 1 }}
            >
              Cómo funciona el <em className="italic" style={{ color: '#FF6B00' }}>Prode</em>
            </h2>
            <p className="font-medium" style={{ marginTop: 8, color: '#8A8A8A', fontSize: 14, maxWidth: 620, lineHeight: 1.5 }}>
              La idea es simple: cargás tus pronósticos a tiempo, seguís el ranking en vivo y competís por el podio.
            </p>
          </div>
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
            {GENERAL_RULES.map((rule) => <InfoCard key={rule.title} {...rule} />)}
          </div>
        </section>

        {/* ── Puntaje por partido ── */}
        <section style={{ marginBottom: 60 }}>
          <div style={{ marginBottom: 22 }}>
            <h2
              className="font-display uppercase"
              style={{ fontSize: 'clamp(24px, 3.4vw, 32px)', letterSpacing: '-0.02em', lineHeight: 1 }}
            >
              Puntaje por <em className="italic" style={{ color: '#FF6B00' }}>partido</em>
            </h2>
            <p className="font-medium" style={{ marginTop: 8, color: '#8A8A8A', fontSize: 14, maxWidth: 520, lineHeight: 1.5 }}>
              Cargá un resultado por partido. Cada acierto suma según el tipo.
            </p>
          </div>
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {MATCH_RULES.map((r) => <RuleCard key={r.type} {...r} />)}
          </div>
        </section>

        {/* ── Apuestas especiales ── */}
        <section style={{ marginBottom: 60 }}>
          <div style={{ marginBottom: 22 }}>
            <h2
              className="font-display uppercase"
              style={{ fontSize: 'clamp(24px, 3.4vw, 32px)', letterSpacing: '-0.02em', lineHeight: 1 }}
            >
              Apuestas <em className="italic" style={{ color: '#FF6B00' }}>especiales</em>
            </h2>
            <p className="font-medium" style={{ marginTop: 8, color: '#8A8A8A', fontSize: 14, maxWidth: 520, lineHeight: 1.5 }}>
              Cargás una sola vez antes del Mundial. Si acertás, suman al final del torneo.
            </p>
          </div>
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {SPECIAL_RULES.map((r) => <RuleCard key={r.name} {...r} />)}
          </div>
        </section>

        {/* ── Ranking transparente ── */}
        <section style={{ marginBottom: 60 }}>
          <div
            className="rounded-[20px]"
            style={{
              background: 'linear-gradient(90deg, rgba(168,240,216,.07), rgba(168,240,216,.02))',
              border: '1px solid rgba(168,240,216,.2)',
              padding: '24px',
            }}
          >
            <h2
              className="font-display uppercase"
              style={{ fontSize: 'clamp(22px, 3vw, 30px)', letterSpacing: '-0.02em', lineHeight: 1 }}
            >
              Ranking <em className="italic" style={{ color: '#A8F0D8' }}>transparente</em>
            </h2>
            <p className="mt-4 text-[14px] font-medium leading-relaxed" style={{ color: '#cfcfcf', maxWidth: 760 }}>
              Durante el Mundial vas a poder entrar al ranking, tocar cualquier jugador y revisar su Prode completo:
              qué resultados cargó, en cuáles acertó, en cuáles falló y cómo fue sumando puntos.
            </p>
            <p className="mt-3 text-[13px] font-bold leading-relaxed" style={{ color: '#A8F0D8', maxWidth: 760 }}>
              Así todos pueden seguir la tabla en vivo y entender de dónde sale cada posición.
            </p>
          </div>
        </section>

        {/* ── Desempates y premios ── */}
        <section style={{ marginBottom: 60 }}>
          <div style={{ marginBottom: 22 }}>
            <h2
              className="font-display uppercase"
              style={{ fontSize: 'clamp(24px, 3.4vw, 32px)', letterSpacing: '-0.02em', lineHeight: 1 }}
            >
              Desempates y <em className="italic" style={{ color: '#FF6B00' }}>premios</em>
            </h2>
          </div>
          <div
            className="rounded-[20px]"
            style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)', padding: '24px' }}
          >
            <p className="text-[14px] font-medium leading-relaxed" style={{ color: '#cfcfcf' }}>
              El ranking ordena primero por puntos. Si hay empate en puntos, desempata la cantidad de resultados exactos.
              Si también empatan en exactas, los jugadores comparten el puesto y el premio correspondiente.
            </p>
            <div className="mt-4 grid gap-2">
              {TIE_EXAMPLES.map((example) => (
                <p key={example} className="text-[12px] font-bold leading-relaxed text-muted">
                  {example}
                </p>
              ))}
            </div>
            <p className="mt-4 text-[12px] font-bold leading-relaxed" style={{ color: '#A8F0D8' }}>
              Criollo: si quedaron iguales en puntos y exactas, no se inventa otro desempate. Se comparte lo que toque.
            </p>
          </div>
        </section>

        {/* ── Footer ── */}
        <p
          className="font-mono font-bold uppercase text-center"
          style={{ marginTop: 12, fontSize: 11, color: '#3a3a3a', letterSpacing: '0.18em' }}
        >
          · fin de reglas ·
        </p>

      </div>
    </div>
  )
}

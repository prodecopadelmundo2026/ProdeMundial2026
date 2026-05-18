export default function ReglasPage() {
  return (
    <div style={{ padding: '48px 20px 80px' }}>
      <div className="max-w-[860px] mx-auto">

        {/* Header */}
        <div className="mb-12">
          <p className="text-[11px] font-extrabold tracking-[0.22em] uppercase text-muted mb-3">
            Cómo jugar
          </p>
          <h1
            className="font-display uppercase leading-[0.9] tracking-[-0.03em]"
            style={{ fontSize: 'clamp(36px, 6vw, 64px)' }}
          >
            Reglas del <em className="italic text-orange">Prode</em>
          </h1>
          <p className="text-muted text-[14px] mt-3">
            Mundial 2026 · USA · Canadá · México
          </p>
        </div>

        {/* Sistema de puntaje */}
        <section className="mb-10">
          <h2
            className="font-display uppercase tracking-[-0.02em] leading-none mb-5"
            style={{ fontSize: 'clamp(20px, 3vw, 28px)' }}
          >
            Sistema de <em className="italic text-orange">puntaje</em>
          </h2>
          <div className="grid grid-cols-1 min-[640px]:grid-cols-3 gap-3">
            {[
              { pts: '+3', title: 'Resultado exacto', desc: 'Acertás el marcador completo.', color: '#FFE040' },
              { pts: '+1', title: 'Ganador o Empate', desc: 'Acertás quién gana o que empatan, pero no el marcador exacto.', color: '#A8F0D8' },
              { pts: '0', title: 'Incorrecto', desc: 'El fútbol siempre da revancha.', color: '#3a3a3a' },
            ].map(({ pts, title, desc, color }) => (
              <div
                key={title}
                className="relative bg-panel rounded-[20px] p-6 flex flex-col gap-2 overflow-hidden"
                style={{ border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div className="font-display text-[56px] leading-none tracking-[-0.04em]" style={{ color }}>
                  {pts}
                </div>
                <h4 className="font-display text-[16px] tracking-[-0.01em] uppercase">{title}</h4>
                <p className="text-muted text-[13px] leading-relaxed font-medium">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Reglas generales */}
        <section className="mb-10">
          <h2
            className="font-display uppercase tracking-[-0.02em] leading-none mb-5"
            style={{ fontSize: 'clamp(20px, 3vw, 28px)' }}
          >
            Reglas <em className="italic text-orange">generales</em>
          </h2>
          <div
            className="rounded-[20px] overflow-hidden"
            style={{ border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {[
              'Podés predecir o modificar tu pronóstico antes que comience el mundial.',
              'Una vez cerrado el partido, tu predicción queda bloqueada.',
              'Los resultados se cargan manualmente después de cada partido.',
              'El ranking se actualiza automáticamente al cargar resultados.',
              'En caso de empate en puntos, desempata quien tenga más aciertos exactos.',
            ].map((rule, i) => (
              <div
                key={i}
                className="flex gap-5 px-6 py-4"
                style={{
                  background: '#141414',
                  borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.06)' : undefined,
                }}
              >
                <span
                  className="font-display text-[20px] leading-none shrink-0 mt-0.5"
                  style={{ color: '#FF6B00' }}
                >
                  {i + 1}
                </span>
                <p className="text-[14px] leading-relaxed font-medium" style={{ color: '#cfcfcf' }}>
                  {rule}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Apuestas especiales */}
        <section>
          <h2
            className="font-display uppercase tracking-[-0.02em] leading-none mb-2"
            style={{ fontSize: 'clamp(20px, 3vw, 28px)' }}
          >
            Apuestas <em className="italic text-orange">especiales</em>
          </h2>
          <p className="text-muted text-[14px] max-w-[520px] leading-relaxed mb-5">
            Se cargan una sola vez antes del Mundial. Si acertás, suman al final del torneo.
          </p>
          <div className="grid grid-cols-1 min-[640px]:grid-cols-3 gap-3">
            {[
              { pts: '+20', title: 'Balón de Oro', desc: 'El mejor jugador del torneo.', color: '#FFE040' },
              { pts: '+15', title: 'Bota de Oro', desc: 'El goleador del torneo.', color: '#FF6B00' },
              { pts: '+15', title: 'Guante de Oro', desc: 'El mejor arquero del torneo.', color: '#1565C0' },
            ].map(({ pts, title, desc, color }) => (
              <div
                key={title}
                className="relative bg-panel rounded-[20px] p-6 flex flex-col gap-2 overflow-hidden"
                style={{ border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div className="font-display text-[56px] leading-none tracking-[-0.04em]" style={{ color }}>
                  {pts}
                </div>
                <h4 className="font-display text-[16px] tracking-[-0.01em] uppercase">{title}</h4>
                <p className="text-muted text-[13px] leading-relaxed font-medium">{desc}</p>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  )
}

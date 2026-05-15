export default function ReglasPage() {
  return (
    <div className="space-y-10 max-w-2xl">
      <div className="border-b border-[#272727] pb-6">
        <p className="text-xs tracking-[0.25em] uppercase text-[#c8a84a] mb-2">Cómo jugar</p>
        <h1
          className="text-4xl font-bold text-[#ede8dc]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Reglas del Prode
        </h1>
        <p className="text-[#7a7266] mt-2 text-sm tracking-wide">
          Mundial 2026 — USA · Canadá · México
        </p>
      </div>

      {/* Puntaje */}
      <section className="border border-[#272727] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#272727] bg-[#131313]">
          <h2
            className="font-semibold text-[#ede8dc]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Sistema de puntaje
          </h2>
        </div>
        <div className="divide-y divide-[#272727]">
          <div className="px-5 py-4 bg-[#131313] flex items-center justify-between">
            <div>
              <p className="font-medium text-[#ede8dc]">Resultado exacto</p>
              <p className="text-sm text-[#7a7266] mt-0.5">Acertás marcador y ganador</p>
            </div>
            <span
              className="text-2xl font-bold text-[#c8a84a] tabular-nums"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              3 pts
            </span>
          </div>
          <div className="px-5 py-4 bg-[#131313] flex items-center justify-between">
            <div>
              <p className="font-medium text-[#ede8dc]">Resultado correcto</p>
              <p className="text-sm text-[#7a7266] mt-0.5">Acertás ganador o empate, no el marcador</p>
            </div>
            <span
              className="text-2xl font-bold text-[#ede8dc] tabular-nums"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              1 pt
            </span>
          </div>
          <div className="px-5 py-4 bg-[#131313] flex items-center justify-between">
            <div>
              <p className="font-medium text-[#ede8dc]">Resultado incorrecto</p>
              <p className="text-sm text-[#7a7266] mt-0.5">No acertás nada</p>
            </div>
            <span
              className="text-2xl font-bold text-[#3a3630] tabular-nums"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              0 pts
            </span>
          </div>
        </div>
      </section>

      {/* Reglas generales */}
      <section className="border border-[#272727] bg-[#131313] px-5 py-5 space-y-4">
        <h2
          className="font-semibold text-[#ede8dc] mb-5"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Reglas generales
        </h2>
        {[
          'Podés predecir o modificar tu pronóstico hasta el momento de cierre de cada partido.',
          'Una vez cerrado el partido, tu predicción queda bloqueada.',
          'Los resultados se cargan manualmente después de cada partido.',
          'El ranking se actualiza automáticamente al cargar resultados.',
          'En caso de empate en puntos, desempata quien tenga más aciertos exactos.',
        ].map((rule, i) => (
          <div key={i} className="flex gap-4 text-sm text-[#7a7266]">
            <span className="text-[#c8a84a] font-medium tabular-nums shrink-0"
              style={{ fontFamily: 'var(--font-display)' }}>
              {i + 1}.
            </span>
            <span>{rule}</span>
          </div>
        ))}
      </section>

      {/* Cierre */}
      <section className="border border-[#c8a84a]/20 bg-[#c8a84a]/5 px-5 py-4">
        <p className="text-sm text-[#c8a84a]/80">
          <span className="font-semibold text-[#c8a84a]">Cierre de predicciones:</span>{' '}
          cada partido cierra automáticamente según la hora oficial. Verificá el fixture
          para ver cuándo cierra cada partido.
        </p>
      </section>
    </div>
  )
}

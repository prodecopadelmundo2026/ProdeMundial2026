export default function ReglasPage() {
  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reglas del Prode</h1>
        <p className="text-gray-500 mt-1 text-sm">Mundial 2026 — USA · Canadá · México</p>
      </div>

      {/* Puntaje */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Sistema de puntaje</h2>
        </div>
        <div className="divide-y divide-gray-50">
          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800">Resultado exacto</p>
              <p className="text-sm text-gray-500">Acertás marcador y ganador</p>
            </div>
            <span className="text-2xl font-bold text-green-700 tabular-nums">3 pts</span>
          </div>
          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800">Resultado correcto</p>
              <p className="text-sm text-gray-500">Acertás ganador o empate, no el marcador</p>
            </div>
            <span className="text-2xl font-bold text-blue-600 tabular-nums">1 pt</span>
          </div>
          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800">Resultado incorrecto</p>
              <p className="text-sm text-gray-500">No acertás nada</p>
            </div>
            <span className="text-2xl font-bold text-gray-300 tabular-nums">0 pts</span>
          </div>
        </div>
      </section>

      {/* Reglas generales */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-5 space-y-3">
        <h2 className="font-semibold text-gray-900 mb-4">Reglas generales</h2>
        {[
          'Podés predecir o modificar tu pronóstico hasta el momento de cierre de cada partido.',
          'Una vez cerrado el partido, tu predicción queda bloqueada.',
          'Los resultados se cargan manualmente después de cada partido.',
          'El ranking se actualiza automáticamente al cargar resultados.',
          'En caso de empate en puntos, desempata quien tenga más aciertos exactos.',
        ].map((rule, i) => (
          <div key={i} className="flex gap-3 text-sm text-gray-600">
            <span className="text-gray-300 font-medium tabular-nums shrink-0">{i + 1}.</span>
            <span>{rule}</span>
          </div>
        ))}
      </section>

      {/* Cierre */}
      <section className="bg-yellow-50 border border-yellow-200 rounded-xl px-5 py-4">
        <p className="text-sm text-yellow-800">
          <span className="font-semibold">Cierre de predicciones:</span> cada partido cierra automáticamente según la hora oficial. Verificá el fixture para ver cuándo cierra cada partido.
        </p>
      </section>
    </div>
  )
}

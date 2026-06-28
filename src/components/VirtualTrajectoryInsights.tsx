import type {
  VirtualMatchTrajectoryInsights,
  VirtualTrajectoryParticipant,
} from '@/lib/public-prediction-data'
import { getTeam } from '@/lib/teams'

function compactNames(items: VirtualTrajectoryParticipant[], limit = 3) {
  if (!items.length) return 'Nadie'
  const visible = items.slice(0, limit).map((item) => item.name).join(', ')
  const remaining = items.length - limit
  return remaining > 0 ? `${visible} +${remaining} más` : visible
}

function ParticipantChips({
  items,
  points,
}: {
  items: VirtualTrajectoryParticipant[]
  points: 1 | 2
}) {
  if (!items.length) {
    return <p className="text-[12px] font-semibold text-muted">Nadie en esta categoría.</p>
  }
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item.userId}
          className="rounded-full px-3 py-2 text-[11px] font-bold text-white"
          style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          {item.name} <strong className={points === 2 ? 'text-orange' : 'text-mint'}>+{points}</strong>
        </span>
      ))}
    </div>
  )
}

function PredictionLine({
  participant,
  homeTeam,
  awayTeam,
}: {
  participant: VirtualTrajectoryParticipant
  homeTeam: string
  awayTeam: string
}) {
  const prediction = participant.prediction
  if (!prediction) {
    return <p className="mt-2 text-[11px] font-semibold text-muted">Pronóstico de resultado no disponible en esta vista.</p>
  }
  return (
    <div className="mt-3 grid gap-1 text-[11px] font-semibold text-[#d7d7d7]">
      <p>Pronóstico: {homeTeam} {prediction.homeScore} - {prediction.awayScore} {awayTeam}</p>
      <p className="text-mint">
        {prediction.classifiedTeam ? `Clasifica ${prediction.classifiedTeam}` : 'Clasificado no definido'}
      </p>
    </div>
  )
}

export function VirtualTrajectoryInsights({
  homeTeam,
  awayTeam,
  data,
  compact = false,
}: {
  homeTeam: string
  awayTeam: string
  data: VirtualMatchTrajectoryInsights
  compact?: boolean
}) {
  const exactTitle = data.exactCrossing.length === 1
    ? `${data.exactCrossing[0].name} acertó el cruce exacto`
    : data.exactCrossing.length > 1
    ? `${data.exactCrossing.length} participantes acertaron el cruce exacto`
    : 'Nadie acertó este cruce exacto'

  if (compact) {
    return (
      <div className="mt-3 grid gap-3">
        <div className="rounded-[12px] px-3 py-3" style={{ background: 'rgba(255,107,0,0.09)', border: '1px solid rgba(255,107,0,0.28)' }}>
          <p className="text-[13px] font-extrabold text-white">{exactTitle}</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-orange">
            {data.exactCrossing.length ? '+2 trayectoria por ambos clasificados' : 'Cruce exacto'}
          </p>
        </div>
        <div className="grid gap-1.5 text-[11px] font-semibold leading-relaxed text-muted">
          <p><strong className="text-orange">Ambos, en otro cruce:</strong> {compactNames(data.bothTeamsOtherCrossing)}</p>
          <p><strong className="text-mint">{getTeam(homeTeam).flag} Solo {homeTeam}:</strong> {compactNames(data.homeTeamOnly)}</p>
          <p><strong className="text-mint">{getTeam(awayTeam).flag} Solo {awayTeam}:</strong> {compactNames(data.awayTeamOnly)}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      <section className="rounded-[18px] p-4" style={{ background: 'linear-gradient(135deg, rgba(255,107,0,0.13), rgba(168,240,216,0.05))', border: '1px solid rgba(255,107,0,0.34)' }}>
        <p className="font-mono text-[10px] font-extrabold uppercase tracking-[0.15em] text-orange">Cruce exacto acertado</p>
        <h3 className="mt-2 font-display text-[clamp(24px,4vw,38px)] uppercase leading-none text-white">{exactTitle}</h3>
        {data.exactCrossing.length > 0 && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {data.exactCrossing.map((participant) => (
              <article key={participant.userId} className="rounded-[14px] bg-[#0A0A0A] p-3" style={{ border: '1px solid rgba(168,240,216,0.18)' }}>
                <div className="flex items-center justify-between gap-3">
                  <strong className="text-[13px] text-white">{participant.name}</strong>
                  <span className="rounded-full bg-orange/15 px-2.5 py-1 text-[10px] font-extrabold text-orange">+2 trayectoria</span>
                </div>
                <PredictionLine participant={participant} homeTeam={homeTeam} awayTeam={awayTeam} />
              </article>
            ))}
          </div>
        )}
        <p className="mt-4 text-[11px] font-semibold leading-relaxed text-muted">
          El +2 corresponde únicamente a los dos equipos clasificados. Puede sumar los puntos normales del partido si acierta ganador, clasificado o resultado según las reglas vigentes.
        </p>
      </section>

      <div className="grid gap-3 lg:grid-cols-3">
        <section className="rounded-[15px] bg-[#101010] p-4" style={{ border: '1px solid rgba(255,107,0,0.18)' }}>
          <p className="text-[12px] font-extrabold text-white">Ambos equipos, en otro cruce</p>
          <p className="mb-3 mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-orange">+2 trayectoria</p>
          <ParticipantChips items={data.bothTeamsOtherCrossing} points={2} />
        </section>
        <section className="rounded-[15px] bg-[#101010] p-4" style={{ border: '1px solid rgba(168,240,216,0.16)' }}>
          <p className="text-[12px] font-extrabold text-white">{getTeam(homeTeam).flag} Solo acertaron a {homeTeam}</p>
          <p className="mb-3 mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-mint">+1 trayectoria</p>
          <ParticipantChips items={data.homeTeamOnly} points={1} />
        </section>
        <section className="rounded-[15px] bg-[#101010] p-4" style={{ border: '1px solid rgba(168,240,216,0.16)' }}>
          <p className="text-[12px] font-extrabold text-white">{getTeam(awayTeam).flag} Solo acertaron a {awayTeam}</p>
          <p className="mb-3 mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-mint">+1 trayectoria</p>
          <ParticipantChips items={data.awayTeamOnly} points={1} />
        </section>
      </div>
    </div>
  )
}

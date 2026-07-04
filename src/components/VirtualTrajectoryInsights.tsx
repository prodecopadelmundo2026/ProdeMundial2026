import type {
  VirtualMatchTrajectoryInsights,
  VirtualTrajectoryParticipant,
} from '@/lib/public-prediction-data'
import { flagUrl, getTeam } from '@/lib/teams'

function TeamFlag({ team }: { team: string }) {
  const meta = getTeam(team)
  return meta.iso2 ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={flagUrl(meta.iso2)} alt="" className="inline-block h-[14px] w-[20px] rounded-sm object-cover align-[-2px]" />
  ) : <span>{meta.flag}</span>
}

function compactNames(items: VirtualTrajectoryParticipant[], limit = 3) {
  if (!items.length) return 'Nadie'
  const visible = items.slice(0, limit).map((item) => item.name).join(', ')
  const remaining = items.length - limit
  return remaining > 0 ? `${visible} +${remaining} más` : visible
}

function ParticipantChips({
  items,
}: {
  items: VirtualTrajectoryParticipant[]
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
          {item.name}
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
    return <p className="mt-2 text-[11px] font-semibold text-muted">Resultado no cargado para este cruce.</p>
  }
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] font-bold text-[#ededed]">
      <TeamFlag team={homeTeam} />
      <span>{homeTeam} {prediction.homeScore} - {prediction.awayScore} {awayTeam}</span>
      <TeamFlag team={awayTeam} />
      {prediction.classifiedTeam && <span className="text-mint">· clasifica {prediction.classifiedTeam}</span>}
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
    : `Nadie acertó el cruce exacto ${homeTeam} vs ${awayTeam}.`

  if (compact) {
    return (
      <div className="mt-3 grid gap-3">
        <div className="rounded-[12px] px-3 py-3" style={{ background: 'rgba(255,107,0,0.09)', border: '1px solid rgba(255,107,0,0.28)' }}>
          <p className="text-[13px] font-extrabold text-white">{exactTitle}</p>
          {data.exactCrossing.length === 1 && data.exactCrossing[0].prediction && (
            <PredictionLine participant={data.exactCrossing[0]} homeTeam={homeTeam} awayTeam={awayTeam} />
          )}
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-orange">
            {data.exactCrossing.length > 0 ? 'Cruce exacto acertado' : 'Cruce exacto'}
          </p>
        </div>
        <div className="grid gap-1.5 text-[11px] font-semibold leading-relaxed text-muted">
          <p><strong className="text-orange">Ambos, en otro cruce:</strong> {compactNames(data.bothTeamsOtherCrossing)}</p>
          <p><strong className="text-mint"><TeamFlag team={homeTeam} /> Solo {homeTeam}:</strong> {compactNames(data.homeTeamOnly)}</p>
          <p><strong className="text-mint"><TeamFlag team={awayTeam} /> Solo {awayTeam}:</strong> {compactNames(data.awayTeamOnly)}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      <section className="rounded-[18px] p-4" style={{ background: 'linear-gradient(135deg, rgba(255,107,0,0.13), rgba(168,240,216,0.05))', border: '1px solid rgba(255,107,0,0.34)' }}>
        <p className="font-mono text-[10px] font-extrabold uppercase tracking-[0.15em] text-orange">Pronósticos exactos del cruce</p>
        <h3 className="mt-2 font-display text-[clamp(24px,4vw,38px)] uppercase leading-none text-white">{exactTitle}</h3>
        {data.exactCrossing.length > 0 && (
          <div className="mt-4">
            <span className="inline-flex rounded-full bg-orange/15 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-orange">
              Cruce exacto acertado
            </span>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {data.exactCrossing.map((participant) => (
                <article key={participant.userId} className="rounded-[14px] bg-[#0A0A0A] p-3" style={{ border: '1px solid rgba(168,240,216,0.18)' }}>
                  <strong className="text-[13px] text-white">{participant.name}</strong>
                  <PredictionLine participant={participant} homeTeam={homeTeam} awayTeam={awayTeam} />
                </article>
              ))}
            </div>
          </div>
        )}
      </section>

      <div>
        <p className="mb-3 font-mono text-[10px] font-extrabold uppercase tracking-[0.15em] text-mint">
          Aciertos de trayectoria en esta instancia
        </p>
        <div className="grid gap-3 lg:grid-cols-3">
          <section className="rounded-[15px] bg-[#101010] p-4" style={{ border: '1px solid rgba(255,107,0,0.18)' }}>
            <p className="text-[12px] font-extrabold text-white">Ambos equipos en {data.instanceLabel}, pero no este cruce exacto</p>
            <p className="mb-3 mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-orange">+{data.trajectoryPoints * 2} trayectoria</p>
            <ParticipantChips items={data.bothTeamsOtherCrossing} />
          </section>
          <section className="rounded-[15px] bg-[#101010] p-4" style={{ border: '1px solid rgba(168,240,216,0.16)' }}>
            <p className="text-[12px] font-extrabold text-white"><TeamFlag team={homeTeam} /> Tenían solo a {homeTeam} en {data.instanceLabel}</p>
            <p className="mb-3 mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-mint">+{data.trajectoryPoints} trayectoria</p>
            <ParticipantChips items={data.homeTeamOnly} />
          </section>
          <section className="rounded-[15px] bg-[#101010] p-4" style={{ border: '1px solid rgba(168,240,216,0.16)' }}>
            <p className="text-[12px] font-extrabold text-white"><TeamFlag team={awayTeam} /> Tenían solo a {awayTeam} en {data.instanceLabel}</p>
            <p className="mb-3 mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-mint">+{data.trajectoryPoints} trayectoria</p>
            <ParticipantChips items={data.awayTeamOnly} />
          </section>
        </div>
      </div>

      {data.nextRoundLabel && data.advancePoints > 0 && (
        <div>
          <p className="mb-3 font-mono text-[10px] font-extrabold uppercase tracking-[0.15em] text-mint">
            Pronosticaron avance
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <section className="rounded-[15px] bg-[#101010] p-4" style={{ border: '1px solid rgba(168,240,216,0.16)' }}>
              <p className="text-[12px] font-extrabold text-white"><TeamFlag team={homeTeam} /> Tenían a {homeTeam} avanzando a {data.nextRoundLabel}</p>
              <p className="mb-3 mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-mint">+{data.advancePoints} avance</p>
              <ParticipantChips items={data.homeTeamAdvancing} />
            </section>
            <section className="rounded-[15px] bg-[#101010] p-4" style={{ border: '1px solid rgba(168,240,216,0.16)' }}>
              <p className="text-[12px] font-extrabold text-white"><TeamFlag team={awayTeam} /> Tenían a {awayTeam} avanzando a {data.nextRoundLabel}</p>
              <p className="mb-3 mt-1 text-[10px] font-bold uppercase tracking-[0.1em] text-mint">+{data.advancePoints} avance</p>
              <ParticipantChips items={data.awayTeamAdvancing} />
            </section>
          </div>
        </div>
      )}
    </div>
  )
}

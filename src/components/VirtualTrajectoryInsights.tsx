import type { VirtualMatchTrajectoryInsights } from '@/lib/public-prediction-data'

function Names({ names }: { names: string[] }) {
  if (!names.length) return <span className="text-muted">Nadie</span>
  return <span className="text-white">{names.join(', ')}</span>
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
  return (
    <div className={compact ? 'mt-4 grid gap-2 text-[11px]' : 'grid gap-3 text-[13px]'}>
      <p className="font-extrabold text-white">
        {data.exactCrossingUsers.length
          ? `Acertaron el cruce exacto: ${data.exactCrossingUsers.join(', ')}.`
          : 'Nadie acertó este cruce exacto.'}
      </p>
      <p className="font-semibold text-muted"><strong className="text-mint">{homeTeam} (+1):</strong> <Names names={data.homeTeamUsers} /></p>
      <p className="font-semibold text-muted"><strong className="text-mint">{awayTeam} (+1):</strong> <Names names={data.awayTeamUsers} /></p>
      <p className="font-semibold text-muted"><strong className="text-orange">Acertaron ambos equipos:</strong> <Names names={data.bothTeamsUsers} /></p>
    </div>
  )
}

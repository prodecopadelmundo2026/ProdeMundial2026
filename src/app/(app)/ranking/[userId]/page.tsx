import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/server'
import type { Match, Prediction, RankingEntry } from '@/types'

type Props = {
  params: Promise<{ userId: string }>
}

function stageLabel(stage: Match['stage']) {
  const labels: Record<Match['stage'], string> = {
    group: 'Grupos',
    round_of_32: 'Dieciseisavos',
    round_of_16: 'Octavos',
    quarter: 'Cuartos',
    semi: 'Semis',
    third_place: '3er puesto',
    final: 'Final',
  }
  return labels[stage] ?? stage
}

function formatScore(home: number | null | undefined, away: number | null | undefined) {
  return home == null || away == null ? 'Pendiente' : `${home} - ${away}`
}

function pointsLabel(prediction: Prediction | undefined, match: Match) {
  if (!prediction) return { text: 'Sin pronóstico', color: '#8A8A8A' }
  if (match.status !== 'finished' || match.home_score == null || match.away_score == null || prediction.points == null) {
    return { text: 'Pendiente', color: '#8A8A8A' }
  }
  if (prediction.points === 3) return { text: 'Exacto', color: '#A8F0D8' }
  if (prediction.points === 1) return { text: 'Parcial', color: '#FFB15C' }
  return { text: 'Incorrecto', color: '#FF6B6B' }
}

export default async function ParticipantRankingPage({ params }: Props) {
  const { userId } = await params
  const supabase = await createClient()

  const [{ data: ranking }, { data: predictions }, { data: matches }] = await Promise.all([
    supabase
      .from('ranking_entries')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('predictions')
      .select('*')
      .eq('user_id', userId),
    supabase
      .from('matches')
      .select('*')
      .order('scheduled_at', { ascending: true }),
  ])

  if (!ranking) notFound()

  const entry = ranking as RankingEntry
  const predictionByMatch = new Map((predictions ?? []).map((prediction) => [prediction.match_id, prediction as Prediction]))
  const orderedMatches = (matches ?? []) as Match[]

  return (
    <div style={{ padding: 'clamp(32px,7vw,56px) 20px clamp(60px,12vw,100px)' }}>
      <div className="max-w-[960px] mx-auto">
        <div className="mb-7">
          <Link
            href="/ranking"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-extrabold text-[12px] uppercase transition-all duration-150 mb-5"
            style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', color: '#cfcfcf' }}
          >
            Volver al ranking
          </Link>
          <span
            className="block font-sans text-[12px] font-extrabold tracking-[0.22em] uppercase text-muted"
            style={{ marginBottom: '14px' }}
          >
            Detalle auditable
          </span>
          <h1
            className="font-display uppercase leading-[.9] tracking-[-0.04em]"
            style={{ fontSize: 'clamp(40px, 8vw, 92px)' }}
          >
            {entry.name}
          </h1>
        </div>

        <div className="grid gap-3 sm:grid-cols-4 mb-7">
          {[
            ['Ranking', `#${entry.rank}`],
            ['Puntos', entry.total_points],
            ['Exactas', entry.exact_predictions ?? 0],
            ['Parciales', entry.correct_result_predictions ?? 0],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-[16px] px-4 py-4"
              style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <p className="font-mono text-[10px] font-extrabold tracking-[0.16em] uppercase text-muted">{label}</p>
              <p className="font-display text-[28px] leading-none mt-2">{value}</p>
            </div>
          ))}
        </div>

        <div
          className="rounded-[20px] overflow-hidden"
          style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="font-extrabold text-white text-[14px]">Partidos y puntaje</p>
            <p className="text-muted text-[12px] mt-1">Predicción del participante contra resultado oficial.</p>
          </div>

          <div>
            {orderedMatches.map((match) => {
              const prediction = predictionByMatch.get(match.id)
              const label = pointsLabel(prediction, match)
              return (
                <div
                  key={match.id}
                  className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_120px_120px_96px_80px] md:items-center"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                >
                  <div className="min-w-0">
                    <p className="font-bold text-[13px] text-white truncate">
                      {match.home_team} <span className="text-muted font-normal">vs</span> {match.away_team}
                    </p>
                    <p className="font-mono text-[10px] text-muted mt-1">
                      {stageLabel(match.stage)} · {format(new Date(match.scheduled_at), 'd MMM yyyy · HH:mm', { locale: es })}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] font-extrabold tracking-[0.14em] uppercase text-muted">Pronóstico</p>
                    <p className="font-bold text-[13px]">{prediction ? formatScore(prediction.home_score, prediction.away_score) : 'Sin cargar'}</p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] font-extrabold tracking-[0.14em] uppercase text-muted">Oficial</p>
                    <p className="font-bold text-[13px]">{formatScore(match.home_score, match.away_score)}</p>
                  </div>
                  <div>
                    <span
                      className="inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em]"
                      style={{ color: label.color, background: '#141414', border: `1px solid ${label.color}33` }}
                    >
                      {label.text}
                    </span>
                  </div>
                  <p className="font-display text-[22px] leading-none tabular-nums md:text-right">
                    {prediction?.points ?? 0}
                    <span className="font-mono text-[10px] font-bold tracking-[0.14em] uppercase ml-1 text-muted">pts</span>
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

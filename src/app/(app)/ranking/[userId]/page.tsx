import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  buildAuditedRankingEntries,
  buildMatchAuditRows,
  type AuditStatus,
  type MatchAuditRow,
} from '@/lib/ranking-audit'
import type { Match, Prediction } from '@/types'
import { formatRank, rankMedal } from '@/lib/ranking-display'
import { buildProjectedKnockoutMatches, KNOCKOUT_FIXTURES } from '@/lib/bracket'
import { TournamentBracket } from '@/components/TournamentBracket'
import { GroupStandingsTables, type GroupTableSection } from '@/components/GroupStandingsTables'
import { flagUrl, getTeam } from '@/lib/teams'
import { buildGroupTableRows, buildOfficialGroupScoreMap } from '@/lib/group-standings'
import { formatMatchDateTimeArgentina, formatMatchDayKeyArgentina } from '@/lib/match-datetime'

export const dynamic = 'force-dynamic'

type StageKey = Match['stage'] | 'specials'
type ViewKey = 'all' | 'knockout' | 'bracket' | 'specials' | `group_${string}`

type Props = {
  params: Promise<{ userId: string }>
  searchParams: Promise<{ view?: string; stage?: StageKey; result?: AuditStatus }>
}

const GROUP_KEYS = Array.from({ length: 12 }, (_, index) => String.fromCharCode(65 + index))
const KNOCKOUT_STAGE_ORDER: Exclude<Match['stage'], 'group'>[] = ['round_of_32', 'round_of_16', 'quarter', 'semi', 'third_place', 'final']

const SPECIAL_AUDIT_ROWS: Array<{ key: keyof SpecialBetsRow; label: string; prompt: string; points: number }> = [
  { key: 'balon', label: 'Balon de Oro', prompt: 'Mejor jugador del torneo', points: 20 },
  { key: 'bota', label: 'Botin de Oro', prompt: 'Maximo goleador del torneo', points: 15 },
  { key: 'guante', label: 'Guante de Oro', prompt: 'Mejor arquero del torneo', points: 15 },
]

const STAGE_LABELS: Record<Match['stage'], string> = {
  group: 'Grupos',
  round_of_32: 'Dieciseisavos',
  round_of_16: 'Octavos',
  quarter: 'Cuartos',
  semi: 'Semis',
  third_place: 'Tercer puesto',
  final: 'Final',
}

type SpecialBetsRow = {
  balon: string | null
  bota: string | null
  guante: string | null
}

type VirtualPredictionRow = {
  id: string
  user_id: string
  virtual_match_id: string
  home_score: number
  away_score: number
  tiebreaker_team: string | null
  created_at: string
  updated_at: string
}

type UserTiebreakerRow = {
  user_id: string
  tiebreaker_key: string
  team: string
}

type ParticipantStatus = 'trial' | 'confirmed'

type PublicParticipant = {
  user_id: string
  name: string
  avatar_url: string | null
  participant_status: ParticipantStatus
}

type PublicPredictionDetail = {
  participant: PublicParticipant | null
  participants: PublicParticipant[]
  matches: Match[]
  predictions: Prediction[]
  virtual_predictions: VirtualPredictionRow[]
  tiebreakers: UserTiebreakerRow[]
  special_bets: SpecialBetsRow | null
}

function virtualPredictionToPrediction(row: VirtualPredictionRow): Prediction {
  return {
    id: row.id,
    user_id: row.user_id,
    match_id: row.virtual_match_id,
    home_score: row.home_score,
    away_score: row.away_score,
    points: null,
    tiebreaker_team: row.tiebreaker_team,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

const STATUS_LABELS: Record<AuditStatus, { text: string; color: string }> = {
  exact: { text: 'Exacto', color: '#A8F0D8' },
  partial: { text: 'Parcial', color: '#FFB15C' },
  incorrect: { text: 'Incorrecto', color: '#FF6B6B' },
  pending: { text: 'Pendiente de resultado', color: '#8A8A8A' },
  missing: { text: 'Sin pronostico', color: '#8A8A8A' },
}

const MATCH_STATUS_LABELS: Record<Match['status'], { text: string; color: string }> = {
  upcoming: { text: 'Proximo', color: '#8A8A8A' },
  live: { text: 'En vivo', color: '#FFB15C' },
  finished: { text: 'Finalizado', color: '#A8F0D8' },
}

const RANK_COLOR: Record<number, string> = {
  1: '#FFE040',
  2: '#D7DEE8',
  3: '#E8A87C',
}

function hrefForView(userId: string, view: ViewKey, result?: AuditStatus | null, stage?: Match['stage'] | null) {
  const params = new URLSearchParams({ view })
  if (stage && stage !== 'group') params.set('stage', stage)
  if (result) params.set('result', result)
  return `/ranking/${userId}?${params.toString()}`
}

function normalizeView(raw: string | undefined, legacyStage: StageKey | undefined): ViewKey {
  const normalized = raw?.trim().toLowerCase().replace(/\s+/g, '-')
  if (normalized === 'all' || normalized === 'todos') return 'all'
  if (normalized === 'knockout' || normalized === 'eliminatorias') return 'knockout'
  if (normalized === 'bracket' || normalized === 'llave') return 'bracket'
  if (normalized === 'specials' || normalized === 'especiales') return 'specials'
  const group = normalized?.match(/^(?:group|grupo)[_-]([a-l])$/)
  if (group) return `group_${group[1].toUpperCase()}` as ViewKey
  if (legacyStage === 'specials') return 'specials'
  if (legacyStage && legacyStage !== 'group') return 'knockout'
  return 'all'
}

function labelForView(view: ViewKey) {
  if (view === 'all') return 'Resumen'
  if (view === 'knockout') return 'Eliminatorias'
  if (view === 'bracket') return 'Llave'
  if (view === 'specials') return 'Apuestas especiales'
  return `Grupo ${view.replace('group_', '')}`
}

function statusCount(rows: MatchAuditRow[], status: AuditStatus) {
  return rows.filter((row) => row.status === status).length
}

function countLoadedSpecials(specialBets: SpecialBetsRow | null) {
  return [specialBets?.balon, specialBets?.bota, specialBets?.guante].filter((value) => Boolean(value?.trim())).length
}

function filterHrefForView(userId: string, view: ViewKey, result: AuditStatus, activeResult: AuditStatus | null, stage?: Match['stage'] | null) {
  return hrefForView(userId, view, activeResult === result ? null : result, stage)
}

function normalizeTiebreakerKey(key: string) {
  return key.trim().replace(/^virtual-P/i, 'virtual-p')
}

function formatScoreText(prediction?: Prediction) {
  return prediction ? `${prediction.home_score}-${prediction.away_score}` : null
}

function formatPredictionScore(prediction?: Prediction) {
  return prediction ? `${prediction.home_score} - ${prediction.away_score}` : null
}

function predictionsMatch(first?: Prediction, second?: Prediction) {
  return Boolean(
    first &&
    second &&
    first.home_score === second.home_score &&
    first.away_score === second.away_score
  )
}

function predictionWinner(row?: MatchAuditRow, tiebreakerTeam?: string | null) {
  const prediction = row?.prediction
  if (!row || !prediction) return null
  if (prediction.home_score > prediction.away_score) return row.predictedHome
  if (prediction.away_score > prediction.home_score) return row.predictedAway
  return tiebreakerTeam ?? prediction.tiebreaker_team ?? null
}

function rowsHaveSamePredictedCross(first?: MatchAuditRow, second?: MatchAuditRow) {
  return Boolean(
    first &&
    second &&
    first.predictedHome === second.predictedHome &&
    first.predictedAway === second.predictedAway
  )
}

function knockoutComparisonParts(targetRow?: MatchAuditRow, viewerRow?: MatchAuditRow, targetTiebreaker?: string | null, viewerTiebreaker?: string | null, isOwnProfile = false) {
  if (isOwnProfile || !targetRow?.prediction || !viewerRow?.prediction) {
    return [] as Array<{ label: string; color: string }>
  }
  const sameCross = rowsHaveSamePredictedCross(targetRow, viewerRow)
  const sameScore = predictionsMatch(targetRow.prediction, viewerRow.prediction)
  const sameWinner = predictionWinner(targetRow, targetTiebreaker) === predictionWinner(viewerRow, viewerTiebreaker)
  return [
    { label: sameCross ? 'Cruce coincide' : 'Cruce distinto', color: sameCross ? '#A8F0D8' : '#FFB15C' },
    { label: sameScore ? 'Marcador coincide' : 'Marcador distinto', color: sameScore ? '#A8F0D8' : '#FFB15C' },
    { label: sameWinner ? 'Avance coincide' : 'Avance distinto', color: sameWinner ? '#A8F0D8' : '#FFB15C' },
  ]
}

function comparisonStatus(targetPrediction?: Prediction, viewerPrediction?: Prediction, isOwnProfile = false) {
  if (isOwnProfile) return null
  if (!targetPrediction || !viewerPrediction) return { label: 'Sin cargar', color: '#8A8A8A' }
  if (predictionsMatch(targetPrediction, viewerPrediction)) return { label: 'Coinciden', color: '#A8F0D8' }
  return { label: 'Diferente', color: '#FFB15C' }
}

function knockoutComparisonStatus(targetRow?: MatchAuditRow, viewerRow?: MatchAuditRow, isOwnProfile = false) {
  if (isOwnProfile) return null
  if (!targetRow?.prediction || !viewerRow?.prediction) return { label: 'Sin cargar', color: '#8A8A8A' }
  if (rowsHaveSamePredictedCross(targetRow, viewerRow)) return { label: 'Coinciden', color: '#A8F0D8' }
  return { label: 'Diferente', color: '#FFB15C' }
}

function pNumberForMatch(match: Match) {
  const virtual = match.id.match(/^virtual-p(\d+)$/i)
  if (virtual) return Number(virtual[1])
  const found = Object.entries(KNOCKOUT_FIXTURES).find(([, [home, away]]) => match.home_team === home && match.away_team === away)
  return found ? Number(found[0]) : null
}

function formatFixtureOrigin(match: Match) {
  if (match.stage === 'group') return null
  const pNum = pNumberForMatch(match)
  const fixture = pNum ? KNOCKOUT_FIXTURES[pNum] : null
  if (!fixture) return null
  return `${fixture[0]} vs ${fixture[1]}`
}

function formatTiebreakerText(
  row: UserTiebreakerRow,
  matches: Match[],
  predictions: Prediction[]
) {
  const key = normalizeTiebreakerKey(row.tiebreaker_key)
  const thirdPair = key.match(/^3rd-(.+)-vs-(.+)$/)
  if (thirdPair) {
    return `En el desempate de mejores terceros entre ${thirdPair[1]} y ${thirdPair[2]}, el usuario eligio a ${row.team}.`
  }

  const thirdRank = key.match(/^3rd-rank-(.+)$/)
  if (thirdRank) {
    return `En el desempate de mejores terceros entre ${thirdRank[1].split('-').join(', ')}, el usuario eligio este orden: ${row.team}.`
  }

  const groupTie = key.match(/^Grupo\s+([A-L])_pos_(\d+)$/)
  if (groupTie) {
    const position = Number(groupTie[2]) + 1
    return `En el desempate del Grupo ${groupTie[1]} para el puesto ${position}, el usuario eligio a ${row.team}.`
  }

  const prediction = predictions.find((item) => normalizeTiebreakerKey(item.match_id) === key)
  const match = matches.find((item) => normalizeTiebreakerKey(item.id) === key)
  if (match) {
    const stage = STAGE_LABELS[match.stage] ?? 'Eliminatorias'
    const score = formatScoreText(prediction)
    return score
      ? `En ${stage}, el cruce termino ${score} y eligio a ${row.team}.`
      : `En ${stage}, el usuario eligio a ${row.team} para avanzar.`
  }

  return `En el desempate entre los equipos involucrados, el usuario eligio a ${row.team}.`
}

function ResultBadge({ status }: { status: AuditStatus }) {
  const label = STATUS_LABELS[status]
  return (
    <span
      className="inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em]"
      style={{ color: label.color, background: '#141414', border: `1px solid ${label.color}33` }}
    >
      {label.text}
    </span>
  )
}

function MatchStatusBadge({ status }: { status: Match['status'] }) {
  const label = MATCH_STATUS_LABELS[status]
  return (
    <span
      className="inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em]"
      style={{ color: label.color, background: '#141414', border: `1px solid ${label.color}33` }}
    >
      Partido: {label.text}
    </span>
  )
}

function AuditMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] px-4 py-3" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.06)' }}>
      <p className="font-mono text-[10px] font-extrabold tracking-[0.14em] uppercase text-muted">{label}</p>
      <p className="font-bold text-[13px] text-white mt-1">{value}</p>
    </div>
  )
}

function TeamChip({ name }: { name: string }) {
  const meta = getTeam(name)
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full bg-black/40" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        {meta.iso2 ? (
          <img src={flagUrl(meta.iso2)} alt={name} className="h-[18px] w-[24px] object-contain" />
        ) : (
          <span className="text-[15px]">{meta.flag}</span>
        )}
      </span>
      <span className="truncate">{name}</span>
    </span>
  )
}

function TiebreakerTeam({ name }: { name: string }) {
  const meta = getTeam(name)
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <span className="grid h-5 w-5 shrink-0 place-items-center overflow-hidden rounded-full bg-black/40" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        {meta.iso2 ? (
          <img src={flagUrl(meta.iso2)} alt="" className="h-[14px] w-[20px] object-contain" />
        ) : (
          <span className="text-[12px]">{meta.flag}</span>
        )}
      </span>
      <span className="truncate">{name}</span>
    </span>
  )
}

function SavedTiebreakerItem({
  row,
  matches,
  predictions,
}: {
  row: UserTiebreakerRow
  matches: Match[]
  predictions: Prediction[]
}) {
  const key = normalizeTiebreakerKey(row.tiebreaker_key)
  const prediction = predictions.find((item) => normalizeTiebreakerKey(item.match_id) === key)
  const match = matches.find((item) => normalizeTiebreakerKey(item.id) === key)

  if (match && prediction) {
    return (
      <div className="grid gap-2 rounded-[12px] px-3 py-2 text-[12px] font-bold sm:grid-cols-[minmax(0,1fr)_auto]" style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)', color: '#cfcfcf' }}>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <TiebreakerTeam name={match.home_team} />
          <span className="font-display text-[15px] leading-none text-white tabular-nums">{prediction.home_score}-{prediction.away_score}</span>
          <TiebreakerTeam name={match.away_team} />
        </div>
        <div className="flex min-w-0 items-center gap-2 sm:justify-end">
          <span className="font-mono text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted">Eligio</span>
          <TiebreakerTeam name={row.team} />
        </div>
      </div>
    )
  }

  return (
    <p className="rounded-[12px] px-3 py-2 text-[12px] font-bold" style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)', color: '#cfcfcf' }}>
      {formatTiebreakerText(row, matches, predictions)}
    </p>
  )
}

function PredictionPanel({
  label,
  value,
  emptyText,
  accent,
}: {
  label: string
  value: string | null
  emptyText: string
  accent?: string
}) {
  return (
    <div className="rounded-[14px] px-4 py-3" style={{ background: '#141414', border: `1px solid ${accent ? `${accent}55` : 'rgba(255,255,255,0.06)'}` }}>
      <p className="font-mono text-[10px] font-extrabold tracking-[0.14em] uppercase text-muted">{label}</p>
      <p className="mt-2 font-display text-[24px] leading-none text-white tabular-nums">
        {value ?? <span className="font-sans text-[12px] font-bold normal-case leading-snug text-muted">{emptyText}</span>}
      </p>
    </div>
  )
}

function MiniBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex max-w-[150px] truncate whitespace-nowrap rounded-full px-2 py-1 text-[9px] font-extrabold uppercase tracking-[0.08em]"
      style={{ color, background: '#0A0A0A', border: `1px solid ${color}44` }}
    >
      {label}
    </span>
  )
}

function TeamScoreLine({
  team,
  score,
  winner,
  showAdvanceBadge,
}: {
  team: string
  score: number | null
  winner: boolean
  showAdvanceBadge: boolean
}) {
  return (
    <div
      className="grid min-h-[46px] min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[12px] px-3 py-2"
      style={{ background: winner ? 'rgba(255,107,0,0.12)' : '#0A0A0A', border: winner ? '1px solid rgba(255,107,0,0.32)' : '1px solid rgba(255,255,255,0.06)' }}
    >
      <TeamChip name={team} />
      <div className="flex min-w-0 shrink-0 items-center justify-end gap-2">
        {showAdvanceBadge && <MiniBadge label="Elegido para avanzar" color="#FFB15C" />}
        {score != null && <span className="font-display text-[22px] leading-none text-white tabular-nums">{score}</span>}
      </div>
    </div>
  )
}

function BracketComparisonPanel({
  label,
  home,
  away,
  prediction,
  winner,
  emptyText,
  accent,
}: {
  label: string
  home: string | null
  away: string | null
  prediction?: Prediction
  winner?: string | null
  emptyText: string
  accent?: string
}) {
  const hasCross = Boolean(home && away)
  const isDraw = Boolean(prediction && prediction.home_score === prediction.away_score && winner)
  return (
    <div className="rounded-[16px] px-4 py-3" style={{ background: '#141414', border: `1px solid ${accent ? `${accent}55` : 'rgba(255,255,255,0.06)'}` }}>
      <div className="flex min-h-[28px] items-center justify-between gap-3">
        <p className="min-w-0 truncate font-mono text-[10px] font-extrabold tracking-[0.14em] uppercase text-muted">{label}</p>
        {isDraw && <MiniBadge label="Pasa por desempate" color="#FFB15C" />}
      </div>
      {hasCross ? (
        <div className="mt-3 grid min-h-[100px] content-start gap-2 text-[13px] font-extrabold text-white">
          <TeamScoreLine team={home!} score={prediction?.home_score ?? null} winner={winner === home} showAdvanceBadge={isDraw && winner === home} />
          <TeamScoreLine team={away!} score={prediction?.away_score ?? null} winner={winner === away} showAdvanceBadge={isDraw && winner === away} />
        </div>
      ) : (
        <div className="mt-3 flex min-h-[100px] items-start rounded-[12px] px-3 py-3" style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="text-[12px] font-bold leading-snug text-muted">{emptyText}</p>
        </div>
      )}
    </div>
  )
}

function MatchAuditCard({
  row,
  showScoring,
  viewerPrediction,
  viewerRow,
  targetTiebreaker,
  viewerTiebreaker,
  isOwnProfile,
  showViewerPrediction = !isOwnProfile,
  variant = 'full',
}: {
  row: MatchAuditRow
  showScoring: boolean
  viewerPrediction?: Prediction
  viewerRow?: MatchAuditRow
  targetTiebreaker?: string | null
  viewerTiebreaker?: string | null
  isOwnProfile: boolean
  showViewerPrediction?: boolean
  variant?: 'full' | 'compact' | 'upcoming'
}) {
  const isGroup = row.stage === 'group'
  const targetPrediction = row.prediction
  const status = isGroup
    ? comparisonStatus(targetPrediction, viewerPrediction, isOwnProfile)
    : knockoutComparisonStatus(row, viewerRow, isOwnProfile)
  const targetLabel = isOwnProfile ? 'Tu pronóstico' : 'Su pronóstico'
  const officialValue = row.match.status === 'finished' && row.match.home_score != null && row.match.away_score != null
    ? row.officialScore
    : null
  const pNum = pNumberForMatch(row.match)
  const fixtureOrigin = formatFixtureOrigin(row.match)
  const targetWinner = predictionWinner(row, targetTiebreaker)
  const viewerWinner = predictionWinner(viewerRow, viewerTiebreaker)
  const officialWinner = row.match.status === 'finished' && row.match.home_score != null && row.match.away_score != null
    ? row.match.home_score > row.match.away_score
      ? row.officialHome
      : row.match.away_score > row.match.home_score
      ? row.officialAway
      : null
    : null
  const officialPrediction = row.match.status === 'finished' && row.match.home_score != null && row.match.away_score != null
    ? ({
        id: `official-${row.match.id}`,
        user_id: 'official',
        match_id: row.match.id,
        home_score: row.match.home_score,
        away_score: row.match.away_score,
        points: null,
        tiebreaker_team: null,
        created_at: row.match.created_at,
        updated_at: row.match.created_at,
      } as Prediction)
    : undefined
  const comparisonParts = isGroup ? [] : knockoutComparisonParts(row, viewerRow, targetTiebreaker, viewerTiebreaker, isOwnProfile)

  if (variant === 'upcoming') {
    const stateLabel = row.match.status === 'live' ? 'En vivo' : 'Proximo'
    const stateColor = row.match.status === 'live' ? '#FF6B6B' : '#D7DEE8'
    const officialPreview = row.match.status === 'live' && row.match.home_score != null && row.match.away_score != null
      ? row.officialScore
      : 'Pendiente'

    return (
      <div className="px-4 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div
          className={
            showViewerPrediction
              ? 'grid gap-3 min-[900px]:grid-cols-[minmax(260px,1fr)_128px_128px_128px_76px] min-[900px]:items-center min-[1120px]:grid-cols-[minmax(300px,1fr)_164px_164px_164px_92px]'
              : 'grid gap-3 min-[720px]:grid-cols-[minmax(260px,1fr)_128px_128px_76px] min-[720px]:items-center min-[1040px]:grid-cols-[minmax(300px,1fr)_172px_172px_92px]'
          }
        >
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <p className="min-w-0 truncate text-[13px] font-extrabold text-white">
                {isGroup ? `${row.match.home_team} vs ${row.match.away_team}` : `${row.officialHome} vs ${row.officialAway}`}
              </p>
              <span
                className="inline-flex rounded-full px-2 py-0.5 font-mono text-[9px] font-extrabold uppercase tracking-[0.12em]"
                style={{ color: stateColor, background: '#101010', border: `1px solid ${stateColor}33` }}
              >
                {stateLabel}
              </span>
            </div>
            <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
              {row.stage === 'group' && row.match.group ? `Grupo ${row.match.group}` : STAGE_LABELS[row.stage]} · {formatMatchDateTimeArgentina(row.match.scheduled_at, { includeYear: true, separator: ' - ' })}
            </p>
          </div>

          <div className="grid h-12 min-w-0 place-items-center rounded-[10px] bg-[#0d0d0d] px-3 text-center font-display text-[18px] leading-none text-white tabular-nums" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            {officialPreview}
          </div>
          <div className="grid h-12 min-w-0 place-items-center rounded-[10px] bg-[#0d0d0d] px-3 text-center font-display text-[22px] leading-none text-white tabular-nums" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            {formatPredictionScore(targetPrediction) ?? '-'}
          </div>
          {showViewerPrediction && (
            <div className="grid h-12 min-w-0 place-items-center rounded-[10px] bg-[#0d0d0d] px-3 text-center font-display text-[22px] leading-none text-white tabular-nums" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              {formatPredictionScore(viewerPrediction) ?? '-'}
            </div>
          )}

          <div className="flex items-center justify-end">
            <span className="font-mono text-[10px] font-extrabold uppercase tracking-[0.12em]" style={{ color: stateColor }}>
              {stateLabel}
            </span>
          </div>
        </div>
      </div>
    )
  }

  if (variant === 'compact') {
    const pointColor = STATUS_LABELS[row.status].color
    return (
      <div className="px-4 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div
          className={
            showViewerPrediction
              ? 'grid gap-3 min-[900px]:grid-cols-[minmax(260px,1fr)_128px_128px_128px_76px] min-[900px]:items-center min-[1120px]:grid-cols-[minmax(300px,1fr)_164px_164px_164px_92px]'
              : 'grid gap-3 min-[720px]:grid-cols-[minmax(260px,1fr)_128px_128px_76px] min-[720px]:items-center min-[1040px]:grid-cols-[minmax(300px,1fr)_172px_172px_92px]'
          }
        >
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <p className="min-w-0 truncate text-[13px] font-extrabold text-white">
                {isGroup ? `${row.match.home_team} vs ${row.match.away_team}` : `${row.officialHome} vs ${row.officialAway}`}
              </p>
              <ResultBadge status={row.status} />
            </div>
            <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
              {row.stage === 'group' && row.match.group ? `Grupo ${row.match.group}` : STAGE_LABELS[row.stage]} · {formatMatchDateTimeArgentina(row.match.scheduled_at, { separator: ' · ' })}
            </p>
          </div>

          <div className="grid h-12 min-w-0 place-items-center rounded-[10px] bg-[#0d0d0d] px-3 text-center font-display text-[22px] leading-none text-white tabular-nums" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            {officialValue ?? '-'}
          </div>
          <div className="grid h-12 min-w-0 place-items-center rounded-[10px] bg-[#0d0d0d] px-3 text-center font-display text-[22px] leading-none text-white tabular-nums" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            {formatPredictionScore(targetPrediction) ?? '-'}
          </div>
          {showViewerPrediction && (
            <div className="grid h-12 min-w-0 place-items-center rounded-[10px] bg-[#0d0d0d] px-3 text-center font-display text-[22px] leading-none text-white tabular-nums" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              {formatPredictionScore(viewerPrediction) ?? '-'}
            </div>
          )}

          <div className="flex items-center justify-end">
            {showScoring ? (
              <p className="shrink-0 font-display text-[24px] leading-none tabular-nums" style={{ color: pointColor }}>
                {row.points ?? 0}
                <span className="ml-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-muted">pts</span>
              </p>
            ) : (
              <span className="font-mono text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted">Previa</span>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
        <div className="min-w-0">
          {isGroup ? (
            <div className="flex min-w-0 flex-wrap items-center gap-2 text-[13px] font-extrabold text-white">
              <TeamChip name={row.match.home_team} />
              <span className="font-display text-[11px] tracking-[0.16em] text-muted">VS</span>
              <TeamChip name={row.match.away_team} />
            </div>
          ) : (
            <>
              <p className="font-extrabold text-[14px] text-white">
                {STAGE_LABELS[row.stage]}{pNum ? ` · Partido ${pNum}` : ''}
              </p>
              {fixtureOrigin && (
                <p className="mt-1 text-[12px] font-semibold leading-snug text-muted">
                  Origen: {fixtureOrigin}
                </p>
              )}
            </>
          )}
          <p className="font-mono text-[10px] text-muted mt-2">
            {formatMatchDateTimeArgentina(row.match.scheduled_at, { includeYear: true, separator: ' - ' })}
          </p>
        </div>
        {isGroup && <div className="flex flex-wrap items-center gap-3 lg:justify-end">
          <MatchStatusBadge status={row.match.status} />
          <ResultBadge status={row.status} />
          {status && (
            <span
              className="inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em]"
              style={{ color: status.color, background: '#141414', border: `1px solid ${status.color}33` }}
            >
              {status.label}
            </span>
          )}
          {comparisonParts.map((part) => (
            <span
              key={part.label}
              className="inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em]"
              style={{ color: part.color, background: '#141414', border: `1px solid ${part.color}33` }}
            >
              {part.label}
            </span>
          ))}
          {showScoring && row.points != null ? (
            <p className="font-display text-[22px] leading-none tabular-nums">
              {row.points ?? 0}
              <span className="font-mono text-[10px] font-bold tracking-[0.14em] uppercase ml-1 text-muted">pts</span>
            </p>
          ) : (
            <span className="font-mono text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted">Previa</span>
          )}
        </div>}
      </div>

      {isGroup ? (
        <div className={`mt-4 grid gap-3 ${isOwnProfile ? 'sm:grid-cols-2' : 'lg:grid-cols-3'}`}>
          <PredictionPanel label={targetLabel} value={formatPredictionScore(targetPrediction)} emptyText="Sin cargar" />
          {!isOwnProfile && (
            <PredictionPanel
              label="Mi pronóstico"
              value={formatPredictionScore(viewerPrediction)}
              emptyText="Todavía no cargaste este partido"
              accent={status?.label === 'Coinciden' ? '#A8F0D8' : status?.label === 'Diferente' ? '#FFB15C' : undefined}
            />
          )}
          <PredictionPanel label="Resultado oficial" value={officialValue} emptyText="Pendiente" />
        </div>
      ) : (
        <div className={`mt-4 grid gap-3 ${isOwnProfile ? 'lg:grid-cols-2' : 'lg:grid-cols-3'}`}>
          <BracketComparisonPanel
            label={isOwnProfile ? 'Tu cruce' : 'Cruce del participante'}
            home={targetPrediction ? row.predictedHome : null}
            away={targetPrediction ? row.predictedAway : null}
            prediction={targetPrediction}
            winner={targetWinner}
            emptyText="Sin cargar"
          />
          {!isOwnProfile && (
            <BracketComparisonPanel
              label="Mi cruce"
              home={viewerRow?.prediction ? viewerRow.predictedHome : null}
              away={viewerRow?.prediction ? viewerRow.predictedAway : null}
              prediction={viewerPrediction}
              winner={viewerWinner}
              emptyText="Todavía no cargaste esta llave"
              accent={status?.label === 'Coinciden' ? '#A8F0D8' : status?.label === 'Diferente' ? '#FFB15C' : undefined}
            />
          )}
          <BracketComparisonPanel
            label="Cruce oficial"
            home={row.hasOfficialTeams ? row.officialHome : null}
            away={row.hasOfficialTeams ? row.officialAway : null}
            prediction={officialPrediction}
            winner={officialWinner}
            emptyText="Pendiente"
          />
        </div>
      )}

      {!isGroup && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <MatchStatusBadge status={row.match.status} />
          <ResultBadge status={row.status} />
          {status && (
            <span
              className="inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em]"
              style={{ color: status.color, background: '#141414', border: `1px solid ${status.color}33` }}
            >
              {status.label}
            </span>
          )}
          {comparisonParts.map((part) => (
            <span
              key={part.label}
              className="inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em]"
              style={{ color: part.color, background: '#141414', border: `1px solid ${part.color}33` }}
            >
              {part.label}
            </span>
          ))}
          {showScoring && row.points != null ? (
            <p className="ml-auto font-display text-[22px] leading-none tabular-nums">
              {row.points ?? 0}
              <span className="font-mono text-[10px] font-bold tracking-[0.14em] uppercase ml-1 text-muted">pts</span>
            </p>
          ) : (
            <span className="font-mono text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted">Previa</span>
          )}
        </div>
      )}

      {row.crossMatches === false && (
        <p className="mt-3 text-[11px] font-bold" style={{ color: '#FFB15C' }}>
          El cruce predicho no coincide con el cruce oficial, por eso no suma por marcador.
        </p>
      )}
    </div>
  )
}

function SpecialAuditCard({ row, value, showScoring }: { row: typeof SPECIAL_AUDIT_ROWS[number]; value: string | null; showScoring: boolean }) {
  return (
    <div
      className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-center"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
    >
      <div>
        <p className="font-bold text-[13px] text-white">{row.label}</p>
        <p className="font-mono text-[10px] text-muted mt-1">{row.prompt} - hasta {row.points} pts</p>
      </div>
      <AuditMetric label="Respuesta del usuario" value={value || 'Sin cargar'} />
      <AuditMetric label="Resultado oficial" value="Pendiente de resultado" />
      <div className="flex flex-wrap items-center gap-3 md:justify-end">
        <ResultBadge status="pending" />
        {showScoring ? (
          <p className="font-display text-[22px] leading-none tabular-nums">
            0
            <span className="font-mono text-[10px] font-bold tracking-[0.14em] uppercase ml-1 text-muted">pts</span>
          </p>
        ) : (
          <span className="font-mono text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted">Previa</span>
        )}
      </div>
      {!value && (
        <p className="md:col-span-4 text-[11px] font-bold text-muted">
          El usuario todavia no cargo esta apuesta especial.
        </p>
      )}
    </div>
  )
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-5 py-8 text-[13px] font-semibold leading-relaxed text-muted">
      {children}
    </p>
  )
}

function ParticipationBadge({ status }: { status: ParticipantStatus }) {
  const config = status === 'trial'
    ? { text: 'Invitado', color: '#FFB15C', bg: 'rgba(255,177,92,0.1)' }
    : status === 'confirmed'
    ? { text: 'Competidor', color: '#A8F0D8', bg: 'rgba(168,240,216,0.1)' }
    : { text: 'Deshabilitado', color: '#FF6B6B', bg: 'rgba(255,59,59,0.1)' }

  return (
    <span
      className="inline-flex rounded-full px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em]"
      style={{ color: config.color, background: config.bg, border: `1px solid ${config.color}33` }}
    >
      {config.text}
    </span>
  )
}

function ViewNavigation({
  userId,
  activeView,
  availableGroups,
}: {
  userId: string
  activeView: ViewKey
  availableGroups: string[]
}) {
  const primaryTabs: Array<{ key: ViewKey; label: string }> = [
    { key: 'all', label: 'Todos' },
    { key: 'bracket', label: 'Llave' },
    { key: 'knockout', label: 'Eliminatorias' },
    { key: 'specials', label: 'Especiales' },
  ]
  const activeGroup = activeView.startsWith('group_') ? activeView.replace('group_', '') : null

  return (
    <nav
      className="mb-5 rounded-[20px] bg-[#101010] p-3"
      aria-label="Navegar Prode"
      style={{ border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="flex flex-col gap-3 min-[760px]:flex-row min-[760px]:items-center min-[760px]:justify-between">
        <div className="grid grid-cols-2 gap-2 min-[560px]:flex min-[560px]:flex-wrap">
          {primaryTabs.map((tab) => {
            const active = tab.key === activeView
            return (
              <Link
                key={tab.key}
                href={hrefForView(userId, tab.key)}
                className="rounded-full px-4 py-2.5 text-center text-[11px] font-extrabold uppercase tracking-[0.04em] transition-all duration-150 hover:-translate-y-0.5"
                style={{
                  background: active ? '#FF6B00' : 'rgba(255,255,255,0.04)',
                  color: active ? '#0A0A0A' : '#e8e8e8',
                  border: active ? '1px solid #FF6B00' : '1px solid rgba(255,255,255,0.1)',
                  boxShadow: active ? '0 10px 24px -18px rgba(255,107,0,0.9)' : 'none',
                }}
              >
                {tab.label}
              </Link>
            )
          })}
        </div>

        <details key={activeGroup ?? 'all'} className="group relative min-[760px]:w-[230px]">
          <summary
            className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-[16px] bg-[#151515] px-4 py-3 text-[12px] font-extrabold uppercase tracking-[0.08em] text-white transition-colors hover:bg-[#1c1c1c]"
            style={{ border: activeGroup ? '1px solid #FF6B00' : '1px solid rgba(255,255,255,0.1)' }}
          >
            <span>{activeGroup ? `Grupo ${activeGroup}` : 'Elegir grupo'}</span>
            <span className="text-orange transition-transform group-open:rotate-180" aria-hidden="true">v</span>
          </summary>
          <div
            className="mt-2 grid grid-cols-2 gap-2 rounded-[16px] bg-[#151515] p-2 min-[760px]:absolute min-[760px]:right-0 min-[760px]:top-full min-[760px]:z-20 min-[760px]:w-[320px]"
            style={{ border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 18px 40px -26px rgba(0,0,0,0.9)' }}
          >
            {availableGroups.map((group) => {
              const key = `group_${group}` as ViewKey
              const active = key === activeView
              return (
                <Link
                  key={key}
                  href={hrefForView(userId, key)}
                  className="rounded-[12px] px-3 py-2 text-center text-[12px] font-extrabold transition-colors"
                  style={{
                    background: active ? '#FF6B00' : 'rgba(255,255,255,0.04)',
                    color: active ? '#0A0A0A' : '#d9d9d9',
                    border: active ? '1px solid #FF6B00' : '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  Grupo {group}
                </Link>
              )
            })}
          </div>
        </details>
      </div>
    </nav>
  )
}

function OverviewTile({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <div className="rounded-[16px] bg-[#141414] p-4" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
      <p className="font-mono text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-2 font-display text-[28px] leading-none text-white">{value}</p>
      <p className="mt-2 text-[12px] font-semibold leading-snug text-muted">{detail}</p>
    </div>
  )
}

function ProdeOverview({
  userId,
  rows,
  specialBets,
  groupKeys,
  showScoring,
  viewerPredictionByMatch,
  viewerRowByMatch,
  userTiebreakerMap,
  viewerTiebreakerMap,
  isOwnProfile,
  showViewerPrediction,
}: {
  userId: string
  rows: MatchAuditRow[]
  specialBets: SpecialBetsRow | null
  groupKeys: string[]
  showScoring: boolean
  viewerPredictionByMatch: Map<string, Prediction>
  viewerRowByMatch: Map<string, MatchAuditRow>
  userTiebreakerMap: Record<string, string>
  viewerTiebreakerMap: Record<string, string>
  isOwnProfile: boolean
  showViewerPrediction: boolean
}) {
  const groupLoaded = rows.filter((row) => row.stage === 'group' && row.prediction).length
  const groupTotal = rows.filter((row) => row.stage === 'group').length
  const knockoutLoaded = rows.filter((row) => row.stage !== 'group' && row.prediction).length
  const knockoutTotal = rows.filter((row) => row.stage !== 'group').length
  const specialsLoaded = countLoadedSpecials(specialBets)
  const scoredRows = rows
    .filter((row) => row.match.status === 'finished' && row.points != null)
    .sort((a, b) => new Date(a.match.scheduled_at).getTime() - new Date(b.match.scheduled_at).getTime())
  const now = new Date()
  const todayKey = formatMatchDayKeyArgentina(now)
  const tomorrowKey = formatMatchDayKeyArgentina(new Date(now.getTime() + 24 * 60 * 60 * 1000))
  const futureRows = rows
    .filter((row) => row.match.status !== 'finished')
    .sort((a, b) => new Date(a.match.scheduled_at).getTime() - new Date(b.match.scheduled_at).getTime())
  const nearFutureRows = futureRows.filter((row) => {
    const dayKey = formatMatchDayKeyArgentina(row.match.scheduled_at)
    return dayKey === todayKey || dayKey === tomorrowKey
  })
  const upcomingRows = (nearFutureRows.length >= 3 ? nearFutureRows : futureRows).slice(0, 6)

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <OverviewTile label="Grupos" value={`${groupLoaded}/${groupTotal}`} detail="Entrá por grupo para ver marcadores sin una lista eterna." />
        <OverviewTile label="Eliminatorias" value={`${knockoutLoaded}/${knockoutTotal}`} detail="Cruces, avances y fases decisivas en una vista separada." />
        <OverviewTile label="Especiales" value={`${specialsLoaded}/3`} detail="Balon, bota y guante de oro." />
      </div>

      {false && (
      <section className="rounded-[18px] bg-[#0d0d0d] p-4" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-extrabold text-white">Grupos</p>
            <p className="mt-1 text-[12px] font-semibold text-muted">Elegí un grupo para revisar solo esos partidos.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {groupKeys.map((group) => {
            const scoped = rows.filter((row) => row.stage === 'group' && row.match.group === group)
            const loaded = scoped.filter((row) => row.prediction).length
            return (
              <Link
                key={group}
                href={hrefForView(userId, `group_${group}` as ViewKey)}
                className="rounded-[14px] px-3 py-3 transition-colors hover:bg-[#1c1c1c]"
                style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <p className="font-display text-[22px] leading-none text-white">Grupo {group}</p>
                <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-muted">{loaded}/{scoped.length} cargados</p>
              </Link>
            )
          })}
        </div>
      </section>
      )}

      <section className="rounded-[18px] bg-[#0d0d0d] p-4" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
        <p className="font-extrabold text-white">Resumen general</p>
        <p className="mt-1 text-[12px] font-semibold leading-relaxed text-muted">
          Usá el selector “Elegir grupo” para entrar a un grupo específico, o la pestaña Eliminatorias para revisar cruces por fase.
        </p>
      </section>
      <section className="rounded-[18px] bg-[#0d0d0d] p-4" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-extrabold text-white">Partidos ya puntuados</p>
            <p className="mt-1 text-[12px] font-semibold leading-relaxed text-muted">
              Estos son los partidos finalizados que ya impactaron en el ranking.
            </p>
          </div>
          <span className="rounded-full px-3 py-1.5 font-mono text-[10px] font-extrabold uppercase tracking-[0.12em]" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)', color: '#D7DEE8' }}>
            {scoredRows.length}
          </span>
        </div>

        {scoredRows.length > 0 ? (
          <div className="overflow-hidden rounded-[16px]" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            <div
              className={
                showViewerPrediction
                  ? 'hidden px-4 py-3 font-mono text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted min-[900px]:grid min-[900px]:grid-cols-[minmax(260px,1fr)_128px_128px_128px_76px] min-[1120px]:grid-cols-[minmax(300px,1fr)_164px_164px_164px_92px]'
                  : 'hidden px-4 py-3 font-mono text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted min-[720px]:grid min-[720px]:grid-cols-[minmax(260px,1fr)_128px_128px_76px] min-[1040px]:grid-cols-[minmax(300px,1fr)_172px_172px_92px]'
              }
              style={{ background: '#101010', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
            >
              <span>Partido</span>
              <span className="text-center">Oficial</span>
              <span className="text-center">{isOwnProfile ? 'Tu pronostico' : 'Su pronostico'}</span>
              {showViewerPrediction && <span className="text-center">Mi pronostico</span>}
              <span className="text-right">Pts</span>
            </div>
            {scoredRows.map((row) => (
              <MatchAuditCard
                key={row.match.id}
                row={row}
                showScoring={showScoring}
                viewerPrediction={viewerPredictionByMatch.get(row.match.id)}
                viewerRow={viewerRowByMatch.get(row.match.id)}
                targetTiebreaker={userTiebreakerMap[row.match.id]}
                viewerTiebreaker={viewerTiebreakerMap[row.match.id]}
                isOwnProfile={isOwnProfile}
                showViewerPrediction={showViewerPrediction}
                variant="compact"
              />
            ))}
          </div>
        ) : (
          <p className="rounded-[14px] bg-[#141414] px-4 py-4 text-[13px] font-semibold text-muted" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
            Todavia no hay partidos finalizados para auditar.
          </p>
        )}
      </section>
      <section className="rounded-[18px] bg-[#0d0d0d] p-4" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-extrabold text-white">Proximos partidos</p>
            <p className="mt-1 text-[12px] font-semibold leading-relaxed text-muted">
              Estos son los proximos partidos con el pronostico del participante y tu comparacion.
            </p>
          </div>
          <span className="rounded-full px-3 py-1.5 font-mono text-[10px] font-extrabold uppercase tracking-[0.12em]" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)', color: '#D7DEE8' }}>
            {upcomingRows.length}
          </span>
        </div>

        {upcomingRows.length > 0 ? (
          <div className="overflow-hidden rounded-[16px]" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            <div
              className={
                showViewerPrediction
                  ? 'hidden px-4 py-3 font-mono text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted min-[900px]:grid min-[900px]:grid-cols-[minmax(260px,1fr)_128px_128px_128px_76px] min-[1120px]:grid-cols-[minmax(300px,1fr)_164px_164px_164px_92px]'
                  : 'hidden px-4 py-3 font-mono text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted min-[720px]:grid min-[720px]:grid-cols-[minmax(260px,1fr)_128px_128px_76px] min-[1040px]:grid-cols-[minmax(300px,1fr)_172px_172px_92px]'
              }
              style={{ background: '#101010', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
            >
              <span>Partido</span>
              <span className="text-center">Oficial</span>
              <span className="text-center">{isOwnProfile ? 'Tu pronostico' : 'Su pronostico'}</span>
              {showViewerPrediction && <span className="text-center">Mi pronostico</span>}
              <span className="text-right">Estado</span>
            </div>
            {upcomingRows.map((row) => (
              <MatchAuditCard
                key={row.match.id}
                row={row}
                showScoring={false}
                viewerPrediction={viewerPredictionByMatch.get(row.match.id)}
                viewerRow={viewerRowByMatch.get(row.match.id)}
                targetTiebreaker={userTiebreakerMap[row.match.id]}
                viewerTiebreaker={viewerTiebreakerMap[row.match.id]}
                isOwnProfile={isOwnProfile}
                showViewerPrediction={showViewerPrediction}
                variant="upcoming"
              />
            ))}
          </div>
        ) : (
          <p className="rounded-[14px] bg-[#141414] px-4 py-4 text-[13px] font-semibold text-muted" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
            Todavia no hay proximos partidos para auditar.
          </p>
        )}
      </section>
    </div>
  )
}

export default async function ParticipantRankingPage({ params, searchParams }: Props) {
  const [{ userId }, query] = await Promise.all([params, searchParams])
  const activeView = normalizeView(query.view, query.stage)
  const activeResult = query.result && ['exact', 'partial', 'incorrect'].includes(query.result)
    ? query.result
    : null
  const activeKnockoutStage = query.stage && KNOCKOUT_STAGE_ORDER.includes(query.stage as Exclude<Match['stage'], 'group'>)
    ? query.stage as Exclude<Match['stage'], 'group'>
    : 'round_of_32'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: detailData, error: detailError } = await supabase.rpc('get_public_prediction_detail', {
    p_user_id: userId,
  })
  if (detailError) throw detailError

  const detail = detailData as PublicPredictionDetail | null
  if (!detail?.participant) notFound()

  const allTypedPredictions = [
    ...((detail.predictions ?? []) as Prediction[]),
    ...((detail.virtual_predictions ?? []) as VirtualPredictionRow[]).map(virtualPredictionToPrediction),
  ]
  const userTypedPredictions = [
    ...((detail.predictions ?? []) as Prediction[]).filter((prediction) => prediction.user_id === userId),
    ...((detail.virtual_predictions ?? []) as VirtualPredictionRow[])
      .filter((prediction) => prediction.user_id === userId)
      .map(virtualPredictionToPrediction),
  ]
  const userTiebreakers = ((detail.tiebreakers ?? []) as UserTiebreakerRow[]).filter((row) => row.user_id === userId)
  const specialBets = detail.special_bets
  const hasSpecialBets = [specialBets?.balon, specialBets?.bota, specialBets?.guante].some((value) => Boolean(value?.trim()))
  const participantRows = (detail.participants ?? []).map((participant) => ({
    user_id: participant.user_id,
    name: participant.name,
    avatar_url: participant.avatar_url,
  }))
  const allMatches = (detail.matches ?? []) as Match[]
  const groupMatches = allMatches.filter((match) => match.stage === 'group')
  const knockoutMatches = buildProjectedKnockoutMatches(allMatches.filter((match) => match.stage !== 'group'))
  const typedMatches = [...groupMatches, ...knockoutMatches]
  const tiebreakersByUser = new Map<string, Record<string, string>>()
  for (const row of (detail.tiebreakers ?? []) as UserTiebreakerRow[]) {
    if (!tiebreakersByUser.has(row.user_id)) tiebreakersByUser.set(row.user_id, {})
    tiebreakersByUser.get(row.user_id)![row.tiebreaker_key] = row.team
  }
  const rankingEntries = buildAuditedRankingEntries(
    typedMatches,
    allTypedPredictions,
    participantRows,
    tiebreakersByUser
  )
  const entry = rankingEntries.find((rankingEntry) => rankingEntry.user_id === userId)
  if (!entry) notFound()
  const isTrialDetail = detail.participant.participant_status === 'trial'
  const typedUserPredictions = userTypedPredictions
  const isOwnProfile = user?.id === userId
  const viewerTypedPredictions = user
    ? allTypedPredictions.filter((prediction) => prediction.user_id === user.id)
    : []
  const hasOfficialResults = typedMatches.some((match) => match.status === 'finished' && match.home_score != null && match.away_score != null)
  const rankingStarted = hasOfficialResults

  const auditRows = buildMatchAuditRows(
    typedMatches,
    typedUserPredictions,
    tiebreakersByUser.get(userId) ?? {}
  )
  const viewerAuditRows = user
    ? buildMatchAuditRows(
        typedMatches,
        viewerTypedPredictions,
        tiebreakersByUser.get(user.id) ?? {}
      )
    : []
  const groupKeys = GROUP_KEYS.filter((group) => groupMatches.some((match) => match.group === group))
  const predictionMap = Object.fromEntries(
    typedUserPredictions.map((prediction) => [
      prediction.match_id,
      { home_score: prediction.home_score, away_score: prediction.away_score },
    ] as const)
  )
  const viewerPredictionMap = Object.fromEntries(
    viewerTypedPredictions.map((prediction) => [
      prediction.match_id,
      { home_score: prediction.home_score, away_score: prediction.away_score },
    ] as const)
  )
  const viewerPredictionByMatch = new Map(viewerTypedPredictions.map((prediction) => [prediction.match_id, prediction]))
  const viewerRowByMatch = new Map(viewerAuditRows.map((row) => [row.match.id, row]))
  const userTiebreakerMap = tiebreakersByUser.get(userId) ?? {}
  const viewerTiebreakerMap = user ? tiebreakersByUser.get(user.id) ?? {} : {}
  const visibleRows = auditRows.filter((row) => {
    if (activeView === 'all' || activeView === 'bracket' || activeView === 'specials') return false
    if (activeView === 'knockout' && row.stage === 'group') return false
    if (activeView === 'knockout' && row.stage !== activeKnockoutStage) return false
    if (activeView.startsWith('group_') && (row.stage !== 'group' || row.match.group !== activeView.replace('group_', ''))) return false
    if (activeResult && row.status !== activeResult) return false
    return true
  })
  const activeStageLabel = labelForView(activeView)
  const activeGroupKey = activeView.startsWith('group_') ? activeView.replace('group_', '') : null
  const activeGroupMatches = activeGroupKey
    ? groupMatches.filter((match) => match.group === activeGroupKey)
    : []
  const officialGroupScoreMap = buildOfficialGroupScoreMap(groupMatches)
  const groupTableSections: GroupTableSection[] = activeGroupKey
    ? [
        {
          id: 'participant',
          title: 'Participante',
          description: detail.participant.name,
          rows: buildGroupTableRows(activeGroupMatches, predictionMap, userTiebreakerMap, `Grupo ${activeGroupKey}`),
          tone: 'participant',
        },
        ...(user
          ? [{
              id: 'viewer',
              title: 'Mi Prode',
              description: isOwnProfile ? 'Tu misma carga' : 'Tu tabla para comparar',
              rows: buildGroupTableRows(activeGroupMatches, viewerPredictionMap, viewerTiebreakerMap, `Grupo ${activeGroupKey}`),
              tone: 'viewer' as const,
            }]
          : []),
        {
          id: 'official',
          title: 'Oficial',
          description: 'Resultados cargados',
          rows: buildGroupTableRows(activeGroupMatches, officialGroupScoreMap, {}, `Grupo ${activeGroupKey}`),
          tone: 'official',
        },
      ]
    : []

  return (
    <div style={{ padding: 'clamp(32px,7vw,56px) 20px clamp(60px,12vw,100px)' }}>
      <div className="max-w-[1060px] mx-auto">
        <div className="mb-7">
          <Link
            href="/ranking"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-extrabold text-[12px] uppercase transition-all duration-150 mb-5"
            style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', color: '#cfcfcf' }}
          >
            Volver al ranking
          </Link>
          <span className="block font-sans text-[12px] font-extrabold tracking-[0.22em] uppercase text-muted" style={{ marginBottom: '14px' }}>
            Detalle auditable
          </span>
          <h1 className="font-display uppercase leading-[.9] tracking-[-0.04em]" style={{ fontSize: 'clamp(40px, 8vw, 92px)' }}>
            {entry.name}
          </h1>
          {isTrialDetail && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <ParticipationBadge status="trial" />
              <p className="text-[13px] font-semibold leading-relaxed text-muted">
                Puede probar el sistema y cargar pronosticos, pero no participa oficialmente por premios.
              </p>
            </div>
          )}
        </div>

        {rankingStarted ? (
          <div className="grid gap-3 sm:grid-cols-5 mb-5">
            <SummaryBox
              label="Ranking"
              value={`${rankMedal(entry.rank, entry.total_points) ? `${rankMedal(entry.rank, entry.total_points)} ` : ''}${formatRank(entry, rankingEntries)}`}
              color={RANK_COLOR[entry.rank]}
            />
            <SummaryBox label="Puntos" value={entry.total_points} />
            <SummaryLink label="Exactas" value={statusCount(auditRows, 'exact')} href={filterHrefForView(userId, activeView, 'exact', activeResult, activeView === 'knockout' ? activeKnockoutStage : null)} active={activeResult === 'exact'} />
            <SummaryLink label="Parciales" value={statusCount(auditRows, 'partial')} href={filterHrefForView(userId, activeView, 'partial', activeResult, activeView === 'knockout' ? activeKnockoutStage : null)} active={activeResult === 'partial'} />
            <SummaryLink label="Incorrectas" value={statusCount(auditRows, 'incorrect')} href={filterHrefForView(userId, activeView, 'incorrect', activeResult, activeView === 'knockout' ? activeKnockoutStage : null)} active={activeResult === 'incorrect'} />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-4 mb-5">
            <SummaryBox label="Modo" value="Pre Mundial" />
            <SummaryBox label="Pronosticos" value={userTypedPredictions.length} />
            <SummaryBox label="Desempates" value={userTiebreakers.length} />
            <SummaryBox label="Especiales" value={`${countLoadedSpecials(specialBets)} de 3`} />
          </div>
        )}

        {userTypedPredictions.length === 0 && userTiebreakers.length === 0 && !hasSpecialBets && (
          <div className="mb-4 rounded-[16px] px-4 py-4 text-[13px] font-semibold leading-relaxed text-muted" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>
            Este Prode todavia no tiene pronosticos cargados.
          </div>
        )}

        {!hasOfficialResults && (
          <div className="mb-4 rounded-[16px] px-4 py-4 text-[13px] font-semibold leading-relaxed text-muted" style={{ background: 'rgba(168,240,216,0.07)', border: '1px solid rgba(168,240,216,0.18)' }}>
            Todavía no hay puntos para auditar, pero podés revisar las predicciones cargadas y los faltantes.
          </div>
        )}

        {userTiebreakers.length > 0 && (
          <details className="group mb-4 rounded-[16px] px-4 py-3 text-[13px] font-semibold leading-relaxed" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate font-extrabold text-white">Desempates guardados</span>
                <span className="rounded-full px-2 py-1 font-mono text-[10px] font-extrabold uppercase tracking-[0.12em]" style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)', color: '#A8F0D8' }}>
                  {userTiebreakers.length}
                </span>
              </span>
              <span className="shrink-0 rounded-full px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em]" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#d9d9d9' }}>
                <span className="group-open:hidden">Ver</span>
                <span className="hidden group-open:inline">Ocultar</span>
              </span>
            </summary>
            <div className="mt-3 grid gap-2">
              {userTiebreakers.map((row) => (
                <SavedTiebreakerItem
                  key={`${row.tiebreaker_key}-${row.team}`}
                  row={row}
                  matches={typedMatches}
                  predictions={typedUserPredictions}
                />
              ))}
            </div>
          </details>
        )}

        <ViewNavigation userId={userId} activeView={activeView} availableGroups={groupKeys} />

        {activeResult && (
          <div className="mb-4">
            <Link
              href={hrefForView(userId, activeView, null, activeView === 'knockout' ? activeKnockoutStage : null)}
              className="inline-flex rounded-full px-3 py-2 text-[11px] font-extrabold uppercase"
              style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', color: '#cfcfcf' }}
            >
              Quitar filtro: {STATUS_LABELS[activeResult].text}
            </Link>
          </div>
        )}

        {activeView === 'all' ? (
          <ProdeOverview
            userId={userId}
            rows={auditRows}
            specialBets={specialBets}
            groupKeys={groupKeys}
            showScoring={rankingStarted}
            viewerPredictionByMatch={viewerPredictionByMatch}
            viewerRowByMatch={viewerRowByMatch}
            userTiebreakerMap={userTiebreakerMap}
            viewerTiebreakerMap={viewerTiebreakerMap}
            isOwnProfile={isOwnProfile}
            showViewerPrediction={Boolean(user && !isOwnProfile)}
          />
        ) : activeView === 'bracket' ? (
          <div className="grid min-w-0 gap-4">
            <section className="min-w-0 rounded-[20px] overflow-hidden" style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <p className="font-extrabold text-white text-[14px]">{isOwnProfile ? 'Mi llave' : 'Llave del participante'}</p>
                <p className="text-muted text-[12px] mt-1">Camino proyectado: avances, semifinales, final y campeón.</p>
              </div>
              <div className="min-w-0 p-4">
                <TournamentBracket
                  mode={rankingStarted ? 'audit' : 'prode'}
                  groupMatches={groupMatches}
                  knockoutMatches={knockoutMatches}
                  predMap={predictionMap}
                  tiebreakerMap={userTiebreakerMap}
                />
              </div>
            </section>

            {!isOwnProfile && user && (
              <section className="min-w-0 rounded-[20px] overflow-hidden" style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <p className="font-extrabold text-white text-[14px]">Mi llave</p>
                  <p className="text-muted text-[12px] mt-1">Tu camino proyectado para comparar cruces, semifinalistas, finalistas y campeón.</p>
                </div>
                <div className="min-w-0 p-4">
                  <TournamentBracket
                    mode="prode"
                    groupMatches={groupMatches}
                    knockoutMatches={knockoutMatches}
                    predMap={viewerPredictionMap}
                    tiebreakerMap={viewerTiebreakerMap}
                  />
                </div>
              </section>
            )}
          </div>
        ) : (
          <div className="rounded-[20px] overflow-hidden" style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <p className="font-extrabold text-white text-[14px]">{activeStageLabel}</p>
              <p className="text-muted text-[12px] mt-1">
                {activeView === 'specials'
                  ? 'Apuestas especiales, resultado oficial y revision manual.'
                  : activeView === 'knockout'
                  ? 'Cruces predichos, equipos que avanzan y marcadores por fase.'
                  : 'Pronosticos de este grupo sin el resto de la fase mezclada.'}
              </p>
              {activeView === 'knockout' && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {KNOCKOUT_STAGE_ORDER.map((stage) => {
                    const active = stage === activeKnockoutStage
                    const count = auditRows.filter((row) => row.stage === stage).length
                    return (
                      <Link
                        key={stage}
                        href={hrefForView(userId, 'knockout', activeResult, stage)}
                        className="rounded-full px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.08em] transition-colors"
                        style={{
                          background: active ? '#FF6B00' : 'rgba(255,255,255,0.04)',
                          color: active ? '#0A0A0A' : '#d9d9d9',
                          border: active ? '1px solid #FF6B00' : '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        {STAGE_LABELS[stage]} · {count}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>

            {activeGroupKey && (
              <div className="p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <GroupStandingsTables
                  title={`Tablas del Grupo ${activeGroupKey}`}
                  subtitle="Compará posiciones, diferencia de gol y clasificados entre el Prode del participante, tu Prode y la tabla oficial."
                  sections={groupTableSections}
                />
              </div>
            )}

            {activeView === 'specials' && !hasSpecialBets ? (
              <EmptyState>Apuestas especiales sin cargar.</EmptyState>
            ) : activeView === 'specials' ? (
              SPECIAL_AUDIT_ROWS.map((row) => (
                <SpecialAuditCard
                  key={row.key}
                  row={row}
                  value={specialBets?.[row.key] ?? null}
                  showScoring={rankingStarted}
                />
              ))
            ) : visibleRows.length > 0 ? (
              visibleRows.map((row) => (
                <MatchAuditCard
                  key={row.match.id}
                  row={row}
                  showScoring={rankingStarted}
                  viewerPrediction={viewerPredictionByMatch.get(row.match.id)}
                  viewerRow={viewerRowByMatch.get(row.match.id)}
                  targetTiebreaker={userTiebreakerMap[row.match.id]}
                  viewerTiebreaker={viewerTiebreakerMap[row.match.id]}
                  isOwnProfile={isOwnProfile}
                />
              ))
            ) : (
              <EmptyState>No hay partidos para este filtro.</EmptyState>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function SummaryBox({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="rounded-[16px] px-4 py-4" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>
      <p className="font-mono text-[10px] font-extrabold tracking-[0.16em] uppercase text-muted">{label}</p>
      <p className="font-display text-[28px] leading-none mt-2" style={{ color }}>{value}</p>
    </div>
  )
}

function SummaryLink({ label, value, href, active }: { label: string; value: number; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className="rounded-[16px] px-4 py-4 transition-colors duration-150"
      style={{
        background: active ? 'rgba(255,107,0,0.12)' : '#141414',
        border: active ? '1px solid rgba(255,107,0,0.35)' : '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <p className="font-mono text-[10px] font-extrabold tracking-[0.16em] uppercase text-muted">{label}</p>
      <p className="font-display text-[28px] leading-none mt-2">{value}</p>
    </Link>
  )
}

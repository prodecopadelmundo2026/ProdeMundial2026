import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  buildAuditedRankingEntries,
  buildMatchAuditRows,
  type AuditStatus,
  type MatchAuditRow,
} from '@/lib/ranking-audit'
import type { Match, Prediction } from '@/types'
import { formatRank, rankMedal } from '@/lib/ranking-display'
import { buildProjectedKnockoutMatches } from '@/lib/bracket'

export const dynamic = 'force-dynamic'

type StageKey = Match['stage'] | 'specials'

type Props = {
  params: Promise<{ userId: string }>
  searchParams: Promise<{ stage?: StageKey; result?: AuditStatus }>
}

const STAGES: Array<{ key: StageKey; label: string }> = [
  { key: 'group', label: 'Grupos' },
  { key: 'round_of_32', label: 'Dieciseisavos' },
  { key: 'round_of_16', label: 'Octavos' },
  { key: 'quarter', label: 'Cuartos' },
  { key: 'semi', label: 'Semis' },
  { key: 'third_place', label: 'Tercer puesto' },
  { key: 'final', label: 'Final' },
  { key: 'specials', label: 'Especiales' },
]

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

type ParticipantAccessRow = {
  email: string
  active: boolean
  status: 'trial' | 'confirmed' | 'disabled'
  deleted_at: string | null
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

async function loadSpecialBets(
  supabase: Awaited<ReturnType<typeof createClient>>,
  admin: ReturnType<typeof createAdminClient>,
  userId: string
): Promise<SpecialBetsRow | null> {
  const selectSpecials = async (client: typeof supabase | ReturnType<typeof createAdminClient>, table: string) => {
    const { data, error } = await client
      .from(table)
      .select('balon, bota, guante')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw error
    return data as SpecialBetsRow | null
  }

  try {
    const data = await selectSpecials(supabase, 'special_bets')
    if (data) return data
  } catch (error) {
    const message = error instanceof Error ? error.message : String((error as { message?: unknown })?.message ?? error)
    if (!message.includes('special_bets') && !message.includes('relation') && !message.includes('does not exist')) throw error
  }

  try {
    const data = await selectSpecials(admin, 'special_bets')
    if (data) return data
  } catch (error) {
    const message = error instanceof Error ? error.message : String((error as { message?: unknown })?.message ?? error)
    if (!message.includes('special_bets') && !message.includes('relation') && !message.includes('does not exist')) throw error
  }

  try {
    return await selectSpecials(admin, 'especiales')
  } catch {
    return null
  }
}

const STATUS_LABELS: Record<AuditStatus, { text: string; color: string }> = {
  exact: { text: 'Exacto', color: '#A8F0D8' },
  partial: { text: 'Parcial', color: '#FFB15C' },
  incorrect: { text: 'Incorrecto', color: '#FF6B6B' },
  pending: { text: 'Pendiente', color: '#8A8A8A' },
  missing: { text: 'Sin pronostico', color: '#8A8A8A' },
}

function hrefFor(userId: string, stage: StageKey, result?: AuditStatus | null) {
  const params = new URLSearchParams({ stage })
  if (result) params.set('result', result)
  return `/ranking/${userId}?${params.toString()}`
}

function stageRows(rows: MatchAuditRow[], stage: StageKey) {
  return stage === 'specials' ? [] : rows.filter((row) => row.stage === stage)
}

function stageStats(rows: MatchAuditRow[], stage: StageKey) {
  const scoped = stageRows(rows, stage)
  return {
    points: scoped.reduce((total, row) => total + (row.points ?? 0), 0),
    exact: scoped.filter((row) => row.status === 'exact').length,
    partial: scoped.filter((row) => row.status === 'partial').length,
    incorrect: scoped.filter((row) => row.status === 'incorrect').length,
  }
}

function statusCount(rows: MatchAuditRow[], status: AuditStatus) {
  return rows.filter((row) => row.status === status).length
}

function filterHref(userId: string, stage: StageKey, result: AuditStatus, activeResult: AuditStatus | null) {
  return hrefFor(userId, stage, activeResult === result ? null : result)
}

function normalizeTiebreakerKey(key: string) {
  return key.trim().replace(/^virtual-P/i, 'virtual-p')
}

function formatScoreText(prediction?: Prediction) {
  return prediction ? `${prediction.home_score}-${prediction.away_score}` : null
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

function AuditMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] px-4 py-3" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.06)' }}>
      <p className="font-mono text-[10px] font-extrabold tracking-[0.14em] uppercase text-muted">{label}</p>
      <p className="font-bold text-[13px] text-white mt-1">{value}</p>
    </div>
  )
}

function MatchAuditCard({ row }: { row: MatchAuditRow }) {
  const isGroup = row.stage === 'group'

  return (
    <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
        <div className="min-w-0">
          <p className="font-bold text-[13px] text-white truncate">
            {isGroup ? `${row.match.home_team} vs ${row.match.away_team}` : `${row.predictedHome} vs ${row.predictedAway}`}
          </p>
          <p className="font-mono text-[10px] text-muted mt-1">
            {format(new Date(row.match.scheduled_at), 'd MMM yyyy - HH:mm', { locale: es })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 lg:justify-end">
          <ResultBadge status={row.status} />
          <p className="font-display text-[22px] leading-none tabular-nums">
            {row.points ?? 0}
            <span className="font-mono text-[10px] font-bold tracking-[0.14em] uppercase ml-1 text-muted">pts</span>
          </p>
        </div>
      </div>

      {isGroup ? (
        <div className="grid gap-3 mt-4 sm:grid-cols-2">
          <AuditMetric label="Pronostico" value={row.predictedScore} />
          <AuditMetric label="Resultado oficial" value={row.officialScore} />
        </div>
      ) : (
        <div className="grid gap-3 mt-4 lg:grid-cols-2">
          <div className="rounded-[14px] px-4 py-3" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="font-mono text-[10px] font-extrabold tracking-[0.14em] uppercase text-muted">Cruce predicho</p>
            <p className="font-bold text-[13px] text-white mt-1">{row.predictedHome} vs {row.predictedAway}</p>
            <p className="font-mono text-[11px] text-muted mt-2">Aposto: <b className="text-white">{row.predictedScore}</b></p>
          </div>
          <div className="rounded-[14px] px-4 py-3" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="font-mono text-[10px] font-extrabold tracking-[0.14em] uppercase text-muted">Cruce oficial</p>
            <p className="font-bold text-[13px] text-white mt-1">
              {row.hasOfficialTeams ? `${row.officialHome} vs ${row.officialAway}` : 'Pendiente'}
            </p>
            <p className="font-mono text-[11px] text-muted mt-2">Resultado: <b className="text-white">{row.officialScore}</b></p>
          </div>
          {row.crossMatches === false && (
            <p className="lg:col-span-2 text-[11px] font-bold" style={{ color: '#FFB15C' }}>
              El cruce predicho no coincide con el cruce oficial, por eso no suma por marcador.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function SpecialAuditCard({ row, value }: { row: typeof SPECIAL_AUDIT_ROWS[number]; value: string | null }) {
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
      <AuditMetric label="Resultado oficial" value="Pendiente" />
      <div className="flex flex-wrap items-center gap-3 md:justify-end">
        <ResultBadge status="pending" />
        <p className="font-display text-[22px] leading-none tabular-nums">
          0
          <span className="font-mono text-[10px] font-bold tracking-[0.14em] uppercase ml-1 text-muted">pts</span>
        </p>
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

function ParticipationBadge({ status }: { status: ParticipantAccessRow['status'] }) {
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

function NotOfficialNotice({ canSee }: { canSee: boolean }) {
  return (
    <div style={{ padding: 'clamp(32px,7vw,56px) 20px clamp(60px,12vw,100px)' }}>
      <div className="max-w-[760px] mx-auto rounded-[20px] px-5 py-6" style={{ background: '#141414', border: '1px solid rgba(255,177,92,0.2)' }}>
        <p className="font-sans text-[12px] font-extrabold tracking-[0.22em] uppercase" style={{ color: '#FFB15C' }}>
          Invitado
        </p>
        <h1 className="mt-3 font-display text-[clamp(34px,6vw,62px)] uppercase leading-[0.92]">
          No participa oficialmente todavia
        </h1>
        <p className="mt-4 text-[14px] font-semibold leading-relaxed text-muted">
          {canSee
            ? 'Este usuario esta habilitado como invitado para probar la plataforma, pero todavia no compite oficialmente por premios.'
            : 'Este Prode pertenece a un invitado. El ranking oficial de premios corresponde a competidores.'}
        </p>
        <Link
          href="/ranking"
          className="mt-5 inline-flex rounded-full px-4 py-2 text-[12px] font-extrabold uppercase"
          style={{ background: '#FF6B00', color: '#0A0A0A' }}
        >
          Volver al ranking
        </Link>
      </div>
    </div>
  )
}

export default async function ParticipantRankingPage({ params, searchParams }: Props) {
  const [{ userId }, query] = await Promise.all([params, searchParams])
  const activeStage = STAGES.some((stage) => stage.key === query.stage) ? query.stage! : 'group'
  const activeResult = query.result && ['exact', 'partial', 'incorrect'].includes(query.result)
    ? query.result
    : null
  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: { user: currentUser } } = await supabase.auth.getUser()

  const [
    { data: participants },
    { data: userPredictions },
    { data: allPredictions },
    { data: userVirtualPredictions },
    { data: allVirtualPredictions },
    { data: matches },
    { data: allTiebreakers },
    specialBets,
    { data: currentProfile },
  ] = await Promise.all([
    supabase.from('ranking_entries').select('user_id, name, avatar_url'),
    supabase.from('predictions').select('*').eq('user_id', userId),
    supabase.from('predictions').select('*'),
    supabase.from('virtual_knockout_predictions').select('*').eq('user_id', userId),
    supabase.from('virtual_knockout_predictions').select('*'),
    supabase.from('matches').select('*').order('scheduled_at', { ascending: true }),
    supabase.from('user_prediction_tiebreakers').select('user_id, tiebreaker_key, team'),
    loadSpecialBets(supabase, admin, userId),
    currentUser
      ? admin.from('profiles').select('is_admin').eq('id', currentUser.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])
  const currentUserIsAdmin = Boolean(currentProfile?.is_admin)

  const allTypedPredictions = [
    ...((allPredictions ?? []) as Prediction[]),
    ...((allVirtualPredictions ?? []) as VirtualPredictionRow[]).map(virtualPredictionToPrediction),
  ]
  const userTypedPredictions = [
    ...((userPredictions ?? []) as Prediction[]),
    ...((userVirtualPredictions ?? []) as VirtualPredictionRow[]).map(virtualPredictionToPrediction),
  ]
  const userTiebreakers = ((allTiebreakers ?? []) as UserTiebreakerRow[]).filter((row) => row.user_id === userId)
  const hasSpecialBets = [specialBets?.balon, specialBets?.bota, specialBets?.guante].some((value) => Boolean(value?.trim()))
  const participantRows = (participants ?? []).map((participant) => ({
    user_id: participant.user_id,
    name: participant.name,
    avatar_url: participant.avatar_url,
  }))
  const isInRankingEntries = participantRows.some((participant) => participant.user_id === userId)
  let participantAccess: ParticipantAccessRow | null = null
  if (!isInRankingEntries) {
    const { data: profile } = await admin
      .from('profiles')
      .select('id, name, email, avatar_url')
      .eq('id', userId)
      .maybeSingle()
    const { data: authorized } = profile?.email
      ? await admin
        .from('authorized_emails')
        .select('email, active, status, deleted_at')
        .eq('email', String(profile.email).toLowerCase().trim())
        .maybeSingle()
      : { data: null }
    participantAccess = authorized as ParticipantAccessRow | null
    if (profile && authorized?.active && !authorized.deleted_at && (authorized.status === 'confirmed' || authorized.status === 'trial')) {
      participantRows.push({
        user_id: profile.id,
        name: profile.name || profile.email || 'Participante',
        avatar_url: profile.avatar_url,
      })
    }
  }
  const typedMatches = buildProjectedKnockoutMatches((matches ?? []) as Match[])
  const tiebreakersByUser = new Map<string, Record<string, string>>()
  for (const row of (allTiebreakers ?? []) as UserTiebreakerRow[]) {
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
  if (!entry && participantAccess?.status === 'trial') {
    return <NotOfficialNotice canSee={currentUserIsAdmin || currentUser?.id === userId} />
  }
  if (!entry) notFound()
  const isTrialDetail = participantAccess?.status === 'trial'
  const rankingStarted = rankingEntries.some((rankingEntry) => rankingEntry.total_points > 0)
  const typedUserPredictions = userTypedPredictions
  const hasOfficialResults = typedMatches.some((match) => match.status === 'finished' && match.home_score != null && match.away_score != null)

  const auditRows = buildMatchAuditRows(
    typedMatches,
    typedUserPredictions,
    tiebreakersByUser.get(userId) ?? {}
  )
  const visibleRows = auditRows.filter((row) => {
    if (activeStage === 'specials') return false
    if (row.stage !== activeStage) return false
    if (activeResult && row.status !== activeResult) return false
    return true
  })
  const activeStageLabel = STAGES.find((stage) => stage.key === activeStage)?.label ?? 'Grupos'

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

        <div className="grid gap-3 sm:grid-cols-5 mb-5">
          <SummaryBox label="Ranking" value={rankingStarted ? `${rankMedal(entry.rank) ? `${rankMedal(entry.rank)} ` : ''}${formatRank(entry, rankingEntries)}` : 'Sin puntos'} />
          <SummaryBox label="Puntos" value={entry.total_points} />
          <SummaryLink label="Exactas" value={statusCount(auditRows, 'exact')} href={filterHref(userId, activeStage, 'exact', activeResult)} active={activeResult === 'exact'} />
          <SummaryLink label="Parciales" value={statusCount(auditRows, 'partial')} href={filterHref(userId, activeStage, 'partial', activeResult)} active={activeResult === 'partial'} />
          <SummaryLink label="Incorrectas" value={statusCount(auditRows, 'incorrect')} href={filterHref(userId, activeStage, 'incorrect', activeResult)} active={activeResult === 'incorrect'} />
        </div>

        {userTypedPredictions.length === 0 && userTiebreakers.length === 0 && !hasSpecialBets && (
          <div className="mb-4 rounded-[16px] px-4 py-4 text-[13px] font-semibold leading-relaxed text-muted" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>
            Este jugador todavia no cargo pronosticos.
          </div>
        )}

        {!hasOfficialResults && (
          <div className="mb-4 rounded-[16px] px-4 py-4 text-[13px] font-semibold leading-relaxed text-muted" style={{ background: 'rgba(168,240,216,0.07)', border: '1px solid rgba(168,240,216,0.18)' }}>
            Todavía no hay puntos para auditar, pero podés revisar las predicciones cargadas y los faltantes.
          </div>
        )}

        {userTiebreakers.length > 0 && (
          <div className="mb-4 rounded-[16px] px-4 py-4 text-[13px] font-semibold leading-relaxed" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="font-extrabold text-white mb-2">Desempates guardados</p>
            <div className="grid gap-2">
              {userTiebreakers.map((row) => (
                <p key={`${row.tiebreaker_key}-${row.team}`} className="rounded-[12px] px-3 py-2 text-[12px] font-bold" style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)', color: '#cfcfcf' }}>
                  {formatTiebreakerText(row, typedMatches, typedUserPredictions)}
                </p>
              ))}
            </div>
          </div>
        )}

        <details className="md:hidden mb-4 rounded-[16px]" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>
          <summary className="cursor-pointer px-4 py-3 font-extrabold text-[12px] uppercase" style={{ color: '#cfcfcf' }}>
            Elegir fase: <span style={{ color: '#FF6B00' }}>{activeStageLabel}</span>
          </summary>
          <div className="grid gap-2 px-3 pb-3">
            {STAGES.map((stage) => {
              const stats = stageStats(auditRows, stage.key)
              const active = stage.key === activeStage
              return (
                <Link
                  key={stage.key}
                  href={hrefFor(userId, stage.key, activeResult)}
                  className="rounded-[12px] px-3 py-3 text-[12px] font-extrabold uppercase"
                  style={{
                    background: active ? '#FF6B00' : '#0A0A0A',
                    color: active ? '#0A0A0A' : '#cfcfcf',
                    border: active ? '1px solid #FF6B00' : '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {stage.label} <span className="font-mono">{stats.points} pts</span>
                </Link>
              )
            })}
          </div>
        </details>

        <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
          {STAGES.map((stage) => {
            const stats = stageStats(auditRows, stage.key)
            const active = stage.key === activeStage
            return (
              <Link
                key={stage.key}
                href={hrefFor(userId, stage.key, activeResult)}
                title={`Sumo ${stats.points} puntos en esta fase. Exactas: ${stats.exact}. Parciales: ${stats.partial}. Incorrectas: ${stats.incorrect}.`}
                className="rounded-full px-4 py-2 text-center text-[12px] font-extrabold uppercase transition-colors duration-150"
                style={{
                  background: active ? '#FF6B00' : '#141414',
                  color: active ? '#0A0A0A' : '#cfcfcf',
                  border: active ? '1px solid #FF6B00' : '1px solid rgba(255,255,255,0.1)',
                }}
              >
                {stage.label} <span className="font-mono">{stats.points} pts</span>
              </Link>
            )
          })}
        </div>

        {activeResult && (
          <div className="mb-4">
            <Link
              href={hrefFor(userId, activeStage, null)}
              className="inline-flex rounded-full px-3 py-2 text-[11px] font-extrabold uppercase"
              style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', color: '#cfcfcf' }}
            >
              Quitar filtro: {STATUS_LABELS[activeResult].text}
            </Link>
          </div>
        )}

        <div className="rounded-[20px] overflow-hidden" style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <p className="font-extrabold text-white text-[14px]">{activeStageLabel}</p>
            <p className="text-muted text-[12px] mt-1">
              {activeStage === 'specials'
                ? 'Apuestas especiales, resultado oficial y revision manual.'
                : activeStage === 'group'
                ? 'Pronostico contra resultado oficial.'
                : 'Cruce predicho, cruce oficial, marcador apostado y puntos obtenidos.'}
            </p>
          </div>

          {activeStage === 'specials' && !hasSpecialBets ? (
            <EmptyState>Apuestas especiales sin cargar.</EmptyState>
          ) : activeStage === 'specials' ? (
            SPECIAL_AUDIT_ROWS.map((row) => (
              <SpecialAuditCard
                key={row.key}
                row={row}
                value={specialBets?.[row.key] ?? null}
              />
            ))
          ) : visibleRows.length > 0 ? (
            visibleRows.map((row) => <MatchAuditCard key={row.match.id} row={row} />)
          ) : (
            <EmptyState>No hay partidos para este filtro.</EmptyState>
          )}
        </div>
      </div>
    </div>
  )
}

function SummaryBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[16px] px-4 py-4" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>
      <p className="font-mono text-[10px] font-extrabold tracking-[0.16em] uppercase text-muted">{label}</p>
      <p className="font-display text-[28px] leading-none mt-2">{value}</p>
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

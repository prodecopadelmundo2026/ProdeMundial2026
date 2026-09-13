import { redirect } from 'next/navigation'
import { unstable_noStore as noStore } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Match } from '@/types'
import { MiProdeTabs } from './MiProdeTabs'
import { getProdeLockState } from '@/lib/prode-lock'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type PredRow = {
  match_id: string
  home_score: number
  away_score: number
  points: number | null
  tiebreaker_team: string | null
  match: { status: string } | { status: string }[]
}

type SpecialBetsRow = {
  balon: string | null
  bota: string | null
  guante: string | null
}

type VirtualKnockoutPredictionRow = {
  virtual_match_id: string
  home_score: number
  away_score: number
  tiebreaker_team: string | null
}

type PredictionTiebreakerRow = {
  tiebreaker_key: string
  team: string
}

type RawMatchRow = Match & {
  group_name?: string | null
  group_key?: string | null
}

function normalizeStage(stage: string | null | undefined, group: string | null | undefined): Match['stage'] {
  const value = String(stage ?? '').trim().toLowerCase().replaceAll('-', '_').replaceAll(' ', '_')
  if (value === 'group' || value === 'groups' || value === 'fase_de_grupos' || value === 'grupos') return 'group'
  if (value === 'round_of_32' || value === 'dieciseisavos' || value === 'd16') return 'round_of_32'
  if (value === 'round_of_16' || value === 'octavos') return 'round_of_16'
  if (value === 'quarter' || value === 'quarter_final' || value === 'cuartos') return 'quarter'
  if (value === 'semi' || value === 'semifinal' || value === 'semifinales') return 'semi'
  if (value === 'third_place' || value === 'tercer_puesto' || value === '3er_puesto') return 'third_place'
  if (value === 'final') return 'final'
  return group ? 'group' : 'group'
}

function normalizeGroup(value: string | null | undefined): string | null {
  const normalized = String(value ?? '').trim()
  if (!normalized) return null
  const groupMatch = normalized.match(/(?:grupo|group)\s+([A-L])/i)
  if (groupMatch) return groupMatch[1].toUpperCase()
  if (/^[A-L]$/i.test(normalized)) return normalized.toUpperCase()
  return normalized
}

function normalizeMatchRow(match: RawMatchRow): Match {
  const group = normalizeGroup(match.group ?? match.group_name ?? match.group_key)
  return {
    ...match,
    group,
    stage: normalizeStage(match.stage, group),
  }
}

async function loadSpecialBets(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<SpecialBetsRow | null> {
  try {
    const { data, error } = await supabase
      .from('special_bets')
      .select('balon, bota, guante')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) throw error
    return data as SpecialBetsRow | null
  } catch (error) {
    const message = error instanceof Error ? error.message : String((error as { message?: unknown })?.message ?? error)
    if (message.includes('special_bets') || message.includes('relation') || message.includes('does not exist')) return null
    throw error
  }
}

async function loadVirtualKnockoutPredictions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<VirtualKnockoutPredictionRow[]> {
  try {
    const { data, error } = await supabase
      .from('virtual_knockout_predictions')
      .select('virtual_match_id, home_score, away_score, tiebreaker_team')
      .eq('user_id', userId)

    if (error) throw error
    return (data ?? []) as VirtualKnockoutPredictionRow[]
  } catch (error) {
    const message = error instanceof Error ? error.message : String((error as { message?: unknown })?.message ?? error)
    if (message.includes('virtual_knockout_predictions') || message.includes('relation') || message.includes('does not exist')) return []
    throw error
  }
}

async function loadPredictionTiebreakers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<PredictionTiebreakerRow[]> {
  try {
    const { data, error } = await supabase
      .from('user_prediction_tiebreakers')
      .select('tiebreaker_key, team')
      .eq('user_id', userId)

    if (error) throw error
    return (data ?? []) as PredictionTiebreakerRow[]
  } catch (error) {
    const message = error instanceof Error ? error.message : String((error as { message?: unknown })?.message ?? error)
    if (message.includes('user_prediction_tiebreakers') || message.includes('relation') || message.includes('does not exist')) return []
    throw error
  }
}

export default async function MiProdePage() {
  noStore()

  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: allMatches, error: matchesError }, { data: predictions }, { data: profile }, specialBets, virtualKnockoutPredictions, predictionTiebreakers, prodeLock] = await Promise.all([
    admin.from('matches').select('*').order('scheduled_at', { ascending: true }),
    supabase
      .from('predictions')
      .select('match_id, home_score, away_score, points, tiebreaker_team, match:matches(status)')
      .eq('user_id', user.id),
    supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle(),
    loadSpecialBets(supabase, user.id),
    loadVirtualKnockoutPredictions(supabase, user.id),
    loadPredictionTiebreakers(supabase, user.id),
    getProdeLockState(supabase),
  ])

  const matches = ((allMatches ?? []) as RawMatchRow[]).map(normalizeMatchRow)
  const userPredictions = (predictions ?? []) as PredRow[]

  const groupMatches = matches.filter((m) => m.stage === 'group')
  const knockoutMatches = matches.filter((m) => m.stage !== 'group')
  const stageCounts = matches.reduce<Record<string, number>>((acc, match) => {
    acc[match.stage] = (acc[match.stage] ?? 0) + 1
    return acc
  }, {})

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  let supabaseHost: string | null = null
  try {
    supabaseHost = supabaseUrl ? new URL(supabaseUrl).host : null
  } catch {
    supabaseHost = supabaseUrl ?? null
  }

  console.info('[mi-prode] fixture load', {
    supabaseHost,
    userId: user.id,
    userEmail: user.email ?? null,
    matchesError: matchesError
      ? {
          message: matchesError.message,
          code: matchesError.code,
          details: matchesError.details,
          hint: matchesError.hint,
        }
      : null,
    rawMatchesCount: allMatches?.length ?? 0,
    firstMatch: allMatches?.[0]
      ? {
          id: allMatches[0].id,
          home_team: allMatches[0].home_team,
          away_team: allMatches[0].away_team,
          scheduled_at: allMatches[0].scheduled_at,
          locked_at: allMatches[0].locked_at,
          stage: allMatches[0].stage,
          group: allMatches[0].group,
          status: allMatches[0].status,
        }
      : null,
    normalizedStageCounts: stageCounts,
    finalGroupMatchesCount: groupMatches.length,
    finalKnockoutMatchesCount: knockoutMatches.length,
    finalGroups: Array.from(new Set(groupMatches.map((match) => match.group).filter(Boolean))),
    predictionsReadCount: userPredictions.length,
    virtualPredictionsReadCount: virtualKnockoutPredictions.length,
    tiebreakersReadCount: predictionTiebreakers.length,
  })

  const predMap = Object.fromEntries(
    [
      ...userPredictions.map((p) => [
        p.match_id,
        { home_score: p.home_score, away_score: p.away_score },
      ] as const),
      ...virtualKnockoutPredictions.map((p) => [
        p.virtual_match_id,
        { home_score: p.home_score, away_score: p.away_score },
      ] as const),
    ]
  )

  const tiebreakerMap = Object.fromEntries(
    [
      ...predictionTiebreakers
        .filter((p) => p.tiebreaker_key.startsWith('Grupo ') || p.tiebreaker_key.startsWith('3rd-'))
        .map((p) => [p.tiebreaker_key, p.team] as const),
      ...userPredictions
        .filter((p) => p.tiebreaker_team)
        .map((p) => [p.match_id, p.tiebreaker_team!] as const),
      ...virtualKnockoutPredictions
        .filter((p) => p.tiebreaker_team)
        .map((p) => [p.virtual_match_id, p.tiebreaker_team!] as const),
    ]
  )

  return (
    <div style={{ padding: '20px 16px clamp(40px, 8vw, 72px)' }}>
      <div className="max-w-[1280px] mx-auto">

        {/* Page head */}
        <div className="mb-5 flex flex-col gap-3 min-[900px]:flex-row min-[900px]:items-center">
          <div>
          <span
            className="inline-block font-sans text-[11px] font-extrabold tracking-[0.22em] uppercase text-muted"
            style={{ marginBottom: '10px' }}
          >
            Tus pronósticos
          </span>
          <h1
            className="font-display uppercase leading-[.9] tracking-[-0.04em]"
            style={{ fontSize: 'clamp(40px, 8vw, 96px)' }}
          >
            Mi <em className="not-italic italic" style={{ color: '#FF6B00' }}>Prode</em>
          </h1>
          <p className="font-mono text-[12px] font-bold text-muted tracking-[0.04em] mt-[8px]">
            Mundial 2026 · Estados Unidos · Canadá · México
          </p>
          </div>
          {prodeLock.locked && (
            <div
              className="w-fit max-w-full rounded-[14px] px-4 py-2 text-[12px] font-bold leading-snug min-[900px]:ml-4 min-[900px]:max-w-[620px]"
              style={{ background: 'rgba(255,107,0,0.1)', border: '1px solid rgba(255,107,0,0.22)', color: '#FFB15C' }}
            >
              La carga del Prode ya cerro. Solo podes completar datos faltantes, no modificar pronosticos ya cargados.
              {prodeLock.override === 'locked'
                ? ' Bloqueo manual admin activo.'
                : prodeLock.automaticLocked
                ? ' Cierre automatico por fecha activo.'
                : ''}
            </div>
          )}
        </div>

        <MiProdeTabs
          groupMatches={groupMatches}
          knockoutMatches={knockoutMatches}
          predMap={predMap}
          tiebreakerMap={tiebreakerMap}
          isAdmin={Boolean(profile?.is_admin)}
          prodeLocked={prodeLock.locked}
          initialSpecialBetsExists={Boolean(specialBets)}
          initialSpecialBets={{
            balon: specialBets?.balon ?? '',
            bota: specialBets?.bota ?? '',
            guante: specialBets?.guante ?? '',
          }}
        />
      </div>
    </div>
  )
}

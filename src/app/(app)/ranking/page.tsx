import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildAuditedRankingEntries } from '@/lib/ranking-audit'
import type { Match, Prediction } from '@/types'
import { RankingClient } from './RankingClient'
import { buildProjectedKnockoutMatches } from '@/lib/bracket'

export const dynamic = 'force-dynamic'

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

type RankingParticipant = {
  user_id: string
  name: string
  avatar_url: string | null
  participant_status: 'confirmed' | 'trial'
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

export default async function RankingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const admin = createAdminClient()

  const [{ data: participants }, { data: matches }, { data: predictions }, { data: virtualPredictions }, { data: tiebreakers }, { data: specialBets }, { data: trialAccessRows }] = await Promise.all([
    supabase
      .from('ranking_entries')
      .select('user_id, name, avatar_url'),
    supabase
      .from('matches')
      .select('*')
      .order('scheduled_at', { ascending: true }),
    supabase
      .from('predictions')
      .select('*'),
    supabase
      .from('virtual_knockout_predictions')
      .select('*'),
    supabase
      .from('user_prediction_tiebreakers')
      .select('user_id, tiebreaker_key, team'),
    supabase
      .from('special_bets')
      .select('user_id, balon, bota, guante'),
    admin
      .from('authorized_emails')
      .select('email, status')
      .eq('active', true)
      .eq('status', 'trial')
      .is('deleted_at', null),
  ])

  const allPredictions = [
    ...((predictions ?? []) as Prediction[]),
    ...((virtualPredictions ?? []) as VirtualPredictionRow[]).map(virtualPredictionToPrediction),
  ]
  const predictionCounts = new Map<string, number>()
  for (const prediction of allPredictions) {
    predictionCounts.set(prediction.user_id, (predictionCounts.get(prediction.user_id) ?? 0) + 1)
  }
  for (const row of (tiebreakers ?? []) as UserTiebreakerRow[]) {
    predictionCounts.set(row.user_id, (predictionCounts.get(row.user_id) ?? 0) + 1)
  }
  for (const row of (specialBets ?? []) as Array<{ user_id: string; balon: string | null; bota: string | null; guante: string | null }>) {
    if (row.balon || row.bota || row.guante) {
      predictionCounts.set(row.user_id, (predictionCounts.get(row.user_id) ?? 0) + 1)
    }
  }
  const confirmedRows: RankingParticipant[] = (participants ?? []).map((participant) => ({
    user_id: participant.user_id,
    name: participant.name,
    avatar_url: participant.avatar_url,
    participant_status: 'confirmed',
  }))
  const trialEmails = ((trialAccessRows ?? []) as Array<{ email: string; status: 'trial' }>)
    .map((row) => row.email.toLowerCase().trim())
  const { data: trialProfiles } = trialEmails.length
    ? await admin
      .from('profiles')
      .select('id, name, email, avatar_url')
      .in('email', trialEmails)
    : { data: [] }
  const confirmedIds = new Set(confirmedRows.map((participant) => participant.user_id))
  const trialRows: RankingParticipant[] = (trialProfiles ?? [])
    .filter((profile) => !confirmedIds.has(profile.id))
    .map((profile) => ({
      user_id: profile.id,
      name: profile.name || profile.email || 'Invitado',
      avatar_url: profile.avatar_url,
      participant_status: 'trial',
    }))

  const typedMatches = buildProjectedKnockoutMatches((matches ?? []) as Match[])
  const tiebreakersByUser = new Map<string, Record<string, string>>()
  for (const row of (tiebreakers ?? []) as UserTiebreakerRow[]) {
    if (!tiebreakersByUser.has(row.user_id)) tiebreakersByUser.set(row.user_id, {})
    tiebreakersByUser.get(row.user_id)![row.tiebreaker_key] = row.team
  }

  const officialEntries = buildAuditedRankingEntries(
    typedMatches,
    allPredictions,
    confirmedRows,
    tiebreakersByUser
  ).map((entry) => ({
    ...entry,
    participant_status: 'confirmed' as const,
    predictions_count: predictionCounts.get(entry.user_id) ?? 0,
    prode_status: (predictionCounts.get(entry.user_id) ?? 0) > 0 ? 'in_progress' as const : 'empty' as const,
  }))
  const trialEntries = buildAuditedRankingEntries(
    typedMatches,
    allPredictions,
    trialRows,
    tiebreakersByUser
  ).map((entry) => ({
    ...entry,
    participant_status: 'trial' as const,
    predictions_count: predictionCounts.get(entry.user_id) ?? 0,
    prode_status: (predictionCounts.get(entry.user_id) ?? 0) > 0 ? 'in_progress' as const : 'empty' as const,
  }))
  const entries = [...officialEntries, ...trialEntries]

  return (
    <div style={{ padding: 'clamp(40px,8vw,64px) 20px clamp(60px,12vw,100px)' }}>
      <div className="max-w-[880px] mx-auto">

        {/* Page head */}
        <div style={{ marginBottom: '32px' }}>
          <span
            className="inline-block font-sans text-[12px] font-extrabold tracking-[0.22em] uppercase text-muted"
            style={{ marginBottom: '18px' }}
          >
            Tabla en vivo
          </span>
          <h1
            className="font-display uppercase leading-[.9] tracking-[-0.04em]"
            style={{ fontSize: 'clamp(48px, 9vw, 108px)' }}
          >
            <em className="not-italic italic" style={{ color: '#FF6B00' }}>Ranking</em>
          </h1>
          <p className="font-mono text-[13px] font-bold text-muted tracking-[0.04em] mt-[14px]">
            Mundial 2026 · USA · Canadá · México
          </p>
          <p className="mt-4 max-w-[620px] text-[13px] font-medium leading-relaxed text-muted">
            Tocá cualquier Prode para ver pronósticos, aciertos, errores y puntos partido por partido.
          </p>
          <p className="mt-3 max-w-[620px] text-[13px] font-medium leading-relaxed text-[#cfcfcf]">
            Esta tabla muestra competidores e invitados con Prodes cargados. Los invitados aparecen identificados y no participan oficialmente por premios.
          </p>
        </div>

        {/* Info banner */}
        <aside
          className="flex items-center gap-3 rounded-[16px] px-[18px] py-[14px] text-[13px] mb-6"
          style={{
            background: 'linear-gradient(90deg, rgba(168,240,216,0.07), rgba(168,240,216,0.02))',
            border: '1px solid rgba(168,240,216,0.22)',
            color: '#cfcfcf',
          }}
        >
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: '#A8F0D8', animation: 'pulse-dot 1.6s infinite' }}
          />
          <span>
            El conteo de puntos empieza cuando se carguen los primeros resultados oficiales. Hasta entonces podés revisar los Prodes cargados por competidores e invitados.
          </span>
        </aside>

        <RankingClient entries={entries} userId={user?.id} />
      </div>
    </div>
  )
}

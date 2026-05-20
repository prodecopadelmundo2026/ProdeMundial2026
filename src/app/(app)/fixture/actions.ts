'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

function assertValidScore(score: number) {
  if (!Number.isInteger(score) || score < 0 || score > 99) {
    throw new Error('Goles invalidos')
  }
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.is_admin) throw new Error('Sin permisos de administrador')
  return { supabase, user }
}

function randomFakeScore() {
  return Math.floor(Math.random() * 10)
}

function randomWinningScores() {
  let homeScore = randomFakeScore()
  let awayScore = randomFakeScore()
  if (homeScore === awayScore) {
    awayScore = (awayScore + 1) % 10
  }
  return { homeScore, awayScore }
}

async function savePredictionsRpc(
  supabase: Awaited<ReturnType<typeof createClient>>,
  predictions: Array<{ matchId: string; homeScore: number; awayScore: number }>
) {
  if (!predictions.length) return 0
  for (const prediction of predictions) {
    assertValidScore(prediction.homeScore)
    assertValidScore(prediction.awayScore)
  }

  const { data, error } = await supabase.rpc('save_predictions', {
    p_predictions: predictions.map((p) => ({
      match_id: p.matchId,
      home_score: p.homeScore,
      away_score: p.awayScore,
    })),
  })

  if (error) throw error
  return data ?? predictions.length
}

export async function upsertPrediction(
  matchId: string,
  homeScore: number,
  awayScore: number
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  assertValidScore(homeScore)
  assertValidScore(awayScore)

  // Validación server-side: partido existe y está abierto
  const { data: match } = await supabase
    .from('matches')
    .select('locked_at, status')
    .eq('id', matchId)
    .single()

  if (!match) throw new Error('Partido no encontrado')
  if (match.status !== 'upcoming' || new Date() >= new Date(match.locked_at)) {
    throw new Error('Las predicciones para este partido ya cerraron')
  }

  const { error } = await supabase.from('predictions').upsert(
    {
      user_id: user.id,
      match_id: matchId,
      home_score: homeScore,
      away_score: awayScore,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,match_id' }
  )

  if (error) throw error
  revalidatePath('/')
  revalidatePath('/fixture')
  revalidatePath('/mi-prode')
}

export async function upsertPredictionsBatch(
  predictions: Array<{ matchId: string; homeScore: number; awayScore: number; tiebreakerTeam?: string | null }>
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  for (const prediction of predictions) {
    assertValidScore(prediction.homeScore)
    assertValidScore(prediction.awayScore)
  }

  const matchIds = predictions.map((p) => p.matchId)
  const { data: matches } = await supabase
    .from('matches')
    .select('id, locked_at, status')
    .in('id', matchIds)

  const now = new Date()
  const openIds = new Set(
    (matches ?? [])
      .filter((m) => m.status === 'upcoming' && now < new Date(m.locked_at))
      .map((m) => m.id)
  )

  const toInsert = predictions
    .filter((p) => openIds.has(p.matchId))
    .map((p) => ({
      user_id: user.id,
      match_id: p.matchId,
      home_score: p.homeScore,
      away_score: p.awayScore,
      tiebreaker_team: p.tiebreakerTeam ?? null,
      updated_at: new Date().toISOString(),
    }))

  if (!toInsert.length) throw new Error('No hay predicciones abiertas para guardar')

  const { error } = await supabase
    .from('predictions')
    .upsert(toInsert, { onConflict: 'user_id,match_id' })

  if (error) throw error
  revalidatePath('/')
  revalidatePath('/mi-prode')
}

export async function deleteGroupPredictions() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: groupMatches } = await supabase
    .from('matches')
    .select('id')
    .eq('stage', 'group')

  if (!groupMatches?.length) return

  const { error } = await supabase
    .from('predictions')
    .delete()
    .eq('user_id', user.id)
    .in('match_id', groupMatches.map((m) => m.id))

  if (error) throw error
  revalidatePath('/mi-prode')
}

export async function generateRandomGroupPredictions() {
  const { user } = await requireAdmin()
  const admin = createAdminClient()

  const { data: groupMatches } = await admin
    .from('matches')
    .select('id')
    .eq('stage', 'group')

  if (!groupMatches?.length) return []

  const generated = groupMatches.map((match) => ({
    matchId: match.id,
    homeScore: randomFakeScore(),
    awayScore: randomFakeScore(),
  }))

  const { error } = await admin
    .from('predictions')
    .upsert(
      generated.map((p) => ({
        user_id: user.id,
        match_id: p.matchId,
        home_score: p.homeScore,
        away_score: p.awayScore,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: 'user_id,match_id' }
    )

  if (error) throw error
  revalidatePath('/')
  revalidatePath('/mi-prode')
  return generated
}

export async function generateRandomKnockoutPredictions(matchIds: string[]) {
  const { supabase } = await requireAdmin()
  const uniqueMatchIds = [...new Set(matchIds)]
  if (!uniqueMatchIds.length) return []

  const now = new Date()
  const { data: matches } = await supabase
    .from('matches')
    .select('id, locked_at, status, stage')
    .in('id', uniqueMatchIds)

  const allowedIds = new Set(
    (matches ?? [])
      .filter((m) => m.stage !== 'group' && m.status === 'upcoming' && now < new Date(m.locked_at))
      .map((m) => m.id)
  )

  const generated = uniqueMatchIds
    .filter((matchId) => allowedIds.has(matchId))
    .map((matchId) => ({
      matchId,
      ...randomWinningScores(),
    }))

  await savePredictionsRpc(supabase, generated)
  revalidatePath('/')
  revalidatePath('/mi-prode')
  return generated
}

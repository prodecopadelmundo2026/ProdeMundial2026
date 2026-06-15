'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { assertProdeOpen } from '@/lib/prode-lock'

function assertValidScore(score: number) {
  if (!Number.isInteger(score) || score < 0 || score > 99) {
    throw new Error('Goles invalidos')
  }
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return String(error)
}

function logActionError(scope: string, error: unknown, context?: Record<string, unknown>) {
  console.error(`[${scope}] ${errorMessage(error)}`, { error, ...context })
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
  const homeScore = randomFakeScore()
  let awayScore = randomFakeScore()
  if (homeScore === awayScore) {
    awayScore = (awayScore + 1) % 10
  }
  return { homeScore, awayScore }
}

function matchIsPredictionOpen(match: { status: string; scheduled_at: string }) {
  return match.status === 'upcoming' && new Date() < new Date(match.scheduled_at)
}

async function savePredictionsRpc(
  supabase: Awaited<ReturnType<typeof createClient>>,
  predictions: Array<{ matchId: string; homeScore: number; awayScore: number; tiebreakerTeam?: string | null }>
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
      tiebreaker_team: p.tiebreakerTeam ?? null,
    })),
  })

  if (error) {
    logActionError('savePredictionsRpc', error, {
      count: predictions.length,
      firstPrediction: predictions[0],
    })
    throw new Error(error.message)
  }
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
  await assertProdeOpen(supabase)
  assertValidScore(homeScore)
  assertValidScore(awayScore)

  // Validación server-side: partido existe y está abierto
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('scheduled_at, status')
    .eq('id', matchId)
    .single()

  if (matchError) {
    logActionError('upsertPrediction.loadMatch', matchError, { matchId })
    throw new Error(matchError.message)
  }
  if (!match) throw new Error('Partido no encontrado')
  if (!matchIsPredictionOpen(match)) {
    throw new Error('No podés cargar pronósticos de partidos que ya empezaron o finalizaron.')
  }

  try {
    await savePredictionsRpc(supabase, [{ matchId, homeScore, awayScore }])
  } catch (error) {
    logActionError('upsertPrediction.save', error, { matchId, homeScore, awayScore })
    throw new Error(errorMessage(error))
  }
  revalidatePath('/')
  revalidatePath('/fixture')
  revalidatePath('/mi-prode')
  revalidatePath('/ranking')
  revalidatePath(`/ranking/${user.id}`)
  revalidatePath('/ranking/[userId]', 'page')
}

export async function deletePrediction(matchId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  await assertProdeOpen(supabase)

  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('scheduled_at, status')
    .eq('id', matchId)
    .single()

  if (matchError) {
    logActionError('deletePrediction.loadMatch', matchError, { matchId })
    throw new Error(matchError.message)
  }
  if (!match) throw new Error('Partido no encontrado')
  if (!matchIsPredictionOpen(match)) {
    throw new Error('No podés cargar pronósticos de partidos que ya empezaron o finalizaron.')
  }

  const { error } = await supabase
    .from('predictions')
    .delete()
    .eq('user_id', user.id)
    .eq('match_id', matchId)

  if (error) {
    logActionError('deletePrediction.delete', error, { matchId })
    throw new Error(error.message)
  }

  revalidatePath('/')
  revalidatePath('/fixture')
  revalidatePath('/mi-prode')
  revalidatePath('/ranking')
  revalidatePath(`/ranking/${user.id}`)
  revalidatePath('/ranking/[userId]', 'page')
}

export async function upsertPredictionsBatch(
  predictions: Array<{ matchId: string; homeScore: number; awayScore: number; tiebreakerTeam?: string | null }>
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  await assertProdeOpen(supabase)
  for (const prediction of predictions) {
    assertValidScore(prediction.homeScore)
    assertValidScore(prediction.awayScore)
  }

  const matchIds = predictions.map((p) => p.matchId)
  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select('id, scheduled_at, status')
    .in('id', matchIds)

  if (matchesError) {
    logActionError('upsertPredictionsBatch.loadMatches', matchesError, { count: predictions.length })
    throw new Error(matchesError.message)
  }

  const openIds = new Set(
    (matches ?? [])
      .filter(matchIsPredictionOpen)
      .map((m) => m.id)
  )

  const toSave = predictions
    .filter((p) => openIds.has(p.matchId))
    .map((p) => ({
      matchId: p.matchId,
      homeScore: p.homeScore,
      awayScore: p.awayScore,
      tiebreakerTeam: p.tiebreakerTeam ?? null,
    }))

  if (!toSave.length) throw new Error('No podés cargar pronósticos de partidos que ya empezaron o finalizaron.')

  try {
    await savePredictionsRpc(supabase, toSave)
  } catch (error) {
    logActionError('upsertPredictionsBatch.save', error, { count: toSave.length })
    throw new Error(errorMessage(error))
  }
  revalidatePath('/')
  revalidatePath('/mi-prode')
  revalidatePath('/ranking')
  revalidatePath(`/ranking/${user.id}`)
  revalidatePath('/ranking/[userId]', 'page')
}

export async function deleteGroupPredictions() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  await assertProdeOpen(supabase)

  const { data, error } = await supabase.rpc('delete_predictions_by_stages', {
    p_stages: ['group'],
  })

  if (error) {
    logActionError('deleteGroupPredictions', error)
    throw new Error(error.message)
  }
  revalidatePath('/mi-prode')
  return data ?? 0
}

export async function deletePredictionsByStages(stages: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  await assertProdeOpen(supabase)

  const uniqueStages = [...new Set(stages)].filter(Boolean)
  if (!uniqueStages.length) return 0

  const { data, error } = await supabase.rpc('delete_predictions_by_stages', {
    p_stages: uniqueStages,
  })

  if (error) {
    logActionError('deletePredictionsByStages', error, { stages: uniqueStages })
    throw new Error(error.message)
  }

  revalidatePath('/')
  revalidatePath('/fixture')
  revalidatePath('/mi-prode')
  return data ?? 0
}

export async function generateRandomGroupPredictions() {
  const { supabase } = await requireAdmin()
  await assertProdeOpen(supabase)

  const { data: groupMatches, error: matchesError } = await supabase
    .from('matches')
    .select('id')
    .eq('stage', 'group')

  if (matchesError) {
    logActionError('generateRandomGroupPredictions.loadMatches', matchesError)
    throw new Error(matchesError.message)
  }

  if (!groupMatches?.length) return []

  const generated = groupMatches.map((match) => ({
    matchId: match.id,
    homeScore: randomFakeScore(),
    awayScore: randomFakeScore(),
  }))

  try {
    await savePredictionsRpc(supabase, generated)
  } catch (error) {
    logActionError('generateRandomGroupPredictions.save', error, { count: generated.length })
    throw new Error(errorMessage(error))
  }
  revalidatePath('/')
  revalidatePath('/mi-prode')
  return generated
}

export async function generateRandomKnockoutPredictions(matchIds: string[]) {
  const { supabase } = await requireAdmin()
  await assertProdeOpen(supabase)
  const uniqueMatchIds = [...new Set(matchIds)]
  if (!uniqueMatchIds.length) return []

  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select('id, scheduled_at, status, stage')
    .in('id', uniqueMatchIds)

  if (matchesError) {
    logActionError('generateRandomKnockoutPredictions.loadMatches', matchesError, { count: uniqueMatchIds.length })
    throw new Error(matchesError.message)
  }

  const allowedIds = new Set(
    (matches ?? [])
      .filter((m) => m.stage !== 'group' && matchIsPredictionOpen(m))
      .map((m) => m.id)
  )

  const generated = uniqueMatchIds
    .filter((matchId) => allowedIds.has(matchId))
    .map((matchId) => ({
      matchId,
      ...randomWinningScores(),
    }))

  try {
    await savePredictionsRpc(supabase, generated)
  } catch (error) {
    logActionError('generateRandomKnockoutPredictions.save', error, { count: generated.length })
    throw new Error(errorMessage(error))
  }
  revalidatePath('/')
  revalidatePath('/mi-prode')
  return generated
}

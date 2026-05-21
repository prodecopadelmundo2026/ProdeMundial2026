'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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
  let homeScore = randomFakeScore()
  let awayScore = randomFakeScore()
  if (homeScore === awayScore) {
    awayScore = (awayScore + 1) % 10
  }
  return { homeScore, awayScore }
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
  assertValidScore(homeScore)
  assertValidScore(awayScore)

  // Validación server-side: partido existe y está abierto
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('locked_at, status')
    .eq('id', matchId)
    .single()

  if (matchError) {
    logActionError('upsertPrediction.loadMatch', matchError, { matchId })
    throw new Error(matchError.message)
  }
  if (!match) throw new Error('Partido no encontrado')
  if (match.status !== 'upcoming' || new Date() >= new Date(match.locked_at)) {
    throw new Error('Las predicciones para este partido ya cerraron')
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
  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select('id, locked_at, status')
    .in('id', matchIds)

  if (matchesError) {
    logActionError('upsertPredictionsBatch.loadMatches', matchesError, { count: predictions.length })
    throw new Error(matchesError.message)
  }

  const now = new Date()
  const openIds = new Set(
    (matches ?? [])
      .filter((m) => m.status === 'upcoming' && now < new Date(m.locked_at))
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

  if (!toSave.length) throw new Error('No hay predicciones abiertas para guardar')

  try {
    await savePredictionsRpc(supabase, toSave)
  } catch (error) {
    logActionError('upsertPredictionsBatch.save', error, { count: toSave.length })
    throw new Error(errorMessage(error))
  }
  revalidatePath('/')
  revalidatePath('/mi-prode')
}

export async function deleteGroupPredictions() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

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
  const uniqueMatchIds = [...new Set(matchIds)]
  if (!uniqueMatchIds.length) return []

  const now = new Date()
  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select('id, locked_at, status, stage')
    .in('id', uniqueMatchIds)

  if (matchesError) {
    logActionError('generateRandomKnockoutPredictions.loadMatches', matchesError, { count: uniqueMatchIds.length })
    throw new Error(matchesError.message)
  }

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

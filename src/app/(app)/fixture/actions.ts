'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function upsertPrediction(
  matchId: string,
  homeScore: number,
  awayScore: number
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

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

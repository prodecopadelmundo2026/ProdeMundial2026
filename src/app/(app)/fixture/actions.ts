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
  revalidatePath('/fixture')
  revalidatePath('/mi-prode')
}

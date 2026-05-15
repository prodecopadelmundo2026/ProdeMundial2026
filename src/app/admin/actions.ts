'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) throw new Error('Sin permisos de administrador')
  return supabase
}

export async function setMatchResult(
  matchId: string,
  homeScore: number,
  awayScore: number,
  status: 'upcoming' | 'live' | 'finished'
) {
  const supabase = await requireAdmin()

  const { error } = await supabase
    .from('matches')
    .update({
      home_score: homeScore,
      away_score: awayScore,
      status,
    })
    .eq('id', matchId)

  if (error) throw error

  revalidatePath('/admin')
  revalidatePath('/ranking')
  revalidatePath('/mi-prode')
  revalidatePath('/')
}

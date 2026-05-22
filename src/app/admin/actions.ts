'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) throw new Error('Sin permisos de administrador')
}

export async function setMatchResult(
  matchId: string,
  homeScore: number,
  awayScore: number,
  status: 'upcoming' | 'live' | 'finished'
) {
  if (!Number.isInteger(homeScore) || homeScore < 0 || homeScore > 99) throw new Error('Goles inválidos')
  if (!Number.isInteger(awayScore) || awayScore < 0 || awayScore > 99) throw new Error('Goles inválidos')

  await requireAdmin()

  // Use service-role client to bypass RLS — admin writes always need this
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('matches')
    .update({
      home_score: homeScore,
      away_score: awayScore,
      status,
    })
    .eq('id', matchId)
    .select('id')

  if (error) throw new Error(error.message)
  if (!data || data.length === 0) throw new Error('No se encontró el partido o no se pudo actualizar.')

  revalidatePath('/admin')
  revalidatePath('/ranking')
  revalidatePath('/mi-prode')
  revalidatePath('/')
}

export async function upsertAuthorizedEmail(formData: FormData) {
  // RPCs with internal current_user_is_admin() check need the user's session
  // (auth.uid() must be set) — use createClient(), NOT createAdminClient()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) throw new Error('Sin permisos de administrador')

  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const label = String(formData.get('label') ?? '').trim()
  const active = formData.get('active') === 'on'

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Email inválido')
  }

  const { error } = await supabase.rpc('admin_upsert_authorized_email', {
    p_email: email,
    p_label: label,
    p_active: active,
  })

  if (error) throw new Error(error.message)

  revalidatePath('/admin/whitelist')
}

export async function setAuthorizedEmailActive(email: string, active: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) throw new Error('Sin permisos de administrador')

  const { error } = await supabase.rpc('admin_set_authorized_email_active', {
    p_email: email,
    p_active: active,
  })

  if (error) throw new Error(error.message)

  revalidatePath('/admin/whitelist')
}

// ─── Test tools ───────────────────────────────────────────────────────────────

export async function adminDeleteAllMyPredictions() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) throw new Error('Sin permisos de administrador')

  const allStages = ['group', 'round_of_32', 'round_of_16', 'quarter', 'semi', 'final', 'third_place']
  const { data, error } = await supabase.rpc('delete_predictions_by_stages', { p_stages: allStages })
  if (error) throw new Error(error.message)

  revalidatePath('/mi-prode')
  revalidatePath('/ranking')
  revalidatePath('/')
  return (data as number) ?? 0
}

export async function adminFillAllRandomly() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
  if (!profile?.is_admin) throw new Error('Sin permisos de administrador')

  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select('id, stage, locked_at, status')

  if (matchesError) throw new Error(matchesError.message)
  if (!matches?.length) return 0

  function rnd(max = 5) { return Math.floor(Math.random() * max) }

  const predictions = matches.map((m) => {
    let homeScore = rnd()
    let awayScore = rnd()
    // Knockout rounds can't end in a draw
    if (m.stage !== 'group' && homeScore === awayScore) {
      awayScore = (awayScore + 1) % 5
    }
    return { match_id: m.id, home_score: homeScore, away_score: awayScore, tiebreaker_team: null }
  })

  const { error } = await supabase.rpc('save_predictions', { p_predictions: predictions })
  if (error) throw new Error(error.message)

  revalidatePath('/mi-prode')
  revalidatePath('/ranking')
  revalidatePath('/')
  return predictions.length
}

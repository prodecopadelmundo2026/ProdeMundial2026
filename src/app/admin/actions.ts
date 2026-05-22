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

// ─── Test tools (operan sobre resultados de partidos, no sobre predicciones) ──

const ALL_STAGES = ['group', 'round_of_32', 'round_of_16', 'quarter', 'semi', 'final', 'third_place']

export async function adminResetMatchResults() {
  await requireAdmin()
  const admin = createAdminClient()

  // Limpiar puntos de todas las predicciones
  const { error: predErr } = await admin
    .from('predictions')
    .update({ points: null })
    .gte('created_at', '2000-01-01')
  if (predErr) throw new Error(predErr.message)

  // Borrar scores y volver a 'upcoming' usando el stage como filtro universal
  const { error: matchErr } = await admin
    .from('matches')
    .update({ home_score: null, away_score: null, status: 'upcoming' })
    .in('stage', ALL_STAGES)
  if (matchErr) throw new Error(matchErr.message)

  revalidatePath('/admin')
  revalidatePath('/mi-prode')
  revalidatePath('/ranking')
  revalidatePath('/')
}

export async function adminFillMatchesRandomly() {
  await requireAdmin()
  const admin = createAdminClient()

  const { data: matches, error } = await admin
    .from('matches')
    .select('id, stage')
    .in('stage', ALL_STAGES)
  if (error) throw new Error(error.message)
  if (!matches?.length) return 0

  function rnd() { return Math.floor(Math.random() * 5) }

  const updates = matches.map((m) => {
    let h = rnd()
    let a = rnd()
    if (m.stage !== 'group' && h === a) a = (a + 1) % 5
    return { id: m.id, home_score: h, away_score: a, status: 'finished' as const }
  })

  // Upsert row a row para que el trigger de puntos corra por cada partido
  const { error: upsertErr } = await admin.from('matches').upsert(updates)
  if (upsertErr) throw new Error(upsertErr.message)

  revalidatePath('/admin')
  revalidatePath('/mi-prode')
  revalidatePath('/ranking')
  revalidatePath('/')
  return matches.length
}

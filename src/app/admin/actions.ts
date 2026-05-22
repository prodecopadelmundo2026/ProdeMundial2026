'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { Match } from '@/types'
import { getPendingGroupTiebreakers } from '@/lib/bracket'

export type AdminToolResult = {
  ok: boolean
  message: string
  count?: number
}

function adminToolError(error: unknown): AdminToolResult {
  return {
    ok: false,
    message: error instanceof Error ? error.message : 'No se pudo ejecutar la herramienta admin.',
  }
}

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
  const supabase = await createClient()
  await requireAdmin()

  const email = String(formData.get('email') ?? '').toLowerCase().trim()
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
  await requireAdmin()

  const { error } = await supabase.rpc('admin_set_authorized_email_active', {
    p_email: email.toLowerCase().trim(),
    p_active: active,
  })

  if (error) throw new Error(error.message)

  revalidatePath('/admin/whitelist')
}

// ─── Test tools (operan sobre resultados de partidos, no sobre predicciones) ──

const ALL_STAGES = ['group', 'round_of_32', 'round_of_16', 'quarter', 'semi', 'final', 'third_place']

export async function adminResetMatchResults() {
  try {
    await requireAdmin()
    const admin = createAdminClient()

    const { error: predErr } = await admin
      .from('predictions')
      .update({ points: null })
      .gte('created_at', '2000-01-01')
    if (predErr) throw new Error(predErr.message)

    const { error: matchErr } = await admin
      .from('matches')
      .update({ home_score: null, away_score: null, status: 'upcoming' })
      .in('stage', ALL_STAGES)
    if (matchErr) throw new Error(matchErr.message)

    revalidatePath('/admin')
    revalidatePath('/mi-prode')
    revalidatePath('/ranking')
    revalidatePath('/')
    return { ok: true, message: 'Resultados borrados. Todos los partidos volvieron a Proximo.' }
  } catch (error) {
    return adminToolError(error)
  }
}

export async function adminFillMatchesRandomly() {
  try {
    await requireAdmin()
    const admin = createAdminClient()

    const { data: matches, error } = await admin
      .from('matches')
      .select('*')
      .in('stage', ALL_STAGES)

    if (error) throw new Error(error.message)
    if (!matches?.length) return { ok: true, message: 'No hay partidos para completar.', count: 0 }

    const typedMatches = matches as Match[]

    function rnd() {
      return Math.floor(Math.random() * 5)
    }

    function buildUpdates() {
      return typedMatches.map((m) => {
        let h = rnd()
        let a = rnd()

        if (m.stage !== 'group' && h === a) {
          a = (a + 1) % 5
        }

        return {
          id: m.id,
          home_score: h,
          away_score: a,
          status: 'finished' as const,
        }
      })
    }

    let updates = buildUpdates()
    const groupMatches = typedMatches.filter((m) => m.stage === 'group')

    for (let attempt = 0; attempt < 80; attempt++) {
      const scoreMap = Object.fromEntries(
        updates
          .filter((m) => groupMatches.some((gm) => gm.id === m.id))
          .map((m) => [m.id, { home_score: m.home_score, away_score: m.away_score }])
      )
      if (getPendingGroupTiebreakers(groupMatches, scoreMap).length === 0) break
      updates = buildUpdates()
    }

    for (const update of updates) {
      const { error: updateErr } = await admin
        .from('matches')
        .update({
          home_score: update.home_score,
          away_score: update.away_score,
          status: update.status,
        })
        .eq('id', update.id)
      if (updateErr) throw new Error(updateErr.message)
    }

    revalidatePath('/admin')
    revalidatePath('/mi-prode')
    revalidatePath('/ranking')
    revalidatePath('/')
    return {
      ok: true,
      message: `${typedMatches.length} partidos completados con scores aleatorios.`,
      count: typedMatches.length,
    }
  } catch (error) {
    return adminToolError(error)
  }
}

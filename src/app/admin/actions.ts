'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { Match, Prediction } from '@/types'
import {
  assignBestThirdsToSlots,
  buildKnockoutMap,
  computeAllStandings,
  computeBestThirdsGroups,
  getPendingGroupTiebreakers,
  resolveTeamFull,
} from '@/lib/bracket'
import { buildMatchAuditRows } from '@/lib/ranking-audit'
import { getProdeLockState } from '@/lib/prode-lock'
import { getMaintenanceMode } from '@/lib/maintenance'

export type AdminToolResult = {
  ok: boolean
  message: string
  count?: number
}

type ScoreMap = Record<string, { home_score: number; away_score: number }>
type ParticipantStatus = 'trial' | 'confirmed' | 'disabled'

function normalizeParticipantStatus(value: FormDataEntryValue | string | null | undefined): ParticipantStatus {
  const status = String(value ?? '').trim()
  if (status === 'confirmed' || status === 'disabled' || status === 'trial') return status
  return 'trial'
}

function revalidateCorePaths() {
  revalidatePath('/admin')
  revalidatePath('/admin/whitelist')
  revalidatePath('/fixture')
  revalidatePath('/mi-prode')
  revalidatePath('/ranking')
  revalidatePath('/ranking/[userId]', 'page')
  revalidatePath('/')
}

function adminToolError(error: unknown): AdminToolResult {
  return {
    ok: false,
    message: error instanceof Error ? error.message : 'No se pudo ejecutar la herramienta admin.',
  }
}

async function recomputeAllPredictionPoints(admin = createAdminClient()) {
  const [{ data: matches, error: matchesError }, { data: predictions, error: predictionsError }] = await Promise.all([
    admin.from('matches').select('*'),
    admin.from('predictions').select('*'),
  ])

  if (matchesError) throw new Error(matchesError.message)
  if (predictionsError) throw new Error(predictionsError.message)

  const typedMatches = (matches ?? []) as Match[]
  const typedPredictions = (predictions ?? []) as Prediction[]
  const byUser = new Map<string, Prediction[]>()
  for (const prediction of typedPredictions) {
    if (!byUser.has(prediction.user_id)) byUser.set(prediction.user_id, [])
    byUser.get(prediction.user_id)!.push(prediction)
  }

  let updated = 0
  for (const userPredictions of byUser.values()) {
    const auditRows = buildMatchAuditRows(typedMatches, userPredictions)
    for (const row of auditRows) {
      if (!row.prediction) continue
      if ((row.prediction.points ?? null) === (row.points ?? null)) continue
      const { error } = await admin
        .from('predictions')
        .update({ points: row.points })
        .eq('id', row.prediction.id)
      if (error) throw new Error(error.message)
      updated++
    }
  }

  return updated
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
  return user
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

  await recomputeAllPredictionPoints(admin)

  revalidateCorePaths()
}

export async function upsertAuthorizedEmail(formData: FormData) {
  const supabase = await createClient()
  await requireAdmin()

  const email = String(formData.get('email') ?? '').toLowerCase().trim()
  const label = String(formData.get('label') ?? '').trim()
  const status = normalizeParticipantStatus(formData.get('status'))
  const disabledReason = String(formData.get('disabled_reason') ?? '').trim()
  const active = status !== 'disabled'

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Email inválido')
  }

  const { error } = await supabase.rpc('admin_upsert_authorized_email', {
    p_email: email,
    p_label: label,
    p_active: active,
    p_status: status,
    p_disabled_reason: disabledReason,
  })

  if (error) throw new Error(error.message)

  revalidateCorePaths()
}

export async function updateAuthorizedEmail(formData: FormData) {
  const supabase = await createClient()
  await requireAdmin()

  const originalEmail = String(formData.get('original_email') ?? '').toLowerCase().trim()
  const email = String(formData.get('email') ?? '').toLowerCase().trim()
  const label = String(formData.get('label') ?? '').trim()
  const status = normalizeParticipantStatus(formData.get('status'))
  const disabledReason = String(formData.get('disabled_reason') ?? '').trim()

  if (!originalEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(originalEmail)) {
    throw new Error('Email original invalido')
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Email invalido')
  }

  const { error } = await supabase.rpc('admin_update_authorized_email', {
    p_original_email: originalEmail,
    p_email: email,
    p_label: label,
    p_status: status,
    p_disabled_reason: disabledReason,
  })

  if (error) throw new Error(error.message)
  revalidateCorePaths()
}

export async function setAuthorizedEmailActive(email: string, active: boolean) {
  const supabase = await createClient()
  await requireAdmin()

  const { error } = await supabase.rpc('admin_set_authorized_email_active', {
    p_email: email.toLowerCase().trim(),
    p_active: active,
  })

  if (error) throw new Error(error.message)

  revalidateCorePaths()
}

export async function setAuthorizedEmailStatus(
  email: string,
  status: ParticipantStatus,
  disabledReason = ''
): Promise<AdminToolResult> {
  try {
    const supabase = await createClient()
    await requireAdmin()
    const normalizedEmail = email.toLowerCase().trim()
    if (!normalizedEmail) throw new Error('Email invalido')

    const { error } = await supabase.rpc('admin_set_authorized_email_status', {
      p_email: normalizedEmail,
      p_status: status,
      p_disabled_reason: disabledReason,
    })

    if (error) throw new Error(error.message)

    revalidateCorePaths()
    const label = status === 'confirmed' ? 'pagado/confirmado' : status === 'trial' ? 'en prueba' : 'deshabilitado'
    return { ok: true, message: `Participante marcado como ${label}.` }
  } catch (error) {
    return adminToolError(error)
  }
}

export async function softDeleteAuthorizedEmail(email: string): Promise<AdminToolResult> {
  try {
    const supabase = await createClient()
    await requireAdmin()
    const normalizedEmail = email.toLowerCase().trim()
    if (!normalizedEmail) throw new Error('Email invalido')

    const { error } = await supabase.rpc('admin_soft_delete_authorized_email', {
      p_email: normalizedEmail,
    })

    if (error) throw new Error(error.message)

    revalidateCorePaths()
    return { ok: true, message: 'Participante movido a Eliminados. Sus datos historicos se conservaron.' }
  } catch (error) {
    return adminToolError(error)
  }
}

export async function restoreAuthorizedEmail(email: string, active = true): Promise<AdminToolResult> {
  try {
    const supabase = await createClient()
    await requireAdmin()
    const normalizedEmail = email.toLowerCase().trim()
    if (!normalizedEmail) throw new Error('Email invalido')

    const { error } = await supabase.rpc('admin_restore_authorized_email', {
      p_email: normalizedEmail,
      p_status: active ? 'trial' : 'disabled',
    })

    if (error) throw new Error(error.message)

    revalidateCorePaths()
    return { ok: true, message: active ? 'Participante restaurado como activo.' : 'Participante restaurado como deshabilitado.' }
  } catch (error) {
    return adminToolError(error)
  }
}

export async function toggleProdeLockOverride() {
  await requireAdmin()
  const admin = createAdminClient()
  const state = await getProdeLockState(admin)
  const nextValue = state.locked ? 'unlocked' : 'locked'

  const { error } = await admin
    .from('app_settings')
    .upsert({
      key: 'prode_lock_override',
      value: nextValue,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'key' })

  if (error) throw new Error(error.message)

  revalidateCorePaths()
  revalidatePath('/admin')
}

export async function toggleMaintenanceMode() {
  await requireAdmin()
  const admin = createAdminClient()
  const enabled = await getMaintenanceMode(admin)

  const { error } = await admin
    .from('app_settings')
    .upsert({
      key: 'maintenance_mode',
      value: enabled ? 'off' : 'on',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'key' })

  if (error) throw new Error(error.message)

  revalidateCorePaths()
  revalidatePath('/maintenance')
}

// ─── Test tools (operan sobre resultados de partidos, no sobre predicciones) ──

export async function deactivateParticipant(email: string): Promise<AdminToolResult> {
  try {
    await setAuthorizedEmailActive(email, false)
    return { ok: true, message: 'Participante desactivado.' }
  } catch (error) {
    return adminToolError(error)
  }
}

export async function setParticipantAdminRole(email: string, isAdmin: boolean): Promise<AdminToolResult> {
  try {
    const currentUser = await requireAdmin()
    const normalizedEmail = email.toLowerCase().trim()
    if (!normalizedEmail) throw new Error('Email inválido')

    const admin = createAdminClient()
    const { data: profile, error: profileErr } = await admin
      .from('profiles')
      .select('id, email, is_admin')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (profileErr) throw new Error(profileErr.message)
    if (!profile) throw new Error('El participante todavía no tiene perfil. Primero debe ingresar con ese correo.')
    if (!isAdmin && profile.id === currentUser.id) {
      throw new Error('No podés quitarte tu propio rol admin desde esta pantalla.')
    }

    const { error } = await admin
      .from('profiles')
      .update({ is_admin: isAdmin, updated_at: new Date().toISOString() })
      .eq('id', profile.id)

    if (error) throw new Error(error.message)

    revalidatePath('/admin')
    revalidatePath('/admin/whitelist')
    return {
      ok: true,
      message: isAdmin ? 'Rol admin otorgado.' : 'Rol admin quitado.',
    }
  } catch (error) {
    return adminToolError(error)
  }
}

const ALL_STAGES = ['group', 'round_of_32', 'round_of_16', 'quarter', 'semi', 'final', 'third_place']
const KNOCKOUT_STAGES: Match['stage'][] = ['round_of_32', 'round_of_16', 'quarter', 'semi', 'third_place', 'final']

function randomGroupScore() {
  return Math.floor(Math.random() * 5)
}

function shuffle<T>(items: T[]) {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = copy[i]
    copy[i] = copy[j]
    copy[j] = tmp
  }
  return copy
}

function buildResolvableGroupUpdates(groupMatches: Match[]) {
  const updates: Array<{ id: string; home_score: number; away_score: number }> = []
  const byGroup: Record<string, Match[]> = {}

  for (const match of groupMatches) {
    if (!match.group) continue
    if (!byGroup[match.group]) byGroup[match.group] = []
    byGroup[match.group].push(match)
  }

  for (const [groupIndex, matches] of Object.values(byGroup).entries()) {
    const teams = Array.from(new Set(matches.flatMap((match) => [match.home_team, match.away_team])))
    const rank = new Map(shuffle(teams).map((team, index) => [team, index]))

    for (const match of matches) {
      const homeRank = rank.get(match.home_team) ?? 99
      const awayRank = rank.get(match.away_team) ?? 99
      const homeWins = homeRank < awayRank
      const bestRank = Math.min(homeRank, awayRank)
      const worstRank = Math.max(homeRank, awayRank)
      const winnerGoals =
        bestRank === 0 && worstRank === 2 ? 4 + groupIndex :
        bestRank === 1 && worstRank === 2 ? 3 + groupIndex :
        bestRank === 2 && worstRank === 3 ? 2 + groupIndex :
        bestRank === 0 && worstRank === 3 ? 5 :
        bestRank === 1 && worstRank === 3 ? 4 :
        3
      updates.push({
        id: match.id,
        home_score: homeWins ? winnerGoals : 0,
        away_score: homeWins ? 0 : winnerGoals,
      })
    }
  }

  return updates
}

function randomKnockoutScore() {
  let home = randomGroupScore()
  let away = randomGroupScore()
  if (home === away) away = (away + 1) % 5
  return { home_score: home, away_score: away }
}

function isResolvedTeamName(name: string) {
  return !(
    /^(\d)(?:Â°|°)\s+Grupo\s+[A-L]/.test(name) ||
    /^3(?:Â°|°)\s+Grupo\s+[A-L]/.test(name) ||
    name.startsWith('Ganador') ||
    name.startsWith('Perdedor') ||
    name.includes('Mejor 3')
  )
}

function buildOfficialScoreMap(matches: Match[]): ScoreMap {
  return Object.fromEntries(
    matches
      .filter((m) => m.home_score != null && m.away_score != null)
      .map((m) => [m.id, { home_score: m.home_score!, away_score: m.away_score! }])
  )
}

function applyMatchUpdates(matches: Match[], updates: Array<{ id: string; home_score: number; away_score: number }>) {
  const byId = new Map(updates.map((u) => [u.id, u]))
  return matches.map((match) => {
    const update = byId.get(match.id)
    if (!update) return match
    return {
      ...match,
      home_score: update.home_score,
      away_score: update.away_score,
      status: 'finished' as const,
    }
  })
}

function resolveRoundTeams(match: Match, workingMatches: Match[]) {
  const groupMatches = workingMatches.filter((m) => m.stage === 'group')
  const knockoutMatches = workingMatches.filter((m) => m.stage !== 'group')
  const scoreMap = buildOfficialScoreMap(workingMatches)
  const standings = computeAllStandings(groupMatches, scoreMap)
  const bestThirdsGroups = computeBestThirdsGroups(groupMatches, scoreMap)
  const thirdSlotAssignment = assignBestThirdsToSlots(bestThirdsGroups)
  const knockoutMap = buildKnockoutMap(knockoutMatches)

  const home = resolveTeamFull(match.home_team, standings, knockoutMap, scoreMap, {}, 0, bestThirdsGroups, thirdSlotAssignment)
  const away = resolveTeamFull(match.away_team, standings, knockoutMap, scoreMap, {}, 0, bestThirdsGroups, thirdSlotAssignment)
  return { home, away }
}

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

    revalidateCorePaths()
    return { ok: true, message: 'Resultados borrados. Todos los partidos volvieron a pendiente.' }
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

    let workingMatches = (matches as Match[]).sort((a, b) => {
      const stageDiff = ALL_STAGES.indexOf(a.stage) - ALL_STAGES.indexOf(b.stage)
      if (stageDiff !== 0) return stageDiff
      return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
    })
    const groupMatches = workingMatches.filter((m) => m.stage === 'group')
    const allUpdates: Array<{ id: string; home_score: number; away_score: number; status: 'finished' }> = []
    let groupUpdates: Array<{ id: string; home_score: number; away_score: number }> = []

    groupUpdates = buildResolvableGroupUpdates(groupMatches)

    workingMatches = applyMatchUpdates(workingMatches, groupUpdates)
    const pendingTiebreakers = getPendingGroupTiebreakers(groupMatches, buildOfficialScoreMap(workingMatches))
    if (pendingTiebreakers.length > 0) {
      throw new Error(`No se pudo completar aleatorio sin desempates pendientes: ${pendingTiebreakers.join(', ')}.`)
    }
    allUpdates.push(...groupUpdates.map((u) => ({ ...u, status: 'finished' as const })))

    for (const stage of KNOCKOUT_STAGES) {
      const stageMatches = workingMatches.filter((m) => m.stage === stage)
      if (stageMatches.length === 0) continue

      const stageUpdates: Array<{ id: string; home_score: number; away_score: number }> = []
      for (const match of stageMatches) {
        const { home, away } = resolveRoundTeams(match, workingMatches)
        if (!isResolvedTeamName(home) || !isResolvedTeamName(away)) {
          throw new Error(`No se pudo completar ${stage}: falta resolver ${home} vs ${away}.`)
        }
        stageUpdates.push({ id: match.id, ...randomKnockoutScore() })
      }

      workingMatches = applyMatchUpdates(workingMatches, stageUpdates)
      allUpdates.push(...stageUpdates.map((u) => ({ ...u, status: 'finished' as const })))
    }

    for (const update of allUpdates) {
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

    await recomputeAllPredictionPoints(admin)

    revalidateCorePaths()
    return {
      ok: true,
      message: `${allUpdates.length} partidos del Mundial completados con resultados aleatorios.`,
      count: allUpdates.length,
    }
  } catch (error) {
    return adminToolError(error)
  }
}

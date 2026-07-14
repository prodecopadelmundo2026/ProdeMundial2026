'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  isSpecialAwardCategory,
  normalizeSpecialAwardText,
  SPECIAL_AWARDS_TOURNAMENT_KEY,
  type SpecialAwardCategory,
} from '@/lib/special-awards'

export type SpecialAwardActionResult = {
  ok: boolean
  message: string
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>
type NormalizationStatus = 'matched' | 'no_match' | 'review'
type ResultStatus = 'draft' | 'confirmed' | 'locked'
type WinnerMode = 'candidate' | 'unchosen_existing' | 'unchosen_new'

type SpecialBetRow = {
  user_id: string
  balon: string | null
  bota: string | null
  guante: string | null
}

type NormalizationRow = {
  raw_normalized: string
  player_id: string | null
  status: NormalizationStatus
}

function result(ok: boolean, message: string): SpecialAwardActionResult {
  return { ok, message }
}

function actionError(error: unknown) {
  return result(false, error instanceof Error ? error.message : 'No se pudo completar la acción.')
}

function revalidateAdminSpecialAwards() {
  revalidatePath('/admin')
  revalidatePath('/admin/premios-especiales')
}

async function requireAdmin(supabase: SupabaseServerClient) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado.')

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (error) throw new Error(error.message)
  if (!profile?.is_admin) throw new Error('Sin permisos de administrador.')

  return user
}

function readRequiredString(formData: FormData, key: string, label: string) {
  const value = String(formData.get(key) ?? '').trim()
  if (!value) throw new Error(`${label} es obligatorio.`)
  return value
}

function readOptionalString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? '').trim()
  return value || null
}

function readCategory(formData: FormData) {
  const category = String(formData.get('category') ?? '').trim()
  if (!isSpecialAwardCategory(category)) throw new Error('Categoría inválida.')
  return category
}

function readInteger(formData: FormData, key: string, label: string) {
  const raw = String(formData.get(key) ?? '').trim()
  if (!/^\d+$/.test(raw)) throw new Error(`${label} debe ser un entero mayor o igual a 0.`)
  const value = Number(raw)
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${label} debe ser un entero mayor o igual a 0.`)
  return value
}

function readWinnerMode(formData: FormData): WinnerMode {
  const mode = String(formData.get('winner_mode') ?? '').trim()
  if (mode === 'candidate' || mode === 'unchosen_existing' || mode === 'unchosen_new') return mode
  throw new Error('Modo de ganador inválido.')
}

function validateOptionalUrl(value: string | null) {
  if (!value) return null
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error('La URL de fuente no es válida.')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('La URL de fuente debe usar http o https.')
  }
  return url.toString()
}

function rawValueForCategory(row: SpecialBetRow, category: SpecialAwardCategory) {
  return row[category]
}

async function findPlayerByNormalizedName(supabase: SupabaseServerClient, normalizedName: string) {
  const { data, error } = await supabase
    .from('players')
    .select('id, display_name')
    .eq('normalized_name', normalizedName)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as { id: string; display_name: string } | null
}

async function ensurePlayerExists(supabase: SupabaseServerClient, playerId: string) {
  const { data, error } = await supabase
    .from('players')
    .select('id')
    .eq('id', playerId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data?.id) throw new Error('El jugador seleccionado no existe.')
}

async function createPlayerStrict(
  supabase: SupabaseServerClient,
  input: {
    displayName: string
    countryName: string
    countryCode: string
  }
) {
  const normalizedName = normalizeSpecialAwardText(input.displayName)
  if (!normalizedName) throw new Error('El nombre del jugador es obligatorio.')

  const existing = await findPlayerByNormalizedName(supabase, normalizedName)
  if (existing) throw new Error('Ya existe un jugador con ese nombre.')

  const { data, error } = await supabase
    .from('players')
    .insert({
      display_name: input.displayName,
      normalized_name: normalizedName,
      country_name: input.countryName,
      country_code: input.countryCode,
    })
    .select('id')
    .single()

  if (error?.code === '23505') throw new Error('Ya existe un jugador con ese nombre.')
  if (error) throw new Error(error.message)
  return (data as { id: string }).id
}

async function updatePlayerStrict(
  supabase: SupabaseServerClient,
  input: {
    playerId: string
    displayName: string
    countryName: string
    countryCode: string
  }
) {
  const normalizedName = normalizeSpecialAwardText(input.displayName)
  if (!normalizedName) throw new Error('El nombre del jugador es obligatorio.')

  const existing = await findPlayerByNormalizedName(supabase, normalizedName)
  if (existing && existing.id !== input.playerId) throw new Error('Ya existe un jugador con ese nombre.')

  const { data, error } = await supabase
    .from('players')
    .update({
      display_name: input.displayName,
      normalized_name: normalizedName,
      country_name: input.countryName,
      country_code: input.countryCode,
    })
    .eq('id', input.playerId)
    .select('id')
    .single()

  if (error?.code === '23505') throw new Error('Ya existe un jugador con ese nombre.')

  if (error) throw new Error(error.message)
  if (!data?.id) throw new Error('No se encontró el jugador para editar.')
  return data.id as string
}

async function savePlayerStrict(
  supabase: SupabaseServerClient,
  input: {
    playerId?: string | null
    displayName: string
    countryName: string
    countryCode: string
  }
) {
  if (input.playerId) {
    return updatePlayerStrict(supabase, {
      playerId: input.playerId,
      displayName: input.displayName,
      countryName: input.countryName,
      countryCode: input.countryCode,
    })
  }
  return createPlayerStrict(supabase, input)
}

async function getGoalsStatTypeId(supabase: SupabaseServerClient) {
  const { data, error } = await supabase
    .from('player_stat_types')
    .select('id')
    .eq('key', 'goals')
    .single()

  if (error) throw new Error(error.message)
  if (!data?.id) throw new Error('No se encontró el tipo de estadística goals.')
  return data.id as string
}

async function getCurrentRawGroup(
  supabase: SupabaseServerClient,
  category: SpecialAwardCategory,
  rawNormalized: string
) {
  const { data, error } = await supabase
    .from('special_bets')
    .select('user_id, balon, bota, guante')

  if (error) throw new Error(error.message)

  const variants = new Map<string, Set<string>>()
  for (const row of (data ?? []) as SpecialBetRow[]) {
    const raw = String(rawValueForCategory(row, category) ?? '').trim()
    if (!raw) continue
    if (normalizeSpecialAwardText(raw) !== rawNormalized) continue
    const users = variants.get(raw) ?? new Set<string>()
    users.add(row.user_id)
    variants.set(raw, users)
  }

  if (variants.size === 0) return null
  const [rawValue] = [...variants.entries()].sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0], 'es'))[0]
  const userIds = new Set([...variants.values()].flatMap((users) => [...users]))
  return { rawValue, count: userIds.size }
}

async function getCandidateCounts(supabase: SupabaseServerClient, category: SpecialAwardCategory) {
  const { data: specialBets, error: betsError } = await supabase
    .from('special_bets')
    .select('user_id, balon, bota, guante')

  if (betsError) throw new Error(betsError.message)

  const groups = new Map<string, Set<string>>()
  for (const row of (specialBets ?? []) as SpecialBetRow[]) {
    const raw = String(rawValueForCategory(row, category) ?? '').trim()
    if (!raw) continue
    const normalized = normalizeSpecialAwardText(raw)
    if (!normalized) continue
    const users = groups.get(normalized) ?? new Set<string>()
    users.add(row.user_id)
    groups.set(normalized, users)
  }

  if (groups.size === 0) return new Map<string, number>()

  const { data: normalizations, error: normalizationsError } = await supabase
    .from('special_bet_normalizations')
    .select('raw_normalized, player_id, status')
    .eq('tournament_key', SPECIAL_AWARDS_TOURNAMENT_KEY)
    .eq('category', category)
    .in('raw_normalized', [...groups.keys()])

  if (normalizationsError) throw new Error(normalizationsError.message)

  const counts = new Map<string, number>()
  for (const row of (normalizations ?? []) as NormalizationRow[]) {
    if (row.status !== 'matched' || !row.player_id) continue
    const count = groups.get(row.raw_normalized)?.size ?? 0
    if (count <= 0) continue
    counts.set(row.player_id, (counts.get(row.player_id) ?? 0) + count)
  }

  return counts
}

async function getPendingNormalizationCount(supabase: SupabaseServerClient, category: SpecialAwardCategory) {
  const { data: specialBets, error: betsError } = await supabase
    .from('special_bets')
    .select('user_id, balon, bota, guante')

  if (betsError) throw new Error(betsError.message)

  const rawNormalizedValues = new Set<string>()
  for (const row of (specialBets ?? []) as SpecialBetRow[]) {
    const raw = String(rawValueForCategory(row, category) ?? '').trim()
    if (!raw) continue
    const normalized = normalizeSpecialAwardText(raw)
    if (normalized) rawNormalizedValues.add(normalized)
  }

  if (rawNormalizedValues.size === 0) return 0

  const { data: normalizations, error: normalizationsError } = await supabase
    .from('special_bet_normalizations')
    .select('raw_normalized, status')
    .eq('tournament_key', SPECIAL_AWARDS_TOURNAMENT_KEY)
    .eq('category', category)
    .in('raw_normalized', [...rawNormalizedValues])

  if (normalizationsError) throw new Error(normalizationsError.message)

  const reviewed = new Set(
    ((normalizations ?? []) as Array<{ raw_normalized: string; status: NormalizationStatus }>)
      .filter((row) => row.status === 'matched' || row.status === 'no_match')
      .map((row) => row.raw_normalized)
  )

  return [...rawNormalizedValues].filter((value) => !reviewed.has(value)).length
}

async function ensureResultRow(
  supabase: SupabaseServerClient,
  category: SpecialAwardCategory,
  userId: string
) {
  const { data: existing, error: existingError } = await supabase
    .from('special_bet_results')
    .select('id, status')
    .eq('tournament_key', SPECIAL_AWARDS_TOURNAMENT_KEY)
    .eq('category', category)
    .maybeSingle()

  if (existingError) throw new Error(existingError.message)
  if (existing?.status === 'locked') throw new Error('El resultado está bloqueado.')
  if (existing?.id) return existing.id as string

  const { data, error } = await supabase
    .from('special_bet_results')
    .insert({
      tournament_key: SPECIAL_AWARDS_TOURNAMENT_KEY,
      category,
      status: 'draft',
      updated_by: userId,
    })
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  if (!data?.id) throw new Error('No se pudo crear el resultado.')
  return data.id as string
}

async function setResultDraft(supabase: SupabaseServerClient, resultId: string, userId: string) {
  const { data, error } = await supabase
    .from('special_bet_results')
    .update({
      status: 'draft',
      confirmed_at: null,
      confirmed_by: null,
      updated_by: userId,
    })
    .eq('id', resultId)
    .neq('status', 'locked')
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  if (!data?.id) throw new Error('No se pudo volver el resultado a borrador.')
}

async function canDeletePlayer(supabase: SupabaseServerClient, playerId: string) {
  const checks = await Promise.all([
    supabase.from('player_tournament_stat_values').select('id', { count: 'exact', head: true }).eq('player_id', playerId),
    supabase.from('player_aliases').select('id', { count: 'exact', head: true }).eq('player_id', playerId),
    supabase.from('special_bet_normalizations').select('id', { count: 'exact', head: true }).eq('player_id', playerId),
    supabase.from('special_bet_result_winners').select('id', { count: 'exact', head: true }).eq('player_id', playerId),
  ])

  const firstError = checks.find((check) => check.error)?.error
  if (firstError) throw new Error(firstError.message)

  return checks.every((check) => (check.count ?? 0) === 0)
}

async function cleanupNewPlayerIfUnused(supabase: SupabaseServerClient, playerId: string) {
  if (!(await canDeletePlayer(supabase, playerId))) return

  const { data, error } = await supabase
    .from('players')
    .delete()
    .eq('id', playerId)
    .select('id')
    .single()

  if (error) throw new Error(error.message)
  if (!data?.id) throw new Error('No se pudo limpiar el jugador recién creado.')
}

export async function saveGoalScorer(
  _prevState: SpecialAwardActionResult | null,
  formData: FormData
): Promise<SpecialAwardActionResult> {
  try {
    const supabase = await createClient()
    const user = await requireAdmin(supabase)
    const playerId = readOptionalString(formData, 'player_id')
    const displayName = readRequiredString(formData, 'display_name', 'Nombre del jugador')
    const countryName = readRequiredString(formData, 'country_name', 'Selección')
    const countryCode = readRequiredString(formData, 'country_code', 'Código de país')
    const value = readInteger(formData, 'goals', 'Total de goles')
    const sourceNote = readOptionalString(formData, 'source_note')
    const sourceUrl = validateOptionalUrl(readOptionalString(formData, 'source_url'))

    const savedPlayerId = await savePlayerStrict(supabase, {
      playerId,
      displayName,
      countryName,
      countryCode,
    })
    const statTypeId = await getGoalsStatTypeId(supabase)

    if (value === 0) {
      const { error } = await supabase
        .from('player_tournament_stat_values')
        .delete()
        .eq('tournament_key', SPECIAL_AWARDS_TOURNAMENT_KEY)
        .eq('player_id', savedPlayerId)
        .eq('stat_type_id', statTypeId)

      if (error) throw new Error(error.message)
      revalidateAdminSpecialAwards()
      return result(true, 'Jugador guardado con 0 goles.')
    }

    const { error } = await supabase
      .from('player_tournament_stat_values')
      .upsert({
        tournament_key: SPECIAL_AWARDS_TOURNAMENT_KEY,
        player_id: savedPlayerId,
        stat_type_id: statTypeId,
        value,
        source_note: sourceNote,
        source_url: sourceUrl,
        updated_by: user.id,
      }, { onConflict: 'tournament_key,player_id,stat_type_id' })

    if (error) throw new Error(error.message)
    revalidateAdminSpecialAwards()
    return result(true, 'Jugador y goles actualizados.')
  } catch (error) {
    return actionError(error)
  }
}

export async function deletePlayer(
  _prevState: SpecialAwardActionResult | null,
  formData: FormData
): Promise<SpecialAwardActionResult> {
  try {
    const supabase = await createClient()
    await requireAdmin(supabase)
    const playerId = readRequiredString(formData, 'player_id', 'Jugador')

    if (!(await canDeletePlayer(supabase, playerId))) {
      throw new Error('No se puede eliminar: el jugador tiene estadísticas, aliases, normalizaciones o ganadores asociados.')
    }

    const { data, error } = await supabase
      .from('players')
      .delete()
      .eq('id', playerId)
      .select('id')
      .single()

    if (error) throw new Error(error.message)
    if (!data?.id) throw new Error('No se encontró el jugador para eliminar.')

    revalidateAdminSpecialAwards()
    return result(true, 'Jugador eliminado.')
  } catch (error) {
    return actionError(error)
  }
}

export async function saveNormalization(
  _prevState: SpecialAwardActionResult | null,
  formData: FormData
): Promise<SpecialAwardActionResult> {
  try {
    const supabase = await createClient()
    const user = await requireAdmin(supabase)
    const category = readCategory(formData)
    const rawNormalized = normalizeSpecialAwardText(readRequiredString(formData, 'raw_normalized', 'Texto normalizado'))
    const status = String(formData.get('status') ?? '').trim() as NormalizationStatus
    const playerId = readOptionalString(formData, 'player_id')

    if (!['matched', 'no_match', 'review'].includes(status)) throw new Error('Estado inválido.')
    const currentGroup = await getCurrentRawGroup(supabase, category, rawNormalized)
    if (!currentGroup) throw new Error('No existe una elección actual con ese texto.')

    if (status === 'matched') {
      if (!playerId) throw new Error('Seleccioná un jugador canónico.')
      await ensurePlayerExists(supabase, playerId)
    }

    const reviewed = status === 'matched' || status === 'no_match'
    const { error } = await supabase
      .from('special_bet_normalizations')
      .upsert({
        tournament_key: SPECIAL_AWARDS_TOURNAMENT_KEY,
        category,
        raw_value: currentGroup.rawValue,
        raw_normalized: rawNormalized,
        status,
        player_id: status === 'matched' ? playerId : null,
        reviewed_by: reviewed ? user.id : null,
        reviewed_at: reviewed ? new Date().toISOString() : null,
      }, { onConflict: 'tournament_key,category,raw_normalized' })

    if (error) throw new Error(error.message)
    revalidateAdminSpecialAwards()
    return result(true, status === 'matched' ? 'Jugador confirmado.' : status === 'no_match' ? 'Marcado como sin coincidencia.' : 'La variante volvió a quedar pendiente de revisión.')
  } catch (error) {
    return actionError(error)
  }
}

export async function addOfficialWinner(
  _prevState: SpecialAwardActionResult | null,
  formData: FormData
): Promise<SpecialAwardActionResult> {
  let supabaseForCleanup: SupabaseServerClient | null = null
  let createdPlayerId: string | null = null
  let createdWinnerId: string | null = null

  try {
    const supabase = await createClient()
    supabaseForCleanup = supabase
    const user = await requireAdmin(supabase)
    const category = readCategory(formData)
    const mode = readWinnerMode(formData)
    const candidateCounts = await getCandidateCounts(supabase, category)
    let playerId: string | null = null

    if (mode === 'candidate') {
      playerId = readRequiredString(formData, 'player_id', 'Ganador')
      if (!candidateCounts.has(playerId)) throw new Error('El jugador no es candidato revisado para esta categoría.')
    } else if (mode === 'unchosen_existing') {
      playerId = readRequiredString(formData, 'player_id', 'Ganador')
      await ensurePlayerExists(supabase, playerId)
      if (candidateCounts.has(playerId)) throw new Error('Ese jugador ya es candidato de esta categoría.')
    } else {
      const displayName = readRequiredString(formData, 'new_display_name', 'Nombre del ganador')
      const normalizedName = normalizeSpecialAwardText(displayName)
      if (!normalizedName) throw new Error('El nombre del jugador es obligatorio.')
      const existing = await findPlayerByNormalizedName(supabase, normalizedName)
      if (existing && candidateCounts.has(existing.id)) throw new Error('Ese jugador ya es candidato de esta categoría.')

      playerId = await createPlayerStrict(supabase, {
        displayName,
        countryName: readRequiredString(formData, 'new_country_name', 'Selección'),
        countryCode: readRequiredString(formData, 'new_country_code', 'Código de país'),
      })
      createdPlayerId = playerId
    }

    const resultId = await ensureResultRow(supabase, category, user.id)
    const { data: winner, error } = await supabase
      .from('special_bet_result_winners')
      .insert({
        special_bet_result_id: resultId,
        player_id: playerId,
        created_by: user.id,
      })
      .select('id')
      .single()

    if (error) {
      if (error.code === '23505') throw new Error('Ese jugador ya está cargado como ganador de este premio.')
      throw new Error(error.message)
    }
    if (!winner?.id) throw new Error('No se pudo agregar el ganador.')
    createdWinnerId = winner.id as string

    await setResultDraft(supabase, resultId, user.id)

    revalidateAdminSpecialAwards()
    return result(true, 'Ganador oficial agregado en borrador.')
  } catch (error) {
    if (supabaseForCleanup && createdWinnerId) {
      try {
        const { data: cleanedWinner, error: cleanupError } = await supabaseForCleanup
          .from('special_bet_result_winners')
          .delete()
          .eq('id', createdWinnerId)
          .select('id')
          .single()

        if (cleanupError || !cleanedWinner?.id) {
          console.error('No se pudo compensar el ganador oficial recien creado.', cleanupError)
        }
      } catch (cleanupError) {
        console.error('No se pudo compensar el ganador oficial recien creado.', cleanupError)
      }
    }

    if (supabaseForCleanup && createdPlayerId) {
      try {
        await cleanupNewPlayerIfUnused(supabaseForCleanup, createdPlayerId)
      } catch (cleanupError) {
        console.error('No se pudo compensar el jugador recien creado.', cleanupError)
        // Mantener el error original.
      }
    }
    return actionError(error)
  }
}

export async function removeOfficialWinner(
  _prevState: SpecialAwardActionResult | null,
  formData: FormData
): Promise<SpecialAwardActionResult> {
  try {
    const supabase = await createClient()
    const user = await requireAdmin(supabase)
    const winnerId = readRequiredString(formData, 'winner_id', 'Ganador')
    const resultId = readRequiredString(formData, 'result_id', 'Resultado')

    const { data: awardResult, error: resultError } = await supabase
      .from('special_bet_results')
      .select('id, status, confirmed_at, confirmed_by, updated_by')
      .eq('id', resultId)
      .eq('tournament_key', SPECIAL_AWARDS_TOURNAMENT_KEY)
      .single()

    if (resultError) throw new Error(resultError.message)
    if (!awardResult?.id) throw new Error('No se encontró el resultado.')
    if ((awardResult.status as ResultStatus) === 'locked') throw new Error('El resultado está bloqueado.')

    const { data: existingWinner, error: winnerError } = await supabase
      .from('special_bet_result_winners')
      .select('id')
      .eq('id', winnerId)
      .eq('special_bet_result_id', resultId)
      .single()

    if (winnerError) throw new Error(winnerError.message)
    if (!existingWinner?.id) throw new Error('El ganador no pertenece a este resultado.')

    await setResultDraft(supabase, resultId, user.id)

    const { data: deletedWinner, error: deleteError } = await supabase
      .from('special_bet_result_winners')
      .delete()
      .eq('id', winnerId)
      .eq('special_bet_result_id', resultId)
      .select('id')
      .single()

    if (deleteError || !deletedWinner?.id) {
      try {
        const { data: restoredResult, error: restoreError } = await supabase
          .from('special_bet_results')
          .update({
            status: awardResult.status,
            confirmed_at: awardResult.confirmed_at,
            confirmed_by: awardResult.confirmed_by,
            updated_by: awardResult.updated_by,
          })
          .eq('id', resultId)
          .select('id')
          .single()

        if (restoreError || !restoredResult?.id) {
          console.error('No se pudo restaurar el estado anterior del resultado.', restoreError)
        }
      } catch (restoreError) {
        console.error('No se pudo restaurar el estado anterior del resultado.', restoreError)
      }

      if (deleteError) throw new Error(deleteError.message)
      throw new Error('No se pudo quitar el ganador.')
    }

    revalidateAdminSpecialAwards()
    return result(true, 'Ganador quitado y resultado vuelto a borrador.')
  } catch (error) {
    return actionError(error)
  }
}

export async function confirmOfficialResult(
  _prevState: SpecialAwardActionResult | null,
  formData: FormData
): Promise<SpecialAwardActionResult> {
  try {
    const supabase = await createClient()
    const user = await requireAdmin(supabase)
    const category = readCategory(formData)

    if (await getPendingNormalizationCount(supabase, category)) {
      throw new Error('No se puede confirmar: todavía hay elecciones pendientes de normalizar.')
    }

    const { data: awardResult, error: resultError } = await supabase
      .from('special_bet_results')
      .select('id, status')
      .eq('tournament_key', SPECIAL_AWARDS_TOURNAMENT_KEY)
      .eq('category', category)
      .maybeSingle()

    if (resultError) throw new Error(resultError.message)
    if (!awardResult?.id) throw new Error('Cargá al menos un ganador antes de confirmar.')
    if ((awardResult.status as ResultStatus) === 'locked') throw new Error('El resultado está bloqueado.')

    if ((awardResult.status as ResultStatus) === 'confirmed') throw new Error('El resultado ya está confirmado.')

    const { count, error: countError } = await supabase
      .from('special_bet_result_winners')
      .select('id', { count: 'exact', head: true })
      .eq('special_bet_result_id', awardResult.id)

    if (countError) throw new Error(countError.message)
    if (!count) throw new Error('Cargá al menos un ganador antes de confirmar.')

    const { data, error } = await supabase
      .from('special_bet_results')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        confirmed_by: user.id,
        updated_by: user.id,
      })
      .eq('id', awardResult.id)
      .eq('status', 'draft')
      .select('id')
      .maybeSingle()

    if (error) throw new Error(error.message)
    if (!data?.id) throw new Error('El resultado ya no está disponible para confirmar.')

    revalidateAdminSpecialAwards()
    return result(true, 'Resultado oficial confirmado. No se modificaron puntos ni ranking.')
  } catch (error) {
    return actionError(error)
  }
}

export async function returnOfficialResultToDraft(
  _prevState: SpecialAwardActionResult | null,
  formData: FormData
): Promise<SpecialAwardActionResult> {
  try {
    const supabase = await createClient()
    const user = await requireAdmin(supabase)
    const category = readCategory(formData)

    const { data, error } = await supabase
      .from('special_bet_results')
      .update({
        status: 'draft',
        confirmed_at: null,
        confirmed_by: null,
        updated_by: user.id,
      })
      .eq('tournament_key', SPECIAL_AWARDS_TOURNAMENT_KEY)
      .eq('category', category)
      .neq('status', 'locked')
      .select('id')
      .single()

    if (error) throw new Error(error.message)
    if (!data?.id) throw new Error('No se encontró un resultado editable para volver a borrador.')

    revalidateAdminSpecialAwards()
    return result(true, 'Resultado vuelto a borrador.')
  } catch (error) {
    return actionError(error)
  }
}

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { assertProdeOpen, getProdeLockState } from '@/lib/prode-lock'
import { findAffectedDownstreamVirtualPredictionIds } from '@/lib/bracket'
import type { Match } from '@/types'

type PredictionInput = {
  matchId: string
  homeScore: number
  awayScore: number
  tiebreakerTeam?: string | null
}

type VirtualKnockoutPredictionInput = {
  matchId: string
  homeScore: number
  awayScore: number
  tiebreakerTeam?: string | null
}

type TiebreakerInput = {
  key: string
  team: string | null
}

type FullProdeInput = {
  realPredictions: PredictionInput[]
  virtualPredictions: VirtualKnockoutPredictionInput[]
  tiebreakers: TiebreakerInput[]
  deleteRealMatchIds?: string[]
  deleteVirtualMatchIds?: string[]
}

type SaveVirtualResult = {
  saved: number
  deletedAffected: number
}

export type SpecialBetsValues = {
  balon: string
  bota: string
  guante: string
}

const CLOSED_COMPLETION_MESSAGE = 'El prode ya está cerrado. Solo podés completar datos faltantes, no modificar pronósticos ya cargados.'

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return String(error)
}

function cleanName(value: unknown) {
  return String(value ?? '').replace(/[^a-zA-ZÀ-ÿ\s]/g, '').trim().slice(0, 80)
}

function assertValidScore(score: number) {
  if (!Number.isInteger(score) || score < 0 || score > 99) {
    throw new Error('Goles invalidos')
  }
}

function assertUuid(value: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new Error('Partido invalido')
  }
}

function assertValidVirtualMatchId(matchId: string) {
  if (!/^virtual-p(7[3-9]|8[0-9]|9[0-9]|10[0-4])$/.test(matchId)) {
    throw new Error('Partido virtual invalido')
  }
}

function cleanTiebreakerKey(value: string) {
  const key = value.trim().slice(0, 160)
  if (!key) throw new Error('Desempate invalido')
  return key
}

function cleanTiebreakerTeam(value: string | null) {
  const team = String(value ?? '').trim().slice(0, 220)
  return team || null
}

function virtualMatchStage(matchId: string) {
  const pNum = Number(matchId.replace('virtual-p', ''))
  if (pNum <= 88) return 'round_of_32'
  if (pNum <= 96) return 'round_of_16'
  if (pNum <= 100) return 'quarter'
  if (pNum <= 102) return 'semi'
  if (pNum === 103) return 'third_place'
  return 'final'
}

export async function saveVirtualKnockoutPredictions(predictions: VirtualKnockoutPredictionInput[]) {
  if (!predictions.length) return { saved: 0, deletedAffected: 0 }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const prodeLock = await getProdeLockState(supabase)

  const payload = predictions.map((prediction) => {
    assertValidVirtualMatchId(prediction.matchId)
    assertValidScore(prediction.homeScore)
    assertValidScore(prediction.awayScore)
    return {
      user_id: user.id,
      virtual_match_id: prediction.matchId,
      home_score: prediction.homeScore,
      away_score: prediction.awayScore,
      tiebreaker_team: prediction.tiebreakerTeam ?? null,
      updated_at: new Date().toISOString(),
    }
  })

  if (prodeLock.locked) {
    const [
      existingResponse,
      allVirtualResponse,
      realPredictionsResponse,
      matchesResponse,
      tiebreakersResponse,
    ] = await Promise.all([
      supabase
        .from('virtual_knockout_predictions')
        .select('virtual_match_id, home_score, away_score, tiebreaker_team')
        .eq('user_id', user.id)
        .in('virtual_match_id', payload.map((prediction) => prediction.virtual_match_id)),
      supabase
        .from('virtual_knockout_predictions')
        .select('virtual_match_id, home_score, away_score, tiebreaker_team')
        .eq('user_id', user.id),
      supabase
        .from('predictions')
        .select('match_id, home_score, away_score, tiebreaker_team')
        .eq('user_id', user.id),
      supabase
        .from('matches')
        .select('id, home_team, away_team, home_score, away_score, scheduled_at, locked_at, stage, group, status, created_at'),
      supabase
        .from('user_prediction_tiebreakers')
        .select('tiebreaker_key, team')
        .eq('user_id', user.id),
    ])

    if (existingResponse.error) throw new Error(existingResponse.error.message)
    if (allVirtualResponse.error) throw new Error(allVirtualResponse.error.message)
    if (realPredictionsResponse.error) throw new Error(realPredictionsResponse.error.message)
    if (matchesResponse.error) throw new Error(matchesResponse.error.message)
    if (tiebreakersResponse.error) throw new Error(tiebreakersResponse.error.message)

    const existingRows = existingResponse.data ?? []
    const allVirtualRows = allVirtualResponse.data ?? []
    const realPredictionRows = realPredictionsResponse.data ?? []
    const allMatches = (matchesResponse.data ?? []) as Match[]
    const groupMatches = allMatches.filter((match) => match.group)
    const knockoutMatches = allMatches.filter((match) => !match.group)
    const beforePredMap: Record<string, { home_score: number; away_score: number }> = {}
    const beforeTiebreakerMap: Record<string, string> = {}

    for (const prediction of realPredictionRows) {
      beforePredMap[prediction.match_id] = {
        home_score: prediction.home_score,
        away_score: prediction.away_score,
      }
      if (prediction.tiebreaker_team) beforeTiebreakerMap[prediction.match_id] = prediction.tiebreaker_team
    }
    for (const prediction of allVirtualRows) {
      beforePredMap[prediction.virtual_match_id] = {
        home_score: prediction.home_score,
        away_score: prediction.away_score,
      }
      if (prediction.tiebreaker_team) beforeTiebreakerMap[prediction.virtual_match_id] = prediction.tiebreaker_team
    }
    for (const tiebreaker of tiebreakersResponse.data ?? []) {
      if (tiebreaker.team) beforeTiebreakerMap[tiebreaker.tiebreaker_key] = tiebreaker.team
    }

    const afterPredMap = { ...beforePredMap }
    const afterTiebreakerMap = { ...beforeTiebreakerMap }
    const existingVirtualMatchIds = new Set(allVirtualRows.map((row) => row.virtual_match_id))
    const changedMatchIds: string[] = []

    const existingByMatch = new Map(existingRows.map((row) => [row.virtual_match_id, row]))
    let savedCount = 0

    for (const prediction of payload) {
      const existing = existingByMatch.get(prediction.virtual_match_id)
      const nextTiebreaker = cleanTiebreakerTeam(prediction.tiebreaker_team)
      if (prediction.home_score === prediction.away_score && !nextTiebreaker) {
        throw new Error('Elegí quién pasa por desempate antes de guardar.')
      }

      if (!existing) {
        const { data: virtualIsOpen, error: virtualIsOpenError } = await supabase.rpc(
          'virtual_knockout_prediction_is_open',
          { p_virtual_match_id: prediction.virtual_match_id },
        )
        if (virtualIsOpenError) throw new Error(virtualIsOpenError.message)
        if (!virtualIsOpen) throw new Error(CLOSED_COMPLETION_MESSAGE)

        const { count, error } = await supabase
          .from('virtual_knockout_predictions')
          .insert(prediction, { count: 'exact' })

        if (error) throw new Error(error.message)
        if ((count ?? 0) !== 1) throw new Error(CLOSED_COMPLETION_MESSAGE)
        afterPredMap[prediction.virtual_match_id] = {
          home_score: prediction.home_score,
          away_score: prediction.away_score,
        }
        if (nextTiebreaker) afterTiebreakerMap[prediction.virtual_match_id] = nextTiebreaker
        changedMatchIds.push(prediction.virtual_match_id)
        savedCount += 1
        continue
      }

      if (existing.home_score !== prediction.home_score || existing.away_score !== prediction.away_score) {
        throw new Error(CLOSED_COMPLETION_MESSAGE)
      }

      if (existing.tiebreaker_team) {
        if (existing.tiebreaker_team !== nextTiebreaker) throw new Error(CLOSED_COMPLETION_MESSAGE)
        continue
      }
      if (!nextTiebreaker) continue
      if (existing.home_score !== existing.away_score) throw new Error(CLOSED_COMPLETION_MESSAGE)

      const { count, error } = await supabase
        .from('virtual_knockout_predictions')
        .update({ tiebreaker_team: nextTiebreaker, updated_at: new Date().toISOString() }, { count: 'exact' })
        .eq('user_id', user.id)
        .eq('virtual_match_id', prediction.virtual_match_id)

      if (error) throw new Error(error.message)
      if ((count ?? 0) !== 1) throw new Error(CLOSED_COMPLETION_MESSAGE)
      afterTiebreakerMap[prediction.virtual_match_id] = nextTiebreaker
      changedMatchIds.push(prediction.virtual_match_id)
      savedCount += 1
    }

    const affectedMatchIds = changedMatchIds.length
      ? findAffectedDownstreamVirtualPredictionIds({
          changedMatchIds,
          existingVirtualMatchIds,
          groupMatches,
          knockoutMatches,
          beforePredMap,
          afterPredMap,
          beforeTiebreakerMap,
          afterTiebreakerMap,
        })
      : []

    let deletedAffected = 0
    if (affectedMatchIds.length) {
      const { count, error } = await supabase
        .from('virtual_knockout_predictions')
        .delete({ count: 'exact' })
        .eq('user_id', user.id)
        .in('virtual_match_id', affectedMatchIds)

      if (error) throw new Error(error.message)
      deletedAffected = count ?? 0
    }

    revalidatePath('/mi-prode')
    revalidatePath('/ranking')
    revalidatePath(`/ranking/${user.id}`)
    return { saved: savedCount, deletedAffected }
  }

  const hasDrawWithoutTiebreaker = payload.some(
    (prediction) => prediction.home_score === prediction.away_score && !cleanTiebreakerTeam(prediction.tiebreaker_team)
  )
  if (hasDrawWithoutTiebreaker) {
    throw new Error('Elegí quién pasa por desempate antes de guardar.')
  }

  console.info('[mi-prode.saveVirtualKnockoutPredictions] payload', {
    userId: user.id,
    count: payload.length,
    first: payload[0] ?? null,
  })

  const { error } = await supabase
    .from('virtual_knockout_predictions')
    .upsert(payload, { onConflict: 'user_id,virtual_match_id' })

  if (error) throw new Error(error.message)
  const { count, error: verifyError } = await supabase
    .from('virtual_knockout_predictions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .in('virtual_match_id', payload.map((prediction) => prediction.virtual_match_id))

  if (verifyError) throw new Error(verifyError.message)
  if ((count ?? 0) < payload.length) {
    throw new Error(`No se pudo verificar el guardado de eliminatorias (${count ?? 0}/${payload.length}).`)
  }
  console.info('[mi-prode.saveVirtualKnockoutPredictions] verified', { userId: user.id, count })
  revalidatePath('/mi-prode')
  revalidatePath('/ranking')
  revalidatePath(`/ranking/${user.id}`)
  return { saved: payload.length, deletedAffected: 0 }
}

export async function saveRealPredictions(predictions: PredictionInput[]) {
  if (!predictions.length) return 0
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const prodeLock = await getProdeLockState(supabase)

  const matchIds = [...new Set(predictions.map((prediction) => {
    assertUuid(prediction.matchId)
    assertValidScore(prediction.homeScore)
    assertValidScore(prediction.awayScore)
    return prediction.matchId
  }))]

  if (prodeLock.locked) {
    const { data, error } = await supabase.rpc('save_predictions', {
      p_predictions: predictions.map((prediction) => ({
        match_id: prediction.matchId,
        home_score: prediction.homeScore,
        away_score: prediction.awayScore,
        tiebreaker_team: prediction.tiebreakerTeam ?? null,
      })),
    })

    if (error) throw new Error(error.message)
    revalidatePath('/')
    revalidatePath('/fixture')
    revalidatePath('/mi-prode')
    revalidatePath('/ranking')
    revalidatePath(`/ranking/${user.id}`)
    return data ?? predictions.length
  }

  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select('id, locked_at, status')
    .in('id', matchIds)

  if (matchesError) throw new Error(matchesError.message)
  const now = new Date()
  const openIds = new Set(
    (matches ?? [])
      .filter((match) => match.status === 'upcoming' && now < new Date(match.locked_at))
      .map((match) => match.id)
  )

  const payload = predictions
    .filter((prediction) => openIds.has(prediction.matchId))
    .map((prediction) => ({
      user_id: user.id,
      match_id: prediction.matchId,
      home_score: prediction.homeScore,
      away_score: prediction.awayScore,
      tiebreaker_team: prediction.tiebreakerTeam ?? null,
      points: null,
      updated_at: new Date().toISOString(),
    }))

  if (!payload.length) throw new Error('No hay predicciones abiertas para guardar')

  console.info('[mi-prode.saveRealPredictions] payload', {
    userId: user.id,
    requested: predictions.length,
    open: payload.length,
    first: payload[0] ?? null,
  })

  const { error } = await supabase
    .from('predictions')
    .upsert(payload, { onConflict: 'user_id,match_id' })

  if (error) throw new Error(error.message)

  const { count, error: verifyError } = await supabase
    .from('predictions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .in('match_id', payload.map((prediction) => prediction.match_id))

  if (verifyError) throw new Error(verifyError.message)
  if ((count ?? 0) < payload.length) {
    throw new Error(`No se pudo verificar el guardado de grupos/eliminatorias (${count ?? 0}/${payload.length}).`)
  }

  console.info('[mi-prode.saveRealPredictions] verified', { userId: user.id, count })
  revalidatePath('/')
  revalidatePath('/fixture')
  revalidatePath('/mi-prode')
  revalidatePath('/ranking')
  revalidatePath(`/ranking/${user.id}`)
  return payload.length
}

export async function deleteVirtualKnockoutPredictionsByStages(stages: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  await assertProdeOpen(supabase)

  const stageSet = new Set(stages.filter(Boolean))
  if (!stageSet.size) return 0

  const virtualMatchIds = Array.from({ length: 32 }, (_, index) => `virtual-p${index + 73}`)
    .filter((matchId) => stageSet.has(virtualMatchStage(matchId)))
  if (!virtualMatchIds.length) return 0

  const { count, error } = await supabase
    .from('virtual_knockout_predictions')
    .delete({ count: 'exact' })
    .eq('user_id', user.id)
    .in('virtual_match_id', virtualMatchIds)

  if (error) throw new Error(error.message)
  revalidatePath('/mi-prode')
  return count ?? 0
}

export async function deleteVirtualKnockoutPredictionsByMatchIds(matchIds: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  await assertProdeOpen(supabase)

  const ids = [...new Set(matchIds.filter(Boolean))]
  for (const matchId of ids) assertValidVirtualMatchId(matchId)
  if (!ids.length) return 0

  const { count, error } = await supabase
    .from('virtual_knockout_predictions')
    .delete({ count: 'exact' })
    .eq('user_id', user.id)
    .in('virtual_match_id', ids)

  if (error) throw new Error(error.message)
  revalidatePath('/mi-prode')
  revalidatePath('/ranking')
  revalidatePath(`/ranking/${user.id}`)
  return count ?? 0
}

export async function deleteRealPredictionsByMatchIds(matchIds: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  await assertProdeOpen(supabase)

  const ids = [...new Set(matchIds.filter(Boolean))]
  for (const matchId of ids) assertUuid(matchId)
  if (!ids.length) return 0

  const { count, error } = await supabase
    .from('predictions')
    .delete({ count: 'exact' })
    .eq('user_id', user.id)
    .in('match_id', ids)

  if (error) throw new Error(error.message)
  revalidatePath('/')
  revalidatePath('/fixture')
  revalidatePath('/mi-prode')
  revalidatePath('/ranking')
  revalidatePath(`/ranking/${user.id}`)
  return count ?? 0
}

export async function savePredictionTiebreakers(tiebreakers: TiebreakerInput[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  await assertProdeOpen(supabase)

  const normalized = tiebreakers.map((item) => ({
    key: cleanTiebreakerKey(item.key),
    team: cleanTiebreakerTeam(item.team),
  }))

  const toDelete = normalized.filter((item) => !item.team).map((item) => item.key)
  const toUpsert = normalized
    .filter((item): item is { key: string; team: string } => Boolean(item.team))
    .map((item) => ({
      user_id: user.id,
      tiebreaker_key: item.key,
      team: item.team,
      updated_at: new Date().toISOString(),
    }))

  if (toDelete.length) {
    const { error } = await supabase
      .from('user_prediction_tiebreakers')
      .delete()
      .eq('user_id', user.id)
      .in('tiebreaker_key', toDelete)
    if (error) throw new Error(error.message)
  }

  if (toUpsert.length) {
    const { error } = await supabase
      .from('user_prediction_tiebreakers')
      .upsert(toUpsert, { onConflict: 'user_id,tiebreaker_key' })
    if (error) throw new Error(error.message)
  }

  revalidatePath('/mi-prode')
  revalidatePath('/ranking')
  revalidatePath(`/ranking/${user.id}`)
  revalidatePath('/ranking/[userId]', 'page')
  return normalized.length
}

export async function saveFullProde(input: FullProdeInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const prodeLock = await getProdeLockState(supabase)

  const realPredictions = input.realPredictions.map((prediction) => {
    assertUuid(prediction.matchId)
    assertValidScore(prediction.homeScore)
    assertValidScore(prediction.awayScore)
    return prediction
  })
  const virtualPredictions = input.virtualPredictions.map((prediction) => {
    assertValidVirtualMatchId(prediction.matchId)
    assertValidScore(prediction.homeScore)
    assertValidScore(prediction.awayScore)
    return prediction
  })
  const deleteRealMatchIds = [...new Set(input.deleteRealMatchIds ?? [])]
  const deleteVirtualMatchIds = [...new Set(input.deleteVirtualMatchIds ?? [])]
  for (const matchId of deleteRealMatchIds) assertUuid(matchId)
  for (const matchId of deleteVirtualMatchIds) assertValidVirtualMatchId(matchId)

  if (prodeLock.locked) {
    if (deleteRealMatchIds.length || deleteVirtualMatchIds.length) {
      throw new Error(CLOSED_COMPLETION_MESSAGE)
    }

    const [real, virtual] = await Promise.all([
      realPredictions.length ? saveRealPredictions(realPredictions) : Promise.resolve(0),
      virtualPredictions.length
        ? saveVirtualKnockoutPredictions(virtualPredictions)
        : Promise.resolve({ saved: 0, deletedAffected: 0 } satisfies SaveVirtualResult),
    ])

    return {
      real,
      virtual: virtual.saved,
      tiebreakers: 0,
      deletedReal: 0,
      deletedVirtual: virtual.deletedAffected,
    }
  }

  const realPayload = realPredictions.map((prediction) => ({
    user_id: user.id,
    match_id: prediction.matchId,
    home_score: prediction.homeScore,
    away_score: prediction.awayScore,
    tiebreaker_team: prediction.tiebreakerTeam ?? null,
    points: null,
    updated_at: new Date().toISOString(),
  }))
  const virtualPayload = virtualPredictions.map((prediction) => ({
    user_id: user.id,
    virtual_match_id: prediction.matchId,
    home_score: prediction.homeScore,
    away_score: prediction.awayScore,
    tiebreaker_team: prediction.tiebreakerTeam ?? null,
    updated_at: new Date().toISOString(),
  }))

  console.info('[mi-prode.saveFullProde] payload', {
    userId: user.id,
    realCount: realPayload.length,
    virtualCount: virtualPayload.length,
    tiebreakerCount: input.tiebreakers.length,
    deleteRealCount: deleteRealMatchIds.length,
    deleteVirtualCount: deleteVirtualMatchIds.length,
    firstReal: realPayload[0] ?? null,
    firstVirtual: virtualPayload[0] ?? null,
  })

  if (deleteRealMatchIds.length) {
    const { error } = await supabase
      .from('predictions')
      .delete()
      .eq('user_id', user.id)
      .in('match_id', deleteRealMatchIds)
    if (error) throw new Error(error.message)
  }

  if (deleteVirtualMatchIds.length) {
    const { error } = await supabase
      .from('virtual_knockout_predictions')
      .delete()
      .eq('user_id', user.id)
      .in('virtual_match_id', deleteVirtualMatchIds)
    if (error) throw new Error(error.message)
  }

  if (realPayload.length) {
    const { error } = await supabase
      .from('predictions')
      .upsert(realPayload, { onConflict: 'user_id,match_id' })
    if (error) throw new Error(error.message)
  }

  if (virtualPayload.length) {
    const { error } = await supabase
      .from('virtual_knockout_predictions')
      .upsert(virtualPayload, { onConflict: 'user_id,virtual_match_id' })
    if (error) throw new Error(error.message)
  }

  await savePredictionTiebreakers(input.tiebreakers)

  const [realVerify, virtualVerify] = await Promise.all([
    realPayload.length
      ? supabase
          .from('predictions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .in('match_id', realPayload.map((prediction) => prediction.match_id))
      : Promise.resolve({ count: 0, error: null }),
    virtualPayload.length
      ? supabase
          .from('virtual_knockout_predictions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .in('virtual_match_id', virtualPayload.map((prediction) => prediction.virtual_match_id))
      : Promise.resolve({ count: 0, error: null }),
  ])

  if (realVerify.error) throw new Error(realVerify.error.message)
  if (virtualVerify.error) throw new Error(virtualVerify.error.message)
  if ((realVerify.count ?? 0) < realPayload.length) {
    throw new Error(`No se pudo verificar el guardado de grupos (${realVerify.count ?? 0}/${realPayload.length}).`)
  }
  if ((virtualVerify.count ?? 0) < virtualPayload.length) {
    throw new Error(`No se pudo verificar el guardado de eliminatorias (${virtualVerify.count ?? 0}/${virtualPayload.length}).`)
  }

  console.info('[mi-prode.saveFullProde] verified', {
    userId: user.id,
    realCount: realVerify.count ?? 0,
    virtualCount: virtualVerify.count ?? 0,
  })

  revalidatePath('/')
  revalidatePath('/fixture')
  revalidatePath('/mi-prode')
  revalidatePath('/ranking')
  revalidatePath(`/ranking/${user.id}`)
  revalidatePath('/ranking/[userId]', 'page')
  return {
    real: realVerify.count ?? 0,
    virtual: virtualVerify.count ?? 0,
    tiebreakers: input.tiebreakers.length,
    deletedReal: deleteRealMatchIds.length,
    deletedVirtual: deleteVirtualMatchIds.length,
  }
}

export async function saveFullProdeSafe(input: FullProdeInput) {
  try {
    const result = await saveFullProde(input)
    return { ok: true as const, result }
  } catch (error) {
    const message = errorMessage(error)
    console.error('[mi-prode.saveFullProdeSafe] failed', { message, error })
    return { ok: false as const, message }
  }
}

export async function saveSpecialBets(values: SpecialBetsValues) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const prodeLock = await getProdeLockState(supabase)

  const payload = {
    user_id: user.id,
    balon: cleanName(values.balon),
    bota: cleanName(values.bota),
    guante: cleanName(values.guante),
    updated_at: new Date().toISOString(),
  }

  if (prodeLock.locked) {
    const closedPayload = {
      user_id: user.id,
      balon: payload.balon || null,
      bota: payload.bota || null,
      guante: payload.guante || null,
      updated_at: payload.updated_at,
    }

    const { data: existing, error: existingError } = await supabase
      .from('special_bets')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (existingError) throw new Error(existingError.message)

    if (!existing) {
      const { error } = await supabase
        .from('special_bets')
        .insert(closedPayload)

      if (error) throw new Error(error.message)
      revalidatePath('/mi-prode')
      revalidatePath('/ranking')
      revalidatePath(`/ranking/${user.id}`)
      revalidatePath('/ranking/[userId]', 'page')
      revalidatePath('/')
      return
    }

    const { count, error } = await supabase
      .from('special_bets')
      .update(closedPayload, { count: 'exact' })
      .eq('user_id', user.id)

    if (error) throw new Error(error.message)
    if ((count ?? 0) !== 1) throw new Error(CLOSED_COMPLETION_MESSAGE)
    revalidatePath('/mi-prode')
    revalidatePath('/ranking')
    revalidatePath(`/ranking/${user.id}`)
    revalidatePath('/ranking/[userId]', 'page')
    revalidatePath('/')
    return
  }

  const { error } = await supabase
    .from('special_bets')
    .upsert(payload, { onConflict: 'user_id' })

  if (error) throw new Error(error.message)
  revalidatePath('/mi-prode')
  revalidatePath('/ranking')
  revalidatePath(`/ranking/${user.id}`)
  revalidatePath('/ranking/[userId]', 'page')
  revalidatePath('/')
}

export async function deleteSpecialBets() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  await assertProdeOpen(supabase)

  const { error } = await supabase
    .from('special_bets')
    .delete()
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)
  revalidatePath('/mi-prode')
  revalidatePath('/ranking')
  revalidatePath(`/ranking/${user.id}`)
  revalidatePath('/ranking/[userId]', 'page')
  revalidatePath('/')
}

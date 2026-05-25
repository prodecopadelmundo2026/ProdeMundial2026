'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { assertProdeOpen } from '@/lib/prode-lock'

type VirtualKnockoutPredictionInput = {
  matchId: string
  homeScore: number
  awayScore: number
  tiebreakerTeam?: string | null
}

export type SpecialBetsValues = {
  balon: string
  bota: string
  guante: string
}

function cleanName(value: unknown) {
  return String(value ?? '').replace(/[^a-zA-ZÀ-ÿ\s]/g, '').trim().slice(0, 80)
}

function assertValidScore(score: number) {
  if (!Number.isInteger(score) || score < 0 || score > 99) {
    throw new Error('Goles invalidos')
  }
}

function assertValidVirtualMatchId(matchId: string) {
  if (!/^virtual-p(7[3-9]|8[0-9]|9[0-9]|10[0-4])$/.test(matchId)) {
    throw new Error('Partido virtual invalido')
  }
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
  if (!predictions.length) return 0
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  await assertProdeOpen(supabase)

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

  const { error } = await supabase
    .from('virtual_knockout_predictions')
    .upsert(payload, { onConflict: 'user_id,virtual_match_id' })

  if (error) throw new Error(error.message)
  revalidatePath('/mi-prode')
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

export async function saveSpecialBets(values: SpecialBetsValues) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  await assertProdeOpen(supabase)

  const payload = {
    user_id: user.id,
    balon: cleanName(values.balon),
    bota: cleanName(values.bota),
    guante: cleanName(values.guante),
    updated_at: new Date().toISOString(),
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

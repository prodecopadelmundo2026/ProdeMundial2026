'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { assertProdeOpen } from '@/lib/prode-lock'

export type SpecialBetsValues = {
  balon: string
  bota: string
  guante: string
}

function cleanName(value: unknown) {
  return String(value ?? '').replace(/[^a-zA-ZÀ-ÿ\s]/g, '').trim().slice(0, 80)
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

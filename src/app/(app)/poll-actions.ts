'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  BONUS_POLL_SLUG,
  normalizeBonusPollState,
  type BonusPollOptionKey,
} from '@/lib/bonus-poll'

const VALID_OPTION_KEYS = new Set(['yes', 'no', 'neutral'])

function assertOptionKey(value: string): asserts value is BonusPollOptionKey {
  if (!VALID_OPTION_KEYS.has(value)) {
    throw new Error('Opcion invalida')
  }
}

export async function submitBonusPollVote(optionKey: string) {
  assertOptionKey(optionKey)

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('submit_poll_vote', {
    p_poll_slug: BONUS_POLL_SLUG,
    p_option_key: optionKey,
  })

  if (error) {
    return {
      ok: false,
      message: error.message,
      poll: null,
    }
  }

  revalidatePath('/')

  return {
    ok: true,
    message: 'Voto registrado',
    poll: normalizeBonusPollState(data),
  }
}

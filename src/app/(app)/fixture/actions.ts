'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type SaveState = {
  ok: boolean
  message: string | null
}

function parseScore(value: string) {
  if (value === '') return null
  const score = Number(value)
  if (!Number.isInteger(score) || score < 0 || score > 30) return null
  return score
}

export async function savePredictions(
  _prevState: SaveState,
  formData: FormData
): Promise<SaveState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, message: 'Necesitas iniciar sesion.' }
  }

  const predictions: Array<{
    match_id: string
    home_score: number
    away_score: number
  }> = []

  for (const value of formData.getAll('match_id')) {
    const matchId = String(value)
    const homeRaw = String(formData.get(`home_${matchId}`) ?? '').trim()
    const awayRaw = String(formData.get(`away_${matchId}`) ?? '').trim()

    if (homeRaw === '' && awayRaw === '') continue

    const homeScore = parseScore(homeRaw)
    const awayScore = parseScore(awayRaw)

    if (homeScore === null || awayScore === null) {
      return { ok: false, message: 'Usa goles enteros entre 0 y 30.' }
    }

    predictions.push({
      match_id: matchId,
      home_score: homeScore,
      away_score: awayScore,
    })
  }

  if (!predictions.length) {
    return { ok: false, message: 'Completa al menos un partido abierto.' }
  }

  const { error, data: savedCount } = await supabase.rpc('save_predictions', {
    p_predictions: predictions,
  })

  if (error) {
    return { ok: false, message: error.message }
  }

  revalidatePath('/fixture')
  revalidatePath('/mi-prode')
  revalidatePath('/')

  return {
    ok: true,
    message: `${savedCount ?? predictions.length} pronosticos guardados.`,
  }
}

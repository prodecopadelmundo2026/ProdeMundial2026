import { calculateProjectedPrizes } from './prode-progress'

type PrizeSettingsRpcClient = {
  rpc: (fn: 'get_public_prize_settings') => PromiseLike<{
    data: PrizeSettingsRow[] | PrizeSettingsRow | null
    error: { message: string } | null
  }>
}

export type PrizeSettingsRow = {
  first_prize: number
  second_prize: number
  third_prize: number
  updated_at: string | null
  updated_by: string | null
}

export type ResolvedPrizes = {
  first: number
  second: number
  third: number
  multiplier: number | null
  source: 'manual' | 'estimated'
}

function normalizePrizeSettings(data: PrizeSettingsRow[] | PrizeSettingsRow | null) {
  if (Array.isArray(data)) return data[0] ?? null
  return data ?? null
}

export async function getPublicPrizeSettings(supabase: PrizeSettingsRpcClient) {
  const { data, error } = await supabase.rpc('get_public_prize_settings')
  if (error) return null
  return normalizePrizeSettings(data)
}

export function resolvePrizes(confirmedPlayers: number, settings: PrizeSettingsRow | null): ResolvedPrizes {
  if (settings) {
    return {
      first: settings.first_prize,
      second: settings.second_prize,
      third: settings.third_prize,
      multiplier: null,
      source: 'manual',
    }
  }

  const projected = calculateProjectedPrizes(confirmedPlayers)
  return {
    first: projected.first,
    second: projected.second,
    third: projected.third,
    multiplier: projected.multiplier,
    source: 'estimated',
  }
}

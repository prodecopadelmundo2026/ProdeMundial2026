type SupabaseLike = {
  from: (table: string) => {
    select: (columns: string) => any
    upsert?: (...args: any[]) => any
  }
}

export type ProdeLockOverride = 'locked' | 'unlocked' | null

export type ProdeLockState = {
  locked: boolean
  automaticLocked: boolean
  override: ProdeLockOverride
}

function isMissingSettingsTable(error: unknown) {
  const message = error instanceof Error ? error.message : String((error as { message?: unknown })?.message ?? error)
  return message.includes('app_settings') || message.includes('relation') || message.includes('does not exist')
}

export async function getProdeLockState(supabase: SupabaseLike): Promise<ProdeLockState> {
  const { data: resultRows } = await supabase
    .from('matches')
    .select('id')
    .not('home_score', 'is', null)
    .not('away_score', 'is', null)
    .limit(1)

  const automaticLocked = Boolean(resultRows?.length)
  let override: ProdeLockOverride = null

  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'prode_lock_override')
      .maybeSingle()

    if (error) throw error
    const value = data?.value
    override = value === 'locked' || value === 'unlocked' ? value : null
  } catch (error) {
    if (!isMissingSettingsTable(error)) throw error
  }

  return {
    automaticLocked,
    override,
    locked: override === 'locked' || (override !== 'unlocked' && automaticLocked),
  }
}

export async function assertProdeOpen(supabase: SupabaseLike) {
  const state = await getProdeLockState(supabase)
  if (state.locked) throw new Error('El Prode esta bloqueado. No se pueden editar apuestas.')
}

type SupabaseLike = {
  from: (table: string) => {
    select: (columns: string) => any
  }
}

function isMissingSettingsTable(error: unknown) {
  const message = error instanceof Error ? error.message : String((error as { message?: unknown })?.message ?? error)
  return message.includes('app_settings') || message.includes('relation') || message.includes('does not exist')
}

export async function getMaintenanceMode(supabase: SupabaseLike): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'maintenance_mode')
      .maybeSingle()

    if (error) throw error
    return data?.value === 'on'
  } catch (error) {
    if (!isMissingSettingsTable(error)) throw error
    return false
  }
}

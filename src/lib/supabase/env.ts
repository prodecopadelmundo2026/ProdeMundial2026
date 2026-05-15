export const SUPABASE_ENV_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  )
}

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  if (!url || !anonKey) {
    throw new Error(
      `Faltan variables de Supabase: ${SUPABASE_ENV_KEYS.join(', ')}`
    )
  }

  try {
    new URL(url)
  } catch {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL no es una URL valida')
  }

  return { url, anonKey }
}

import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseConfig } from './env'

export const createClient = () => {
  // Cliente browser: usa configuracion centralizada y anon key publica.
  const { url, anonKey } = getSupabaseConfig()

  return createBrowserClient(url, anonKey)
}

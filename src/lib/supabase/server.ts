import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseConfig } from './env'

export const createClient = async () => {
  // Server-side Supabase client. Usa anon key, no service role.
  // No usar para operaciones admin.
  const cookieStore = await cookies()
  const { url, anonKey } = getSupabaseConfig()

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Server Components can't set cookies; middleware handles refresh.
        }
      },
    },
  })
}

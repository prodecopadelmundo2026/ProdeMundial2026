import { createAdminClient } from '@/lib/supabase/admin'

export type CurrentProfile = {
  id: string
  email: string | null
  name: string | null
  avatar_url?: string | null
  is_admin: boolean
}

type AuthUserLike = {
  id: string
  email?: string | null
}

export async function getCurrentProfile(user: AuthUserLike): Promise<CurrentProfile | null> {
  const admin = createAdminClient()
  const normalizedEmail = user.email?.toLowerCase().trim() ?? ''

  const { data: byId } = await admin
    .from('profiles')
    .select('id, email, name, avatar_url, is_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (byId) return byId as CurrentProfile

  if (!normalizedEmail) return null

  const { data: byEmail } = await admin
    .from('profiles')
    .select('id, email, name, avatar_url, is_admin')
    .eq('email', normalizedEmail)
    .maybeSingle()

  return (byEmail as CurrentProfile | null) ?? null
}

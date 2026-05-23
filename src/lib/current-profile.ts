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

  const [byIdResult, byEmailResult] = await Promise.all([
    admin
      .from('profiles')
      .select('id, email, name, avatar_url, is_admin')
      .eq('id', user.id)
      .maybeSingle(),
    normalizedEmail
      ? admin
          .from('profiles')
          .select('id, email, name, avatar_url, is_admin')
          .ilike('email', normalizedEmail)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])

  const byId = (byIdResult.data as CurrentProfile | null) ?? null
  const byEmail = (byEmailResult.data as CurrentProfile | null) ?? null

  console.info('[current-profile] resolved', {
    authUserId: user.id,
    authEmail: normalizedEmail || null,
    byId: byId ? { id: byId.id, email: byId.email, is_admin: byId.is_admin } : null,
    byEmail: byEmail ? { id: byEmail.id, email: byEmail.email, is_admin: byEmail.is_admin } : null,
    byIdError: byIdResult.error?.message ?? null,
    byEmailError: byEmailResult.error?.message ?? null,
  })

  if (byEmail?.is_admin) return byEmail
  if (byId?.is_admin) return byId
  if (byId && byEmail) return { ...byId, is_admin: Boolean(byId.is_admin || byEmail.is_admin) }

  return byId ?? byEmail
}

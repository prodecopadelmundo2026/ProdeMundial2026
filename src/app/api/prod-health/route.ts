import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const DIAGNOSTIC_VERSION = 'prod-health-2026-05-23-1'
const EMERGENCY_ADMIN_EMAIL = 'ascenzimarquezjuanignacio@gmail.com'

function safeHost(rawUrl?: string) {
  const value = rawUrl?.trim()
  if (!value) return null
  try {
    return new URL(value).host
  } catch {
    return value
  }
}

function serializeError(error: unknown) {
  if (!error) return null
  if (error instanceof Error) return { message: error.message }
  const maybe = error as { message?: unknown; code?: unknown; details?: unknown; hint?: unknown }
  return {
    message: typeof maybe.message === 'string' ? maybe.message : String(error),
    code: maybe.code ?? null,
    details: maybe.details ?? null,
    hint: maybe.hint ?? null,
  }
}

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const supabaseHost = safeHost(supabaseUrl)
  const hasAnonKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim())
  const hasServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim())

  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      {
        ok: false,
        diagnosticVersion: DIAGNOSTIC_VERSION,
        reason: 'not_authenticated',
        supabaseHost,
        hasAnonKey,
        hasServiceRoleKey,
        userError: serializeError(userError),
      },
      { status: 401 }
    )
  }

  const normalizedEmail = user.email?.toLowerCase().trim() ?? ''
  const admin = createAdminClient()

  const [byIdResult, byEmailResult, adminMatchesResult, anonMatchesResult] = await Promise.all([
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
    admin
      .from('matches')
      .select('id, home_team, away_team, scheduled_at, locked_at, stage, group, status', { count: 'exact' })
      .order('scheduled_at', { ascending: true })
      .limit(3),
    supabase
      .from('matches')
      .select('id, home_team, away_team, scheduled_at, locked_at, stage, group, status', { count: 'exact' })
      .order('scheduled_at', { ascending: true })
      .limit(3),
  ])

  const byId = byIdResult.data as { is_admin?: boolean; email?: string | null } | null
  const byEmail = byEmailResult.data as { is_admin?: boolean; email?: string | null } | null
  const allowed =
    normalizedEmail === EMERGENCY_ADMIN_EMAIL ||
    Boolean(byId?.is_admin) ||
    Boolean(byEmail?.is_admin)

  if (!allowed) {
    return NextResponse.json(
      {
        ok: false,
        diagnosticVersion: DIAGNOSTIC_VERSION,
        reason: 'not_admin',
        authUser: { id: user.id, email: normalizedEmail || null },
        profileById: byId,
        profileByEmail: byEmail,
      },
      { status: 403 }
    )
  }

  const firstAdminMatch = adminMatchesResult.data?.[0] ?? null
  const stageCounts = (adminMatchesResult.data ?? []).reduce<Record<string, number>>((acc, match) => {
    const stage = String(match.stage ?? 'null')
    acc[stage] = (acc[stage] ?? 0) + 1
    return acc
  }, {})

  return NextResponse.json({
    ok: true,
    diagnosticVersion: DIAGNOSTIC_VERSION,
    runtime: {
      vercelEnv: process.env.VERCEL_ENV ?? null,
      vercelUrl: process.env.VERCEL_URL ?? null,
      vercelGitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      vercelGitCommitRef: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    },
    supabase: {
      host: supabaseHost,
      hasAnonKey,
      hasServiceRoleKey,
    },
    authUser: {
      id: user.id,
      email: normalizedEmail || null,
    },
    profile: {
      byId: byIdResult.data ?? null,
      byEmail: byEmailResult.data ?? null,
      byIdError: serializeError(byIdResult.error),
      byEmailError: serializeError(byEmailResult.error),
      finalIsAdmin: Boolean(byEmail?.is_admin || byId?.is_admin),
    },
    matches: {
      adminCount: adminMatchesResult.count ?? null,
      adminSampleCount: adminMatchesResult.data?.length ?? 0,
      adminFirstMatch: firstAdminMatch,
      adminSampleStageCounts: stageCounts,
      adminError: serializeError(adminMatchesResult.error),
      anonCount: anonMatchesResult.count ?? null,
      anonSampleCount: anonMatchesResult.data?.length ?? 0,
      anonFirstMatch: anonMatchesResult.data?.[0] ?? null,
      anonError: serializeError(anonMatchesResult.error),
    },
  })
}

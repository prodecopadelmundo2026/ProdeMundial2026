import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseConfig, isSupabaseConfigured } from '@/lib/supabase/env'
import { createAdminClient } from '@/lib/supabase/admin'

function redirectToLoginWithClearedSession(request: NextRequest, origin: string, error = 'unauthorized_email', reason?: string | null) {
  const loginUrl = new URL(`${origin}/login`)
  loginUrl.searchParams.set('error', error)
  if (reason?.trim()) loginUrl.searchParams.set('reason', reason.trim().slice(0, 180))
  const response = NextResponse.redirect(loginUrl)

  request.cookies
    .getAll()
    .filter(
      (cookie) =>
        cookie.name.startsWith('sb-') ||
        cookie.name.toLowerCase().includes('supabase')
    )
    .forEach((cookie) => response.cookies.delete(cookie.name))

  return response
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const oauthError = searchParams.get('error')
  const code = searchParams.get('code')
  // Sanitize next: must be a relative path (starts with / but not //) to prevent open redirects
  const rawNext = searchParams.get('next') ?? '/'
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/'

  if (oauthError) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(`${origin}/login?error=local_no_db`)
  }

  const { url, anonKey } = getSupabaseConfig()
  let supabaseResponse = NextResponse.redirect(`${origin}${next}`)
  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.redirect(`${origin}${next}`)
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
  }

  const { user } = data
  const selectedEmail = user.email?.toLowerCase().trim() ?? ''

  if (!selectedEmail) {
    await supabase.auth.signOut()
    return NextResponse.redirect(`${origin}/login?error=auth_method_mismatch`)
  }

  const name: string =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    selectedEmail.split('@')[0] ??
    'Jugador'
  const avatarUrl: string | null = user.user_metadata?.avatar_url ?? null

  const { error: accessError } = await supabase.rpc('complete_google_sign_in', {
    p_name: name,
    p_avatar_url: avatarUrl,
  })

  if (accessError) {
    console.error('[auth/callback] complete_google_sign_in failed', {
      email: selectedEmail,
      provider: user.app_metadata?.provider,
      error: accessError,
    })
    await supabase.auth.signOut()
    if (accessError.message.toLowerCase().includes('email no autorizado')) {
      const admin = createAdminClient()
      const { data: authorized } = await admin
        .from('authorized_emails')
        .select('active, status, deleted_at, disabled_reason')
        .eq('email', selectedEmail)
        .maybeSingle()
      if (authorized && (!authorized.active || authorized.status === 'disabled' || authorized.deleted_at)) {
        return redirectToLoginWithClearedSession(request, origin, 'disabled_email', authorized.disabled_reason)
      }
      return redirectToLoginWithClearedSession(request, origin)
    }
    return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
  }

  return supabaseResponse
}

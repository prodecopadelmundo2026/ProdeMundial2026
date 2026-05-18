import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseConfig, isSupabaseConfigured } from '@/lib/supabase/env'

function redirectToLoginWithClearedSession(request: NextRequest, origin: string) {
  const response = NextResponse.redirect(`${origin}/login?error=unauthorized_email`)

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
  const next = searchParams.get('next') ?? '/'

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
  const cookieStore = await cookies()
  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
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
  if (!user.email) {
    await supabase.auth.signOut()
    return redirectToLoginWithClearedSession(request, origin)
  }

  const name: string =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split('@')[0] ??
    'Jugador'
  const avatarUrl: string | null = user.user_metadata?.avatar_url ?? null

  const { error: accessError } = await supabase.rpc('complete_google_sign_in', {
    p_name: name,
    p_avatar_url: avatarUrl,
  })

  if (accessError) {
    await supabase.auth.signOut()
    return redirectToLoginWithClearedSession(request, origin)
  }

  return NextResponse.redirect(`${origin}${next}`)
}

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseConfig, isSupabaseConfigured } from './src/lib/supabase/env'

const PUBLIC_PATHS = ['/', '/login', '/auth/', '/ranking', '/reglas', '/premios']

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((path) =>
    path === '/' ? pathname === '/' : pathname.startsWith(path)
  )
}

function clearSupabaseAuthCookies(response: NextResponse, request: NextRequest) {
  request.cookies
    .getAll()
    .filter(
      (cookie) =>
        cookie.name.startsWith('sb-') ||
        cookie.name.toLowerCase().includes('supabase')
    )
    .forEach((cookie) => response.cookies.delete(cookie.name))
}

export async function middleware(request: NextRequest) {
  if (isPublic(request.nextUrl.pathname)) {
    return NextResponse.next()
  }

  if (!isSupabaseConfigured()) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('error', 'local_no_db')
    return NextResponse.redirect(loginUrl)
  }

  let supabaseResponse = NextResponse.next({ request })
  const { url, anonKey } = getSupabaseConfig()

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        )
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  // Refresca la sesion: usar getUser(), no getSession().
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  const { data: hasAccess, error: accessError } = await supabase.rpc(
    'current_user_has_access'
  )

  if (accessError || !hasAccess) {
    await supabase.auth.signOut()

    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('error', 'unauthorized_email')
    const redirectResponse = NextResponse.redirect(loginUrl)
    clearSupabaseAuthCookies(redirectResponse, request)
    return redirectResponse
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|json)$).*)',
  ],
}

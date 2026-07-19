import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSupabaseConfig, isSupabaseConfigured } from './src/lib/supabase/env'

const PUBLIC_PATHS = ['/', '/login', '/auth/', '/fixture', '/ranking', '/estadisticas', '/pronosticos', '/premios', '/mundial-en-vivo', '/reglas', '/maintenance']
const MAINTENANCE_ALLOWED_PATHS = ['/login', '/auth/', '/maintenance']

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

  const { data: maintenanceSetting } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'maintenance_mode')
    .maybeSingle()
  const maintenanceActive = maintenanceSetting?.value === 'on'
  let isAdmin = false

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle()
    isAdmin = Boolean(profile?.is_admin)
  }

  if (maintenanceActive && !isAdmin) {
    const allowed = MAINTENANCE_ALLOWED_PATHS.some((path) =>
      path === '/maintenance'
        ? request.nextUrl.pathname === '/maintenance'
        : request.nextUrl.pathname.startsWith(path)
    )
    if (!allowed) {
      const maintenanceUrl = request.nextUrl.clone()
      maintenanceUrl.pathname = '/maintenance'
      maintenanceUrl.search = ''
      return NextResponse.redirect(maintenanceUrl)
    }
  }

  if (isPublic(request.nextUrl.pathname)) {
    return supabaseResponse
  }

  if (!user) {
    const homeUrl = request.nextUrl.clone()
    homeUrl.pathname = '/'
    homeUrl.searchParams.set('desde', 'acceso')
    return NextResponse.redirect(homeUrl)
  }

  const { data: hasAccess, error: accessError } = await supabase.rpc(
    'current_user_has_access'
  )

  if (accessError) {
    console.warn('[middleware] current_user_has_access failed; allowing authenticated request to page guards', {
      pathname: request.nextUrl.pathname,
      userId: user.id,
      email: user.email,
      supabaseHost: new URL(url).host,
      error: accessError.message,
    })
    return supabaseResponse
  }

  if (!hasAccess) {
    const { data: accessState } = await supabase.rpc(
      'get_authorized_email_login_state',
      { p_email: user.email?.toLowerCase().trim() ?? '' }
    )
    const authorized = Array.isArray(accessState) ? accessState[0] : accessState
    await supabase.auth.signOut()

    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('error', authorized?.exists_in_whitelist ? 'disabled_email' : 'unauthorized_email')
    if (authorized?.disabled_reason) {
      loginUrl.searchParams.set('reason', String(authorized.disabled_reason).slice(0, 180))
    }
    const redirectResponse = NextResponse.redirect(loginUrl)
    clearSupabaseAuthCookies(redirectResponse, request)
    return redirectResponse
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|json|mp3|mp4|webm|wav|ogg|woff|woff2|ttf)$).*)',
  ],
}

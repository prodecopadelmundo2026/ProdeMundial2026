import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import { ACCESS_CODE_COOKIE } from '@/lib/auth/access-code'
import { createClient } from '@/lib/supabase/server'

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/'
  return value
}

function metadataText(value: unknown) {
  return typeof value === 'string' ? value : null
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeNextPath(searchParams.get('next'))

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
  }

  const cookieStore = await cookies()
  const accessCode = cookieStore.get(ACCESS_CODE_COOKIE)?.value ?? null
  const supabase = await createClient()

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    cookieStore.delete(ACCESS_CODE_COOKIE)
    return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
  }

  const { user } = data
  const name =
    metadataText(user.user_metadata?.full_name) ??
    metadataText(user.user_metadata?.name) ??
    'Jugador'
  const avatarUrl =
    metadataText(user.user_metadata?.avatar_url) ??
    metadataText(user.user_metadata?.picture)

  if (!accessCode) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile) {
      await supabase.auth.signOut()
      return NextResponse.redirect(`${origin}/login?error=missing_access_code`)
    }

    return NextResponse.redirect(`${origin}${next}`)
  }

  const { error: claimError } = await supabase.rpc('claim_access_code', {
    p_code: accessCode,
    p_name: name,
    p_avatar_url: avatarUrl,
  })

  cookieStore.delete(ACCESS_CODE_COOKIE)

  if (claimError) {
    await supabase.auth.signOut()
    return NextResponse.redirect(`${origin}/login?error=access_code_invalid`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}

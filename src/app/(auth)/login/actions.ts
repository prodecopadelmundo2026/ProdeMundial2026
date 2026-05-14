'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  ACCESS_CODE_COOKIE,
  ACCESS_CODE_MAX_AGE_SECONDS,
  isValidAccessCode,
  normalizeAccessCode,
} from '@/lib/auth/access-code'

export async function signInWithGoogle(formData: FormData) {
  const accessCode = normalizeAccessCode(formData.get('access_code'))

  if (!isValidAccessCode(accessCode)) {
    redirect('/login?error=invalid_access_code')
  }

  const headerStore = await headers()
  const origin =
    headerStore.get('origin') ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    'http://localhost:3000'

  const cookieStore = await cookies()
  cookieStore.set(ACCESS_CODE_COOKIE, accessCode, {
    httpOnly: true,
    maxAge: ACCESS_CODE_MAX_AGE_SECONDS,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  })

  if (error || !data.url) {
    redirect('/login?error=oauth_start_failed')
  }

  redirect(data.url)
}

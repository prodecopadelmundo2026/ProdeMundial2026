'use client'

import Link from 'next/link'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SALES_CONTACTS, whatsappHref } from '@/lib/sales-contacts'

const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  unauthorized_email:
    'Tu correo no está autorizado para ingresar. Usá exactamente el mismo correo cargado en Participantes habilitados.',
  auth_method_mismatch:
    'Este ingreso usa Google. Si tu correo es Hotmail, Outlook o Yahoo, solo funciona si ese mismo correo está asociado a una cuenta Google habilitada.',
  auth_callback_error:
    'No pudimos completar el inicio de sesión con Google. Volvé a intentarlo.',
  missing_code:
    'No recibimos la respuesta de Google. Volvé a intentarlo.',
  oauth_start_failed:
    'No pudimos iniciar el acceso con Google. Volvé a intentarlo en unos minutos.',
  local_no_db:
    'La base de datos no está configurada en este ambiente.',
}

const LOGIN_INFO_MESSAGES: Record<string, string> = {
  signed_out: 'Sesión cerrada correctamente.',
}

function getInitialError() {
  if (typeof window === 'undefined') return null
  const code = new URLSearchParams(window.location.search).get('error')
  return code ? LOGIN_ERROR_MESSAGES[code] ?? 'No pudimos iniciar sesión. Volvé a intentarlo.' : null
}

function getInitialMessage() {
  if (typeof window === 'undefined') return null
  const code = new URLSearchParams(window.location.search).get('message')
  return code ? LOGIN_INFO_MESSAGES[code] ?? null : null
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(getInitialError)
  const [message, setMessage] = useState<string | null>(getInitialMessage)

  async function handleGoogleSignIn() {
    setLoading(true)
    setError(null)
    setMessage(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          prompt: 'select_account',
        },
      },
    })

    if (error) {
      setError(LOGIN_ERROR_MESSAGES.oauth_start_failed)
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: '#0A0A0A', color: '#fff', fontFamily: 'var(--font-archivo, system-ui, sans-serif)' }}
    >
      <header
        className="sticky top-0 z-50 border-b"
        style={{
          background: 'rgba(10,10,10,0.78)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderColor: 'rgba(255,255,255,0.08)',
        }}
      >
        <div className="relative max-w-[1280px] mx-auto px-5 h-[60px] flex items-center">
          <Link
            href="/"
            className="flex items-center text-[18px] tracking-[-0.02em] shrink-0"
            style={{ fontFamily: 'var(--font-archivo-black, system-ui, sans-serif)' }}
          >
            PRODE <b style={{ color: '#FF6B00', marginLeft: '6px' }}>26&apos;</b>
          </Link>

          <nav className="absolute left-1/2 -translate-x-1/2 hidden min-[880px]:flex gap-7 font-semibold text-[14px]">
            {[
              { label: 'Inicio', href: '/' },
              { label: 'Premios', href: '/#premios' },
              { label: 'Reglas', href: '/reglas' },
            ].map(({ label, href }) => (
              <a
                key={label}
                href={href}
                className="text-[#cfcfcf] hover:text-white transition-colors duration-150"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main
        className="flex-1 grid place-items-center"
        style={{ padding: '60px 20px', position: 'relative', overflow: 'hidden' }}
      >
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true" style={{ opacity: 0.5 }}>
          <span
            className="absolute rounded-full"
            style={{
              top: '-80px',
              left: '-80px',
              width: '340px',
              height: '340px',
              background: '#5B2D8E',
              filter: 'blur(2px)',
              animation: 'float 26s ease-in-out infinite',
            }}
          />
          <span
            className="absolute"
            style={{
              top: '20%',
              right: '-60px',
              width: '240px',
              height: '240px',
              background: '#FF6B00',
              filter: 'blur(2px)',
              borderRadius: '50% 0 50% 0',
              animation: 'float 26s ease-in-out infinite',
              animationDelay: '-6s',
            }}
          />
          <span
            className="absolute"
            style={{
              bottom: '-100px',
              left: '30%',
              width: '300px',
              height: '300px',
              background: '#1565C0',
              filter: 'blur(2px)',
              borderRadius: '0 50% 0 50%',
              animation: 'float 26s ease-in-out infinite',
              animationDelay: '-12s',
            }}
          />
          <div
            className="absolute inset-0"
            style={{ background: 'radial-gradient(60% 50% at 50% 50%, transparent 0%, rgba(10,10,10,.7) 60%, rgba(10,10,10,.98) 100%)' }}
          />
        </div>

        <section
          className="relative z-10 w-full"
          style={{
            width: '100%',
            maxWidth: 'min(460px, calc(100vw - 40px))',
            minWidth: 0,
            boxSizing: 'border-box',
            background: '#141414',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '24px',
            padding: '40px 32px 32px',
            boxShadow: '0 40px 100px -30px rgba(0,0,0,.6)',
          }}
        >
          <div className="mb-7">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-[18px] text-[11px] font-extrabold tracking-[0.18em] uppercase"
              style={{ background: 'rgba(168,240,216,0.1)', color: '#A8F0D8' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#A8F0D8]" />
              TEMPORADA 2026
            </div>
            <h1
              className="text-[clamp(36px,8vw,52px)] leading-[.92] tracking-[-0.03em] uppercase"
              style={{ fontFamily: 'var(--font-archivo-black, system-ui, sans-serif)' }}
            >
              Entrá<br />al <em className="not-italic" style={{ color: '#FF6B00' }}>Prode</em>
            </h1>
            <p className="mt-3 text-[#bdbdbd] text-[15px] leading-relaxed font-medium">
              Elegí tu cuenta de Google. Si ese correo está en la lista de inscriptos, entrás a la cancha.
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {message && (
              <span
                className="flex items-start gap-2 text-[13px] font-bold leading-relaxed"
                style={{ color: '#A8F0D8' }}
              >
                <svg className="mt-0.5 shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                {message}
              </span>
            )}

            {error && (
              <span
                className="flex items-start gap-2 text-[13px] font-bold leading-relaxed"
                style={{ color: '#FF8585' }}
              >
                <svg className="mt-0.5 shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </span>
            )}

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full inline-flex items-center justify-center flex-wrap gap-3 font-extrabold text-[15px] tracking-[0.01em] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: '#fff',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#141414',
                padding: '17px 20px',
                borderRadius: '14px',
                boxShadow: '0 16px 34px -18px rgba(255,255,255,.7)',
              }}
            >
              <svg className="w-[20px] h-[20px]" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-11.3 8 12 12 0 1 1 7.9-21l5.7-5.7A20 20 0 1 0 44 24a20 20 0 0 0-.4-3.5z" />
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8A12 12 0 0 1 24 12c3 0 5.8 1 7.9 3l5.7-5.7A20 20 0 0 0 6.3 14.7z" />
                <path fill="#4CAF50" d="M24 44a20 20 0 0 0 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.7 28l-6.5 5A20 20 0 0 0 24 44z" />
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2c-.4.4 6.6-4.8 6.6-14.8 0-1.2-.1-2.4-.4-3.5z" />
              </svg>
              {loading ? 'Abriendo Google...' : 'Entrar con Google'}
            </button>
          </div>

          <div
            className="mt-7 pt-6 text-center"
            style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
          >
            <p className="text-[#8A8A8A] text-[13px] leading-relaxed mb-3.5">
              Si usás Hotmail, Outlook o Yahoo, tenés que elegir una cuenta Google asociada a ese mismo correo cargado en Participantes habilitados.
            </p>
            <p className="text-[#bdbdbd] text-[13px] leading-relaxed mb-3.5 font-semibold">
              Si todavía no tenés acceso, escribinos por WhatsApp.
            </p>
            <div className="grid gap-2 text-left">
              {SALES_CONTACTS.map((contact) => (
                <div
                  key={`${contact.name}-${contact.role}`}
                  className="flex items-center justify-between gap-3 rounded-[14px] px-3 py-2"
                  style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <div className="min-w-0">
                    <p className="font-extrabold text-[13px] text-white truncate">{contact.name}</p>
                    <p className="text-[11px] text-[#8A8A8A] truncate">{contact.role}</p>
                  </div>
                  <a
                    href={whatsappHref(contact.phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-full font-extrabold text-[12px] transition-colors duration-150"
                    style={{
                      background: 'rgba(168,240,216,0.08)',
                      border: '1px solid rgba(168,240,216,0.18)',
                      color: '#A8F0D8',
                    }}
                  >
                    WhatsApp
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

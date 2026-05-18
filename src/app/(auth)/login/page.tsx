'use client'

import Link from 'next/link'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [nameError, setNameError] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setEmailError(null)
    setNameError(false)

    if (!name.trim()) { setNameError(true); return }
    if (!email.trim()) { setEmailError('Ingresá el mail con el que te registraste'); return }
    if (!email.includes('@')) { setEmailError('Email inválido'); return }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        data: { name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      const msg = error.message.toLowerCase()
      if (msg.includes('database error') || msg.includes('saving new user') || msg.includes('not authorized')) {
        setEmailError('Aún no estás dado de alta, por favor contactarte con los organizadores.')
      } else {
        setEmailError(error.message)
      }
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: '#0A0A0A', color: '#fff', fontFamily: 'var(--font-archivo, system-ui, sans-serif)' }}
    >
      {/* Nav */}
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
          {/* Brand */}
          <Link
            href="/"
            className="flex items-center text-[18px] tracking-[-0.02em] shrink-0"
            style={{ fontFamily: 'var(--font-archivo-black, system-ui, sans-serif)' }}
          >
            PRODE <b style={{ color: '#FF6B00', marginLeft: '6px' }}>26'</b>
          </Link>

          {/* Nav — centered absolutely */}
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

      {/* Page */}
      <main
        className="flex-1 grid place-items-center"
        style={{ padding: '60px 20px', position: 'relative', overflow: 'hidden' }}
      >
        {/* Blobs */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true" style={{ opacity: 0.5 }}>
          <span
            className="absolute rounded-full"
            style={{
              top: '-80px', left: '-80px', width: '340px', height: '340px',
              background: '#5B2D8E', filter: 'blur(2px)',
              animation: 'float 26s ease-in-out infinite',
            }}
          />
          <span
            className="absolute"
            style={{
              top: '20%', right: '-60px', width: '240px', height: '240px',
              background: '#FF6B00', filter: 'blur(2px)',
              borderRadius: '50% 0 50% 0',
              animation: 'float 26s ease-in-out infinite',
              animationDelay: '-6s',
            }}
          />
          <span
            className="absolute"
            style={{
              bottom: '-100px', left: '30%', width: '300px', height: '300px',
              background: '#1565C0', filter: 'blur(2px)',
              borderRadius: '0 50% 0 50%',
              animation: 'float 26s ease-in-out infinite',
              animationDelay: '-12s',
            }}
          />
          {/* Vignette overlay */}
          <div
            className="absolute inset-0"
            style={{ background: 'radial-gradient(60% 50% at 50% 50%, transparent 0%, rgba(10,10,10,.7) 60%, rgba(10,10,10,.98) 100%)' }}
          />
        </div>

        {/* Card */}
        <section
          className="relative z-10 w-full"
          style={{
            maxWidth: '460px',
            background: '#141414',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '28px',
            padding: '40px 32px 32px',
            boxShadow: '0 40px 100px -30px rgba(0,0,0,.6)',
          }}
        >
          {sent ? (
            /* ── Confirmation state ── */
            <div>
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-5 text-[11px] font-extrabold tracking-[0.18em] uppercase"
                style={{ background: 'rgba(168,240,216,0.1)', color: '#A8F0D8' }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#A8F0D8]" />
                LINK ENVIADO
              </div>
              <h1
                className="text-[clamp(36px,8vw,52px)] leading-[.92] tracking-[-0.03em] uppercase mb-3"
                style={{ fontFamily: 'var(--font-archivo-black, system-ui, sans-serif)' }}
              >
                Revisá<br/>tu <em className="not-italic" style={{ color: '#FF6B00' }}>email</em>
              </h1>
              <p className="text-[#bdbdbd] text-[15px] leading-relaxed font-medium mt-3">
                Te mandamos un link de acceso a{' '}
                <span className="text-white font-bold">{email}</span>.
                Revisá también spam.
              </p>
            </div>
          ) : (
            /* ── Login form ── */
            <>
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
                  Entrá<br/>al <em className="not-italic" style={{ color: '#FF6B00' }}>Prode</em>
                </h1>
                <p className="mt-3 text-[#bdbdbd] text-[15px] leading-relaxed font-medium">
                  Cargá tu nombre y mail. Si estás en la lista de inscriptos, entrás a la cancha.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
                {/* Name field */}
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="name"
                    className="text-[11px] font-extrabold tracking-[0.18em] uppercase"
                    style={{ color: '#8A8A8A' }}
                  >
                    Nombre
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setNameError(false) }}
                    placeholder="Ej. Mateo Fernández"
                    autoComplete="name"
                    className="w-full text-white text-[16px] font-semibold outline-none transition-all duration-150"
                    style={{
                      background: '#0A0A0A',
                      border: `1px solid ${nameError ? '#FF5A5A' : 'rgba(255,255,255,0.08)'}`,
                      padding: '16px 18px',
                      borderRadius: '14px',
                    }}
                    onFocus={(e) => {
                      if (!nameError) e.currentTarget.style.borderColor = '#FF6B00'
                      e.currentTarget.style.boxShadow = nameError
                        ? '0 0 0 4px rgba(255,90,90,.14)'
                        : '0 0 0 4px rgba(255,107,0,.12)'
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = nameError ? '#FF5A5A' : 'rgba(255,255,255,0.08)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  />
                  {nameError && (
                    <span
                      className="flex items-center gap-2 text-[13px] font-bold"
                      style={{ color: '#FF5A5A', animation: 'shake .3s ease-out' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                      Ingresá tu nombre.
                    </span>
                  )}
                </div>

                {/* Email field */}
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="email"
                    className="text-[11px] font-extrabold tracking-[0.18em] uppercase"
                    style={{ color: '#8A8A8A' }}
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setEmailError(null) }}
                    placeholder="vos@mail.com"
                    autoComplete="email"
                    className="w-full text-white text-[16px] font-semibold outline-none transition-all duration-150"
                    style={{
                      background: emailError ? 'rgba(255,90,90,.06)' : '#0A0A0A',
                      border: `1px solid ${emailError ? '#FF5A5A' : 'rgba(255,255,255,0.08)'}`,
                      padding: '16px 18px',
                      borderRadius: '14px',
                    }}
                    onFocus={(e) => {
                      if (!emailError) e.currentTarget.style.borderColor = '#FF6B00'
                      e.currentTarget.style.boxShadow = emailError
                        ? '0 0 0 4px rgba(255,90,90,.14)'
                        : '0 0 0 4px rgba(255,107,0,.12)'
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = emailError ? '#FF5A5A' : 'rgba(255,255,255,0.08)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  />
                  {emailError && (
                    <span
                      className="flex items-center gap-2 text-[13px] font-bold"
                      style={{ color: '#FF5A5A', animation: 'shake .3s ease-out' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                      {emailError}
                    </span>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-2 inline-flex items-center justify-center gap-2.5 font-extrabold text-[15px] tracking-[0.02em] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: '#FF6B00',
                    color: '#0A0A0A',
                    padding: '18px 24px',
                    borderRadius: '14px',
                    boxShadow: '0 10px 28px -10px rgba(255,107,0,.6)',
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 18px 36px -10px rgba(255,107,0,.85)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = ''
                    e.currentTarget.style.boxShadow = '0 10px 28px -10px rgba(255,107,0,.6)'
                  }}
                >
                  {loading ? 'Enviando...' : 'Entrar'}
                  {!loading && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M13 5l7 7-7 7"/>
                    </svg>
                  )}
                </button>

                {/* Divider */}
                <div
                  className="flex items-center gap-3.5 my-1 text-[11px] font-extrabold tracking-[0.22em] uppercase"
                  style={{ color: '#8A8A8A' }}
                >
                  <span className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
                  O
                  <span className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
                </div>

                {/* Google (disabled) */}
                <button
                  type="button"
                  disabled
                  className="w-full inline-flex items-center justify-center flex-wrap gap-3 font-bold text-[14px] cursor-not-allowed"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#9a9a9a',
                    padding: '16px 18px',
                    borderRadius: '14px',
                  }}
                >
                  <svg className="w-[18px] h-[18px] opacity-70" viewBox="0 0 48 48">
                    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-11.3 8 12 12 0 1 1 7.9-21l5.7-5.7A20 20 0 1 0 44 24a20 20 0 0 0-.4-3.5z"/>
                    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8A12 12 0 0 1 24 12c3 0 5.8 1 7.9 3l5.7-5.7A20 20 0 0 0 6.3 14.7z"/>
                    <path fill="#4CAF50" d="M24 44a20 20 0 0 0 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.7 28l-6.5 5A20 20 0 0 0 24 44z"/>
                    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2c-.4.4 6.6-4.8 6.6-14.8 0-1.2-.1-2.4-.4-3.5z"/>
                  </svg>
                  Continuar con Google
                  <span
                    className="text-[9px] font-extrabold tracking-[0.18em] px-2 py-1 rounded-[6px] shrink-0"
                    style={{
                      background: '#1C1C1C',
                      color: '#8A8A8A',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    PRÓXIMAMENTE
                  </span>
                </button>
              </form>

              {/* Help footer */}
              <div
                className="mt-7 pt-6 text-center"
                style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
              >
                <p className="text-[#8A8A8A] text-[13px] leading-relaxed mb-3.5">
                  ¿No estás en la lista de inscriptos?<br/>
                  Escribinos por WhatsApp y te damos el alta.
                </p>
                <a
                  href="https://wa.me/5491100000000?text=Hola!%20Quiero%20participar%20del%20Prode%2026"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 px-[18px] py-3 rounded-full font-extrabold text-[13px] transition-colors duration-150"
                  style={{
                    background: 'rgba(168,240,216,0.08)',
                    border: '1px solid rgba(168,240,216,0.18)',
                    color: '#A8F0D8',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(168,240,216,0.14)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(168,240,216,0.08)')}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.5 14.4c-.3-.1-1.7-.8-1.9-.9-.3-.1-.5-.1-.7.1-.2.3-.8.9-1 1.1-.2.2-.4.2-.6.1-.3-.1-1.2-.4-2.2-1.3-.8-.7-1.4-1.6-1.5-1.9-.2-.3 0-.4.1-.5l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.7-1.8c-.2-.4-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.3.3-1 .9-1 2.2 0 1.3.9 2.6 1.1 2.8.1.2 1.8 2.9 4.5 4.1 1.7.7 2.3.8 3.1.7.5-.1 1.4-.6 1.6-1.1.2-.5.2-1 .1-1.1l-.4-.2zM12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 4.9L2 22l5.2-1.3c1.4.8 3 1.2 4.7 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2zm6 16c-1.6 1.6-3.8 2.5-6 2.5-1.4 0-2.9-.4-4.1-1.1l-.3-.2-3.1.8.8-3-.2-.3C4.4 15.5 4 13.8 4 12c0-4.4 3.6-8 8-8s8 3.6 8 8c0 2.2-.9 4.3-2.5 5.9z"/>
                  </svg>
                  Contactar a los organizadores
                </a>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  )
}

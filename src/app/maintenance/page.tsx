export default function MaintenancePage() {
  return (
    <main className="min-h-screen grid place-items-center px-5" style={{ background: '#0A0A0A' }}>
      <section className="max-w-[560px] text-center">
        <span
          className="inline-block font-sans text-[11px] font-extrabold tracking-[0.22em] uppercase text-muted"
          style={{ marginBottom: '14px' }}
        >
          Modo mantenimiento
        </span>
        <h1
          className="font-display uppercase leading-[.9]"
          style={{ fontSize: 'clamp(44px, 10vw, 88px)', letterSpacing: 0 }}
        >
          Volvemos <em className="not-italic italic" style={{ color: '#FF6B00' }}>pronto</em>
        </h1>
        <p className="mt-5 text-[15px] font-semibold leading-relaxed text-muted">
          Estamos haciendo mantenimiento, volvemos pronto.
        </p>
        <a
          href="/login"
          className="mt-7 inline-flex rounded-full px-5 py-3 text-[12px] font-extrabold uppercase"
          style={{ background: '#FF6B00', color: '#0A0A0A' }}
        >
          Entrar como admin
        </a>
      </section>
    </main>
  )
}

'use client'

export function SpecialsBanner() {
  return (
    <div
      className="mb-7 flex items-center gap-4 flex-wrap rounded-[24px] px-6 py-5"
      style={{
        background: 'linear-gradient(90deg, rgba(91,45,142,.18), rgba(91,45,142,.04))',
        border: '1px solid rgba(168,140,220,.22)',
      }}
    >
      <div
        className="w-11 h-11 rounded-[14px] grid place-items-center shrink-0"
        style={{ background: '#5B2D8E' }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h2"/>
          <path d="M18 9h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-2"/>
          <path d="M4 22h16"/>
          <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
          <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
        </svg>
      </div>

      <div className="flex-1 min-w-[200px]">
        <h4 className="font-display text-[15px] uppercase tracking-[0.02em] leading-[1.1] mb-1">
          Apuestas especiales · sin cargar
        </h4>
        <p className="text-[#cfcfcf] text-[13px] font-medium leading-[1.4]">
          Cerramos el <b className="text-white">11 de junio</b>. Valen hasta{' '}
          <b className="text-white">50 pts</b> en total.
        </p>
      </div>

      <button
        className="inline-flex items-center gap-2 px-[18px] py-3 rounded-full font-extrabold text-[13px] shrink-0 transition-all duration-150 hover:-translate-y-px"
        style={{ background: '#5B2D8E', color: '#fff' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#6f3aa6'
          e.currentTarget.style.boxShadow = '0 10px 24px -10px rgba(91,45,142,.6)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#5B2D8E'
          e.currentTarget.style.boxShadow = ''
        }}
      >
        Cargarlas →
      </button>
    </div>
  )
}

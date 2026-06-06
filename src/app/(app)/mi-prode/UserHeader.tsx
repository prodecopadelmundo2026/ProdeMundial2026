import { PRODE_SUBMISSION_CUTOFF_AT } from '@/lib/tournament-dates'

type Props = {
  name: string
  totalPoints: number
  rank: number | null
  exactPredictions: number
  partialPredictions: number
  finishedMatchesCount: number
  filledCount: number
  totalCount: number
}

export function UserHeader({
  name,
  totalPoints,
  rank,
  exactPredictions,
  partialPredictions,
  finishedMatchesCount,
  filledCount,
  totalCount,
}: Props) {
  const initial = name ? name.charAt(0).toUpperCase() : '?'
  const hitPercent =
    finishedMatchesCount > 0
      ? Math.round(((exactPredictions + partialPredictions) / finishedMatchesCount) * 100)
      : null
  const fillPercent = totalCount > 0 ? Math.round((filledCount / totalCount) * 100) : 0
  const cutoffLabel = new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date(PRODE_SUBMISSION_CUTOFF_AT))

  return (
    <div
      style={{
        display: 'grid',
        gap: '14px',
        gridTemplateColumns: '1fr',
        marginBottom: '28px',
      }}
      className="min-[780px]:grid-cols-[1fr_320px]"
    >
      {/* User card */}
      <div
        style={{
          position: 'relative',
          background: '#141414',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '24px',
          padding: '28px 28px 24px',
          overflow: 'hidden',
        }}
      >
        {/* Soft orange glow */}
        <div
          style={{
            position: 'absolute',
            right: '-30%',
            top: '-30%',
            width: '60%',
            height: '60%',
            background: '#FF6B00',
            borderRadius: '50%',
            opacity: 0.08,
            filter: 'blur(20px)',
            pointerEvents: 'none',
          }}
        />

        {/* Top row: avatar + greeting + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px', position: 'relative', zIndex: 2 }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg,#5B2D8E,#1565C0)',
              display: 'grid',
              placeItems: 'center',
              fontFamily: 'var(--font-display, inherit)',
              fontSize: '20px',
              fontWeight: 900,
              border: '2px solid #2a2a2a',
              flexShrink: 0,
            }}
          >
            {initial}
          </div>
          <div>
            <p
              style={{
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: '#8A8A8A',
                marginBottom: '4px',
              }}
            >
              Bienvenido de vuelta
            </p>
            <p
              className="font-display"
              style={{
                fontSize: 'clamp(22px, 3.5vw, 32px)',
                lineHeight: 1,
                letterSpacing: '-0.02em',
              }}
            >
              {name}
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3,1fr)',
            position: 'relative',
            zIndex: 2,
          }}
        >
          {/* Puntos */}
          <div style={{ padding: '14px 14px 14px 0', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
            <p
              className="font-display"
              style={{ fontSize: 'clamp(26px, 3.5vw, 34px)', lineHeight: 1, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}
            >
              {totalPoints}
            </p>
            <p style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#8A8A8A', marginTop: '6px' }}>
              Puntos
            </p>
            <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#8A8A8A', marginTop: '4px' }}>
              {rank != null ? `#${rank} en el ranking` : 'Sin ranking aún'}
            </span>
          </div>

          {/* Posición */}
          <div style={{ padding: '14px', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
            <p
              className="font-display"
              style={{ fontSize: 'clamp(26px, 3.5vw, 34px)', lineHeight: 1, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', color: '#A8F0D8' }}
            >
              {rank != null ? `#${rank}` : '—'}
            </p>
            <p style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#8A8A8A', marginTop: '6px' }}>
              Posición
            </p>
            <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#8A8A8A', marginTop: '4px' }}>
              en el ranking global
            </span>
          </div>

          {/* Aciertos */}
          <div style={{ padding: '14px 0 14px 14px' }}>
            <p
              className="font-display"
              style={{ fontSize: 'clamp(26px, 3.5vw, 34px)', lineHeight: 1, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}
            >
              {hitPercent != null ? (
                <>
                  {hitPercent}
                  <em style={{ fontStyle: 'normal', color: '#8A8A8A', fontSize: '0.7em' }}>%</em>
                </>
              ) : '—'}
            </p>
            <p style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#8A8A8A', marginTop: '6px' }}>
              Aciertos
            </p>
            <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#8A8A8A', marginTop: '4px' }}>
              {exactPredictions} exactos · {partialPredictions} parciales
            </span>
          </div>
        </div>
      </div>

      {/* Progress card */}
      <div
        style={{
          background: '#141414',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '24px',
          padding: '28px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '18px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#8A8A8A' }}>
              Tu prode
            </p>
            <p
              className="font-display"
              style={{ fontSize: 'clamp(28px, 4vw, 36px)', lineHeight: 1, letterSpacing: '-0.03em', marginTop: '6px' }}
            >
              {filledCount}
              <em style={{ fontStyle: 'normal', color: '#8A8A8A', fontSize: '0.6em', letterSpacing: '-0.02em' }}>/{totalCount}</em>
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '11px', fontWeight: 800, color: '#FF6B00', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
              Cierre
            </p>
            <p
              className="font-mono"
              style={{ display: 'block', color: '#ffffff', fontSize: '14px', letterSpacing: '-0.01em', fontWeight: 800, textTransform: 'none', marginTop: '4px' }}
            >
              {cutoffLabel} ART
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div
            style={{
              position: 'relative',
              height: '10px',
              borderRadius: '999px',
              background: '#0a0a0a',
              border: '1px solid rgba(255,255,255,0.08)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: `${fillPercent}%`,
                background: 'linear-gradient(90deg, #FF6B00, #FFE040)',
                borderRadius: '999px',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, marginTop: '8px' }}>
            <span style={{ color: '#ffffff' }}>{filledCount} cargados</span>
            <span style={{ color: '#8A8A8A' }}>{totalCount - filledCount} pendientes</span>
          </div>
        </div>
      </div>
    </div>
  )
}

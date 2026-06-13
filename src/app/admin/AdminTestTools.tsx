'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminResetMatchResults, adminFillMatchesRandomly, type AdminToolResult } from './actions'

type State = 'idle' | 'confirm-reset' | 'confirm-fill' | 'confirm-both' | 'working' | 'done' | 'error'

export function AdminTestTools() {
  const router = useRouter()
  const [state, setState] = useState<State>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function clear() {
    setState('idle')
    setMessage(null)
  }

  function run(action: () => Promise<AdminToolResult>) {
    setState('working')
    startTransition(async () => {
      try {
        const result = await action()
        setMessage(result.message)
        setState(result.ok ? 'done' : 'error')
        if (result.ok) router.refresh()
      } catch (err) {
        setMessage(err instanceof Error ? err.message : 'Error desconocido')
        setState('error')
      }
    })
  }

  const pill = (extra?: React.CSSProperties): React.CSSProperties => ({
    padding: '8px 16px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 800,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    border: 'none',
    transition: 'opacity 0.15s',
    ...extra,
  })

  return (
    <details
      className="group"
      style={{
        background: '#0d0d0d',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '16px',
        overflow: 'hidden',
        marginBottom: '32px',
      }}
    >
      <summary
        className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden"
        style={{ padding: '14px 20px' }}
      >
        <span style={{ display: 'flex', minWidth: 0, alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', background: 'rgba(255,177,92,0.12)', color: '#FFB15C', border: '1px solid rgba(255,177,92,0.2)', padding: '3px 8px', borderRadius: '999px' }}>
            Dev
          </span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#cfcfcf' }}>Herramientas de prueba</span>
        </span>
        <span className="group-open:hidden" style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8A8A8A' }}>Ver</span>
        <span className="hidden group-open:inline" style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#8A8A8A' }}>Ocultar</span>
      </summary>

      <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        {state === 'idle' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <button style={pill({ background: 'rgba(255,59,59,0.12)', color: '#FF6B6B', border: '1px solid rgba(255,59,59,0.2)' })} onClick={() => setState('confirm-reset')}>
              1 - Borrar resultados
            </button>
            <button style={pill({ background: 'rgba(255,107,0,0.1)', color: '#FF6B00', border: '1px solid rgba(255,107,0,0.2)' })} onClick={() => setState('confirm-fill')}>
              2 - Generar datos de prueba
            </button>
            <button style={pill({ background: '#141414', color: '#cfcfcf', border: '1px solid rgba(255,255,255,0.1)' })} onClick={() => setState('confirm-both')}>
              3 - Reset + generar
            </button>
          </div>
        )}

        {state === 'confirm-reset' && (
          <Confirm
            text={<>Esto borra <strong style={{ color: '#fff' }}>todos los resultados oficiales</strong>, vuelve los partidos a <strong style={{ color: '#fff' }}>Proximo</strong> y no borra pronosticos de usuarios. Confirmar?</>}
            confirmLabel="Si, borrar"
            confirmStyle={{ background: 'rgba(255,59,59,0.15)', color: '#FF6B6B', border: '1px solid rgba(255,59,59,0.3)' }}
            onConfirm={() => run(adminResetMatchResults)}
            onCancel={clear}
            pill={pill}
          />
        )}

        {state === 'confirm-fill' && (
          <Confirm
            text={<>Esto puede reemplazar resultados existentes. Completar todos los partidos con goles aleatorios y marcarlos como <strong style={{ color: '#fff' }}>Finalizado</strong>?</>}
            confirmLabel="Si, completar"
            confirmStyle={{ background: 'rgba(255,107,0,0.15)', color: '#FF6B00', border: '1px solid rgba(255,107,0,0.3)' }}
            onConfirm={() => run(adminFillMatchesRandomly)}
            onCancel={clear}
            pill={pill}
          />
        )}

        {state === 'confirm-both' && (
          <Confirm
            text={<>Esto puede reemplazar resultados existentes. Borrar resultados y luego completar todo con goles aleatorios?</>}
            confirmLabel="Si, reset + completar"
            confirmStyle={{ background: '#141414', color: '#FF6B00', border: '1px solid rgba(255,107,0,0.3)' }}
            onConfirm={() => run(async () => {
              const reset = await adminResetMatchResults()
              if (!reset.ok) return reset
              const fill = await adminFillMatchesRandomly()
              return fill.ok
                ? { ok: true, message: `Reset completo. ${fill.message}`, count: fill.count }
                : fill
            })}
            onCancel={clear}
            pill={pill}
          />
        )}

        {state === 'working' && (
          <p style={{ fontSize: '13px', color: '#8A8A8A', fontStyle: 'italic' }}>Procesando...</p>
        )}

        {state === 'done' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#A8F0D8' }}>{message}</span>
            <button style={pill({ background: '#1a1a1a', color: '#8A8A8A', border: '1px solid rgba(255,255,255,0.06)' })} onClick={clear}>OK</button>
          </div>
        )}

        {state === 'error' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#FF6B6B' }}>{message}</span>
            <button style={pill({ background: '#1a1a1a', color: '#8A8A8A', border: '1px solid rgba(255,255,255,0.06)' })} onClick={clear}>Cerrar</button>
          </div>
        )}
      </div>
    </details>
  )
}

function Confirm({
  text,
  confirmLabel,
  confirmStyle,
  onConfirm,
  onCancel,
  pill,
}: {
  text: React.ReactNode
  confirmLabel: string
  confirmStyle: React.CSSProperties
  onConfirm: () => void
  onCancel: () => void
  pill: (extra?: React.CSSProperties) => React.CSSProperties
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
      <p style={{ fontSize: '13px', color: '#cfcfcf' }}>{text}</p>
      <button style={pill(confirmStyle)} onClick={onConfirm}>{confirmLabel}</button>
      <button style={pill({ background: '#1a1a1a', color: '#8A8A8A', border: '1px solid rgba(255,255,255,0.06)' })} onClick={onCancel}>Cancelar</button>
    </div>
  )
}

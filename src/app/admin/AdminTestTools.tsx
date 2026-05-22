'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminResetMatchResults, adminFillMatchesRandomly } from './actions'

type State = 'idle' | 'confirm-reset' | 'confirm-fill' | 'confirm-both' | 'working' | 'done' | 'error'

export function AdminTestTools() {
  const router = useRouter()
  const [state, setState] = useState<State>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function clear() { setState('idle'); setMessage(null) }

  function run(action: () => Promise<string>) {
    setState('working')
    startTransition(async () => {
      try {
        setMessage(await action())
        setState('done')
        router.refresh()
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
    <div
      style={{
        background: '#0d0d0d',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: '16px',
        overflow: 'hidden',
        marginBottom: '32px',
      }}
    >
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', background: 'rgba(255,177,92,0.12)', color: '#FFB15C', border: '1px solid rgba(255,177,92,0.2)', padding: '3px 8px', borderRadius: '999px' }}>
          Dev
        </span>
        <p style={{ fontSize: '13px', fontWeight: 700, color: '#cfcfcf' }}>Herramientas de prueba</p>
      </div>

      {/* Body */}
      <div style={{ padding: '16px 20px' }}>

        {state === 'idle' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <button style={pill({ background: 'rgba(255,59,59,0.12)', color: '#FF6B6B', border: '1px solid rgba(255,59,59,0.2)' })} onClick={() => setState('confirm-reset')}>
              1 · Borrar resultados
            </button>
            <button style={pill({ background: 'rgba(255,107,0,0.1)', color: '#FF6B00', border: '1px solid rgba(255,107,0,0.2)' })} onClick={() => setState('confirm-fill')}>
              2 · Completar aleatorio
            </button>
            <button style={pill({ background: '#141414', color: '#cfcfcf', border: '1px solid rgba(255,255,255,0.1)' })} onClick={() => setState('confirm-both')}>
              3 · Reset + completar
            </button>
          </div>
        )}

        {state === 'confirm-reset' && (
          <Confirm
            text={<>¿Borrar todos los resultados y volver los partidos a <strong style={{ color: '#fff' }}>Próximo</strong>?</>}
            confirmLabel="Sí, borrar"
            confirmStyle={{ background: 'rgba(255,59,59,0.15)', color: '#FF6B6B', border: '1px solid rgba(255,59,59,0.3)' }}
            onConfirm={() => run(async () => { await adminResetMatchResults(); return 'Resultados borrados. Todos los partidos volvieron a Próximo.' })}
            onCancel={clear}
            pill={pill}
          />
        )}

        {state === 'confirm-fill' && (
          <Confirm
            text={<>¿Completar todos los partidos con goles aleatorios y marcarlos como <strong style={{ color: '#fff' }}>Finalizado</strong>?</>}
            confirmLabel="Sí, completar"
            confirmStyle={{ background: 'rgba(255,107,0,0.15)', color: '#FF6B00', border: '1px solid rgba(255,107,0,0.3)' }}
            onConfirm={() => run(async () => { const n = await adminFillMatchesRandomly(); return `${n} partidos completados con scores aleatorios.` })}
            onCancel={clear}
            pill={pill}
          />
        )}

        {state === 'confirm-both' && (
          <Confirm
            text={<>¿<strong style={{ color: '#fff' }}>Borrar resultados</strong> y luego completar todo con goles aleatorios?</>}
            confirmLabel="Sí, reset + completar"
            confirmStyle={{ background: '#141414', color: '#FF6B00', border: '1px solid rgba(255,107,0,0.3)' }}
            onConfirm={() => run(async () => {
              await adminResetMatchResults()
              const n = await adminFillMatchesRandomly()
              return `Reset completo · ${n} partidos completados con scores aleatorios.`
            })}
            onCancel={clear}
            pill={pill}
          />
        )}

        {state === 'working' && (
          <p style={{ fontSize: '13px', color: '#8A8A8A', fontStyle: 'italic' }}>Procesando…</p>
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
    </div>
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

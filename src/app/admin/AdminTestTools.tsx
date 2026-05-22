'use client'

import { useTransition, useState } from 'react'
import { adminDeleteAllMyPredictions, adminFillAllRandomly } from './actions'

type State = 'idle' | 'confirm-delete' | 'confirm-fill' | 'confirm-reset' | 'working' | 'done' | 'error'

export function AdminTestTools() {
  const [state, setState] = useState<State>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function reset() { setState('idle'); setMessage(null) }

  function run(action: () => Promise<string>) {
    setState('working')
    startTransition(async () => {
      try {
        const msg = await action()
        setMessage(msg)
        setState('done')
      } catch (err) {
        setMessage(err instanceof Error ? err.message : 'Error desconocido')
        setState('error')
      }
    })
  }

  const btnBase: React.CSSProperties = {
    padding: '8px 16px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 800,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    cursor: 'pointer',
    border: 'none',
    transition: 'opacity 0.15s',
  }

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
      <div
        style={{
          padding: '14px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <span
          style={{
            fontSize: '9px',
            fontWeight: 800,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            background: 'rgba(255,177,92,0.12)',
            color: '#FFB15C',
            border: '1px solid rgba(255,177,92,0.2)',
            padding: '3px 8px',
            borderRadius: '999px',
          }}
        >
          Dev
        </span>
        <p style={{ fontSize: '13px', fontWeight: 700, color: '#cfcfcf' }}>
          Herramientas de prueba
        </p>
      </div>

      {/* Body */}
      <div style={{ padding: '16px 20px' }}>
        {state === 'idle' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <button
              style={{ ...btnBase, background: 'rgba(255,59,59,0.12)', color: '#FF6B6B', border: '1px solid rgba(255,59,59,0.2)' }}
              onClick={() => setState('confirm-delete')}
            >
              Borrar mis pronósticos
            </button>
            <button
              style={{ ...btnBase, background: 'rgba(255,107,0,0.1)', color: '#FF6B00', border: '1px solid rgba(255,107,0,0.2)' }}
              onClick={() => setState('confirm-fill')}
            >
              Completar todo aleatorio
            </button>
            <button
              style={{ ...btnBase, background: '#141414', color: '#cfcfcf', border: '1px solid rgba(255,255,255,0.1)' }}
              onClick={() => setState('confirm-reset')}
            >
              Reset + completar
            </button>
          </div>
        )}

        {state === 'confirm-delete' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
            <p style={{ fontSize: '13px', color: '#cfcfcf' }}>
              ¿Borrar <strong style={{ color: '#fff' }}>todos mis pronósticos</strong>?
            </p>
            <button
              style={{ ...btnBase, background: 'rgba(255,59,59,0.15)', color: '#FF6B6B', border: '1px solid rgba(255,59,59,0.3)' }}
              onClick={() =>
                run(async () => {
                  const n = await adminDeleteAllMyPredictions()
                  return `${n} pronósticos borrados.`
                })
              }
            >
              Sí, borrar
            </button>
            <button style={{ ...btnBase, background: '#1a1a1a', color: '#8A8A8A', border: '1px solid rgba(255,255,255,0.06)' }} onClick={reset}>
              Cancelar
            </button>
          </div>
        )}

        {state === 'confirm-fill' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
            <p style={{ fontSize: '13px', color: '#cfcfcf' }}>
              ¿Completar <strong style={{ color: '#fff' }}>todos los partidos</strong> con scores aleatorios?
            </p>
            <button
              style={{ ...btnBase, background: 'rgba(255,107,0,0.15)', color: '#FF6B00', border: '1px solid rgba(255,107,0,0.3)' }}
              onClick={() =>
                run(async () => {
                  const n = await adminFillAllRandomly()
                  return `${n} pronósticos generados.`
                })
              }
            >
              Sí, completar
            </button>
            <button style={{ ...btnBase, background: '#1a1a1a', color: '#8A8A8A', border: '1px solid rgba(255,255,255,0.06)' }} onClick={reset}>
              Cancelar
            </button>
          </div>
        )}

        {state === 'confirm-reset' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
            <p style={{ fontSize: '13px', color: '#cfcfcf' }}>
              ¿Borrar todo y <strong style={{ color: '#fff' }}>completar aleatorio</strong>?
            </p>
            <button
              style={{ ...btnBase, background: '#141414', color: '#FF6B00', border: '1px solid rgba(255,107,0,0.3)' }}
              onClick={() =>
                run(async () => {
                  await adminDeleteAllMyPredictions()
                  const n = await adminFillAllRandomly()
                  return `Reset completo · ${n} pronósticos generados.`
                })
              }
            >
              Sí, reset
            </button>
            <button style={{ ...btnBase, background: '#1a1a1a', color: '#8A8A8A', border: '1px solid rgba(255,255,255,0.06)' }} onClick={reset}>
              Cancelar
            </button>
          </div>
        )}

        {state === 'working' && (
          <p style={{ fontSize: '13px', color: '#8A8A8A', fontStyle: 'italic' }}>Procesando…</p>
        )}

        {state === 'done' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#A8F0D8' }}>{message}</span>
            <button style={{ ...btnBase, background: '#1a1a1a', color: '#8A8A8A', border: '1px solid rgba(255,255,255,0.06)' }} onClick={reset}>
              OK
            </button>
          </div>
        )}

        {state === 'error' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#FF6B6B' }}>{message}</span>
            <button style={{ ...btnBase, background: '#1a1a1a', color: '#8A8A8A', border: '1px solid rgba(255,255,255,0.06)' }} onClick={reset}>
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

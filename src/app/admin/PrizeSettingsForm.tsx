'use client'

import { useActionState } from 'react'
import { updatePrizeSettings, type AdminToolResult } from './actions'
import { formatCurrency } from '@/lib/prode-progress'

type Props = {
  firstPrize: number
  secondPrize: number
  thirdPrize: number
  isManual: boolean
}

export function PrizeSettingsForm({ firstPrize, secondPrize, thirdPrize, isManual }: Props) {
  const [state, formAction, pending] = useActionState<AdminToolResult | null, FormData>(updatePrizeSettings, null)
  const fields: Array<{ name: string; label: string; value: number }> = [
    { name: 'first_prize', label: 'Primer puesto', value: firstPrize },
    { name: 'second_prize', label: 'Segundo puesto', value: secondPrize },
    { name: 'third_prize', label: 'Tercer puesto', value: thirdPrize },
  ]

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-3">
        {fields.map(({ name, label, value }) => (
          <label key={name} className="grid gap-2 rounded-[14px] p-3" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>
            <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted">{label}</span>
            <input
              name={name}
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              defaultValue={value}
              className="w-full rounded-[12px] bg-[#0A0A0A] px-3 py-3 font-mono text-[16px] font-extrabold text-white outline-none"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}
            />
          </label>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[12px] font-bold text-muted">
            Estado actual: {isManual ? 'premios manuales publicados' : 'fallback automatico proporcional'}.
          </p>
          <p className="mt-1 text-[11px] font-semibold text-muted">
            Vista previa: {formatCurrency(firstPrize)} / {formatCurrency(secondPrize)} / {formatCurrency(thirdPrize)}
          </p>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full px-5 py-3 text-[12px] font-extrabold uppercase transition-opacity disabled:opacity-60"
          style={{ background: '#FF6B00', color: '#0A0A0A', border: '1px solid #FF6B00' }}
        >
          {pending ? 'Guardando...' : 'Guardar premios'}
        </button>
      </div>

      {state && (
        <p
          className="rounded-[12px] px-3 py-3 text-[12px] font-bold"
          style={{
            background: state.ok ? 'rgba(168,240,216,0.1)' : 'rgba(255,107,107,0.12)',
            border: state.ok ? '1px solid rgba(168,240,216,0.24)' : '1px solid rgba(255,107,107,0.24)',
            color: state.ok ? '#A8F0D8' : '#FF6B6B',
          }}
        >
          {state.message}
        </p>
      )}
    </form>
  )
}

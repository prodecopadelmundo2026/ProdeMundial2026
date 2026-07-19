'use client'

import { useEffect, useState } from 'react'
import { WORLD_CUP_FIRST_MATCH_AT } from '@/lib/tournament-dates'

function pad(n: number) {
  return String(Math.max(0, n)).padStart(2, '0')
}

type CountdownTimerProps = {
  targetAt?: string
  doneMessage?: string
  showDays?: boolean
  className?: string
}

export function CountdownTimer({
  targetAt = WORLD_CUP_FIRST_MATCH_AT,
  doneMessage = 'El Mundial ya arranco',
  showDays = true,
  className = '',
}: CountdownTimerProps) {
  const [diff, setDiff] = useState<number | null>(null)
  const targetMs = new Date(targetAt).getTime()
  const labels = showDays ? ['DIAS', 'HS', 'MIN', 'SEG'] : ['HORAS', 'MIN', 'SEG']

  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null

    function update() {
      const remaining = Math.max(0, targetMs - Date.now())
      setDiff(remaining)
      if (remaining === 0 && id) {
        clearInterval(id)
        id = null
      }
    }

    update()
    if (targetMs > Date.now()) id = setInterval(update, 1000)
    return () => {
      if (id) clearInterval(id)
    }
  }, [targetMs])

  if (diff === null) {
    return (
      <div className={`grid gap-[10px] ${showDays ? 'grid-cols-4' : 'grid-cols-3'} ${className}`} aria-hidden="true">
        {labels.map((label) => (
          <div key={label} className="min-w-0 rounded-[14px] bg-bg px-2 py-[14px] text-center" style={{ border: '1px solid rgba(255,255,255,0.04)' }}>
            <div className="font-display text-[clamp(28px,8vw,48px)] leading-none tracking-[-0.04em] tabular-nums">--</div>
            <div className="mt-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted">{label}</div>
          </div>
        ))}
      </div>
    )
  }

  if (diff <= 0) {
    return (
      <div className={`text-center font-display text-[clamp(26px,7vw,42px)] uppercase leading-none tracking-tight text-orange ${className}`}>
        {doneMessage}
      </div>
    )
  }

  const days = Math.floor(diff / 86_400_000)
  const hours = showDays
    ? Math.floor((diff % 86_400_000) / 3_600_000)
    : Math.floor(diff / 3_600_000)
  const minutes = Math.floor((diff % 3_600_000) / 60_000)
  const seconds = Math.floor((diff % 60_000) / 1_000)

  const cells = showDays
    ? [
        { num: days, label: 'DIAS' },
        { num: hours, label: 'HS' },
        { num: minutes, label: 'MIN' },
        { num: seconds, label: 'SEG' },
      ]
    : [
        { num: hours, label: 'HORAS' },
        { num: minutes, label: 'MIN' },
        { num: seconds, label: 'SEG' },
      ]

  return (
    <div className={`grid gap-[10px] ${showDays ? 'grid-cols-4' : 'grid-cols-3'} ${className}`}>
      {cells.map(({ num, label }) => (
        <div
          key={label}
          className="min-w-0 rounded-[14px] bg-bg px-2 py-[14px] text-center"
          style={{ border: '1px solid rgba(255,255,255,0.04)' }}
        >
          <div className="font-display text-[clamp(28px,8vw,48px)] leading-none tracking-[-0.04em] tabular-nums">
            {pad(num)}
          </div>
          <div className="mt-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted">
            {label}
          </div>
        </div>
      ))}
    </div>
  )
}

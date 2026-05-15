'use client'

import { useEffect, useState } from 'react'

const TARGET = new Date('2026-06-11T19:00:00Z')

function pad(n: number) {
  return String(Math.max(0, n)).padStart(2, '0')
}

export function CountdownTimer() {
  const [diff, setDiff] = useState<number | null>(null)

  useEffect(() => {
    setDiff(TARGET.getTime() - Date.now())
    const id = setInterval(() => setDiff(TARGET.getTime() - Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  if (diff === null) {
    return <div className="grid grid-cols-4 gap-[10px]" aria-hidden="true">
      {['DÍAS','HS','MIN','SEG'].map((label) => (
        <div key={label} className="bg-bg rounded-[14px] py-[14px] px-2 text-center" style={{ border: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="font-display text-[clamp(28px,6vw,40px)] leading-none tracking-[-0.04em] tabular-nums">--</div>
          <div className="mt-2 text-[10px] font-extrabold tracking-[0.2em] text-muted uppercase">{label}</div>
        </div>
      ))}
    </div>
  }

  if (diff <= 0) {
    return (
      <div className="text-center font-display text-2xl text-orange tracking-tight">
        ¡El Mundial ya arrancó!
      </div>
    )
  }

  const days = Math.floor(diff / 86_400_000)
  const hours = Math.floor((diff % 86_400_000) / 3_600_000)
  const minutes = Math.floor((diff % 3_600_000) / 60_000)
  const seconds = Math.floor((diff % 60_000) / 1_000)

  const cells = [
    { num: days, label: 'DÍAS' },
    { num: hours, label: 'HS' },
    { num: minutes, label: 'MIN' },
    { num: seconds, label: 'SEG' },
  ]

  return (
    <div className="grid grid-cols-4 gap-[10px]">
      {cells.map(({ num, label }) => (
        <div
          key={label}
          className="bg-bg rounded-[14px] py-[14px] px-2 text-center"
          style={{ border: '1px solid rgba(255,255,255,0.04)' }}
        >
          <div className="font-display text-[clamp(28px,6vw,40px)] leading-none tracking-[-0.04em] tabular-nums">
            {pad(num)}
          </div>
          <div className="mt-2 text-[10px] font-extrabold tracking-[0.2em] text-muted uppercase">
            {label}
          </div>
        </div>
      ))}
    </div>
  )
}

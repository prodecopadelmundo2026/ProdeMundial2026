'use client'
import { useEffect, useState } from 'react'
import type { DailyEvent } from '@/lib/daily-prode/model'
import { countdownState, countdownText } from '@/lib/daily-prode/journey'

export function DailyCountdown({ event }: { event?: DailyEvent }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => { if (!event || countdownState(event) !== 'future') return; const id = window.setInterval(() => setNow(new Date()), 1000); return () => window.clearInterval(id) }, [event])
  const text = countdownText(event, now)
  return <p aria-live="polite" className="font-mono text-[11px] font-extrabold uppercase tracking-[.1em] text-mint">Próximo evento: {text}</p>
}

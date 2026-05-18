import type { Match } from '@/types'

type Props = {
  match: Pick<Match, 'status' | 'locked_at'>
  liveMinute?: number
}

export function StatusBadge({ match, liveMinute }: Props) {
  const now = new Date()
  const lockedAt = new Date(match.locked_at)

  const base = 'inline-flex items-center gap-1.5 px-[10px] py-[5px] rounded-full text-[10px] font-extrabold tracking-[0.18em] uppercase'
  const dot = 'w-1.5 h-1.5 rounded-full'

  if (match.status === 'finished') {
    return (
      <span className={base} style={{ background: 'rgba(255,255,255,0.06)', color: '#9a9a9a' }}>
        <span className={dot} style={{ background: '#9a9a9a' }} />
        Finalizado
      </span>
    )
  }

  if (match.status === 'live') {
    return (
      <span className={base} style={{ background: 'rgba(255,59,59,0.18)', color: '#FF6B6B' }}>
        <span className={dot} style={{ background: '#FF6B6B', animation: 'blink 1s infinite' }} />
        {liveMinute ? `En vivo · ${liveMinute}'` : 'En vivo'}
      </span>
    )
  }

  if (now >= lockedAt) {
    return (
      <span className={base} style={{ background: 'rgba(123,92,210,0.18)', color: '#A892E8' }}>
        <span className={dot} style={{ background: '#A892E8' }} />
        Cerrado
      </span>
    )
  }

  return (
    <span className={base} style={{ background: 'rgba(168,240,216,0.14)', color: '#A8F0D8' }}>
      <span className={dot} style={{ background: '#A8F0D8' }} />
      Abierto
    </span>
  )
}

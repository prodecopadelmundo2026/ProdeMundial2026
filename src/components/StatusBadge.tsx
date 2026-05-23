import type { Match } from '@/types'

type Props = {
  match: Pick<Match, 'status'>
}

export function StatusBadge({ match }: Props) {
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

  return (
    <span className={base} style={{ background: 'rgba(168,240,216,0.14)', color: '#A8F0D8' }}>
      <span className={dot} style={{ background: '#A8F0D8' }} />
      Abierto
    </span>
  )
}

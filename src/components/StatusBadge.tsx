import type { Match } from '@/types'

type Props = {
  match: Pick<Match, 'status' | 'locked_at'>
}

export function StatusBadge({ match }: Props) {
  const now = new Date()
  const lockedAt = new Date(match.locked_at)

  if (match.status === 'finished') {
    return (
      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
        Finalizado
      </span>
    )
  }

  if (match.status === 'live') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
        <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 animate-pulse" />
        En vivo
      </span>
    )
  }

  if (now >= lockedAt) {
    return (
      <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-600">
        Cerrado
      </span>
    )
  }

  return (
    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
      Abierto
    </span>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { setMatchResult } from './actions'
import type { Match } from '@/types'

export function AdminMatchForm({ match }: { match: Match }) {
  const [home, setHome] = useState(match.home_score?.toString() ?? '')
  const [away, setAway] = useState(match.away_score?.toString() ?? '')
  const [status, setStatus] = useState<Match['status']>(match.status)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setOk(false)

    if (home === '' || away === '') {
      setError('Ingresá ambos goles')
      return
    }

    startTransition(async () => {
      try {
        await setMatchResult(match.id, Number(home), Number(away), status)
        setOk(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2 mt-2">
      <input
        type="number"
        min={0}
        max={30}
        value={home}
        onChange={(e) => { setHome(e.target.value); setOk(false) }}
        className="w-12 text-center border border-gray-200 rounded-lg py-1.5 text-sm focus:outline-none focus:border-green-500"
        placeholder="0"
      />
      <span className="text-gray-400">—</span>
      <input
        type="number"
        min={0}
        max={30}
        value={away}
        onChange={(e) => { setAway(e.target.value); setOk(false) }}
        className="w-12 text-center border border-gray-200 rounded-lg py-1.5 text-sm focus:outline-none focus:border-green-500"
        placeholder="0"
      />
      <select
        value={status}
        onChange={(e) => { setStatus(e.target.value as Match['status']); setOk(false) }}
        className="border border-gray-200 rounded-lg py-1.5 px-2 text-sm focus:outline-none focus:border-green-500"
      >
        <option value="upcoming">Próximo</option>
        <option value="live">En vivo</option>
        <option value="finished">Finalizado</option>
      </select>
      <button
        type="submit"
        disabled={isPending}
        className="px-3 py-1.5 rounded-lg text-sm font-medium text-white disabled:opacity-50"
        style={{ backgroundColor: '#0a3d1f' }}
      >
        {isPending ? <Loader2 size={14} className="animate-spin" /> : 'Guardar'}
      </button>
      {ok && <span className="text-xs text-green-600 font-medium">✓ Guardado</span>}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </form>
  )
}

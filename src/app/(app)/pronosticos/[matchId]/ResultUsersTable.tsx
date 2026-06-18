'use client'

import { useEffect, useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { percent, type ResultDistributionRow } from '@/lib/prediction-insights'

type SelectedScore = {
  homeScore: number
  awayScore: number
}

type UserNameRow = {
  name: string | null
}

type MyPrediction = {
  home_score: number
  away_score: number
}

function scoreLabel(score: SelectedScore) {
  return `${score.homeScore}-${score.awayScore}`
}

function normalizeName(value: string | null | undefined) {
  const trimmed = value?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : 'Participante'
}

export function ResultUsersTable({
  matchId,
  rows,
  totalCount,
  myPrediction,
}: {
  matchId: string
  rows: ResultDistributionRow[]
  totalCount: number
  myPrediction: MyPrediction | null
}) {
  const [selectedScore, setSelectedScore] = useState<SelectedScore | null>(null)
  const [names, setNames] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const modalOpen = selectedScore !== null

  async function openPlayers(score: SelectedScore) {
    setSelectedScore(score)
    const supabase = createClient()

    setLoading(true)
    setError(null)
    setNames([])

    try {
      const { data, error: rpcError } = await supabase.rpc('get_match_prediction_users_by_score', {
        p_match_id: matchId,
        p_home_score: score.homeScore,
        p_away_score: score.awayScore,
      })

      if (rpcError) {
        setError('No se pudieron cargar los jugadores.')
        setNames([])
      } else {
        setNames(((data ?? []) as UserNameRow[]).map((row) => normalizeName(row.name)))
      }
    } catch {
      setError('No se pudieron cargar los jugadores.')
      setNames([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!modalOpen) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeModal()
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [modalOpen])

  function closeModal() {
    setSelectedScore(null)
    setNames([])
    setError(null)
    setLoading(false)
  }

  return (
    <>
      <div className="overflow-hidden rounded-[18px] bg-[#0A0A0A]" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="grid grid-cols-[1fr_78px_78px_112px] gap-3 border-b border-white/10 px-4 py-3 font-mono text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted max-[700px]:grid-cols-[1fr_58px_60px]">
          <span>Resultado</span>
          <span className="text-right">Cantidad</span>
          <span className="text-right">Porcentaje</span>
          <span className="text-right max-[700px]:hidden">Jugadores</span>
        </div>
        {rows.map((row) => {
          const score = { homeScore: row.home_score, awayScore: row.away_score }
          const isMyPrediction = myPrediction?.home_score === row.home_score && myPrediction.away_score === row.away_score
          return (
            <div
              key={`${row.home_score}-${row.away_score}`}
              className="grid grid-cols-[1fr_78px_78px_112px] items-center gap-3 border-b border-white/[0.06] px-4 py-3 last:border-0 max-[700px]:grid-cols-[1fr_58px_60px]"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-[24px] leading-none">{row.home_score}-{row.away_score}</span>
                  {isMyPrediction && (
                    <span
                      className="rounded-full px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.1em]"
                      style={{ background: 'rgba(255,107,0,0.14)', border: '1px solid rgba(255,107,0,0.3)', color: '#FFB15C' }}
                    >
                      Mi apuesta
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => openPlayers(score)}
                  className="mt-2 block rounded-full bg-white/[0.06] px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-white min-[701px]:hidden"
                  style={{ border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  Ver jugadores
                </button>
              </div>
              <span className="text-right text-[14px] font-bold tabular-nums">{row.picked_count}</span>
              <span className="text-right text-[14px] font-bold tabular-nums text-orange">
                {percent(row.picked_count, totalCount)}%
              </span>
              <span className="text-right max-[700px]:hidden">
                <button
                  type="button"
                  onClick={() => openPlayers(score)}
                  className="rounded-full bg-orange px-3 py-2 text-[10px] font-extrabold uppercase tracking-[0.08em] text-bg transition-transform hover:-translate-y-0.5"
                >
                  Ver jugadores
                </button>
              </span>
            </div>
          )
        })}
      </div>

      {selectedScore && (
        <div className="fixed inset-0 z-[220] grid place-items-center px-4 py-6">
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-black/72"
            aria-label="Cerrar jugadores"
            onClick={closeModal}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="prediction-users-title"
            className="relative max-h-[calc(100dvh-48px)] w-full max-w-[520px] overflow-hidden rounded-[24px] bg-[#101010] p-5 shadow-2xl min-[640px]:p-6"
            style={{ border: '1px solid rgba(255,255,255,0.12)' }}
          >
            <div className="absolute inset-x-0 top-0 h-1.5 bg-orange" aria-hidden="true" />
            <button
              type="button"
              aria-label="Cerrar"
              onClick={closeModal}
              className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-muted transition-colors hover:bg-white/5 hover:text-white"
            >
              <X size={18} aria-hidden="true" />
            </button>

            <p className="mb-3 inline-flex rounded-full bg-orange/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-orange">
              Resultado elegido
            </p>
            <h2 id="prediction-users-title" className="pr-10 font-display text-[34px] uppercase leading-none tracking-[-0.02em]">
              Eligieron {scoreLabel(selectedScore)}
            </h2>

            <div className="mt-5 max-h-[52dvh] overflow-y-auto rounded-[18px] bg-[#0A0A0A] p-3" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              {loading && (
                <div className="flex items-center gap-3 px-2 py-8 text-[13px] font-bold text-muted">
                  <Loader2 className="h-4 w-4 animate-spin text-orange" aria-hidden="true" />
                  Cargando jugadores...
                </div>
              )}

              {!loading && error && (
                <p className="px-2 py-8 text-[13px] font-bold text-[#FF6B6B]">{error}</p>
              )}

              {!loading && !error && names.length === 0 && (
                <p className="px-2 py-8 text-[13px] font-bold text-muted">No hay jugadores para este resultado.</p>
              )}

              {!loading && !error && names.length > 0 && (
                <ul className="grid gap-2">
                  {names.map((name, index) => (
                    <li
                      key={`${name}-${index}`}
                      className="flex items-center gap-3 rounded-[14px] bg-white/[0.04] px-3 py-3"
                      style={{ border: '1px solid rgba(255,255,255,0.07)' }}
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-orange font-display text-[13px] text-bg">
                        {name[0]?.toUpperCase() ?? 'P'}
                      </span>
                      <span className="min-w-0 truncate text-[14px] font-extrabold text-white">{name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-full bg-orange px-5 py-3 text-[12px] font-extrabold text-bg transition-transform hover:-translate-y-0.5"
              >
                Cerrar
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  )
}

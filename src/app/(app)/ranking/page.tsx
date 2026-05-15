import { createClient } from '@/lib/supabase/server'
import type { RankingEntry } from '@/types'

function medal(rank: number) {
  if (rank === 1) return { emoji: '🥇', color: '#FFE040' }
  if (rank === 2) return { emoji: '🥈', color: '#C0C0C0' }
  if (rank === 3) return { emoji: '🥉', color: '#CD7F32' }
  return null
}

export default async function RankingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: ranking } = await supabase
    .from('ranking_entries')
    .select('*')
    .order('rank', { ascending: true })

  const entries = (ranking ?? []) as RankingEntry[]

  return (
    <div className="max-w-[860px] mx-auto px-5 py-12">
      {/* Header */}
      <div className="mb-10">
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-4 text-[11px] font-extrabold tracking-[0.18em] uppercase"
          style={{ background: 'rgba(168,240,216,0.1)', color: '#A8F0D8' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-mint" style={{ animation: 'pulse-dot 1.6s infinite' }} />
          EN VIVO
        </div>
        <h1
          className="font-display text-[clamp(36px,6vw,56px)] leading-[.9] tracking-[-0.03em] uppercase"
        >
          Ranking
        </h1>
        <p className="mt-3 text-muted text-[15px] font-medium">
          {entries.length} participante{entries.length !== 1 ? 's' : ''} · actualizado automáticamente
        </p>
      </div>

      {entries.length === 0 ? (
        <div
          className="rounded-[24px] bg-panel p-16 text-center"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="font-display text-[48px] mb-4">🏆</div>
          <p className="font-display text-[20px] tracking-[-0.01em] uppercase mb-2">
            Aún no hay resultados
          </p>
          <p className="text-muted text-[14px]">
            El ranking se actualiza cuando se cargan los resultados de los partidos.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map((entry) => {
            const isMe = user?.id === entry.user_id
            const m = medal(entry.rank)
            return (
              <div
                key={entry.user_id}
                className="relative flex items-center gap-4 rounded-[20px] px-5 py-4 transition-all duration-150"
                style={{
                  background: isMe ? 'rgba(255,107,0,0.08)' : '#141414',
                  border: `1px solid ${isMe ? 'rgba(255,107,0,0.3)' : 'rgba(255,255,255,0.08)'}`,
                }}
              >
                {/* Rank */}
                <div
                  className="w-10 shrink-0 text-center font-display text-[18px] leading-none tracking-[-0.02em]"
                  style={{ color: m?.color ?? '#4a4a4a' }}
                >
                  {m ? m.emoji : `#${entry.rank}`}
                </div>

                {/* Avatar */}
                <div
                  className="w-9 h-9 rounded-full shrink-0 grid place-items-center font-bold text-[13px]"
                  style={{
                    background: isMe
                      ? 'linear-gradient(135deg, #FF6B00, #FF9A3C)'
                      : 'linear-gradient(135deg, #5B2D8E, #1565C0)',
                    border: '2px solid rgba(255,255,255,0.1)',
                  }}
                >
                  {entry.name?.[0]?.toUpperCase() ?? '?'}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[15px] truncate">
                    {entry.name}
                    {isMe && (
                      <span className="ml-2 text-[11px] font-extrabold tracking-[0.1em] text-orange">
                        VOS
                      </span>
                    )}
                  </div>
                  <div className="text-muted text-[12px] font-semibold mt-0.5 hidden min-[480px]:block">
                    {entry.exact_predictions ?? 0} exactas · {entry.correct_result_predictions ?? 0} resultado
                  </div>
                </div>

                {/* Points */}
                <div className="shrink-0 text-right">
                  <div
                    className="font-display text-[28px] leading-none tracking-[-0.03em]"
                    style={{ color: m ? m.color : isMe ? '#FF6B00' : '#fff' }}
                  >
                    {entry.total_points}
                  </div>
                  <div className="text-muted text-[11px] font-extrabold tracking-[0.1em] uppercase mt-0.5">
                    pts
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

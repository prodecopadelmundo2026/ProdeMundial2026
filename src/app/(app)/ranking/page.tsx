import { createClient } from '@/lib/supabase/server'
import type { RankingEntry } from '@/types'
import { RankingClient } from './RankingClient'

export default async function RankingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: ranking } = await supabase
    .from('ranking_entries')
    .select('*')
    .order('rank', { ascending: true })

  const entries = (ranking ?? []) as RankingEntry[]

  return (
    <div style={{ padding: 'clamp(40px,8vw,64px) 20px clamp(60px,12vw,100px)' }}>
      <div className="max-w-[880px] mx-auto">

        {/* Page head */}
        <div style={{ marginBottom: '32px' }}>
          <span
            className="inline-block font-sans text-[12px] font-extrabold tracking-[0.22em] uppercase text-muted"
            style={{ marginBottom: '18px' }}
          >
            Tabla en vivo
          </span>
          <h1
            className="font-display uppercase leading-[.9] tracking-[-0.04em]"
            style={{ fontSize: 'clamp(48px, 9vw, 108px)' }}
          >
            <em className="not-italic italic" style={{ color: '#FF6B00' }}>Ranking</em>
          </h1>
          <p className="font-mono text-[13px] font-bold text-muted tracking-[0.04em] mt-[14px]">
            Mundial 2026 · USA · Canadá · México
          </p>
        </div>

        {/* Info banner */}
        <aside
          className="flex items-center gap-3 rounded-[16px] px-[18px] py-[14px] text-[13px] mb-6"
          style={{
            background: 'linear-gradient(90deg, rgba(168,240,216,0.07), rgba(168,240,216,0.02))',
            border: '1px solid rgba(168,240,216,0.22)',
            color: '#cfcfcf',
          }}
        >
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: '#A8F0D8', animation: 'pulse-dot 1.6s infinite' }}
          />
          <span>
            El ranking arranca con el primer pitazo · <b className="text-white">11 de junio, 16:00</b>
          </span>
        </aside>

        <RankingClient entries={entries} userId={user?.id} />
      </div>
    </div>
  )
}

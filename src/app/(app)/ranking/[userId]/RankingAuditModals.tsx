'use client'

import { useEffect, useState } from 'react'
import type { MatchAuditRow, AuditStatus } from '@/lib/ranking-audit'
import type { KnockoutBonusLedgerItem, KnockoutBonusRound } from '@/lib/knockout-bonus'

type AuditView = 'groups' | 'knockout' | 'trajectory' | 'exact' | 'partial' | 'incorrect'

const VIEW_META: Record<AuditView, { label: string; color: string }> = {
  groups: { label: 'Fase de grupos', color: '#A8F0D8' },
  knockout: { label: 'Eliminatorias', color: '#FFB15C' },
  trajectory: { label: 'Bonus eliminatorias', color: '#A8F0D8' },
  exact: { label: 'Exactas', color: '#A8F0D8' },
  partial: { label: 'Parciales', color: '#FFB15C' },
  incorrect: { label: 'Incorrectas', color: '#FF6B6B' },
}

const STAGE_ORDER: MatchAuditRow['stage'][] = ['group', 'round_of_32', 'round_of_16', 'quarter', 'semi', 'third_place', 'final']
const STAGE_LABELS: Record<MatchAuditRow['stage'], string> = {
  group: 'Fase de grupos',
  round_of_32: '16avos',
  round_of_16: 'Octavos',
  quarter: 'Cuartos',
  semi: 'Semis',
  third_place: 'Tercer puesto',
  final: 'Final',
}
const BONUS_ORDER: KnockoutBonusRound[] = ['round_of_32', 'round_of_16', 'quarterfinal', 'semifinal', 'final', 'champion']
const BONUS_LABELS: Record<KnockoutBonusRound, string> = {
  round_of_32: '16avos',
  round_of_16: 'Octavos',
  quarterfinal: 'Cuartos',
  semifinal: 'Semis',
  final: 'Final',
  champion: 'Campeón',
}

function tileClass() {
  return 'group rounded-[14px] bg-[#141414] p-3 text-left transition-all hover:-translate-y-0.5 hover:bg-[#191919] focus:outline-none focus-visible:ring-2 focus-visible:ring-orange sm:rounded-[16px] sm:p-4'
}

function AuditTile({ view, value, onOpen }: { view: AuditView; value: string | number; onOpen: (view: AuditView) => void }) {
  const meta = VIEW_META[view]
  return (
    <button type="button" onClick={() => onOpen(view)} className={tileClass()} style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
      <span className="block truncate font-mono text-[9px] font-extrabold uppercase tracking-[0.12em] text-muted sm:text-[10px]">{meta.label}</span>
      <span className="mt-1 block font-display text-[24px] leading-none text-white sm:mt-2 sm:text-[30px]">{value}</span>
      <span className="mt-2 block text-[10px] font-extrabold uppercase tracking-[0.08em] opacity-70 transition-opacity group-hover:opacity-100" style={{ color: meta.color }}>
        Ver auditoría
      </span>
    </button>
  )
}

function StaticTile({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="rounded-[14px] bg-[#141414] p-3 sm:rounded-[16px] sm:p-4" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
      <span className="block truncate font-mono text-[9px] font-extrabold uppercase tracking-[0.12em] text-muted sm:text-[10px]">{label}</span>
      <span className="mt-1 block font-display text-[24px] leading-none sm:mt-2 sm:text-[30px]" style={{ color: color ?? '#fff' }}>{value}</span>
    </div>
  )
}

function MatchAuditItem({ row }: { row: MatchAuditRow }) {
  const resultColor = row.status === 'exact' ? '#A8F0D8' : row.status === 'partial' ? '#FFB15C' : row.status === 'incorrect' ? '#FF6B6B' : '#8A8A8A'
  const statusLabel: Record<AuditStatus, string> = {
    exact: 'Exacto',
    partial: 'Parcial',
    incorrect: 'Incorrecto',
    pending: 'Pendiente',
    missing: 'Sin pronóstico',
  }
  return (
    <article className="rounded-[14px] bg-[#111] p-3 sm:p-4" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[13px] font-extrabold text-white">{row.predictedHome} vs {row.predictedAway}</p>
          {row.stage !== 'group' && row.hasOfficialTeams && (
            <p className="mt-1 text-[11px] font-semibold text-muted">Oficial: {row.officialHome} vs {row.officialAway}</p>
          )}
        </div>
        <span className="rounded-full px-2 py-1 font-mono text-[9px] font-extrabold uppercase" style={{ color: resultColor, border: `1px solid ${resultColor}44` }}>
          {row.stage !== 'group' && row.crossMatches === true ? 'Cruce exacto · ' : ''}{statusLabel[row.status]}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-[10px] bg-black/25 p-2">
          <p className="font-mono text-[8px] font-bold uppercase tracking-[0.1em] text-muted">Pronóstico</p>
          <p className="mt-1 font-extrabold text-white">{row.predictedScore}</p>
        </div>
        <div className="rounded-[10px] bg-black/25 p-2">
          <p className="font-mono text-[8px] font-bold uppercase tracking-[0.1em] text-muted">Oficial</p>
          <p className="mt-1 font-extrabold text-white">{row.officialScore}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-[620px] text-[11px] font-semibold leading-relaxed text-muted">{row.explanation}</p>
        <p className="font-display text-[24px] leading-none" style={{ color: resultColor }}>
          {row.points ?? 0}<span className="ml-1 font-mono text-[9px] font-bold uppercase text-muted">pts</span>
        </p>
      </div>
      {row.stage !== 'group' && (
        <p className="mt-2 font-mono text-[9px] font-bold uppercase tracking-[0.08em] text-muted">
          Resultado: +{row.resultPoints ?? 0} · Trayectoria: +{row.qualifiedPoints}
        </p>
      )}
    </article>
  )
}

function TrajectoryDetails({ awards }: { awards: KnockoutBonusLedgerItem[] }) {
  return (
    <div className="grid gap-3">
      {BONUS_ORDER.map((round) => {
        const items = awards.filter((item) => item.round === round)
        if (items.length === 0) return null
        const awarded = items.filter((item) => item.awarded)
        const points = awarded.reduce((total, item) => total + item.points, 0)
        return (
          <details key={round} className="group rounded-[14px] bg-[#111] p-3" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
              <span className="text-[12px] font-extrabold text-white">{BONUS_LABELS[round]}: acertó {awarded.length} de {items.length} equipos · +{points} pts</span>
              <span className="text-[10px] font-extrabold uppercase text-mint group-open:hidden">Ver detalle</span>
              <span className="hidden text-[10px] font-extrabold uppercase text-muted group-open:inline">Ocultar</span>
            </summary>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {items.map((item) => (
                <div key={`${round}-${item.team}`} className="rounded-[10px] px-3 py-2 text-[11px] font-bold" style={{ background: item.awarded ? 'rgba(168,240,216,0.09)' : 'rgba(255,255,255,0.035)', color: item.awarded ? '#A8F0D8' : '#888' }}>
                  {item.awarded ? '✓' : '×'} {item.team} {item.awarded ? `+${item.points}` : '0'}
                </div>
              ))}
            </div>
          </details>
        )
      })}
    </div>
  )
}

export function RankingAuditModals({
  rows,
  trajectoryAwards,
  groupPoints,
  knockoutPoints,
  trajectoryPoints,
  ranking,
  rankingColor,
  totalPoints,
}: {
  rows: MatchAuditRow[]
  trajectoryAwards: KnockoutBonusLedgerItem[]
  groupPoints: number
  knockoutPoints: number
  trajectoryPoints: number
  ranking: string
  rankingColor?: string
  totalPoints: number
}) {
  const [activeView, setActiveView] = useState<AuditView | null>(null)

  useEffect(() => {
    if (!activeView) return
    const previousOverflow = document.body.style.overflow
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveView(null)
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [activeView])

  const statusForView: Partial<Record<AuditView, AuditStatus>> = { exact: 'exact', partial: 'partial', incorrect: 'incorrect' }
  const filteredRows = activeView === 'groups'
    ? rows.filter((row) => row.stage === 'group')
    : activeView === 'knockout'
    ? rows.filter((row) => row.stage !== 'group')
    : statusForView[activeView ?? 'groups']
    ? rows.filter((row) => row.status === statusForView[activeView!])
    : []

  return (
    <>
      <StaticTile label="Ranking" value={ranking} color={rankingColor} />
      <AuditTile view="groups" value={groupPoints} onOpen={setActiveView} />
      <AuditTile view="knockout" value={knockoutPoints} onOpen={setActiveView} />
      <AuditTile view="trajectory" value={`+${trajectoryPoints}`} onOpen={setActiveView} />
      <StaticTile label="Total" value={totalPoints} />
      <AuditTile view="exact" value={rows.filter((row) => row.status === 'exact').length} onOpen={setActiveView} />
      <AuditTile view="partial" value={rows.filter((row) => row.status === 'partial').length} onOpen={setActiveView} />
      <AuditTile view="incorrect" value={rows.filter((row) => row.status === 'incorrect').length} onOpen={setActiveView} />

      {activeView && (
        <div role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setActiveView(null)} className="fixed inset-0 z-[120] grid place-items-center bg-black/75 p-3 backdrop-blur-sm sm:p-6">
          <section role="dialog" aria-modal="true" aria-labelledby="audit-modal-title" className="flex max-h-[90vh] w-full max-w-[900px] flex-col overflow-hidden rounded-[22px] bg-[#0b0b0b]" style={{ border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 28px 90px rgba(0,0,0,0.65)' }}>
            <header className="flex items-start justify-between gap-4 border-b border-white/10 p-4 sm:p-5">
              <div>
                <p className="font-mono text-[9px] font-extrabold uppercase tracking-[0.18em] text-orange">Detalle auditable</p>
                <h2 id="audit-modal-title" className="mt-1 font-display text-[28px] uppercase leading-none text-white sm:text-[34px]">{VIEW_META[activeView].label}</h2>
              </div>
              <button type="button" onClick={() => setActiveView(null)} aria-label="Cerrar auditoría" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/5 text-xl font-bold text-white" style={{ border: '1px solid rgba(255,255,255,0.12)' }}>×</button>
            </header>
            <div className="overflow-y-auto p-3 sm:p-5">
              {activeView === 'trajectory' ? (
                <TrajectoryDetails awards={trajectoryAwards} />
              ) : filteredRows.length > 0 ? (
                <div className="grid gap-3">
                  {STAGE_ORDER.map((stage) => {
                    const stageRows = filteredRows.filter((row) => row.stage === stage)
                    if (stageRows.length === 0) return null
                    const stagePoints = stageRows.reduce((total, row) => total + (row.points ?? 0), 0)
                    return (
                      <details key={stage} className="group rounded-[16px] bg-white/[0.025] p-3" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
                          <span className="text-[13px] font-extrabold text-white">{STAGE_LABELS[stage]} · {stageRows.length} partidos</span>
                          <span className="font-display text-[20px] text-mint">{stagePoints} pts</span>
                        </summary>
                        <div className="mt-3 grid gap-2">{stageRows.map((row) => <MatchAuditItem key={row.match.id} row={row} />)}</div>
                      </details>
                    )
                  })}
                </div>
              ) : (
                <p className="rounded-[14px] bg-white/[0.035] px-4 py-6 text-center text-[13px] font-semibold text-muted">No hay partidos en esta categoría.</p>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  )
}

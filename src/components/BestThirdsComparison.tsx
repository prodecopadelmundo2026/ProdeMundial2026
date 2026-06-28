'use client'

import { flagUrl, getTeam } from '@/lib/teams'

export type BestThirdRow = {
  name: string
  group: string
  pts: number
  gd: number
  gf: number
  qualified: boolean
}

function formatGoalDiff(gd: number) {
  return gd > 0 ? `+${gd}` : `${gd}`
}

function ThirdsTable({
  rows,
  tone,
  officialQualifiedNames,
}: {
  rows: BestThirdRow[]
  tone: 'predicted' | 'official'
  officialQualifiedNames: Set<string> | null
}) {
  const accent = tone === 'official' ? '#FFFFFF' : '#FFB15C'
  return (
    <div className="min-w-0 overflow-hidden rounded-[14px] bg-[#141414] p-3" style={{ border: `1px solid ${accent}33` }}>
      <div className="grid grid-cols-[18px_minmax(0,1fr)_24px_30px_26px] items-center gap-1 px-1 pb-1.5 font-mono text-[8px] font-extrabold uppercase tracking-[0.06em] text-muted">
        <span className="text-center">#</span>
        <span>Tercero</span>
        <span className="text-center">Gr</span>
        <span className="text-center">DG</span>
        <span className="text-center">Pts</span>
      </div>
      <div className="grid gap-1">
        {rows.length === 0 && (
          <p className="px-1 py-2 text-[11px] font-semibold text-muted">Sin terceros para mostrar todavia.</p>
        )}
        {rows.map((row, index) => {
          const meta = getTeam(row.name)
          const isQualified = row.qualified
          const hit =
            tone === 'predicted' && isQualified && officialQualifiedNames
              ? officialQualifiedNames.has(row.name)
              : null
          return (
            <div
              key={row.name}
              className="grid grid-cols-[18px_minmax(0,1fr)_24px_30px_26px] items-center gap-1 rounded-[8px] px-1 py-1"
              style={{
                background: isQualified ? `${accent}14` : 'rgba(255,255,255,0.02)',
                borderBottom: index === 7 ? `1px dashed ${accent}66` : '1px solid transparent',
              }}
            >
              <span className="text-center font-mono text-[10px] font-extrabold" style={{ color: isQualified ? accent : '#6a6a6a' }}>
                {index + 1}
              </span>
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="grid h-4 w-6 shrink-0 place-items-center overflow-hidden rounded-[2px] bg-black/40">
                  {meta.iso2 ? (
                    <img src={flagUrl(meta.iso2)} alt="" className="h-[14px] w-[20px] object-cover" />
                  ) : (
                    <span className="text-[10px] leading-none">{meta.flag}</span>
                  )}
                </span>
                <span className="truncate text-[11px] font-bold text-white">{row.name}</span>
                {hit === true && <span className="shrink-0 text-[10px] font-extrabold text-mint">✓ +1</span>}
                {hit === false && <span className="shrink-0 text-[10px] font-extrabold text-[#FF6B6B]">×</span>}
              </div>
              <span className="text-center font-mono text-[10px] text-muted">{row.group}</span>
              <span className="text-center font-mono text-[10px] text-muted">{formatGoalDiff(row.gd)}</span>
              <span className="text-center font-mono text-[10px] font-extrabold text-white">{row.pts}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function BestThirdsComparison({
  predicted,
  official,
  predictedLabel = 'Tu tabla de terceros',
}: {
  predicted: BestThirdRow[]
  official: BestThirdRow[] | null
  predictedLabel?: string
}) {
  const officialQualifiedNames = official
    ? new Set(official.filter((team) => team.qualified).map((team) => team.name))
    : null
  const predictedQualified = predicted.filter((team) => team.qualified)
  const hits = officialQualifiedNames
    ? predictedQualified.filter((team) => officialQualifiedNames.has(team.name)).length
    : null

  return (
    <div className="mb-6 rounded-[18px] bg-[#101010] p-4" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="mb-3">
        <p className="text-[14px] font-extrabold text-white">Mejores terceros</p>
        <p className="mt-1 text-[12px] font-semibold leading-relaxed text-muted">
          Los 8 mejores terceros clasifican a 16avos (linea punteada).{' '}
          {hits != null
            ? `Acertaste ${hits} de 8 terceros · +${hits} pts de trayectoria.`
            : 'La tabla oficial se publica cuando termina la fase de grupos.'}
        </p>
      </div>
      <div className="grid gap-3 min-[720px]:grid-cols-2">
        <div className="min-w-0">
          <p className="mb-1.5 px-1 text-[11px] font-extrabold uppercase tracking-[0.1em] text-orange">{predictedLabel}</p>
          <ThirdsTable rows={predicted} tone="predicted" officialQualifiedNames={officialQualifiedNames} />
        </div>
        {official && (
          <div className="min-w-0">
            <p className="mb-1.5 px-1 text-[11px] font-extrabold uppercase tracking-[0.1em] text-white">Tabla oficial</p>
            <ThirdsTable rows={official} tone="official" officialQualifiedNames={null} />
          </div>
        )}
      </div>
    </div>
  )
}

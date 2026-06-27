import { unstable_noStore as noStore } from 'next/cache'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Match } from '@/types'
import { buildProjectedKnockoutMatches } from '@/lib/bracket'
import { computeFifaBestThirds, type FifaBestThirdStanding } from '@/lib/fifa-standings'
import { buildGroupTableRows, buildOfficialGroupScoreMap } from '@/lib/group-standings'
import { GroupStandingsTables, type GroupTableSection } from '@/components/GroupStandingsTables'
import { TournamentBracket } from '@/components/TournamentBracket'
import { flagUrl, getTeam } from '@/lib/teams'
import { getOfficialRoundOf32State } from '@/lib/tournament-state'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type RawMatchRow = Match & {
  group_name?: string | null
  group_key?: string | null
}

const GROUP_ORDER = Array.from({ length: 12 }, (_, index) => String.fromCharCode(65 + index))

function normalizeStage(stage: string | null | undefined, group: string | null | undefined): Match['stage'] {
  const value = String(stage ?? '').trim().toLowerCase().replaceAll('-', '_').replaceAll(' ', '_')
  if (value === 'group' || value === 'groups' || value === 'fase_de_grupos' || value === 'grupos') return 'group'
  if (value === 'round_of_32' || value === 'dieciseisavos' || value === 'd16') return 'round_of_32'
  if (value === 'round_of_16' || value === 'octavos') return 'round_of_16'
  if (value === 'quarter' || value === 'quarter_final' || value === 'cuartos') return 'quarter'
  if (value === 'semi' || value === 'semifinal' || value === 'semifinales') return 'semi'
  if (value === 'third_place' || value === 'tercer_puesto' || value === '3er_puesto') return 'third_place'
  if (value === 'final') return 'final'
  return group ? 'group' : 'group'
}

function normalizeGroup(value: string | null | undefined): string | null {
  const normalized = String(value ?? '').trim()
  if (!normalized) return null
  const groupMatch = normalized.match(/(?:grupo|group)\s+([A-L])/i)
  if (groupMatch) return groupMatch[1].toUpperCase()
  if (/^[A-L]$/i.test(normalized)) return normalized.toUpperCase()
  return normalized
}

function normalizeMatchRow(match: RawMatchRow): Match {
  const group = normalizeGroup(match.group ?? match.group_name ?? match.group_key)
  return {
    ...match,
    group,
    stage: normalizeStage(match.stage, group),
  }
}

function sameBasicThirdLine(a: Pick<FifaBestThirdStanding, 'pts' | 'gd' | 'gf'>, b: Pick<FifaBestThirdStanding, 'pts' | 'gd' | 'gf'>) {
  return a.pts === b.pts && a.gd === b.gd && a.gf === b.gf
}

function findTechnicalTieTeams(rows: FifaBestThirdStanding[]) {
  const tied = new Set<string>()
  for (let i = 0; i < rows.length; i++) {
    const peers = rows.filter((row) => sameBasicThirdLine(row, rows[i]))
    if (peers.length > 1) {
      for (const peer of peers) tied.add(`${peer.group}-${peer.name}`)
    }
  }
  return tied
}

function thirdStatus(row: FifaBestThirdStanding, index: number) {
  if (row.qualificationStatus === 'pending') {
    return { label: 'Desempate pendiente', color: '#FFE040', bg: 'rgba(255,224,64,0.1)', border: 'rgba(255,224,64,0.3)' }
  }
  if (index < 7) return { label: 'Clasifica', color: '#A8F0D8', bg: 'rgba(168,240,216,0.09)', border: 'rgba(168,240,216,0.28)' }
  if (index === 7) return { label: 'Ultimo clasificado', color: '#FFE040', bg: 'rgba(255,224,64,0.1)', border: 'rgba(255,224,64,0.3)' }
  if (row.played >= 3) return { label: 'ARAFUE', color: '#FF5C5C', bg: 'rgba(255,92,92,0.08)', border: 'rgba(255,92,92,0.26)' }
  return { label: 'Afuera por ahora', color: '#FFB15C', bg: 'rgba(255,177,92,0.08)', border: 'rgba(255,177,92,0.22)' }
}

function ThirdTeamCell({ name }: { name: string }) {
  const meta = getTeam(name)
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full bg-black/40" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
        {meta.iso2 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={flagUrl(meta.iso2)} alt="" className="h-[18px] w-[24px] object-contain" />
        ) : (
          <span className="text-[15px] leading-none">{meta.flag}</span>
        )}
      </span>
      <span className="truncate text-[13px] font-extrabold text-white">{name}</span>
    </div>
  )
}

function BestThirdsTable({ rows }: { rows: FifaBestThirdStanding[] }) {
  const tiedTeams = findTechnicalTieTeams(rows)

  if (rows.length === 0) {
    return (
      <section className="rounded-[20px] bg-[#0d0d0d] p-5" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
        <p className="text-[14px] font-extrabold text-white">Mejores terceros</p>
        <p className="mt-2 text-[13px] font-semibold leading-relaxed text-muted">
          Todavía no hay terceros con partidos computados. Cuando haya resultados finalizados o en vivo, esta tabla se actualiza.
        </p>
      </section>
    )
  }

  return (
    <section className="rounded-[20px] bg-[#0d0d0d] p-4" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[14px] font-extrabold text-white">Mejores terceros</p>
          <p className="mt-1 max-w-[680px] text-[12px] font-semibold leading-relaxed text-muted">
            Los 8 mejores terceros clasifican a la siguiente fase.
          </p>
        </div>
        <span className="rounded-full px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em]" style={{ background: 'rgba(168,240,216,0.09)', border: '1px solid rgba(168,240,216,0.24)', color: '#A8F0D8' }}>
          Top 8 clasifica
        </span>
      </div>

      {tiedTeams.size > 0 && (
        <div className="mb-4 rounded-[14px] px-4 py-3 text-[12px] font-bold leading-relaxed" style={{ background: 'rgba(255,224,64,0.08)', border: '1px solid rgba(255,224,64,0.22)', color: '#FFE040' }}>
          Empate técnico / desempate pendiente: hay equipos igualados en puntos, diferencia de gol y goles a favor.
        </div>
      )}

      <div className="overflow-x-auto">
        <div className="min-w-[680px]">
          <div className="grid grid-cols-[48px_minmax(180px,1fr)_70px_repeat(4,52px)_170px] items-center gap-2 rounded-[10px] bg-[#0A0A0A] px-3 py-2 font-mono text-[9px] font-extrabold uppercase tracking-[0.1em] text-muted">
            <span className="text-center">Pos</span>
            <span>Equipo</span>
            <span className="text-center">Grupo</span>
            <span className="text-center">PJ</span>
            <span className="text-center">Pts</span>
            <span className="text-center">DG</span>
            <span className="text-center">GF</span>
            <span>Estado</span>
          </div>
          <div className="mt-2 grid gap-1.5">
            {rows.map((row, index) => {
              const status = thirdStatus(row, index)
              const hasTie = tiedTeams.has(`${row.group}-${row.name}`)
              return (
                <div
                  key={`${row.group}-${row.name}`}
                  className="grid min-h-[44px] grid-cols-[48px_minmax(180px,1fr)_70px_repeat(4,52px)_170px] items-center gap-2 rounded-[12px] px-3"
                  style={{
                    background: row.qualified ? 'rgba(168,240,216,0.055)' : 'rgba(255,255,255,0.025)',
                    border: row.qualified ? '1px solid rgba(168,240,216,0.18)' : '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <span className="text-center font-mono text-[12px] font-extrabold tabular-nums text-white">{index + 1}</span>
                  <ThirdTeamCell name={row.name} />
                  <span className="text-center font-mono text-[11px] font-extrabold text-muted">Grupo {row.group}</span>
                  <span className="text-center font-mono text-[11px] font-bold text-muted">{row.played}</span>
                  <span className="text-center font-mono text-[12px] font-extrabold text-white">{row.pts}</span>
                  <span className="text-center font-mono text-[11px] font-bold text-muted">{row.gd}</span>
                  <span className="text-center font-mono text-[11px] font-bold text-muted">{row.gf}</span>
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em]" style={{ background: status.bg, border: `1px solid ${status.border}`, color: status.color }}>
                      {status.label}
                    </span>
                    {hasTie && (
                      <span className="shrink-0 rounded-full px-2 py-1 text-[9px] font-extrabold uppercase tracking-[0.08em]" style={{ background: 'rgba(255,224,64,0.08)', border: '1px solid rgba(255,224,64,0.2)', color: '#FFE040' }}>
                        Empate
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

function Metric({ label, value, tone = 'neutral' }: { label: string; value: number | string; tone?: 'neutral' | 'live' | 'done' }) {
  const color = tone === 'live' ? '#FF6B6B' : tone === 'done' ? '#A8F0D8' : '#FFB15C'
  return (
    <div className="rounded-[16px] bg-[#141414] px-4 py-3" style={{ border: `1px solid ${color}2e` }}>
      <p className="font-mono text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-1 font-display text-[30px] leading-none tabular-nums" style={{ color }}>{value}</p>
    </div>
  )
}

function LiveBracketSection({
  groupMatches,
  knockoutMatches,
  hasAnyGroupResult,
  officialBracketReady,
}: {
  groupMatches: Match[]
  knockoutMatches: Match[]
  hasAnyGroupResult: boolean
  officialBracketReady: boolean
}) {
  return (
    <section id="llave-real" className="min-w-0 scroll-mt-24 rounded-[20px] bg-[#0d0d0d] p-4" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[14px] font-extrabold text-white">{officialBracketReady ? 'Llave oficial de 16avos' : 'Llave real actual'}</p>
          <p className="mt-1 max-w-[680px] text-[12px] font-semibold leading-relaxed text-muted">
            {officialBracketReady ? 'Cruces definidos desde las tablas finales y los mejores terceros.' : 'Así quedarían los cruces según las posiciones actuales de los grupos.'}
          </p>
        </div>
        <span className="rounded-full px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em]" style={{ background: 'rgba(255,177,92,0.08)', border: '1px solid rgba(255,177,92,0.22)', color: '#FFB15C' }}>
          {officialBracketReady ? 'Oficial' : 'Provisorio'}
        </span>
      </div>

      {!officialBracketReady && (
        <div className="mb-4 rounded-[14px] px-4 py-3 text-[12px] font-bold leading-relaxed" style={{ background: 'rgba(255,177,92,0.08)', border: '1px solid rgba(255,177,92,0.2)', color: '#FFB15C' }}>
          La llave es provisoria mientras haya grupos, mejores terceros o posiciones pendientes de validación.
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2 text-[10px] font-extrabold uppercase tracking-[0.08em]">
        <span className="rounded-full px-3 py-1.5" style={{ color: '#FFE040', background: 'rgba(255,224,64,0.08)', border: '1px solid rgba(255,224,64,0.28)' }}>Dorado: 1° confirmado</span>
        <span className="rounded-full px-3 py-1.5" style={{ color: '#CBD5E1', background: 'rgba(203,213,225,0.08)', border: '1px solid rgba(203,213,225,0.25)' }}>Plateado: 2° confirmado</span>
        <span className="rounded-full px-3 py-1.5" style={{ color: '#D08A45', background: 'rgba(208,138,69,0.1)', border: '1px solid rgba(208,138,69,0.28)' }}>Bronce: mejor 3° confirmado</span>
        <span className="rounded-full px-3 py-1.5" style={{ color: '#B18CFF', background: 'rgba(177,140,255,0.09)', border: '1px solid rgba(177,140,255,0.26)' }}>Violeta: provisional</span>
      </div>

      {!hasAnyGroupResult ? (
        <p className="rounded-[16px] bg-[#0A0A0A] px-4 py-8 text-center text-[13px] font-semibold leading-relaxed text-muted" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          Todavía no hay suficientes resultados para armar la llave real.
        </p>
      ) : (
        <TournamentBracket
          mode="official"
          groupMatches={groupMatches}
          knockoutMatches={knockoutMatches}
          officialGroupResolution="current"
        />
      )}
    </section>
  )
}

export default async function MundialEnVivoPage() {
  noStore()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .order('scheduled_at', { ascending: true })

  if (error) {
    return (
      <div className="mx-auto max-w-[860px] px-5 py-12">
        <div className="rounded-[20px] p-6" style={{ background: 'rgba(255,90,90,0.07)', border: '1px solid rgba(255,90,90,0.2)' }}>
          <p className="mb-1 font-bold text-[#FF5A5A]">Error al cargar las tablas reales</p>
          <p className="break-all font-mono text-sm text-muted">{error.message}</p>
        </div>
      </div>
    )
  }

  const matches = ((data ?? []) as RawMatchRow[]).map(normalizeMatchRow)
  const roundOf32State = getOfficialRoundOf32State(matches)
  const groupMatches = matches.filter((match) => match.stage === 'group' && match.group)
  const knockoutMatches = buildProjectedKnockoutMatches(matches.filter((match) => match.stage !== 'group'))
  const scoreMap = buildOfficialGroupScoreMap(groupMatches)
  const groupKeys = GROUP_ORDER.filter((group) => groupMatches.some((match) => match.group === group))
  const tableSections: GroupTableSection[] = groupKeys.map((group) => {
    const scoped = groupMatches.filter((match) => match.group === group)
    return {
      id: group,
      title: `Grupo ${group}`,
      description: 'Tabla real',
      anchorId: `mundial-tabla-grupo-${group}`,
      rows: buildGroupTableRows(scoped, scoreMap, {}, `Grupo ${group}`, 'fifa'),
      tone: 'official',
    }
  })
  const bestThirds = computeFifaBestThirds(groupMatches, scoreMap).standings
  const countedMatches = groupMatches.filter((match) => scoreMap[match.id])
  const liveCounted = countedMatches.filter((match) => match.status === 'live').length
  const finishedCounted = countedMatches.filter((match) => match.status === 'finished').length
  const hasAnyGroupResult = countedMatches.length > 0

  return (
    <div style={{ padding: 'clamp(32px,7vw,56px) 16px clamp(60px,12vw,100px)' }}>
      <div className="mx-auto max-w-[1280px]">
        <div className="mb-6">
          <span className="mb-3 inline-block font-sans text-[11px] font-extrabold uppercase tracking-[0.22em] text-muted">
            Resultados reales
          </span>
          <h1 className="font-display uppercase leading-[0.9] tracking-[-0.04em]" style={{ fontSize: 'clamp(42px, 8vw, 92px)' }}>
            Mundial <em className="italic text-orange">en vivo</em>
          </h1>
          <p className="mt-3 max-w-[640px] text-[14px] font-semibold leading-relaxed text-muted">
            {roundOf32State.officialBracketReady
              ? 'Fase de grupos finalizada: tablas, mejores terceros y llave oficial en un solo lugar.'
              : 'Así están quedando los grupos según los resultados cargados.'}
          </p>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <Metric label="Partidos computados" value={countedMatches.length} />
          <Metric label="En vivo" value={liveCounted} tone="live" />
          <Metric label="Finalizados" value={finishedCounted} tone="done" />
        </div>

        <div className="mb-5 rounded-[16px] px-4 py-3 text-[12px] font-bold leading-relaxed" style={{ background: 'rgba(255,177,92,0.08)', border: '1px solid rgba(255,177,92,0.2)', color: '#FFB15C' }}>
          Las posiciones son provisorias mientras haya partidos en vivo o desempates pendientes. Los puestos 1 y 2 clasifican directo; el 3 compite como mejor tercero; el 4 queda afuera por ahora.
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          <a href="#grupos-reales" className="rounded-full px-3 py-2 text-[11px] font-extrabold uppercase transition-colors" style={{ background: '#141414', color: '#cfcfcf', border: '1px solid rgba(255,255,255,0.1)' }}>
            Ver grupos
          </a>
          <a href="#mejores-terceros" className="rounded-full px-3 py-2 text-[11px] font-extrabold uppercase transition-colors" style={{ background: '#141414', color: '#cfcfcf', border: '1px solid rgba(255,255,255,0.1)' }}>
            Ver mejores terceros
          </a>
          <a href="#llave-real" className="rounded-full px-3 py-2 text-[11px] font-extrabold uppercase transition-colors" style={{ background: '#141414', color: '#cfcfcf', border: '1px solid rgba(255,255,255,0.1)' }}>
            Ver llave
          </a>
          <Link href="/mi-prode" className="rounded-full px-3 py-2 text-[11px] font-extrabold uppercase transition-colors" style={{ background: '#141414', color: '#cfcfcf', border: '1px solid rgba(255,255,255,0.1)' }}>
            Comparar con Mi Prode
          </Link>
          <Link href="/ranking" className="rounded-full px-3 py-2 text-[11px] font-extrabold uppercase transition-colors" style={{ background: '#141414', color: '#cfcfcf', border: '1px solid rgba(255,255,255,0.1)' }}>
            Ver Ranking
          </Link>
        </div>

        <div className="grid gap-5">
          <div id="grupos-reales" className="scroll-mt-24">
          <GroupStandingsTables
            title="Tablas reales de grupos"
            subtitle="Calculadas con partidos finalizados y partidos en vivo que ya tienen ambos goles cargados. Los próximos sin resultado no cuentan."
            sections={tableSections}
            controls={false}
          />
          </div>
          <div id="mejores-terceros" className="scroll-mt-24">
          <BestThirdsTable rows={bestThirds} />
          </div>
          <LiveBracketSection
            groupMatches={groupMatches}
            knockoutMatches={knockoutMatches}
            hasAnyGroupResult={hasAnyGroupResult}
            officialBracketReady={roundOf32State.officialBracketReady}
          />
        </div>
      </div>
    </div>
  )
}

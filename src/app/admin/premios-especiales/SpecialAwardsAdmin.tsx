'use client'

import { useMemo, useState, useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { getTeam } from '@/lib/teams'
import { SPECIAL_AWARD_CATEGORIES, SPECIAL_AWARD_LABELS, type SpecialAwardCategory } from '@/lib/special-awards'
import {
  addOfficialWinner,
  confirmOfficialResult,
  deletePlayer,
  removeOfficialWinner,
  returnOfficialResultToDraft,
  saveGoalScorer,
  saveNormalization,
  type SpecialAwardActionResult,
} from './actions'

type PlayerOption = {
  id: string
  displayName: string
  normalizedName: string
  countryName: string
  countryCode: string
  goals: number
  sourceNote: string | null
  sourceUrl: string | null
  updatedAt: string | null
}

type TeamOption = {
  name: string
  code: string
  flag: string
}

type ScorerRow = {
  id: string
  playerId: string
  displayName: string
  countryName: string
  countryCode: string
  goals: number
  sourceNote: string | null
  sourceUrl: string | null
  updatedAt: string | null
}

type RawGroup = {
  category: SpecialAwardCategory
  rawNormalized: string
  rawValue: string
  variants: Array<{ value: string; count: number }>
  count: number
  status: 'matched' | 'no_match' | 'review'
  playerId: string | null
  playerLabel: string
  reviewedAt: string | null
  suggestion:
    | { type: 'single'; playerId: string; label: string }
    | { type: 'ambiguous'; label: string }
    | { type: 'none'; label: string }
}

type CandidateSummaryItem = {
  playerId: string
  displayName: string
  countryName: string
  countryCode: string
  count: number
}

type AwardResult = {
  id: string | null
  status: 'pending' | 'draft' | 'confirmed' | 'locked'
  confirmedAt: string | null
  winners: Array<{
    id: string
    playerId: string
    displayName: string
    countryName: string
    countryCode: string
    choices: number
  }>
}

export type SpecialAwardsAdminData = {
  setupErrors: string[]
  teamOptions: TeamOption[]
  players: PlayerOption[]
  scorers: ScorerRow[]
  rawGroups: RawGroup[]
  candidateSummaries: Record<SpecialAwardCategory, {
    items: CandidateSummaryItem[]
    pendingCount: number
    noMatchCount: number
  }>
  awardResults: Record<SpecialAwardCategory, AwardResult>
}

function SubmitButton({ idle, pending, disabled = false }: { idle: string; pending: string; disabled?: boolean }) {
  const status = useFormStatus()
  return (
    <button
      type="submit"
      disabled={disabled || status.pending}
      className="inline-flex items-center justify-center rounded-full px-4 py-2 text-[11px] font-extrabold uppercase text-bg transition-opacity disabled:opacity-50"
      style={{ background: '#FF6B00', border: '1px solid #FF6B00' }}
    >
      {status.pending ? pending : idle}
    </button>
  )
}

function ActionMessage({ state }: { state: SpecialAwardActionResult | null }) {
  if (!state) return null
  return (
    <p
      className="rounded-[12px] px-3 py-2 text-[12px] font-bold"
      style={{
        background: state.ok ? 'rgba(168,240,216,0.1)' : 'rgba(255,107,107,0.12)',
        border: state.ok ? '1px solid rgba(168,240,216,0.24)' : '1px solid rgba(255,107,107,0.24)',
        color: state.ok ? '#A8F0D8' : '#FF6B6B',
      }}
    >
      {state.message}
    </p>
  )
}

function TeamSelect({
  teams,
  defaultName,
  name = 'country_name',
  codeName = 'country_code',
}: {
  teams: TeamOption[]
  defaultName?: string
  name?: string
  codeName?: string
}) {
  const initialName = defaultName && teams.some((team) => team.name === defaultName) ? defaultName : teams[0]?.name ?? ''
  const [selected, setSelected] = useState(initialName)
  const meta = getTeam(selected)

  return (
    <label className="grid gap-1">
      <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted">Selección</span>
      <select
        name={name}
        value={selected}
        onChange={(event) => setSelected(event.target.value)}
        className="w-full rounded-[12px] bg-[#0A0A0A] px-3 py-2 text-[13px] font-bold text-white outline-none"
        style={{ border: '1px solid rgba(255,255,255,0.1)' }}
      >
        {teams.map((team) => (
          <option key={team.name} value={team.name}>{team.flag} {team.name}</option>
        ))}
      </select>
      <input type="hidden" name={codeName} value={meta.code} />
    </label>
  )
}

function PlayerFlag({ countryName }: { countryName: string }) {
  if (!countryName) return <span className="text-muted">Sin selección</span>
  const team = getTeam(countryName)
  return <span className="inline-flex items-center gap-1">{team.flag} {countryName}</span>
}

function sharedPositions(scorers: ScorerRow[]) {
  let lastGoals: number | null = null
  let lastPosition = 0
  return scorers.map((scorer, index) => {
    if (lastGoals !== scorer.goals) {
      lastGoals = scorer.goals
      lastPosition = index + 1
    }
    return { ...scorer, position: lastPosition }
  })
}

function GoalsAdminSection({ data, writesDisabled }: { data: SpecialAwardsAdminData; writesDisabled: boolean }) {
  const [state, action] = useActionState(saveGoalScorer, null)
  const [query, setQuery] = useState('')
  const filteredPlayers = data.players.filter((player) =>
    `${player.displayName} ${player.countryName}`.toLowerCase().includes(query.toLowerCase())
  )
  const rankedScorers = sharedPositions(data.scorers)

  return (
    <section id="tabla-goleadores" className="grid gap-4 rounded-[16px] p-4" style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div>
        <p className="font-mono text-[10px] font-extrabold uppercase tracking-[0.18em] text-orange">Tabla de goleadores</p>
        <h2 className="mt-1 text-[20px] font-extrabold text-white">Goles actuales del Mundial</h2>
        <p className="mt-1 text-[12px] text-muted">El admin carga el total actual. Esta tabla no define automáticamente la Bota de Oro.</p>
      </div>

      <form action={action} className="grid gap-3 rounded-[14px] p-3" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>
        <fieldset disabled={writesDisabled} className="contents">
          <p className="text-[12px] font-extrabold text-white">Crear jugador</p>
          <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_110px]">
            <label className="grid gap-1">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted">Jugador</span>
              <input name="display_name" required className="w-full rounded-[12px] bg-[#0A0A0A] px-3 py-2 text-[13px] font-bold text-white outline-none" style={{ border: '1px solid rgba(255,255,255,0.1)' }} />
            </label>
            <TeamSelect teams={data.teamOptions} />
            <label className="grid gap-1">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted">Goles</span>
              <input name="goals" type="number" inputMode="numeric" min={0} step={1} required defaultValue={0} className="w-full rounded-[12px] bg-[#0A0A0A] px-3 py-2 text-[13px] font-bold text-white outline-none" style={{ border: '1px solid rgba(255,255,255,0.1)' }} />
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <input name="source_note" placeholder="Nota o fuente" className="w-full rounded-[12px] bg-[#0A0A0A] px-3 py-2 text-[13px] font-bold text-white outline-none" style={{ border: '1px solid rgba(255,255,255,0.1)' }} />
            <input name="source_url" type="url" placeholder="URL de fuente" className="w-full rounded-[12px] bg-[#0A0A0A] px-3 py-2 text-[13px] font-bold text-white outline-none" style={{ border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ActionMessage state={state} />
            <SubmitButton idle="Crear jugador" pending="Guardando..." disabled={writesDisabled} />
          </div>
        </fieldset>
      </form>

      <div className="grid gap-2">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-[16px] font-extrabold text-white">Catálogo de jugadores</h3>
            <p className="mt-1 text-[12px] text-muted">Todos los jugadores canónicos, tengan o no goles.</p>
          </div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar jugador o selección"
            className="min-w-[220px] rounded-[12px] bg-[#141414] px-3 py-2 text-[13px] font-bold text-white outline-none"
            style={{ border: '1px solid rgba(255,255,255,0.1)' }}
          />
        </div>
        {filteredPlayers.length === 0 ? (
          <p className="rounded-[14px] p-4 text-[13px] text-muted" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>No hay jugadores para ese filtro.</p>
        ) : filteredPlayers.map((player) => (
          <CatalogPlayerCard key={player.id} player={player} teams={data.teamOptions} writesDisabled={writesDisabled} />
        ))}
      </div>

      <div className="grid gap-2">
        <h3 className="text-[16px] font-extrabold text-white">Tabla administrativa de goleadores</h3>
        {rankedScorers.length === 0 ? (
          <p className="rounded-[14px] p-4 text-[13px] text-muted" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>
            Todavía no hay goleadores cargados con goles mayores a 0.
          </p>
        ) : rankedScorers.map((scorer) => (
          <div key={scorer.id} className="grid gap-3 rounded-[14px] p-3 md:grid-cols-[48px_1fr_90px_1fr]" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>
            <span className="font-mono text-[18px] font-extrabold text-orange">#{scorer.position}</span>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-extrabold text-white">{scorer.displayName}</p>
              <p className="mt-1 text-[12px] text-muted"><PlayerFlag countryName={scorer.countryName} /></p>
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted">Goles</p>
              <p className="font-mono text-[22px] font-extrabold text-white">{scorer.goals}</p>
            </div>
            <p className="text-[12px] text-muted">
              {scorer.sourceUrl ? <a className="text-orange underline" href={scorer.sourceUrl} target="_blank" rel="noreferrer">{scorer.sourceNote || 'Fuente'}</a> : scorer.sourceNote || 'Sin fuente'}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

function CatalogPlayerCard({ player, teams, writesDisabled }: { player: PlayerOption; teams: TeamOption[]; writesDisabled: boolean }) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [saveState, saveAction] = useActionState(saveGoalScorer, null)
  const [deleteState, deleteAction] = useActionState(deletePlayer, null)

  return (
    <article className="rounded-[14px] p-3" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="grid gap-3 md:grid-cols-[1fr_90px_auto] md:items-center">
        <div className="min-w-0">
          <p className="truncate text-[14px] font-extrabold text-white">{player.displayName}</p>
          <p className="mt-1 text-[12px] text-muted"><PlayerFlag countryName={player.countryName} /></p>
          <p className="mt-1 text-[11px] text-muted">{player.goals === 0 ? '0 goles cargados' : `Actualizado: ${player.updatedAt ? new Date(player.updatedAt).toLocaleString('es-AR') : 'sin fecha'}`}</p>
        </div>
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted">Goles</p>
          <p className="font-mono text-[22px] font-extrabold text-white">{player.goals}</p>
        </div>
        <div className="flex flex-wrap gap-2 md:justify-end">
          <button type="button" onClick={() => setEditOpen((value) => !value)} className="rounded-full px-3 py-2 text-[11px] font-extrabold uppercase text-white" style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.1)' }}>
            {editOpen ? 'Cerrar' : 'Editar'}
          </button>
          <button type="button" onClick={() => setDeleteOpen((value) => !value)} className="rounded-full px-3 py-2 text-[11px] font-extrabold uppercase text-white" style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.24)' }}>
            Eliminar
          </button>
        </div>
      </div>

      {editOpen && (
        <form action={saveAction} className="mt-3 grid gap-3 rounded-[12px] p-3" style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)' }}>
          <fieldset disabled={writesDisabled} className="contents">
          <input type="hidden" name="player_id" value={player.id} />
          <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_110px]">
            <input name="display_name" required defaultValue={player.displayName} className="w-full rounded-[12px] bg-[#050505] px-3 py-2 text-[13px] font-bold text-white outline-none" style={{ border: '1px solid rgba(255,255,255,0.1)' }} />
            <TeamSelect teams={teams} defaultName={player.countryName} />
            <input name="goals" type="number" min={0} step={1} required defaultValue={player.goals} className="w-full rounded-[12px] bg-[#050505] px-3 py-2 text-[13px] font-bold text-white outline-none" style={{ border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <input name="source_note" defaultValue={player.sourceNote ?? ''} placeholder="Nota o fuente" className="w-full rounded-[12px] bg-[#050505] px-3 py-2 text-[13px] font-bold text-white outline-none" style={{ border: '1px solid rgba(255,255,255,0.1)' }} />
            <input name="source_url" type="url" defaultValue={player.sourceUrl ?? ''} placeholder="URL de fuente" className="w-full rounded-[12px] bg-[#050505] px-3 py-2 text-[13px] font-bold text-white outline-none" style={{ border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ActionMessage state={saveState} />
            <SubmitButton idle="Guardar cambios" pending="Guardando..." disabled={writesDisabled} />
          </div>
          </fieldset>
        </form>
      )}

      {deleteOpen && (
        <form action={deleteAction} className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-[12px] p-3" style={{ background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.2)' }}>
          <fieldset disabled={writesDisabled} className="contents">
          <input type="hidden" name="player_id" value={player.id} />
          <div>
            <p className="text-[12px] font-extrabold text-white">Confirmar eliminación</p>
            <p className="mt-1 text-[12px] text-muted">Solo se elimina si no tiene estadísticas, aliases, normalizaciones ni ganadores asociados.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ActionMessage state={deleteState} />
            <SubmitButton idle="Eliminar jugador" pending="Eliminando..." disabled={writesDisabled} />
          </div>
          </fieldset>
        </form>
      )}
    </article>
  )
}

function NormalizationSection({ data, writesDisabled }: { data: SpecialAwardsAdminData; writesDisabled: boolean }) {
  const [category, setCategory] = useState<SpecialAwardCategory>('balon')
  const [query, setQuery] = useState('')
  const filtered = data.rawGroups.filter((group) => {
    const text = `${group.rawNormalized} ${group.variants.map((variant) => variant.value).join(' ')}`.toLowerCase()
    return group.category === category && text.includes(query.toLowerCase())
  })

  return (
    <section id="normalizacion" className="grid gap-4 rounded-[16px] p-4" style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div>
        <p className="font-mono text-[10px] font-extrabold uppercase tracking-[0.18em] text-orange">Elecciones y normalización</p>
        <h2 className="mt-1 text-[20px] font-extrabold text-white">Respuestas originales agrupadas</h2>
        <p className="mt-1 text-[12px] text-muted">Se lee <code>special_bets</code> sin modificarlo. Las decisiones se guardan aparte.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
        <div className="flex flex-wrap gap-2">
          {SPECIAL_AWARD_CATEGORIES.map((item) => (
            <button key={item} type="button" onClick={() => setCategory(item)} className="rounded-full px-3 py-2 text-[11px] font-extrabold uppercase" style={{ background: category === item ? '#FF6B00' : '#141414', color: category === item ? '#0A0A0A' : '#cfcfcf', border: '1px solid rgba(255,255,255,0.1)' }}>
              {SPECIAL_AWARD_LABELS[item]}
            </button>
          ))}
        </div>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar texto o variante" className="w-full rounded-[12px] bg-[#141414] px-3 py-2 text-[13px] font-bold text-white outline-none" style={{ border: '1px solid rgba(255,255,255,0.1)' }} />
      </div>

      <CandidateSummary data={data} category={category} />

      <div className="grid gap-2">
        {filtered.length === 0 ? (
          <p className="rounded-[14px] p-4 text-[13px] text-muted" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>No hay respuestas para este filtro.</p>
        ) : filtered.map((group) => (
          <NormalizationCard key={`${group.category}-${group.rawNormalized}`} group={group} players={data.players} writesDisabled={writesDisabled} />
        ))}
      </div>
    </section>
  )
}

function CandidateSummary({ data, category }: { data: SpecialAwardsAdminData; category: SpecialAwardCategory }) {
  const summary = data.candidateSummaries[category]
  return (
    <div className="rounded-[14px] p-3" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex flex-wrap gap-2 text-[11px] font-extrabold uppercase">
        <span className="rounded-full px-3 py-1.5 text-[#A8F0D8]" style={{ background: 'rgba(168,240,216,0.1)' }}>Pendientes: {summary.pendingCount}</span>
        <span className="rounded-full px-3 py-1.5 text-[#FFB15C]" style={{ background: 'rgba(255,177,92,0.1)' }}>No match: {summary.noMatchCount}</span>
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {summary.items.length === 0 ? (
          <p className="text-[12px] text-muted">Todavía no hay candidatos matched para esta categoría.</p>
        ) : summary.items.map((item) => (
          <div key={item.playerId} className="flex items-center justify-between gap-3 rounded-[10px] px-3 py-2" style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span className="min-w-0 truncate text-[13px] font-extrabold text-white">{item.displayName}</span>
            <span className="shrink-0 font-mono text-[12px] text-orange">{item.count} elecciones</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function NormalizationCard({ group, players, writesDisabled }: { group: RawGroup; players: PlayerOption[]; writesDisabled: boolean }) {
  const [state, action] = useActionState(saveNormalization, null)
  const selectedId = group.playerId ?? (group.suggestion.type === 'single' ? group.suggestion.playerId : '')

  return (
    <article className="rounded-[14px] p-3" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="grid gap-3 lg:grid-cols-[1fr_260px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase text-bg" style={{ background: '#FF6B00' }}>{SPECIAL_AWARD_LABELS[group.category]}</span>
            <span className="rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase text-muted" style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)' }}>{group.count} participantes</span>
            <span className="rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase text-muted" style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)' }}>{group.status}</span>
          </div>
          <p className="mt-2 font-mono text-[12px] text-muted">{group.rawNormalized}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {group.variants.map((variant) => (
              <span key={variant.value} className="rounded-[10px] px-2.5 py-1 text-[12px] font-bold text-white" style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)' }}>
                {variant.value} <span className="text-muted">x{variant.count}</span>
              </span>
            ))}
          </div>
          <p className="mt-2 text-[12px] text-muted">Sugerencia: <span className="text-white">{group.suggestion.label}</span></p>
          {group.playerId && <p className="mt-1 text-[12px] text-muted">Asignado: <span className="text-white">{group.playerLabel}</span></p>}
        </div>
        <form action={action} className="grid gap-2">
          <fieldset disabled={writesDisabled} className="contents">
          <input type="hidden" name="category" value={group.category} />
          <input type="hidden" name="raw_normalized" value={group.rawNormalized} />
          <select name="player_id" defaultValue={selectedId} className="w-full rounded-[12px] bg-[#0A0A0A] px-3 py-2 text-[13px] font-bold text-white outline-none" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
            <option value="">Seleccionar jugador</option>
            {players.map((player) => (
              <option key={player.id} value={player.id}>{player.displayName}{player.countryName ? ` - ${player.countryName}` : ''}</option>
            ))}
          </select>
          <div className="grid grid-cols-3 gap-2">
            <button disabled={writesDisabled} name="status" value="matched" className="rounded-full px-3 py-2 text-[10px] font-extrabold uppercase text-bg disabled:opacity-50" style={{ background: '#FF6B00' }}>Matched</button>
            <button disabled={writesDisabled} name="status" value="no_match" className="rounded-full px-3 py-2 text-[10px] font-extrabold uppercase text-white disabled:opacity-50" style={{ background: '#332017', border: '1px solid rgba(255,177,92,0.24)' }}>No match</button>
            <button disabled={writesDisabled} name="status" value="review" className="rounded-full px-3 py-2 text-[10px] font-extrabold uppercase text-white disabled:opacity-50" style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.1)' }}>Review</button>
          </div>
          <ActionMessage state={state} />
          </fieldset>
        </form>
      </div>
    </article>
  )
}

function ResultsSection({ data, writesDisabled }: { data: SpecialAwardsAdminData; writesDisabled: boolean }) {
  return (
    <section id="resultados-oficiales" className="grid gap-4 rounded-[16px] p-4" style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div>
        <p className="font-mono text-[10px] font-extrabold uppercase tracking-[0.18em] text-orange">Resultados oficiales</p>
        <h2 className="mt-1 text-[20px] font-extrabold text-white">Ganadores por premio</h2>
        <p className="mt-1 text-[12px] text-muted">Confirmar un premio no suma puntos, no bloquea y no toca ranking.</p>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {SPECIAL_AWARD_CATEGORIES.map((category) => (
          <AwardResultCard key={category} category={category} data={data} writesDisabled={writesDisabled} />
        ))}
      </div>
    </section>
  )
}

function AwardResultCard({ category, data, writesDisabled }: { category: SpecialAwardCategory; data: SpecialAwardsAdminData; writesDisabled: boolean }) {
  const awardResult = data.awardResults[category]
  const winnerIds = new Set(awardResult.winners.map((winner) => winner.playerId))
  const candidateSummary = data.candidateSummaries[category]
  const pendingCount = candidateSummary.pendingCount
  const hasPendingNormalizations = pendingCount > 0
  const candidates = candidateSummary.items.filter((candidate) => !winnerIds.has(candidate.playerId))
  const candidateIds = new Set(candidateSummary.items.map((candidate) => candidate.playerId))
  const nonCandidatePlayers = data.players.filter((player) => !candidateIds.has(player.id) && !winnerIds.has(player.id))
  const [showUnchosen, setShowUnchosen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [addState, addAction] = useActionState(addOfficialWinner, null)
  const [confirmState, confirmAction] = useActionState(confirmOfficialResult, null)
  const [draftState, draftAction] = useActionState(returnOfficialResultToDraft, null)
  const locked = awardResult.status === 'locked'

  const winnersWithChoices = awardResult.winners.filter((winner) => winner.choices > 0).length
  const derivedMessage = awardResult.winners.length === 0
    ? 'Sin ganadores cargados.'
    : winnersWithChoices === 0
    ? `Nadie acertó. ${awardResult.winners.length === 1 ? 'El ganador oficial es' : 'Los ganadores oficiales son'} ${awardResult.winners.map((winner) => winner.displayName).join(', ')}.`
    : winnersWithChoices === awardResult.winners.length
    ? 'Todos los ganadores oficiales tuvieron al menos una elección.'
    : 'Hubo acertantes para algunos de los ganadores oficiales.'

  return (
    <article className="grid gap-3 rounded-[14px] p-3" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div>
        <h3 className="text-[16px] font-extrabold text-white">{SPECIAL_AWARD_LABELS[category]}</h3>
        <p className="mt-1 text-[12px] text-muted">Estado: <span className="font-extrabold text-orange">{awardResult.status}</span></p>
        {awardResult.confirmedAt && <p className="mt-1 text-[11px] text-muted">Confirmado: {new Date(awardResult.confirmedAt).toLocaleString('es-AR')}</p>}
      </div>

      <div className="grid gap-2">
        {awardResult.winners.length === 0 ? (
          <p className="rounded-[12px] p-3 text-[12px] text-muted" style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)' }}>Sin ganadores cargados.</p>
        ) : awardResult.winners.map((winner) => (
          <WinnerRow key={winner.id} winner={winner} resultId={awardResult.id} locked={locked} writesDisabled={writesDisabled} />
        ))}
      </div>

      <p className="rounded-[12px] p-3 text-[12px] font-bold text-muted" style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)' }}>{derivedMessage}</p>

      {!locked && (
        <form action={addAction} className="grid gap-2">
          <fieldset disabled={writesDisabled || candidates.length === 0} className="contents">
          <input type="hidden" name="category" value={category} />
          <input type="hidden" name="winner_mode" value="candidate" />
          {candidates.length === 0 && (
            <p className="rounded-[12px] p-3 text-[12px] font-bold text-muted" style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)' }}>
              No hay candidatos disponibles para agregar.
            </p>
          )}
          <select name="player_id" className="w-full rounded-[12px] bg-[#0A0A0A] px-3 py-2 text-[13px] font-bold text-white outline-none" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
            <option value="">Ganador elegido por participantes</option>
            {candidates.map((candidate) => (
              <option key={candidate.playerId} value={candidate.playerId}>{candidate.displayName} - {candidate.count} elecciones</option>
            ))}
          </select>
          <SubmitButton idle="Agregar ganador elegido" pending="Agregando..." disabled={writesDisabled || candidates.length === 0} />
          <ActionMessage state={addState} />
          </fieldset>
        </form>
      )}

      {!locked && (
        <div className="grid gap-2 rounded-[12px] p-2" style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)' }}>
          <button type="button" onClick={() => setShowUnchosen((value) => !value)} className="rounded-full px-3 py-2 text-[11px] font-extrabold uppercase text-white" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)' }}>
            Agregar ganador oficial no elegido
          </button>
          {showUnchosen && <UnchosenWinnerForm category={category} players={nonCandidatePlayers} teams={data.teamOptions} writesDisabled={writesDisabled} />}
        </div>
      )}

      {!locked && awardResult.status !== 'confirmed' && hasPendingNormalizations && (
        <div className="grid gap-2">
          <p className="rounded-[12px] p-3 text-[12px] font-bold text-muted" style={{ background: '#0A0A0A', border: '1px solid rgba(255,177,92,0.24)' }}>
            Todavía hay elecciones pendientes de normalizar.
          </p>
          <button type="button" disabled className="rounded-full px-3 py-2 text-[11px] font-extrabold uppercase text-bg opacity-50" style={{ background: '#FF6B00' }}>
            Confirmar resultado oficial
          </button>
        </div>
      )}

      {!locked && awardResult.status !== 'confirmed' && !hasPendingNormalizations && (
        <div className="grid gap-2">
          <button type="button" onClick={() => setConfirmOpen((value) => !value)} className="rounded-full px-3 py-2 text-[11px] font-extrabold uppercase text-bg" style={{ background: '#FF6B00' }}>
            Confirmar resultado oficial
          </button>
          {confirmOpen && (
            <form action={confirmAction} className="grid gap-2 rounded-[12px] p-3" style={{ background: '#0A0A0A', border: '1px solid rgba(255,107,0,0.24)' }}>
              <fieldset disabled={writesDisabled} className="contents">
              <input type="hidden" name="category" value={category} />
              <p className="text-[12px] font-bold text-muted">Confirmar no modifica puntajes ni ranking.</p>
              <SubmitButton idle="Sí, confirmar" pending="Confirmando..." disabled={writesDisabled} />
              <ActionMessage state={confirmState} />
              </fieldset>
            </form>
          )}
        </div>
      )}

      {!locked && awardResult.status === 'confirmed' && (
        <form action={draftAction} className="grid gap-2">
          <fieldset disabled={writesDisabled} className="contents">
          <input type="hidden" name="category" value={category} />
          <SubmitButton idle="Volver a borrador" pending="Volviendo..." disabled={writesDisabled} />
          <ActionMessage state={draftState} />
          </fieldset>
        </form>
      )}
    </article>
  )
}

function WinnerRow({ winner, resultId, locked, writesDisabled }: { winner: AwardResult['winners'][number]; resultId: string | null; locked: boolean; writesDisabled: boolean }) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [state, action] = useActionState(removeOfficialWinner, null)

  return (
    <div className="rounded-[12px] p-3" style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[13px] font-extrabold text-white">{winner.displayName}</p>
          <p className="text-[12px] text-muted"><PlayerFlag countryName={winner.countryName} /> · {winner.choices > 0 ? `${winner.choices} elecciones` : 'no elegido por participantes'}</p>
        </div>
        {!locked && resultId && (
          <button type="button" onClick={() => setConfirmOpen((value) => !value)} className="rounded-full px-3 py-2 text-[11px] font-extrabold uppercase text-white" style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.24)' }}>
            Quitar
          </button>
        )}
      </div>
      {confirmOpen && resultId && (
        <form action={action} className="mt-3 grid gap-2">
          <fieldset disabled={writesDisabled} className="contents">
          <input type="hidden" name="winner_id" value={winner.id} />
          <input type="hidden" name="result_id" value={resultId} />
          <p className="text-[12px] font-bold text-muted">Quitar este ganador vuelve el resultado a borrador.</p>
          <SubmitButton idle="Sí, quitar" pending="Quitando..." disabled={writesDisabled} />
          </fieldset>
        </form>
      )}
      <ActionMessage state={state} />
    </div>
  )
}

function UnchosenWinnerForm({ category, players, teams, writesDisabled }: { category: SpecialAwardCategory; players: PlayerOption[]; teams: TeamOption[]; writesDisabled: boolean }) {
  const [mode, setMode] = useState<'unchosen_existing' | 'unchosen_new'>('unchosen_existing')
  const [state, action] = useActionState(addOfficialWinner, null)

  return (
    <form action={action} className="grid gap-2">
      <fieldset disabled={writesDisabled} className="contents">
      <input type="hidden" name="category" value={category} />
      <input type="hidden" name="winner_mode" value={mode} />
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setMode('unchosen_existing')} className="rounded-full px-3 py-2 text-[10px] font-extrabold uppercase" style={{ background: mode === 'unchosen_existing' ? '#FF6B00' : '#141414', color: mode === 'unchosen_existing' ? '#0A0A0A' : '#cfcfcf', border: '1px solid rgba(255,255,255,0.1)' }}>Existente</button>
        <button type="button" onClick={() => setMode('unchosen_new')} className="rounded-full px-3 py-2 text-[10px] font-extrabold uppercase" style={{ background: mode === 'unchosen_new' ? '#FF6B00' : '#141414', color: mode === 'unchosen_new' ? '#0A0A0A' : '#cfcfcf', border: '1px solid rgba(255,255,255,0.1)' }}>Nuevo</button>
      </div>
      {mode === 'unchosen_existing' ? (
        <select name="player_id" className="w-full rounded-[12px] bg-[#050505] px-3 py-2 text-[13px] font-bold text-white outline-none" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
          <option value="">Jugador canónico existente</option>
          {players.map((player) => (
            <option key={player.id} value={player.id}>{player.displayName}{player.countryName ? ` - ${player.countryName}` : ''}</option>
          ))}
        </select>
      ) : (
        <div className="grid gap-2">
          <input name="new_display_name" placeholder="Nombre del ganador" className="w-full rounded-[12px] bg-[#050505] px-3 py-2 text-[13px] font-bold text-white outline-none" style={{ border: '1px solid rgba(255,255,255,0.1)' }} />
          <TeamSelect teams={teams} name="new_country_name" codeName="new_country_code" />
        </div>
      )}
      <SubmitButton idle="Agregar no elegido" pending="Agregando..." disabled={writesDisabled} />
      <ActionMessage state={state} />
      </fieldset>
    </form>
  )
}

export function SpecialAwardsAdmin({ data }: { data: SpecialAwardsAdminData }) {
  const setupErrors = useMemo(() => [...new Set(data.setupErrors)], [data.setupErrors])
  const writesDisabled = setupErrors.length > 0

  return (
    <div className="grid gap-5">
      <nav className="flex flex-wrap gap-2">
        {[
          ['#tabla-goleadores', 'Tabla de goleadores'],
          ['#normalizacion', 'Elecciones y normalización'],
          ['#resultados-oficiales', 'Resultados oficiales'],
        ].map(([href, label]) => (
          <a key={href} href={href} className="rounded-full px-4 py-2 text-[12px] font-extrabold uppercase text-white" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)' }}>{label}</a>
        ))}
      </nav>

      {setupErrors.length > 0 && (
        <div className="rounded-[16px] p-4" style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.24)' }}>
          <p className="text-[13px] font-extrabold text-white">Hay tablas pendientes o permisos no disponibles.</p>
          <p className="mt-1 text-[12px] font-bold text-muted">Los formularios quedan bloqueados hasta resolver la configuración.</p>
          <ul className="mt-2 grid gap-1 text-[12px] text-[#FFB1B1]">
            {setupErrors.map((error) => <li key={error}>{error}</li>)}
          </ul>
        </div>
      )}

      <GoalsAdminSection data={data} writesDisabled={writesDisabled} />
      <NormalizationSection data={data} writesDisabled={writesDisabled} />
      <ResultsSection data={data} writesDisabled={writesDisabled} />
    </div>
  )
}

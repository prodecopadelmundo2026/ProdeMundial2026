'use client'

import { useMemo, useState, useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { flagUrl, getTeam, getTeamByCode } from '@/lib/teams'
import { SPECIAL_AWARD_CATEGORIES, SPECIAL_AWARD_LABELS, type SpecialAwardCategory } from '@/lib/special-awards'
import type { SpecialAwardPreview, SpecialAwardPreviewRow } from '@/lib/special-awards-preview'
import {
  addOfficialWinner,
  confirmOfficialResult,
  deletePlayer,
  removeOfficialWinner,
  returnOfficialResultToDraft,
  saveGoalScorer,
  saveNormalization,
  updatePlayerGoals,
  type SpecialAwardActionResult,
} from './actions'

type PlayerOption = {
  id: string
  displayName: string
  normalizedName: string
  countryName: string
  countryCode: string
  goals: number
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
  participants: Array<{
    userId: string
    name: string
    email: string | null
    rawValue: string
  }>
  suggestion:
    | { type: 'single'; playerId: string; label: string }
    | { type: 'ambiguous'; label: string }
    | { type: 'none'; label: string }
}

type PendingNormalizationGroup = {
  key: string
  category: SpecialAwardCategory
  rawNormalizedValues: string[]
  variants: Array<{ value: string; count: number }>
  count: number
  participants: RawGroup['participants']
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

type CanonicalParticipant = {
  userId: string
  name: string
  email: string | null
  rawValue: string
  category: SpecialAwardCategory
  playerLabel: string
  status: 'matched'
}

type CanonicalGroup = {
  rawNormalized: string
  variants: Array<{ value: string; count: number }>
  participants: CanonicalParticipant[]
}

type CanonicalChoice = {
  playerId: string
  displayName: string
  countryName: string
  countryCode: string
  count: number
  crossAwardCount: number
  variants: Array<{ value: string; count: number }>
  participants: CanonicalParticipant[]
  groups: CanonicalGroup[]
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
  canonicalChoices: Record<SpecialAwardCategory, CanonicalChoice[]>
  candidateSummaries: Record<SpecialAwardCategory, {
    items: CandidateSummaryItem[]
    pendingCount: number
    noMatchCount: number
  }>
  awardResults: Record<SpecialAwardCategory, AwardResult>
  awardPreviews: Record<SpecialAwardCategory, SpecialAwardPreview>
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
      <div className="grid grid-cols-[38px_1fr] items-center gap-2">
        <TeamFlagImage countryName={selected} countryCode={meta.code} label={selected} />
        <select
        name={name}
        value={selected}
        onChange={(event) => setSelected(event.target.value)}
        className="w-full rounded-[12px] bg-[#0A0A0A] px-3 py-2 text-[13px] font-bold text-white outline-none"
        style={{ border: '1px solid rgba(255,255,255,0.1)' }}
        >
        {teams.map((team) => (
            <option key={team.name} value={team.name}>{team.name}</option>
          ))}
        </select>
      </div>
      <input type="hidden" name={codeName} value={meta.code} />
    </label>
  )
}

function resolveTeamMeta(countryName?: string | null, countryCode?: string | null) {
  const byName = countryName ? getTeam(countryName) : null
  if (byName?.iso2) return byName
  return countryCode ? getTeamByCode(countryCode) : byName ?? getTeam('')
}

function TeamFlagImage({
  countryName,
  countryCode,
  label,
}: {
  countryName?: string | null
  countryCode?: string | null
  label: string
}) {
  const team = resolveTeamMeta(countryName, countryCode)
  const src = team.iso2 ? flagUrl(team.iso2) : ''
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  return (
    <span className="grid h-[24px] w-[34px] shrink-0 place-items-center overflow-hidden rounded-[4px] bg-white/10 text-[10px] font-extrabold text-white">
      {src && failedSrc !== src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={label} className="h-full w-full object-cover" loading="lazy" onError={() => setFailedSrc(src)} />
      ) : (
        team.displayCode || team.code
      )}
    </span>
  )
}

function PlayerFlag({ countryName, countryCode }: { countryName: string; countryCode?: string }) {
  if (!countryName) return <span className="text-muted">Sin selección</span>
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <TeamFlagImage countryName={countryName} countryCode={countryCode} label={countryName} />
      <span className="min-w-0 truncate">{countryName}</span>
    </span>
  )
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

function statusLabel(status: RawGroup['status'] | 'matched') {
  if (status === 'matched') return 'Confirmado'
  if (status === 'no_match') return 'Sin coincidencia'
  return 'Pendiente'
}

function mergeVariants(groups: RawGroup[]) {
  const variants = new Map<string, number>()
  for (const group of groups) {
    for (const variant of group.variants) {
      variants.set(variant.value, (variants.get(variant.value) ?? 0) + variant.count)
    }
  }
  return [...variants.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value, 'es'))
}

function mergeParticipants(groups: RawGroup[]) {
  return groups
    .flatMap((group) => group.participants)
    .sort((a, b) => a.name.localeCompare(b.name, 'es') || a.rawValue.localeCompare(b.rawValue, 'es'))
}

function groupPendingNormalizations(groups: RawGroup[]): PendingNormalizationGroup[] {
  const bySuggestedPlayer = new Map<string, RawGroup[]>()
  const standalone: RawGroup[] = []

  for (const group of groups) {
    if (group.suggestion.type === 'single') {
      const list = bySuggestedPlayer.get(group.suggestion.playerId) ?? []
      list.push(group)
      bySuggestedPlayer.set(group.suggestion.playerId, list)
    } else {
      standalone.push(group)
    }
  }

  const suggestedGroups = [...bySuggestedPlayer.entries()].map(([playerId, playerGroups]) => {
    const first = playerGroups[0]!
    return {
      key: `suggested-${playerId}`,
      category: first.category,
      rawNormalizedValues: playerGroups.map((group) => group.rawNormalized),
      variants: mergeVariants(playerGroups),
      count: playerGroups.reduce((sum, group) => sum + group.count, 0),
      participants: mergeParticipants(playerGroups),
      suggestion: first.suggestion,
    }
  })

  const standaloneGroups = standalone.map((group) => ({
    key: `raw-${group.rawNormalized}`,
    category: group.category,
    rawNormalizedValues: [group.rawNormalized],
    variants: group.variants,
    count: group.count,
    participants: group.participants,
    suggestion: group.suggestion,
  }))

  return [...suggestedGroups, ...standaloneGroups]
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key, 'es'))
}

function GoalsAdminSection({ data, writesDisabled }: { data: SpecialAwardsAdminData; writesDisabled: boolean }) {
  const [state, action] = useActionState(saveGoalScorer, null)
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLowerCase()
  const semifinalistCountryCodes = new Set(['ARG', 'FRA', 'ESP', 'ENG'])
  const sortPlayers = (players: PlayerOption[]) =>
    [...players].sort((a, b) => b.goals - a.goals || a.displayName.localeCompare(b.displayName, 'es'))
  const sortedPlayers = sortPlayers(data.players)
  const topEight = sortedPlayers.slice(0, 8)
  const cutoffGoals = topEight.at(-1)?.goals ?? 0
  const topGeneralScorers = sortedPlayers.filter((player) => player.goals > 0 && player.goals >= cutoffGoals)
  const semifinalistScorers = sortedPlayers.filter(
    (player) => player.goals > 0 && semifinalistCountryCodes.has(player.countryCode)
  )
  const featuredPlayerIds = new Set([...topGeneralScorers, ...semifinalistScorers].map((player) => player.id))
  const featuredPlayers = sortPlayers(data.players.filter((player) => featuredPlayerIds.has(player.id)))
  const remainingPlayers = sortPlayers(data.players.filter((player) => !featuredPlayerIds.has(player.id)))
  const filteredPlayers = normalizedQuery
    ? sortPlayers(data.players.filter((player) =>
        `${player.displayName} ${player.countryName} ${player.countryCode}`.toLowerCase().includes(normalizedQuery)
      ))
    : []
  return (
    <section id="tabla-goleadores" className="grid gap-4 rounded-[16px] p-4" style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div>
        <p className="font-mono text-[10px] font-extrabold uppercase tracking-[0.18em] text-orange">Tabla de goleadores</p>
        <h2 className="mt-1 text-[20px] font-extrabold text-white">Goles actuales del Mundial</h2>
        <p className="mt-1 text-[12px] text-muted">El admin carga el total actual. Esta tabla no define automáticamente la Bota de Oro.</p>
      </div>

      <form action={action} className="grid gap-3 rounded-[14px] p-3" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>
        <fieldset disabled={writesDisabled} className="contents">
          <p className="text-[12px] font-extrabold text-white">Agregar jugador</p>
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ActionMessage state={state} />
            <SubmitButton idle="Agregar jugador" pending="Guardando..." disabled={writesDisabled} />
          </div>
        </fieldset>
      </form>

      <div className="grid gap-2">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-[16px] font-extrabold text-white">Catálogo de jugadores</h3>
            <p className="mt-1 text-[12px] text-muted">Vista compacta. El buscador revisa todos los jugadores.</p>
          </div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar jugador o selección"
            className="min-w-[220px] rounded-[12px] bg-[#141414] px-3 py-2 text-[13px] font-bold text-white outline-none"
            style={{ border: '1px solid rgba(255,255,255,0.1)' }}
          />
        </div>
        {normalizedQuery ? (
          <PlayerCatalogGrid
            title="Resultados de búsqueda"
            empty="No hay jugadores para ese filtro."
            players={filteredPlayers}
            writesDisabled={writesDisabled}
          />
        ) : (
          <>
            <PlayerCatalogGrid
              title="Jugadores destacados"
              empty="No hay jugadores destacados cargados."
              players={featuredPlayers}
              writesDisabled={writesDisabled}
            />
            <details className="rounded-[14px] p-3" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>
              <summary className="cursor-pointer text-[12px] font-extrabold uppercase text-orange">Ver resto de jugadores ({remainingPlayers.length})</summary>
              <div className="mt-3">
                <PlayerCatalogGrid
                  title=""
                  empty="No hay otros jugadores cargados."
                  players={remainingPlayers}
                  writesDisabled={writesDisabled}
                />
              </div>
            </details>
          </>
        )}
      </div>

    </section>
  )
}

function SecondaryScorersTable({ data }: { data: SpecialAwardsAdminData }) {
  const rankedScorers = sharedPositions(data.scorers)
  const botaVotesByPlayerId = new Map(data.canonicalChoices.bota.map((choice) => [choice.playerId, choice.count]))

  return (
    <section id="tabla-secundaria-goleadores" className="grid gap-4 rounded-[16px] p-4" style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div>
        <p className="font-mono text-[10px] font-extrabold uppercase tracking-[0.18em] text-orange">Tabla secundaria</p>
        <h2 className="mt-1 text-[20px] font-extrabold text-white">Tabla administrativa de goleadores</h2>
        <p className="mt-1 text-[12px] text-muted">Vista informativa. La edición de goles se hace desde el catálogo principal.</p>
      </div>
      <div className="grid gap-2">
        {rankedScorers.length === 0 ? (
          <p className="rounded-[14px] p-4 text-[13px] text-muted" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>
            Todavía no hay goleadores cargados con goles mayores a 0.
          </p>
        ) : rankedScorers.map((scorer) => (
          <div key={scorer.id} className="grid gap-3 rounded-[14px] p-3 md:grid-cols-[48px_1fr_90px_120px_120px]" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>
            <span className="font-mono text-[18px] font-extrabold text-orange">#{scorer.position}</span>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-extrabold text-white">{scorer.displayName}</p>
              <p className="mt-1 text-[12px] text-muted"><PlayerFlag countryName={scorer.countryName} countryCode={scorer.countryCode} /></p>
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted">Goles</p>
              <p className="font-mono text-[22px] font-extrabold text-white">{scorer.goals}</p>
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted">Pronósticos Bota</p>
              <p className="font-mono text-[22px] font-extrabold text-white">{botaVotesByPlayerId.get(scorer.playerId) ?? 0}</p>
            </div>
            <p className="text-[12px] font-bold text-muted">Editar desde el catálogo</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function PlayerCatalogGrid({
  title,
  empty,
  players,
  writesDisabled,
}: {
  title: string
  empty: string
  players: PlayerOption[]
  writesDisabled: boolean
}) {
  return (
    <div className="grid gap-2">
      {title && <p className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-muted">{title}</p>}
      {players.length === 0 ? (
        <p className="rounded-[14px] p-4 text-[13px] text-muted" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>{empty}</p>
      ) : (
        <div className="grid gap-2 lg:grid-cols-2">
          {players.map((player) => (
            <CatalogPlayerCard key={player.id} player={player} writesDisabled={writesDisabled} />
          ))}
        </div>
      )}
    </div>
  )
}

function CatalogPlayerCard({ player, writesDisabled }: { player: PlayerOption; writesDisabled: boolean }) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [draftGoals, setDraftGoals] = useState(player.goals)
  const [savedGoals, setSavedGoals] = useState<number | null>(null)
  const [deleteState, deleteAction] = useActionState(deletePlayer, null)
  const displayedGoals = savedGoals ?? player.goals
  const [goalsState, goalsAction] = useActionState(async (
    previous: SpecialAwardActionResult | null,
    formData: FormData
  ) => {
    const next = await updatePlayerGoals(previous, formData)
    if (next.ok) {
      setSavedGoals(draftGoals)
      setEditOpen(false)
    }
    return next
  }, null)

  function startEditing() {
    setDraftGoals(displayedGoals)
    setEditOpen(true)
  }

  function cancelEditing() {
    setDraftGoals(displayedGoals)
    setEditOpen(false)
  }

  return (
    <article className="rounded-[12px] p-2.5" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>
      <form action={goalsAction} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_90px_auto] sm:items-center">
        <div className="flex min-w-0 items-center gap-2">
          <TeamFlagImage countryName={player.countryName} countryCode={player.countryCode} label={player.countryName || player.displayName} />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-extrabold text-white">{player.displayName}</p>
            <p className="truncate text-[11px] font-bold text-muted">{player.countryName || 'Sin selección'}</p>
          </div>
        </div>
        <input type="hidden" name="player_id" value={player.id} />
        <div className="sm:text-right">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted">Goles</p>
          {editOpen ? (
            <input
              name="goals"
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              required
              autoFocus
              value={draftGoals}
              onFocus={(event) => event.currentTarget.select()}
              onChange={(event) => setDraftGoals(Math.max(0, Number(event.currentTarget.value || 0)))}
              className="mt-1 h-10 w-[76px] rounded-[10px] bg-[#050505] px-3 text-center font-mono text-[18px] font-extrabold tabular-nums text-white outline-none"
              style={{ border: '1px solid rgba(255,255,255,0.18)' }}
            />
          ) : (
            <p className="font-mono text-[20px] font-extrabold text-white">{displayedGoals}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5 sm:justify-end">
          {editOpen ? (
            <>
              <SubmitButton idle="Guardar" pending="Guardando..." />
              <button type="button" onClick={cancelEditing} className="rounded-full px-3 py-2 text-[11px] font-extrabold uppercase text-white" style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.1)' }}>
                Cancelar
              </button>
            </>
          ) : (
            <button type="button" onClick={startEditing} className="rounded-full px-3 py-2 text-[11px] font-extrabold uppercase text-white" style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.1)' }}>
              Editar
            </button>
          )}
          <button type="button" onClick={() => setDeleteOpen((value) => !value)} className="rounded-full px-3 py-2 text-[11px] font-extrabold uppercase text-white" style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.24)' }}>
            Eliminar
          </button>
        </div>
      </form>
      <ActionMessage state={goalsState} />

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
  const [query, setQuery] = useState('')

  return (
    <section id="normalizacion" className="grid gap-4 rounded-[16px] p-4" style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div>
        <p className="font-mono text-[10px] font-extrabold uppercase tracking-[0.18em] text-orange">Elecciones y normalización</p>
        <h2 className="mt-1 text-[20px] font-extrabold text-white">Respuestas originales agrupadas</h2>
        <p className="mt-1 text-[12px] text-muted">Se lee <code>special_bets</code> sin modificarlo. Las decisiones se guardan aparte.</p>
      </div>

      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar texto o variante" className="w-full rounded-[12px] bg-[#141414] px-3 py-2 text-[13px] font-bold text-white outline-none" style={{ border: '1px solid rgba(255,255,255,0.1)' }} />

      {SPECIAL_AWARD_CATEGORIES.map((category) => (
        <AwardNormalizationModule
          key={category}
          category={category}
          data={data}
          query={query}
          writesDisabled={writesDisabled}
        />
      ))}
    </section>
  )
}

function AwardNormalizationModule({
  category,
  data,
  query,
  writesDisabled,
}: {
  category: SpecialAwardCategory
  data: SpecialAwardsAdminData
  query: string
  writesDisabled: boolean
}) {
  const summary = data.candidateSummaries[category]
  const normalizedQuery = query.trim().toLowerCase()
  const choices = data.canonicalChoices[category].filter((choice) => {
    if (!normalizedQuery) return true
    const text = `${choice.displayName} ${choice.countryName} ${choice.groups.map((group) => `${group.rawNormalized} ${group.variants.map((variant) => variant.value).join(' ')}`).join(' ')}`.toLowerCase()
    return text.includes(normalizedQuery)
  })
  const noMatch = data.rawGroups.filter((group) => {
    if (group.category !== category || group.status !== 'no_match') return false
    if (!normalizedQuery) return true
    const text = `${group.rawNormalized} ${group.variants.map((variant) => variant.value).join(' ')}`.toLowerCase()
    return text.includes(normalizedQuery)
  })
  const pending = data.rawGroups.filter((group) => {
    if (group.category !== category || group.status !== 'review') return false
    if (!normalizedQuery) return true
    const text = `${group.rawNormalized} ${group.variants.map((variant) => variant.value).join(' ')}`.toLowerCase()
    return text.includes(normalizedQuery)
  })
  const pendingGroups = groupPendingNormalizations(pending)

  return (
    <div className="grid gap-3 rounded-[16px] p-3" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div>
        <h3 className="text-[18px] font-extrabold text-white">{SPECIAL_AWARD_LABELS[category]}</h3>
        <p className="mt-1 text-[12px] text-muted">Votos agrupados por jugador canónico, sin mezclar premios.</p>
      </div>
      <div className="flex flex-wrap gap-2 text-[11px] font-extrabold uppercase">
        <span className="rounded-full px-3 py-1.5 text-[#A8F0D8]" style={{ background: 'rgba(168,240,216,0.1)' }}>Pendientes: {summary.pendingCount}</span>
        <span className="rounded-full px-3 py-1.5 text-[#FFB15C]" style={{ background: 'rgba(255,177,92,0.1)' }}>Sin coincidencia: {summary.noMatchCount}</span>
      </div>
      <div className="grid gap-2">
        <p className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-muted">Jugadores canónicos confirmados</p>
        {choices.length === 0 ? (
          <p className="rounded-[12px] p-3 text-[12px] text-muted" style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)' }}>Todavía no hay jugadores confirmados para este premio.</p>
        ) : choices.map((choice) => (
          <CanonicalChoiceCard key={choice.playerId} category={category} choice={choice} writesDisabled={writesDisabled} />
        ))}
      </div>
      <div className="grid gap-2">
        <p className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-muted">Respuestas sin coincidencia</p>
        {noMatch.length === 0 ? (
          <p className="rounded-[12px] p-3 text-[12px] text-muted" style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)' }}>No hay respuestas sin coincidencia.</p>
        ) : noMatch.map((group) => (
          <NoMatchGroupCard key={`${group.category}-${group.rawNormalized}`} group={group} writesDisabled={writesDisabled} />
        ))}
      </div>
      <div className="grid gap-2">
        <p className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-muted">Respuestas pendientes de revisión</p>
        {pendingGroups.length === 0 ? (
          <p className="rounded-[12px] p-3 text-[12px] text-muted" style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)' }}>No hay respuestas pendientes para este filtro.</p>
        ) : pendingGroups.map((group) => (
          <NormalizationCard key={`${group.category}-${group.key}`} group={group} players={data.players} writesDisabled={writesDisabled} />
        ))}
      </div>
    </div>
  )
}

function ReviewNormalizationForm({
  category,
  rawNormalized,
  writesDisabled,
}: {
  category: SpecialAwardCategory
  rawNormalized: string
  writesDisabled: boolean
}) {
  const [state, action] = useActionState(saveNormalization, null)

  return (
    <form action={action} className="grid gap-2">
      <fieldset disabled={writesDisabled} className="contents">
        <input type="hidden" name="category" value={category} />
        <input type="hidden" name="raw_normalized" value={rawNormalized} />
        <button disabled={writesDisabled} name="status" value="review" className="rounded-full px-3 py-2 text-[10px] font-extrabold uppercase text-white disabled:opacity-50" style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.1)' }}>
          Volver a pendiente
        </button>
        <ActionMessage state={state} />
      </fieldset>
    </form>
  )
}

function CanonicalChoiceCard({ category, choice, writesDisabled }: { category: SpecialAwardCategory; choice: CanonicalChoice; writesDisabled: boolean }) {
  return (
    <article className="grid gap-3 rounded-[14px] p-3" style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-extrabold text-white">{choice.displayName}</p>
          <p className="mt-1 text-[12px] text-muted"><PlayerFlag countryName={choice.countryName} countryCode={choice.countryCode} /></p>
        </div>
        <div className="rounded-[12px] px-3 py-2 text-right" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="font-mono text-[22px] font-extrabold text-orange">{choice.count}</p>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted">votos</p>
        </div>
      </div>
      {choice.crossAwardCount > 0 && (
        <p className="rounded-[10px] px-3 py-2 text-[12px] font-bold text-muted" style={{ background: 'rgba(168,240,216,0.08)', border: '1px solid rgba(168,240,216,0.18)' }}>
          {choice.crossAwardCount} participantes también lo eligieron en otro premio.
        </p>
      )}
      <div className="grid gap-2">
        {choice.groups.map((group) => (
          <CanonicalGroupCard key={`${category}-${group.rawNormalized}`} category={category} group={group} playerLabel={`${choice.displayName}${choice.countryName ? ` - ${choice.countryName}` : ''}`} writesDisabled={writesDisabled} />
        ))}
      </div>
    </article>
  )
}

function CanonicalGroupCard({
  category,
  group,
  playerLabel,
  writesDisabled,
}: {
  category: SpecialAwardCategory
  group: CanonicalGroup
  playerLabel: string
  writesDisabled: boolean
}) {
  return (
    <div className="grid gap-3 rounded-[12px] p-3" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">Grupo normalizado</p>
          <p className="mt-1 font-mono text-[12px] text-white">{group.rawNormalized}</p>
          <p className="mt-1 text-[12px] text-muted">Jugador canónico actual: <span className="text-white">{playerLabel}</span></p>
        </div>
        <ReviewNormalizationForm category={category} rawNormalized={group.rawNormalized} writesDisabled={writesDisabled} />
      </div>
      <div className="flex flex-wrap gap-2">
        {group.variants.map((variant) => (
          <span key={variant.value} className="rounded-[10px] px-2.5 py-1 text-[12px] font-bold text-white" style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)' }}>
            {variant.value} <span className="text-muted">x{variant.count}</span>
          </span>
        ))}
      </div>
      <ParticipantDetails
        label={`Ver ${group.participants.length} participantes`}
        participants={group.participants}
        category={category}
      />
    </div>
  )
}

function ParticipantDetails({
  label,
  participants,
  category,
}: {
  label: string
  participants: CanonicalParticipant[]
  category: SpecialAwardCategory
}) {
  return (
    <details className="rounded-[12px] p-3" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>
      <summary className="cursor-pointer text-[12px] font-extrabold uppercase text-orange">{label}</summary>
      <div className="mt-3 grid gap-2">
        {participants.map((participant) => (
          <div key={`${participant.userId}-${participant.rawValue}`} className="grid gap-1 rounded-[10px] px-3 py-2 text-[12px]" style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="font-extrabold text-white">{participant.name}</p>
            <p className="text-muted">Escribió: <span className="text-white">{participant.rawValue}</span></p>
            <p className="text-muted">Premio: <span className="text-white">{SPECIAL_AWARD_LABELS[category]}</span></p>
            <p className="text-muted">Jugador canónico: <span className="text-white">{participant.playerLabel}</span></p>
            <p className="text-muted">Estado: <span className="text-white">{statusLabel(participant.status)}</span></p>
          </div>
        ))}
      </div>
    </details>
  )
}

function NoMatchGroupCard({ group, writesDisabled }: { group: RawGroup; writesDisabled: boolean }) {
  return (
    <article className="grid gap-3 rounded-[14px] p-3" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="grid gap-3 lg:grid-cols-[1fr_180px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase text-bg" style={{ background: '#FF6B00' }}>{SPECIAL_AWARD_LABELS[group.category]}</span>
            <span className="rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase text-muted" style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)' }}>{group.count} participantes</span>
            <span className="rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase text-[#FFB15C]" style={{ background: 'rgba(255,177,92,0.1)', border: '1px solid rgba(255,177,92,0.2)' }}>Sin coincidencia</span>
          </div>
          <p className="mt-2 font-mono text-[12px] text-white">{group.rawNormalized}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {group.variants.map((variant) => (
              <span key={variant.value} className="rounded-[10px] px-2.5 py-1 text-[12px] font-bold text-white" style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)' }}>
                {variant.value} <span className="text-muted">x{variant.count}</span>
              </span>
            ))}
          </div>
          <details className="mt-3 rounded-[10px] p-3" style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)' }}>
            <summary className="cursor-pointer text-[12px] font-extrabold uppercase text-orange">Ver participantes</summary>
            <div className="mt-2 grid gap-2">
              {group.participants.map((participant) => (
                <div key={`${participant.userId}-${participant.rawValue}`} className="grid gap-1 rounded-[10px] px-3 py-2 text-[12px]" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="font-extrabold text-white">{participant.name}</p>
                  <p className="text-muted">Escribió: <span className="text-white">{participant.rawValue}</span></p>
                </div>
              ))}
            </div>
          </details>
        </div>
        <ReviewNormalizationForm category={group.category} rawNormalized={group.rawNormalized} writesDisabled={writesDisabled} />
      </div>
    </article>
  )
}

function NormalizationCard({ group, players, writesDisabled }: { group: PendingNormalizationGroup; players: PlayerOption[]; writesDisabled: boolean }) {
  const [state, action] = useActionState(saveNormalization, null)
  const selectedId = group.suggestion.type === 'single' ? group.suggestion.playerId : ''

  return (
    <article className="rounded-[14px] p-3" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="grid gap-3 lg:grid-cols-[1fr_260px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase text-bg" style={{ background: '#FF6B00' }}>{SPECIAL_AWARD_LABELS[group.category]}</span>
            <span className="rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase text-muted" style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)' }}>{group.count} participantes</span>
            <span className="rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase text-muted" style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)' }}>Pendiente</span>
          </div>
          <p className="mt-2 font-mono text-[12px] text-muted">{group.rawNormalizedValues.join(', ')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {group.variants.map((variant) => (
              <span key={variant.value} className="rounded-[10px] px-2.5 py-1 text-[12px] font-bold text-white" style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)' }}>
                {variant.value} <span className="text-muted">x{variant.count}</span>
              </span>
            ))}
          </div>
          <p className="mt-2 text-[12px] text-muted">Sugerencia: <span className="text-white">{group.suggestion.label}</span></p>
          <details className="mt-3 rounded-[10px] p-3" style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)' }}>
            <summary className="cursor-pointer text-[12px] font-extrabold uppercase text-orange">Ver participantes</summary>
            <div className="mt-2 grid gap-2">
              {group.participants.map((participant) => (
                <div key={`${participant.userId}-${participant.rawValue}`} className="text-[12px] text-muted">
                  <span className="font-extrabold text-white">{participant.name}</span> escribió <span className="text-white">{participant.rawValue}</span>
                </div>
              ))}
            </div>
          </details>
        </div>
        <form action={action} className="grid gap-2">
          <fieldset disabled={writesDisabled} className="contents">
          <input type="hidden" name="category" value={group.category} />
          {group.rawNormalizedValues.map((rawNormalized) => (
            <input key={rawNormalized} type="hidden" name="raw_normalized" value={rawNormalized} />
          ))}
          <select name="player_id" defaultValue={selectedId} className="w-full rounded-[12px] bg-[#0A0A0A] px-3 py-2 text-[13px] font-bold text-white outline-none" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
            <option value="">Seleccionar jugador</option>
            {players.map((player) => (
              <option key={player.id} value={player.id}>{player.displayName}{player.countryName ? ` - ${player.countryName}` : ''}</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <button disabled={writesDisabled} name="status" value="matched" className="rounded-full px-3 py-2 text-[10px] font-extrabold uppercase text-bg disabled:opacity-50" style={{ background: '#FF6B00' }}>Confirmar jugador</button>
            <button disabled={writesDisabled} name="status" value="no_match" className="rounded-full px-3 py-2 text-[10px] font-extrabold uppercase text-white disabled:opacity-50" style={{ background: '#332017', border: '1px solid rgba(255,177,92,0.24)' }}>Sin coincidencia</button>
          </div>
          <ActionMessage state={state} />
          </fieldset>
        </form>
      </div>
    </article>
  )
}

function GoldenBootSummary({ scorers }: { scorers: ScorerRow[] }) {
  const topGoals = Math.max(0, ...scorers.map((scorer) => scorer.goals))
  const leaders = topGoals > 0 ? scorers.filter((scorer) => scorer.goals === topGoals) : []

  if (leaders.length === 0) {
    return (
      <div className="rounded-[12px] p-3 text-[12px] font-bold text-muted" style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)' }}>
        Carga goles en la tabla para ver candidatos a Bota de Oro.
      </div>
    )
  }

  if (leaders.length === 1) {
    const leader = leaders[0]
    return (
      <div className="grid gap-2 rounded-[12px] p-3" style={{ background: '#0A0A0A', border: '1px solid rgba(168,240,216,0.22)' }}>
        <p className="font-mono text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted">Máximo goleador según tabla actual</p>
        <div className="min-w-0">
          <p className="truncate text-[14px] font-extrabold text-white">{leader.displayName} - {leader.goals} goles</p>
          <p className="mt-1 text-[12px] text-muted"><PlayerFlag countryName={leader.countryName} countryCode={leader.countryCode} /></p>
        </div>
        <p className="text-[12px] font-bold text-[#A8F0D8]">Candidato sugerido. Juan debe confirmar igualmente el ganador oficial.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-2 rounded-[12px] p-3" style={{ background: '#0A0A0A', border: '1px solid rgba(255,177,92,0.28)' }}>
      <p className="font-mono text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#FFB15C]">EMPATE EN GOLES</p>
      <div className="grid gap-2">
        {leaders.map((leader) => (
          <div key={leader.playerId} className="min-w-0">
            <p className="truncate text-[14px] font-extrabold text-white">{leader.displayName} - {leader.goals} goles</p>
            <p className="mt-1 text-[12px] text-muted"><PlayerFlag countryName={leader.countryName} countryCode={leader.countryCode} /></p>
          </div>
        ))}
      </div>
      <p className="text-[12px] font-bold text-[#FFB15C]">La tabla local no puede determinar automáticamente al ganador oficial. Seleccioná al ganador confirmado oficialmente.</p>
    </div>
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
  const isGoldenBoot = category === 'bota'
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
  const canAddWinner = !isGoldenBoot || awardResult.winners.length === 0
  const hasInvalidGoldenBootWinners = isGoldenBoot && awardResult.winners.length > 1

  const winnersWithChoices = awardResult.winners.filter((winner) => winner.choices > 0).length
  const derivedMessage = awardResult.winners.length === 0
    ? 'Sin ganadores oficiales cargados.'
    : winnersWithChoices === 0
    ? `Nadie lo pronosticó. ${awardResult.winners.length === 1 ? 'El ganador oficial es' : 'Los ganadores oficiales son'} ${awardResult.winners.map((winner) => winner.displayName).join(', ')}.`
    : winnersWithChoices === awardResult.winners.length
    ? 'Todos los ganadores oficiales tuvieron al menos un pronóstico asociado.'
    : 'Hubo acertantes para algunos de los ganadores oficiales.'

  return (
    <article className="grid gap-3 rounded-[14px] p-3" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div>
        <h3 className="text-[16px] font-extrabold text-white">{SPECIAL_AWARD_LABELS[category]}</h3>
        <p className="mt-1 text-[12px] text-muted">Estado: <span className="font-extrabold text-orange">{awardResult.status}</span></p>
        {awardResult.confirmedAt && <p className="mt-1 text-[11px] text-muted">Confirmado: {new Date(awardResult.confirmedAt).toLocaleString('es-AR')}</p>}
      </div>

      {isGoldenBoot && <GoldenBootSummary scorers={data.scorers} />}

      <div className="grid gap-2">
        {awardResult.winners.length === 0 ? (
          <p className="rounded-[12px] p-3 text-[12px] text-muted" style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)' }}>Sin ganadores oficiales cargados.</p>
        ) : awardResult.winners.map((winner) => (
          <WinnerRow key={winner.id} winner={winner} resultId={awardResult.id} locked={locked} writesDisabled={writesDisabled} />
        ))}
      </div>

      <p className="rounded-[12px] p-3 text-[12px] font-bold text-muted" style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)' }}>{derivedMessage}</p>

      {!locked && (
        <form action={addAction} className="grid gap-2">
          <fieldset disabled={writesDisabled || candidates.length === 0 || !canAddWinner} className="contents">
          <input type="hidden" name="category" value={category} />
          <input type="hidden" name="winner_mode" value="candidate" />
          {!canAddWinner && (
            <p className="rounded-[12px] p-3 text-[12px] font-bold text-[#FFB15C]" style={{ background: '#0A0A0A', border: '1px solid rgba(255,177,92,0.24)' }}>
              Bota de Oro ya tiene un ganador oficial cargado. Quita el actual para seleccionar otro.
            </p>
          )}
          {candidates.length === 0 && (
            <p className="rounded-[12px] p-3 text-[12px] font-bold text-muted" style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)' }}>
              No hay candidatos disponibles para agregar.
            </p>
          )}
          <select name="player_id" className="w-full rounded-[12px] bg-[#0A0A0A] px-3 py-2 text-[13px] font-bold text-white outline-none" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
            <option value="">Seleccionar jugador</option>
            {candidates.map((candidate) => (
              <option key={candidate.playerId} value={candidate.playerId}>{candidate.displayName} - {candidate.count} pronósticos</option>
            ))}
          </select>
          <SubmitButton idle="Agregar ganador oficial" pending="Agregando..." disabled={writesDisabled || candidates.length === 0 || !canAddWinner} />
          <ActionMessage state={addState} />
          </fieldset>
        </form>
      )}

      {!locked && canAddWinner && (
        <div className="grid gap-2 rounded-[12px] p-2" style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)' }}>
          <button type="button" onClick={() => setShowUnchosen((value) => !value)} className="rounded-full px-3 py-2 text-[11px] font-extrabold uppercase text-white" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)' }}>
            Agregar ganador no pronosticado
          </button>
          {showUnchosen && <UnchosenWinnerForm category={category} players={nonCandidatePlayers} teams={data.teamOptions} writesDisabled={writesDisabled} />}
        </div>
      )}

      {!locked && awardResult.status !== 'confirmed' && hasPendingNormalizations && (
        <div className="grid gap-2">
          <p className="rounded-[12px] p-3 text-[12px] font-bold text-muted" style={{ background: '#0A0A0A', border: '1px solid rgba(255,177,92,0.24)' }}>
            Todavía hay pronósticos pendientes de normalizar.
          </p>
          <button type="button" disabled className="rounded-full px-3 py-2 text-[11px] font-extrabold uppercase text-bg opacity-50" style={{ background: '#FF6B00' }}>
            Confirmar resultado oficial
          </button>
        </div>
      )}

      {!locked && awardResult.status !== 'confirmed' && hasInvalidGoldenBootWinners && (
        <p className="rounded-[12px] p-3 text-[12px] font-bold text-[#FFB15C]" style={{ background: '#0A0A0A', border: '1px solid rgba(255,177,92,0.24)' }}>
          Bota de Oro debe tener exactamente un ganador oficial. Quita los ganadores extra antes de confirmar.
        </p>
      )}

      {!locked && awardResult.status !== 'confirmed' && !hasPendingNormalizations && !hasInvalidGoldenBootWinners && (
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
          <p className="text-[12px] text-muted"><PlayerFlag countryName={winner.countryName} countryCode={winner.countryCode} /> · {winner.choices > 0 ? `${winner.choices} pronósticos` : 'sin pronósticos asociados'}</p>
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
      <SubmitButton idle="Agregar ganador oficial" pending="Agregando..." disabled={writesDisabled} />
      <ActionMessage state={state} />
      </fieldset>
    </form>
  )
}


function PreviewSection({ data }: { data: SpecialAwardsAdminData }) {
  return (
    <section id="vista-previa" className="grid gap-4 rounded-[16px] p-4" style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] font-extrabold uppercase tracking-[0.18em] text-orange">Vista previa auditable</p>
          <h2 className="mt-1 text-[20px] font-extrabold text-white">Proyección de premios especiales</h2>
          <p className="mt-1 max-w-[720px] text-[12px] text-muted">
            Compara la respuesta literal normalizada contra los ganadores oficiales por player_id.
          </p>
        </div>
        <span className="rounded-full px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em]" style={{ background: 'rgba(255,224,64,0.1)', border: '1px solid rgba(255,224,64,0.28)', color: '#FFE040' }}>
          No modifica puntos ni ranking
        </span>
      </div>

      <div className="grid gap-4">
        {SPECIAL_AWARD_CATEGORIES.map((category) => (
          <AwardPreviewCard key={category} preview={data.awardPreviews[category]} />
        ))}
      </div>
    </section>
  )
}

function AwardPreviewCard({ preview }: { preview: SpecialAwardPreview }) {
  const winnerLabel = preview.winners.length > 0
    ? preview.winners.map((winner) => winner.displayName).join(', ')
    : 'Sin ganador seleccionado'
  const consistencyTone = preview.isConsistent ? '#A8F0D8' : '#FF6B6B'
  const projectedTotalLabel = preview.evaluationReady ? `+${preview.projectedTotalPoints}` : '-'
  const projectedDetailLabel = preview.evaluationReady
    ? `${preview.hitCount} x ${preview.pointsPerHit} pts`
    : 'Seleccioná un ganador'

  return (
    <article className="grid gap-4 rounded-[14px] p-3" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="grid gap-2 lg:grid-cols-[1fr_auto] lg:items-start">
        <div className="min-w-0">
          <h3 className="text-[17px] font-extrabold text-white">{preview.label}</h3>
          <p className="mt-1 text-[12px] font-bold text-muted">Ganador oficial: <span className="text-white">{winnerLabel}</span></p>
          <p className="mt-1 text-[12px] font-bold text-muted">Estado: <span className="text-orange">{preview.resultStatus}</span></p>
        </div>
        <div className="rounded-[12px] px-3 py-2 text-left lg:text-right" style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="font-mono text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted">Total proyectado</p>
          <p className="font-display text-[28px] leading-none text-white">{projectedTotalLabel}</p>
          <p className="text-[11px] font-bold text-muted">{projectedDetailLabel}</p>
        </div>
      </div>

      {!preview.evaluationReady && (
        <p className="rounded-[12px] p-3 text-[12px] font-bold" style={{ background: 'rgba(255,224,64,0.09)', border: '1px solid rgba(255,224,64,0.28)', color: '#FFE040' }}>
          Seleccioná al menos un ganador oficial para calcular la proyección.
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <PreviewMetric label="Habilitados" value={preview.participantsTotal} />
        <PreviewMetric label="Con respuesta" value={preview.withAnswer} />
        <PreviewMetric label="Sin respuesta" value={preview.withoutAnswer} />
        <PreviewMetric label="Pendientes" value={preview.pendingCount} />
        <PreviewMetric label="Listas para evaluar" value={preview.notEvaluatedCount} />
        <PreviewMetric label="Acertaron" value={preview.evaluationReady ? preview.hitCount : '-'} />
        <PreviewMetric label="No acertaron" value={preview.evaluationReady ? preview.missCount : '-'} />
        <PreviewMetric label="Puntos por acierto" value={`+${preview.pointsPerHit}`} />
        <PreviewMetric label="Consistencia" value={`${preview.consistencyTotal}/${preview.participantsTotal}`} color={consistencyTone} />
      </div>

      <p className="rounded-[12px] p-3 text-[12px] font-bold" style={{ background: '#0A0A0A', border: `1px solid ${preview.isConsistent ? 'rgba(168,240,216,0.22)' : 'rgba(255,107,107,0.26)'}`, color: consistencyTone }}>
        {preview.evaluationReady
          ? `acertaron + no acertaron + pendientes + sin respuesta = ${preview.consistencyTotal}`
          : `listas para evaluar + pendientes + sin respuesta = ${preview.consistencyTotal}`}
      </p>

      <div className="grid gap-3">
        {preview.evaluationReady ? (
          <>
            <PreviewRowsBlock title="Acertantes" rows={preview.hits} empty="Nadie acertaría con los ganadores seleccionados." />
            <PreviewRowsBlock title="No acertantes" rows={preview.misses} empty="No hay participantes en este bloque." />
          </>
        ) : (
          <PreviewRowsBlock title="Respuestas listas para evaluar" rows={preview.notEvaluated} empty="No hay respuestas listas para evaluar." />
        )}
        <PreviewRowsBlock title="Pendientes de normalización" rows={preview.pending} empty="No hay respuestas pendientes." />
        <PreviewRowsBlock title="Sin respuesta" rows={preview.noAnswer} empty="No hay participantes sin respuesta." />
      </div>
    </article>
  )
}

function PreviewMetric({ label, value, color = '#fff' }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="rounded-[12px] p-3" style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)' }}>
      <p className="font-mono text-[9px] font-extrabold uppercase tracking-[0.1em] text-muted">{label}</p>
      <p className="mt-1 font-display text-[24px] leading-none tabular-nums" style={{ color }}>{value}</p>
    </div>
  )
}

function PreviewRowsBlock({ title, rows, empty }: { title: string; rows: SpecialAwardPreviewRow[]; empty: string }) {
  return (
    <details className="rounded-[12px] p-3" style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)' }}>
      <summary className="cursor-pointer text-[12px] font-extrabold uppercase text-white">{title} ({rows.length})</summary>
      {rows.length === 0 ? (
        <p className="mt-3 text-[12px] font-bold text-muted">{empty}</p>
      ) : (
        <div className="mt-3 grid gap-2">
          {rows.map((row) => (
            <PreviewParticipantRow key={`${row.userId}-${row.result}-${row.originalAnswer ?? 'empty'}`} row={row} />
          ))}
        </div>
      )}
    </details>
  )
}

function PreviewParticipantRow({ row }: { row: SpecialAwardPreviewRow }) {
  const resultLabel: Record<SpecialAwardPreviewRow['result'], string> = {
    hit: 'Acertó',
    miss: 'No acertó',
    pending: 'Pendiente',
    no_answer: 'Sin respuesta',
    not_evaluated: 'Sin ganador seleccionado',
  }

  return (
    <div className="grid gap-2 rounded-[10px] p-3 text-[12px]" style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="min-w-0">
        <p className="font-extrabold text-white">{row.name}</p>
        <p className="break-all font-mono text-[10px] text-muted">{row.email ?? row.userId}</p>
      </div>
      <div className="grid gap-1 text-muted sm:grid-cols-2">
        <p>Tu respuesta: <span className="font-bold text-white">{row.originalAnswer ?? '-'}</span></p>
        <p>Texto normalizado: <span className="font-bold text-white">{row.rawNormalized ?? '-'}</span></p>
        <p>Se refiere a: <span className="font-bold text-white">{row.canonicalPlayerName ?? '-'}</span></p>
        <p>Ganador oficial: <span className="font-bold text-white">{row.winnerName ?? '-'}</span></p>
        <p>Estado normalización: <span className="font-bold text-white">{row.normalizationStatus ?? '-'}</span></p>
        <p>Resultado: <span className="font-bold text-white">{resultLabel[row.result]}</span></p>
      </div>
      {row.reason && <p className="text-[11px] font-bold text-[#FFB15C]">{row.reason}</p>}
      <p className="font-mono text-[11px] font-extrabold uppercase tracking-[0.1em] text-muted">Puntos proyectados: <span className="text-white">+{row.projectedPoints}</span></p>
    </div>
  )
}

function AdvancedToolsSection({ data, writesDisabled }: { data: SpecialAwardsAdminData; writesDisabled: boolean }) {
  return (
    <section id="herramientas-avanzadas" className="grid gap-4">
      <div className="rounded-[16px] p-4" style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)' }}>
        <p className="font-mono text-[10px] font-extrabold uppercase tracking-[0.18em] text-orange">Herramientas avanzadas</p>
        <h2 className="mt-1 text-[20px] font-extrabold text-white">Auditoría y normalización</h2>
        <p className="mt-1 text-[12px] text-muted">Secciones secundarias para revisar pronósticos, normalizaciones y proyecciones sin modificar ranking.</p>
      </div>

      <details className="rounded-[16px] p-4" style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)' }}>
        <summary className="cursor-pointer text-[13px] font-extrabold uppercase text-orange">Elecciones y normalización</summary>
        <div className="mt-4">
          <NormalizationSection data={data} writesDisabled={writesDisabled} />
        </div>
      </details>

      <details className="rounded-[16px] p-4" style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)' }}>
        <summary className="cursor-pointer text-[13px] font-extrabold uppercase text-orange">Vista previa auditable</summary>
        <div className="mt-4">
          <PreviewSection data={data} />
        </div>
      </details>

      <details className="rounded-[16px] p-4" style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)' }}>
        <summary className="cursor-pointer text-[13px] font-extrabold uppercase text-orange">Tabla administrativa secundaria</summary>
        <div className="mt-4">
          <SecondaryScorersTable data={data} />
        </div>
      </details>
    </section>
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
          ['#resultados-oficiales', 'Resultados oficiales'],
          ['#herramientas-avanzadas', 'Herramientas avanzadas'],
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
      <ResultsSection data={data} writesDisabled={writesDisabled} />
      <AdvancedToolsSection data={data} writesDisabled={writesDisabled} />
    </div>
  )
}

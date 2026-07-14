import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/current-profile'
import { normalizeSpecialAwardText, SPECIAL_AWARD_CATEGORIES, SPECIAL_AWARDS_TOURNAMENT_KEY, type SpecialAwardCategory } from '@/lib/special-awards'
import { TEAM_NAMES, getTeam } from '@/lib/teams'
import { SpecialAwardsAdmin, type SpecialAwardsAdminData } from './SpecialAwardsAdmin'

type PlayerRow = {
  id: string
  display_name: string
  normalized_name: string
  country_code: string | null
  country_name: string | null
}

type StatValueRow = {
  id: string
  player_id: string
  stat_type_id: string
  value: number
  source_note: string | null
  source_url: string | null
  updated_at: string | null
}

type StatTypeRow = {
  id: string
  key: string
  label: string
}

type AliasRow = {
  player_id: string
  alias_raw: string
  alias_normalized: string
}

type NormalizationRow = {
  id: string
  category: SpecialAwardCategory
  raw_value: string
  raw_normalized: string
  player_id: string | null
  status: 'matched' | 'no_match' | 'review'
  reviewed_at: string | null
}

type SpecialBetRow = {
  user_id: string
  balon: string | null
  bota: string | null
  guante: string | null
}

type ResultRow = {
  id: string
  category: SpecialAwardCategory
  status: 'draft' | 'confirmed' | 'locked'
  confirmed_at: string | null
}

type WinnerRow = {
  id: string
  special_bet_result_id: string
  player_id: string
}

type QueryResult<T> = {
  data: T[]
  error: string | null
}

async function asRows<T>(promise: PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<QueryResult<T>> {
  const { data, error } = await promise
  return { data: data ?? [], error: error?.message ?? null }
}

function makePlayerLabel(player: PlayerRow | undefined | null) {
  if (!player) return 'Jugador no encontrado'
  return player.country_name ? `${player.display_name} - ${player.country_name}` : player.display_name
}

function buildData(input: {
  players: PlayerRow[]
  statTypes: StatTypeRow[]
  statValues: StatValueRow[]
  aliases: AliasRow[]
  normalizations: NormalizationRow[]
  specialBets: SpecialBetRow[]
  results: ResultRow[]
  winners: WinnerRow[]
  setupErrors: string[]
}): SpecialAwardsAdminData {
  const playersById = new Map(input.players.map((player) => [player.id, player]))
  const goalsType = input.statTypes.find((type) => type.key === 'goals')
  const goalRows = goalsType
    ? input.statValues.filter((row) => row.stat_type_id === goalsType.id)
    : []
  const goalsByPlayerId = new Map(goalRows.map((row) => [row.player_id, row]))

  const scorers = goalRows
    .filter((row) => row.value > 0)
    .map((row) => {
      const player = playersById.get(row.player_id)
      if (!player) return null
      return {
        id: row.id,
        playerId: player.id,
        displayName: player.display_name,
        countryName: player.country_name ?? '',
        countryCode: player.country_code ?? '',
        goals: row.value,
        sourceNote: row.source_note,
        sourceUrl: row.source_url,
        updatedAt: row.updated_at,
      }
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .sort((a, b) => b.goals - a.goals || a.displayName.localeCompare(b.displayName, 'es'))

  const normalizationByKey = new Map(
    input.normalizations.map((row) => [`${row.category}:${row.raw_normalized}`, row])
  )
  const aliasByNormalized = new Map<string, PlayerRow[]>()
  for (const alias of input.aliases) {
    const player = playersById.get(alias.player_id)
    if (!player) continue
    const list = aliasByNormalized.get(alias.alias_normalized) ?? []
    if (!list.some((item) => item.id === player.id)) list.push(player)
    aliasByNormalized.set(alias.alias_normalized, list)
  }
  for (const player of input.players) {
    const list = aliasByNormalized.get(player.normalized_name) ?? []
    if (!list.some((item) => item.id === player.id)) list.push(player)
    aliasByNormalized.set(player.normalized_name, list)
  }

  const grouped = new Map<string, {
    category: SpecialAwardCategory
    rawNormalized: string
    rawValue: string
    variants: Map<string, number>
    userIds: Set<string>
  }>()

  for (const bet of input.specialBets) {
    for (const category of SPECIAL_AWARD_CATEGORIES) {
      const raw = String(bet[category] ?? '').trim()
      if (!raw) continue
      const rawNormalized = normalizeSpecialAwardText(raw)
      if (!rawNormalized) continue
      const key = `${category}:${rawNormalized}`
      const group = grouped.get(key) ?? {
        category,
        rawNormalized,
        rawValue: raw,
        variants: new Map<string, number>(),
        userIds: new Set<string>(),
      }
      group.variants.set(raw, (group.variants.get(raw) ?? 0) + 1)
      group.userIds.add(bet.user_id)
      grouped.set(key, group)
    }
  }

  const rawGroups = [...grouped.values()]
    .map((group) => {
      const normalization = normalizationByKey.get(`${group.category}:${group.rawNormalized}`) ?? null
      const suggestionPlayers = aliasByNormalized.get(group.rawNormalized) ?? []
      return {
        category: group.category,
        rawNormalized: group.rawNormalized,
        rawValue: group.rawValue,
        variants: [...group.variants.entries()].map(([value, count]) => ({ value, count })),
        count: group.userIds.size,
        status: normalization?.status ?? 'review',
        playerId: normalization?.player_id ?? null,
        playerLabel: makePlayerLabel(playersById.get(normalization?.player_id ?? '')),
        reviewedAt: normalization?.reviewed_at ?? null,
        suggestion:
          suggestionPlayers.length === 1
            ? { type: 'single' as const, playerId: suggestionPlayers[0].id, label: makePlayerLabel(suggestionPlayers[0]) }
            : suggestionPlayers.length > 1
            ? { type: 'ambiguous' as const, label: suggestionPlayers.map(makePlayerLabel).join(', ') }
            : { type: 'none' as const, label: 'Sin sugerencia' },
      }
    })
    .sort((a, b) => a.category.localeCompare(b.category) || b.count - a.count || a.rawNormalized.localeCompare(b.rawNormalized, 'es'))

  const candidateMap = new Map<SpecialAwardCategory, Map<string, number>>()
  const pendingCounts: Record<SpecialAwardCategory, number> = { balon: 0, bota: 0, guante: 0 }
  const noMatchCounts: Record<SpecialAwardCategory, number> = { balon: 0, bota: 0, guante: 0 }

  for (const group of rawGroups) {
    if (group.status === 'matched' && group.playerId) {
      const categoryCandidates = candidateMap.get(group.category) ?? new Map<string, number>()
      categoryCandidates.set(group.playerId, (categoryCandidates.get(group.playerId) ?? 0) + group.count)
      candidateMap.set(group.category, categoryCandidates)
    } else if (group.status === 'no_match') {
      noMatchCounts[group.category] += group.count
    } else {
      pendingCounts[group.category] += group.count
    }
  }

  const candidateSummaries = Object.fromEntries(
    SPECIAL_AWARD_CATEGORIES.map((category) => {
      const items = [...(candidateMap.get(category)?.entries() ?? [])]
        .map(([playerId, count]) => {
          const player = playersById.get(playerId)
          return player ? {
            playerId,
            displayName: player.display_name,
            countryName: player.country_name ?? '',
            countryCode: player.country_code ?? '',
            count,
          } : null
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
        .sort((a, b) => b.count - a.count || a.displayName.localeCompare(b.displayName, 'es'))

      return [category, {
        items,
        pendingCount: pendingCounts[category],
        noMatchCount: noMatchCounts[category],
      }]
    })
  ) as SpecialAwardsAdminData['candidateSummaries']

  const resultsByCategory = new Map(input.results.map((row) => [row.category, row]))
  const winnersByResult = new Map<string, WinnerRow[]>()
  for (const winner of input.winners) {
    const list = winnersByResult.get(winner.special_bet_result_id) ?? []
    list.push(winner)
    winnersByResult.set(winner.special_bet_result_id, list)
  }

  const awardResults = Object.fromEntries(
    SPECIAL_AWARD_CATEGORIES.map((category) => {
      const awardResult = resultsByCategory.get(category) ?? null
      const winners = awardResult
        ? (winnersByResult.get(awardResult.id) ?? [])
            .map((winner) => {
              const player = playersById.get(winner.player_id)
              if (!player) return null
              const choices = candidateMap.get(category)?.get(winner.player_id) ?? 0
              return {
                id: winner.id,
                playerId: winner.player_id,
                displayName: player.display_name,
                countryName: player.country_name ?? '',
                countryCode: player.country_code ?? '',
                choices,
              }
            })
            .filter((winner): winner is NonNullable<typeof winner> => Boolean(winner))
        : []

      return [category, {
        id: awardResult?.id ?? null,
        status: awardResult?.status ?? 'pending',
        confirmedAt: awardResult?.confirmed_at ?? null,
        winners,
      }]
    })
  ) as SpecialAwardsAdminData['awardResults']

  return {
    setupErrors: input.setupErrors,
    teamOptions: TEAM_NAMES.map((name) => ({ name, code: getTeam(name).code, flag: getTeam(name).flag })),
    players: input.players
      .map((player) => ({
        id: player.id,
        displayName: player.display_name,
        normalizedName: player.normalized_name,
        countryName: player.country_name ?? '',
        countryCode: player.country_code ?? '',
        goals: goalsByPlayerId.get(player.id)?.value ?? 0,
        sourceNote: goalsByPlayerId.get(player.id)?.source_note ?? null,
        sourceUrl: goalsByPlayerId.get(player.id)?.source_url ?? null,
        updatedAt: goalsByPlayerId.get(player.id)?.updated_at ?? null,
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName, 'es')),
    scorers,
    rawGroups,
    candidateSummaries,
    awardResults,
  }
}

export default async function SpecialAwardsAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profile = await getCurrentProfile(user)
  if (!profile?.is_admin) redirect('/')

  const [
    players,
    statTypes,
    statValues,
    aliases,
    normalizations,
    specialBets,
    results,
  ] = await Promise.all([
    asRows<PlayerRow>(supabase.from('players').select('id, display_name, normalized_name, country_code, country_name')),
    asRows<StatTypeRow>(supabase.from('player_stat_types').select('id, key, label')),
    asRows<StatValueRow>(supabase.from('player_tournament_stat_values').select('id, player_id, stat_type_id, value, source_note, source_url, updated_at').eq('tournament_key', SPECIAL_AWARDS_TOURNAMENT_KEY)),
    asRows<AliasRow>(supabase.from('player_aliases').select('player_id, alias_raw, alias_normalized')),
    asRows<NormalizationRow>(supabase.from('special_bet_normalizations').select('id, category, raw_value, raw_normalized, player_id, status, reviewed_at').eq('tournament_key', SPECIAL_AWARDS_TOURNAMENT_KEY)),
    asRows<SpecialBetRow>(supabase.from('special_bets').select('user_id, balon, bota, guante')),
    asRows<ResultRow>(supabase.from('special_bet_results').select('id, category, status, confirmed_at').eq('tournament_key', SPECIAL_AWARDS_TOURNAMENT_KEY)),
  ])
  const resultIds = results.data.map((row) => row.id)
  const winners = resultIds.length > 0
    ? await asRows<WinnerRow>(
        supabase
          .from('special_bet_result_winners')
          .select('id, special_bet_result_id, player_id')
          .in('special_bet_result_id', resultIds)
      )
    : { data: [] as WinnerRow[], error: null }

  const setupErrors = [
    players.error,
    statTypes.error,
    !statTypes.error && !statTypes.data.some((type) => type.key === 'goals')
      ? 'No se encontró el tipo de estadística goals.'
      : null,
    statValues.error,
    aliases.error,
    normalizations.error,
    specialBets.error,
    results.error,
    winners.error,
  ].filter((message): message is string => Boolean(message))

  const data = buildData({
    players: players.data,
    statTypes: statTypes.data,
    statValues: statValues.data,
    aliases: aliases.data,
    normalizations: normalizations.data,
    specialBets: specialBets.data,
    results: results.data,
    winners: winners.data,
    setupErrors,
  })

  return (
    <main className="px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1120px]">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-extrabold uppercase tracking-[0.18em] text-muted">Herramienta admin</p>
            <h1 className="mt-2 font-display text-[34px] uppercase leading-none text-white sm:text-[48px]">
              Tabla de goleadores y premios especiales
            </h1>
            <p className="mt-3 max-w-[680px] rounded-[14px] px-4 py-3 text-[12px] font-bold leading-relaxed text-muted" style={{ background: 'rgba(255,107,0,0.08)', border: '1px solid rgba(255,107,0,0.24)' }}>
              La carga es manual e informativa. Confirmar premios no modifica puntajes ni ranking.
            </p>
          </div>
          <Link
            href="/admin"
            className="inline-flex rounded-full px-4 py-2 text-[12px] font-extrabold uppercase text-white"
            style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            Volver al panel admin
          </Link>
        </div>

        <SpecialAwardsAdmin data={data} />
      </div>
    </main>
  )
}

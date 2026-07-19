import {
  SPECIAL_AWARD_CATEGORIES,
  SPECIAL_AWARD_LABELS,
  SPECIAL_AWARD_POINTS,
  normalizeSpecialAwardText,
  type SpecialAwardCategory,
} from '@/lib/special-awards'

export type SpecialAwardPreviewStatus = 'hit' | 'miss' | 'pending' | 'no_answer' | 'not_evaluated'

export type SpecialAwardPreviewParticipant = {
  userId: string
  name: string
  email: string | null
}

export type SpecialAwardPreviewBet = {
  userId: string
  balon: string | null
  bota: string | null
  guante: string | null
}

export type SpecialAwardPreviewPlayer = {
  id: string
  displayName: string
  countryName: string
  countryCode: string
}

export type SpecialAwardPreviewNormalization = {
  category: SpecialAwardCategory
  rawNormalized: string
  playerId: string | null
  status: 'matched' | 'no_match' | 'review'
}

export type SpecialAwardPreviewWinner = {
  playerId: string
  displayName: string
  countryName: string
  countryCode: string
}

export type SpecialAwardPreviewRow = {
  userId: string
  name: string
  email: string | null
  originalAnswer: string | null
  rawNormalized: string | null
  normalizationStatus: SpecialAwardPreviewNormalization['status'] | 'missing' | null
  playerId: string | null
  canonicalPlayerName: string | null
  canonicalCountryName: string | null
  winnerPlayerId: string | null
  winnerName: string | null
  result: SpecialAwardPreviewStatus
  reason: string | null
  projectedPoints: number
}

export type SpecialAwardPreview = {
  category: SpecialAwardCategory
  label: string
  resultStatus: 'pending' | 'draft' | 'confirmed' | 'locked'
  winners: SpecialAwardPreviewWinner[]
  hasSelectedWinners: boolean
  evaluationReady: boolean
  pointsPerHit: number
  participantsTotal: number
  withAnswer: number
  withoutAnswer: number
  hitCount: number
  missCount: number
  pendingCount: number
  notEvaluatedCount: number
  projectedTotalPoints: number
  consistencyTotal: number
  isConsistent: boolean
  hits: SpecialAwardPreviewRow[]
  misses: SpecialAwardPreviewRow[]
  pending: SpecialAwardPreviewRow[]
  noAnswer: SpecialAwardPreviewRow[]
  notEvaluated: SpecialAwardPreviewRow[]
}

export function buildSpecialAwardPreviews(input: {
  participants: SpecialAwardPreviewParticipant[]
  bets: SpecialAwardPreviewBet[]
  normalizations: SpecialAwardPreviewNormalization[]
  players: SpecialAwardPreviewPlayer[]
  results: Record<SpecialAwardCategory, {
    status: SpecialAwardPreview['resultStatus']
    winners: SpecialAwardPreviewWinner[]
  }>
}): Record<SpecialAwardCategory, SpecialAwardPreview> {
  const betsByUserId = new Map(input.bets.map((bet) => [bet.userId, bet]))
  const playersById = new Map(input.players.map((player) => [player.id, player]))
  const normalizationsByKey = new Map(
    input.normalizations.map((row) => [`${row.category}:${row.rawNormalized}`, row])
  )

  return Object.fromEntries(
    SPECIAL_AWARD_CATEGORIES.map((category) => {
      const result = input.results[category]
      const winnerIds = new Set(result.winners.map((winner) => winner.playerId))
      const hasSelectedWinners = result.winners.length > 0
      const pointsPerHit = SPECIAL_AWARD_POINTS[category]
      const rows = input.participants.map((participant) => {
        const storedAnswer = betsByUserId.get(participant.userId)?.[category]
        const originalAnswer = storedAnswer == null ? '' : String(storedAnswer)
        const raw = originalAnswer.trim()
        if (!raw) {
          return makePreviewRow(participant, {
            originalAnswer: null,
            rawNormalized: null,
            normalizationStatus: null,
            result: 'no_answer',
            reason: 'El participante no cargó respuesta para este premio.',
          })
        }

        const rawNormalized = normalizeSpecialAwardText(raw)
        const normalization = normalizationsByKey.get(`${category}:${rawNormalized}`) ?? null
        if (!normalization) {
          return makePreviewRow(participant, {
            originalAnswer,
            rawNormalized,
            normalizationStatus: 'missing',
            result: 'pending',
            reason: 'No existe una normalización persistida para esta respuesta.',
          })
        }

        if (normalization.status !== 'matched' || !normalization.playerId) {
          return makePreviewRow(participant, {
            originalAnswer,
            rawNormalized,
            normalizationStatus: normalization.status,
            playerId: normalization.playerId,
            result: 'pending',
            reason: normalization.status === 'no_match'
              ? 'La normalización quedó marcada como sin coincidencia.'
              : 'La normalización requiere revisión o no tiene player_id.',
          })
        }

        const player = playersById.get(normalization.playerId)
        if (!player) {
          return makePreviewRow(participant, {
            originalAnswer,
            rawNormalized,
            normalizationStatus: normalization.status,
            playerId: normalization.playerId,
            result: 'pending',
            reason: 'El player_id asociado no existe en players.',
          })
        }

        if (!hasSelectedWinners) {
          return makePreviewRow(participant, {
            originalAnswer,
            rawNormalized,
            normalizationStatus: normalization.status,
            playerId: normalization.playerId,
            canonicalPlayerName: player.displayName,
            canonicalCountryName: player.countryName,
            result: 'not_evaluated',
            reason: null,
          })
        }

        const matchedWinner = result.winners.find((winner) => winner.playerId === normalization.playerId) ?? null
        const isHit = winnerIds.has(normalization.playerId)
        return makePreviewRow(participant, {
          originalAnswer,
          rawNormalized,
          normalizationStatus: normalization.status,
          playerId: normalization.playerId,
          canonicalPlayerName: player.displayName,
          canonicalCountryName: player.countryName,
          winnerPlayerId: matchedWinner?.playerId ?? null,
          winnerName: matchedWinner?.displayName ?? null,
          result: isHit ? 'hit' : 'miss',
          reason: isHit ? null : 'El jugador normalizado no coincide con los ganadores oficiales seleccionados.',
          projectedPoints: isHit ? pointsPerHit : 0,
        })
      })

      const hits = rows.filter((row) => row.result === 'hit')
      const misses = rows.filter((row) => row.result === 'miss')
      const pending = rows.filter((row) => row.result === 'pending')
      const noAnswer = rows.filter((row) => row.result === 'no_answer')
      const notEvaluated = rows.filter((row) => row.result === 'not_evaluated')
      const consistencyTotal = hits.length + misses.length + pending.length + noAnswer.length + notEvaluated.length

      return [category, {
        category,
        label: SPECIAL_AWARD_LABELS[category],
        resultStatus: result.status,
        winners: result.winners,
        hasSelectedWinners,
        evaluationReady: hasSelectedWinners,
        pointsPerHit,
        participantsTotal: input.participants.length,
        withAnswer: rows.length - noAnswer.length,
        withoutAnswer: noAnswer.length,
        hitCount: hits.length,
        missCount: misses.length,
        pendingCount: pending.length,
        notEvaluatedCount: notEvaluated.length,
        projectedTotalPoints: hits.reduce((total, row) => total + row.projectedPoints, 0),
        consistencyTotal,
        isConsistent: consistencyTotal === input.participants.length,
        hits: sortPreviewRows(hits),
        misses: sortPreviewRows(misses),
        pending: sortPreviewRows(pending),
        noAnswer: sortPreviewRows(noAnswer),
        notEvaluated: sortPreviewRows(notEvaluated),
      }]
    })
  ) as Record<SpecialAwardCategory, SpecialAwardPreview>
}

function makePreviewRow(
  participant: SpecialAwardPreviewParticipant,
  row: Partial<SpecialAwardPreviewRow> & Pick<SpecialAwardPreviewRow, 'result'>
): SpecialAwardPreviewRow {
  return {
    userId: participant.userId,
    name: participant.name,
    email: participant.email,
    originalAnswer: row.originalAnswer ?? null,
    rawNormalized: row.rawNormalized ?? null,
    normalizationStatus: row.normalizationStatus ?? null,
    playerId: row.playerId ?? null,
    canonicalPlayerName: row.canonicalPlayerName ?? null,
    canonicalCountryName: row.canonicalCountryName ?? null,
    winnerPlayerId: row.winnerPlayerId ?? null,
    winnerName: row.winnerName ?? null,
    result: row.result,
    reason: row.reason ?? null,
    projectedPoints: row.projectedPoints ?? 0,
  }
}

function sortPreviewRows(rows: SpecialAwardPreviewRow[]) {
  return [...rows].sort((a, b) => a.name.localeCompare(b.name, 'es') || a.userId.localeCompare(b.userId))
}

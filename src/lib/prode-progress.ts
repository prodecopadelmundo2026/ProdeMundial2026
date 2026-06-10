export type ProdeCompletionStatus = 'not_started' | 'in_progress' | 'almost_done' | 'completed'

export type ProdeProgress = {
  loadedCount: number
  expectedCount: number
  percentage: number
  status: ProdeCompletionStatus
  missingSections: string[]
}

export type ProdeProgressInput = {
  groupLoadedCount?: number | null
  groupExpectedCount?: number | null
  knockoutLoadedCount?: number | null
  knockoutExpectedCount?: number | null
  specialsLoadedCount?: number | null
  specialsExpectedCount?: number | null
}

export const CONFIRMED_PLAYER_FEE = 20000
export const PRIZE_TARGET_PLAYERS = 65
export const TARGET_PRIZES = {
  first: 800000,
  second: 200000,
  third: 100000,
} as const

function toSafeCount(value: number | null | undefined) {
  return Number.isFinite(value) && value && value > 0 ? Math.floor(value) : 0
}

export function getCompletionStatus(percentage: number, loadedCount: number): ProdeCompletionStatus {
  if (percentage >= 100) return 'completed'
  if (loadedCount <= 0 || percentage < 5) return 'not_started'
  if (percentage >= 70) return 'almost_done'
  return 'in_progress'
}

export function calculatePredictionProgress(input: ProdeProgressInput): ProdeProgress {
  const groupLoadedCount = toSafeCount(input.groupLoadedCount)
  const groupExpectedCount = toSafeCount(input.groupExpectedCount)
  const knockoutLoadedCount = toSafeCount(input.knockoutLoadedCount)
  const knockoutExpectedCount = toSafeCount(input.knockoutExpectedCount)
  const specialsLoadedCount = toSafeCount(input.specialsLoadedCount)
  const specialsExpectedCount = toSafeCount(input.specialsExpectedCount)

  const loadedCount = groupLoadedCount + knockoutLoadedCount + specialsLoadedCount
  const expectedCount = groupExpectedCount + knockoutExpectedCount + specialsExpectedCount
  const percentage = expectedCount > 0 ? Math.min(100, Math.round((loadedCount / expectedCount) * 100)) : 0
  const status = getCompletionStatus(percentage, loadedCount)
  const missingSections: string[] = []

  if (groupLoadedCount < groupExpectedCount) missingSections.push('fase de grupos')
  if (knockoutLoadedCount < knockoutExpectedCount) missingSections.push('eliminatorias')
  if (specialsLoadedCount < specialsExpectedCount) missingSections.push('apuestas especiales')

  return {
    loadedCount,
    expectedCount,
    percentage,
    status,
    missingSections,
  }
}

export function formatPrizePool(confirmedPlayers: number) {
  return formatCurrency(Math.max(0, confirmedPlayers) * CONFIRMED_PLAYER_FEE)
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(Math.max(0, Math.round(amount)))
}

export function calculateProjectedPrizes(confirmedPlayers: number) {
  const multiplier = Math.max(0, confirmedPlayers) / PRIZE_TARGET_PLAYERS
  return {
    first: Math.round(TARGET_PRIZES.first * multiplier),
    second: Math.round(TARGET_PRIZES.second * multiplier),
    third: Math.round(TARGET_PRIZES.third * multiplier),
    multiplier,
  }
}

export function prodeStatusLabel(status: ProdeCompletionStatus) {
  if (status === 'completed') return 'Terminado'
  if (status === 'almost_done') return 'Muy cerca'
  if (status === 'in_progress') return 'En proceso'
  return 'Sin cargar'
}

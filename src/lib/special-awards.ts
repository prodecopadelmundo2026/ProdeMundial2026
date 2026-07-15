export const SPECIAL_AWARDS_TOURNAMENT_KEY = 'world-cup-2026'

export const SPECIAL_AWARD_CATEGORIES = ['balon', 'bota', 'guante'] as const

export type SpecialAwardCategory = (typeof SPECIAL_AWARD_CATEGORIES)[number]

export const SPECIAL_AWARD_LABELS: Record<SpecialAwardCategory, string> = {
  balon: 'Balón de Oro',
  bota: 'Bota de Oro',
  guante: 'Guante de Oro',
}

export const SPECIAL_AWARD_POINTS: Record<SpecialAwardCategory, number> = {
  balon: 20,
  bota: 15,
  guante: 15,
}

export function isSpecialAwardCategory(value: unknown): value is SpecialAwardCategory {
  return SPECIAL_AWARD_CATEGORIES.includes(value as SpecialAwardCategory)
}

export function normalizeSpecialAwardText(value: unknown) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase()
}

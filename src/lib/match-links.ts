export function getMatchPredictionHref(matchId: string | null | undefined) {
  const normalized = String(matchId ?? '').trim()
  if (!normalized || normalized.includes('/') || normalized.includes('\\')) return null
  return `/pronosticos/${encodeURIComponent(normalized)}`
}

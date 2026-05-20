export function normalizeScoreInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 2)
  if (!digits) return ''
  return String(Number(digits))
}

export function isValidScoreInput(value: string) {
  return /^(?:0|[1-9]\d?)$/.test(value)
}

export function parseScoreInput(value: string) {
  if (!isValidScoreInput(value)) return null
  return Number(value)
}

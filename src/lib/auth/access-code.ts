export const ACCESS_CODE_COOKIE = 'prode_access_code'
export const ACCESS_CODE_MAX_AGE_SECONDS = 10 * 60

export function normalizeAccessCode(value: FormDataEntryValue | string | null) {
  return String(value ?? '').trim().toUpperCase()
}

export function isValidAccessCode(code: string) {
  return /^[A-Z0-9-]{4,32}$/.test(code)
}

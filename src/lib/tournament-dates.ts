export const WORLD_CUP_FIRST_MATCH_AT = '2026-06-11T19:00:00Z'

export const PRODE_SUBMISSION_CUTOFF_AT = new Date(
  new Date(WORLD_CUP_FIRST_MATCH_AT).getTime() - 24 * 60 * 60 * 1000
).toISOString()


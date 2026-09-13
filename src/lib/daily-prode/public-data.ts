import type { DailyEvent, Journey, Room } from './model'

/**
 * Boundary for public daily data. It remains empty until an authorized source
 * provides events that pass isPublicDailyEvent; development fixtures never
 * belong in this module.
 */
export const publicDailyJourneys: Journey[] = []
export const publicDailyRooms: Room[] = []
export const publicDailyEvents: DailyEvent[] = []

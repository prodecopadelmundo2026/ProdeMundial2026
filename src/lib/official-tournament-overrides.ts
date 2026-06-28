/**
 * Desempates oficiales que no pueden reconstruirse con los datos de partidos.
 *
 * Ghana y Ecuador terminaron igualados en puntos, diferencia y goles a favor.
 * La tabla oficial publicada ubica a Ghana por encima de Ecuador mediante los
 * criterios FIFA posteriores (conducta/fair play y, si persiste, ranking FIFA).
 * Este override sólo ordena el empate: no altera estadísticas, clasificación
 * ni la combinación de grupos que alimenta el Anexo C.
 *
 * Criterios de desempate:
 * https://www.skysports.com/football/news/12098/13556635/
 * world-cup-2026-third-place-standings-live-table-as-top-eight-sides-qualify-for-knockout-stage
 * Orden final contrastado con las referencias oficiales aportadas el 28/06/2026.
 */
export const OFFICIAL_BEST_THIRD_TIE_ORDER: string[][] = [
  ['Ghana', 'Ecuador'],
]

export function officialBestThirdOrder(names: string[]) {
  const nameSet = new Set(names)
  return OFFICIAL_BEST_THIRD_TIE_ORDER.find(
    (order) => order.length === names.length && order.every((name) => nameSet.has(name))
  ) ?? null
}

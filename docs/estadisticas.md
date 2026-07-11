# Estadisticas

> Documento corto de referencia. La documentacion operativa actual del modulo vive en `docs/modules/estadisticas.md`.

## Para que sirve

`/estadisticas` es una vista de solo lectura para contar la historia del Prode Mundial 2026: evolucion del ranking, lideres por fecha, partidos cerrados en cada dia y records serios/curiosos de los participantes.

La pagina no es fuente de verdad para el scoring. Muestra datos derivados de resultados, pronosticos, desempates y auditoria existente.

## Archivos principales

- `src/app/(app)/estadisticas/page.tsx`: Server Component de la ruta. Carga ranking publico, partidos y un detalle publico de pronosticos para armar el dataset.
- `src/app/(app)/estadisticas/StatisticsDashboard.tsx`: componente visual interactivo. Maneja filtros, timeline, cards, modales y partidos de la fecha.
- `src/lib/statistics.ts`: construye snapshots diarios, metricas acumuladas, cambios por fecha, cards y chequeo de consistencia con el ranking actual.

## Datos que consume

- `get_public_ranking`: ranking publico actual.
- `matches`: partidos oficiales con estado, fecha, score y etapa.
- `get_public_prediction_detail`: participantes, pronosticos reales, pronosticos virtuales y tiebreakers.
- `buildMatchAuditRows`: auditoria de puntos ya existente.
- `buildRoundOf32CrossingAudit`: cruces exactos de eliminatorias.

## Que no conviene tocar sin autorizacion

No modificar desde este modulo:

- reglas de scoring;
- calculo de puntos de ranking;
- bonus de eliminatorias;
- auditoria de resultados;
- snapshots si el cambio altera valores;
- RPCs de Supabase;
- queries o estructura de datos;
- auth, admin o carga de resultados.

Si aparece una diferencia entre `/estadisticas` y `/ranking`, primero documentar el caso y revisar si el snapshot historico esta mostrando un corte de fecha, un empate o un dato actual divergente. No corregir puntos desde la UI.

## Funcionamiento general

### Timeline

`buildStatisticsData` agrupa partidos finalizados por fecha Argentina y crea un snapshot acumulado por dia. Cada entry guarda:

- metricas acumuladas (`points`, `exact`, `signs`, `bonus`);
- posicion por fase (`all`, `group`, `knockout`);
- cambios contra el snapshot anterior;
- puntos ganados ese dia.

La UI permite ver todos los dias, una semana alrededor de una fecha o una fecha puntual.

### Snapshots

Los snapshots se ordenan por fecha de partido finalizado. El ranking dentro del snapshot usa puntos, exactas, signos y nombre como desempate visual. Es una reconstruccion historica desde los datos disponibles, no una tabla independiente.

### Metricas

Las metricas salen de `buildMatchAuditRows`, por lo que respetan la auditoria vigente. La UI no recalcula reglas: solo suma y muestra los campos ya auditados.

### Partidos de la fecha

Para la fecha seleccionada, se listan partidos finalizados de ese dia y se agrupan participantes segun exactas, parciales/signo e incorrectas.

### Cards

Las cards serias y curiosas salen de `makeCard` en `statistics.ts`. Cada card tiene valor principal, detalle y ganadores. En UI, el modal solo aporta valor cuando hay mas de un ganador.

## Riesgos conocidos

- El ranking historico puede no coincidir visualmente con `/ranking` si el usuario esta mirando una fecha anterior al ultimo snapshot.
- El ultimo snapshot debe coincidir con `/ranking` para la vista actual. La ruta alinea ese corte con el ranking oficial enriquecido cuando corresponde.
- Si faltan predicciones o tiebreakers en el detalle publico, algunas estadisticas pueden quedar incompletas.
- Los nombres largos de equipos o participantes requieren layout defensivo para evitar overflow.
- Cambios en `buildMatchAuditRows` o bonus de eliminatorias impactan indirectamente en esta pagina.

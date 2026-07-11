# Modulo Estadisticas

## Proposito

`/estadisticas` muestra una lectura historica y visual del Prode: evolucion diaria, cortes por fecha, partidos terminados del dia y records serios/curiosos.

No es fuente de verdad de scoring. La pagina consume ranking, partidos, predicciones y auditorias existentes para presentar datos.

## Archivos principales

- `src/app/(app)/estadisticas/page.tsx`: carga datos y arma el modelo de la pagina.
- `src/app/(app)/estadisticas/StatisticsDashboard.tsx`: UI interactiva, filtros, timeline, cards y partidos de fecha.
- `src/lib/statistics.ts`: construye snapshots, metricas, cards y chequeos de consistencia.
- `src/lib/public-prediction-data.ts`: contiene el enriquecimiento confirmado de trayectoria que tambien usa `/ranking`.
- `src/lib/ranking-audit.ts`: fuente de auditoria por partido.
- `src/lib/knockout-bonus.ts`: auditoria de cruces y bonus de eliminatorias.

## Datos consumidos

- RPC `get_public_ranking`.
- Tabla `matches`.
- RPC `get_public_prediction_detail`.
- Predicciones reales y virtuales.
- Tiebreakers historicos.
- Auditoria de puntos por partido.

## Flujo general

1. La pagina trae ranking publico y partidos.
2. Si hay usuario autenticado, alinea el ranking con `addConfirmedTrajectoryToRanking`, igual que `/ranking`.
3. Usa un participante semilla para obtener detalle publico de predicciones.
4. `buildStatisticsData` agrupa partidos finalizados por dia Argentina.
5. Se generan snapshots acumulados por fecha.
6. El ultimo snapshot se alinea contra el ranking oficial recibido para que `/estadisticas` y `/ranking` no diverjan en la vista actual.
7. La UI muestra timeline, fecha puntual, partidos de la fecha y cards.

## Timeline

El timeline puede mostrar:

- `Todos los dias`: evolucion completa.
- `Semana`: ventana de 7 cortes alrededor de la fecha seleccionada.
- `Fecha puntual`: resumen del corte seleccionado.

Metricas disponibles:

- Ranking.
- Puntos.
- Exactas.
- Signos acertados: exactas + parciales.
- Bonus.

Si una metrica no tiene valores acumulados, la UI debe mostrar estado vacio en lugar de una linea plana que parezca dato relevante.

## Fecha puntual

Si no hubo puntos nuevos, bonus ni movimientos de puesto para el filtro seleccionado, se muestra un estado vacio explicativo.

Si hubo actividad, se muestran:

- lider del corte;
- mayor subida real;
- mayor caida real;
- mayor puntaje del dia;
- balance de exactas, signos acertados y bonus.

## Cards

Las cards salen de `makeCard`. El boton de detalle solo debe aparecer si hay mas de un ganador o si el detalle aporta valor real.

## Riesgos conocidos

- Si cambia scoring, `/estadisticas` puede moverse aunque no se toque su UI.
- Si falta detalle publico de predicciones o tiebreakers, algunas metricas quedan incompletas.
- El ultimo snapshot debe alinearse con `/ranking`; los snapshots historicos pueden diferir por definicion temporal.
- Los cambios en eliminatorias y bonus pueden afectar timeline, cards y fecha puntual.

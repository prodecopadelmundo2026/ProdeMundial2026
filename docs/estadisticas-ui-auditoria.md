# Auditoria UI de Estadisticas

## Problemas visuales detectados

- En mobile, el timeline no funcionaba como evolucion real y generaba una lista ruidosa.
- Los filtros ocupaban demasiado espacio antes de mostrar datos.
- La leyenda de participantes se duplicaba con el listado mobile.
- Algunas grillas pasaban a dos columnas demasiado pronto en 390px.
- Las cards eran altas y generaban scroll excesivo.
- En partidos de la fecha, nombres largos podian romper la composicion.
- En desktop, el tooltip del timeline estaba fijo arriba a la derecha y podia tapar puntos o robar hover.
- El tooltip no aclaraba con suficiente fuerza que era ranking historico de una fecha.
- Las cards mostraban "Ver detalle" aunque hubiera un unico ganador.
- Caso a revisar: si "anto" aparece #1 en estadisticas pero no en `/ranking`, puede ser fecha historica, empate o inconsistencia de datos. No se modifico scoring.

## Arreglos realizados

- Filtros mobile simplificados: se muestran periodo y fecha; fase, metrica, top y participantes quedan plegados.
- En desktop, todos los filtros siguen disponibles en la barra.
- Cards de estadisticas compactadas en mobile.
- Grillas mobile ajustadas para evitar dos columnas demasiado temprano.
- Boton "Ver detalle" oculto cuando la card tiene un solo ganador.
- Modal conservado para empates o multiples ganadores.
- Partidos de la fecha usan columnas defensivas y texto limitado a dos lineas.
- Timeline desktop ahora posiciona el tooltip cerca del punto activo.
- Tooltip desktop usa `pointer-events-none` para no robar hover.
- Tooltip desktop se mueve hacia la izquierda cuando el punto esta cerca del borde derecho.
- Tooltip aclara "Ranking al ...", "Puntos acumulados" y "Ganados ese dia".
- Leyenda/lista mobile reducida para evitar duplicacion de ruido.

## Pendiente

- Verificar con datos reales completos si algun snapshot historico muestra un lider distinto al ranking actual y documentar la razon.
- Considerar un mini sparkline mobile real por participante si se quiere mostrar evolucion en pantallas chicas sin usar el SVG completo.
- Evaluar virtualizacion si la cantidad de participantes crece mucho.
- Agregar tests visuales o snapshots de Playwright cuando exista suite e2e.

## Recomendaciones futuras

- Mantener `src/lib/statistics.ts` separado de UI. Los cambios visuales deberian vivir en `StatisticsDashboard.tsx`.
- Si se modifica scoring, hacerlo primero en auditoria/ranking y recien despues revisar `/estadisticas`.
- Para nuevas cards, definir si el detalle aporta valor antes de mostrar modal.
- Evitar tooltips dentro del area activa del SVG si pueden interferir con hover.
- Revisar siempre nombres largos y empates multiples.

## Breakpoints revisados

- 360px: filtros compactos, una columna, sin overflow horizontal.
- 390px: se evita el salto temprano a dos columnas en cards criticas.
- 430px: layout mobile sigue priorizando lectura vertical.
- 768px: transicion a tablet con dos columnas donde mejora la lectura.
- Desktop: filtros en fila, SVG visible, tooltip dinamico y no interactivo.

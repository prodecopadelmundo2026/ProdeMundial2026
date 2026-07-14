# Worklog

## 2026-07-11 - Premios especiales Etapa 3 admin

### Objetivo

Preparar la administración local de tabla de goleadores, normalización de apuestas especiales y resultados oficiales informativos sin activar scoring.

### Cambios

- Se agrega migración local para `player_aliases`, `special_bet_normalizations`, `special_bet_results` y `special_bet_result_winners`.
- Se agrega índice único sobre `players.normalized_name` y seeds idempotentes de jugadores/aliases confirmados.
- Se crea `/admin/premios-especiales` protegida para admins con cliente Supabase de sesión.
- Se permite cargar totales actuales de goles, normalizar textos agrupados de `special_bets` y confirmar ganadores oficiales sin tocar puntos.
- Se agrega acceso visible desde `/admin`.

### Validación

- `npx eslint` dirigido a archivos modificados: OK.
- `npx tsc --noEmit --pretty false`: OK.
- `git diff --check`: OK, solo avisos CRLF propios de Windows.

## 2026-07-11 - Estadisticas: auditoria, alineacion y UI

### Objetivo

Corregir `/estadisticas` sin tocar reglas de scoring, Supabase, auth, admin ni estructura de datos.

### Hallazgos

- `/ranking` enriquecia el ranking base con `addConfirmedTrajectoryToRanking`.
- `/estadisticas` reconstruia el ultimo snapshot solo desde auditoria cruda de partidos.
- Esa diferencia podia mostrar un lider actual distinto, por ejemplo `anto #1` en estadisticas y Franco Galarza #1 en ranking.
- El modo `Fecha puntual` mostraba ganadores falsos cuando no habia movimientos ni puntos nuevos.
- La metrica `Bonus` podia quedar como linea plana en cero sin explicar que no habia valores acumulados.
- `Signos` era poco claro para usuarios no tecnicos.

### Cambios

- El ultimo snapshot de `/estadisticas` se alinea con el ranking oficial que usa `/ranking`.
- `Fecha puntual` muestra estado vacio cuando no hay actividad real.
- `Signos` pasa a mostrarse como `Signos acertados`.
- El timeline explica la metrica seleccionada.
- El estado de metricas en cero se muestra como vacio explicativo.
- Se documenta el modulo en `docs/modules/estadisticas.md`.
- Se agrega memoria operativa en `docs/memory.md` y reglas locales en `AGENTS.md`.

### Validación

- `npm run build`: OK.
- `git diff --check`: OK, solo avisos CRLF propios de Windows.
- Navegador local `/estadisticas`: OK en 360, 390, 430, 768 y desktop; sin overlay de Next, sin errores de consola y sin overflow horizontal.

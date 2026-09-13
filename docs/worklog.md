# Worklog

## 2026-09-13 - P017 estabilidad visual y bloqueo de API

- El home diario reserva altura para títulos de hasta tres líneas, descripción, estado y tarjetas de eventos/resumen, evitando que la fecha o el estado cambien la estructura vertical.
- En escritorio el hero separa información y controles; en mobile los apila sin ocultar texto. La fecha visible pasa a formato breve completo, mientras el label accesible conserva la fecha íntegra.
- No hay credencial deportiva local ni acceso al scope Vercel de producción desde esta sesión; la agenda pública continúa vacía, sin Boxeo ni UFC, y no se creó adaptador ni se tocó Supabase.

## 2026-09-13 - P016 calendario propio y bloqueo de API

- Se reemplaza el selector `input type="date"` por un calendario visual propio reutilizado en `/`, `/mi-prode` y `/ranking`.
- El calendario usa la zona `America/Argentina/Buenos_Aires`, permite mes, día anterior/siguiente, Hoy, teclado, Escape y cierre al click afuera; los instantes continúan en UTC.
- La agenda pública no ofrece Boxeo, MMA ni UFC sin una fuente autorizada y campos completos. No se encontró una credencial deportiva local ni acceso al scope productivo de Vercel.
- El contador detiene su intervalo al inicio del evento y el arnés cubre futuro, inminente, iniciado, sin horario, reprogramado, cierre y zona horaria argentina.

## 2026-09-13 - P014 agenda única, calendario y preparación móvil

- Inicio concentra la agenda pública; `/diario` redirige permanentemente.
- Calendario, cierre MVP y contador quedan centralizados para datos públicos futuros; no hay eventos ficticios visibles.
- `dev` se alineó por fast-forward con `main` y se preservó una rama de respaldo local.

## 2026-09-13 - P013 auditoria de experiencia diaria y eventos validos

### Cambios

- Separamos los fixtures sinteticos de la fuente publica y dejamos estados vacios honestos mientras no haya proveedor autorizado.
- Reforzamos la puerta de publicacion y los datos requeridos por la consola manual.

### Validacion

- Contrato 122/122, JSON, TypeScript, ESLint dirigido, build y smoke HTTP local correctos.
- No hay automatizacion de navegador disponible; queda pendiente inspeccion visual de Preview en los anchos solicitados.
- Preview de la rama P013 publicado y smoke HTTP correcto; `main` no fue modificado.

## 2026-09-13 - P012 separación diaria y catálogo deportivo

### Cambios

- Separamos Inicio, Prode diario, Mi Prode, Ranking y Reglas de la experiencia histórica.
- Se creó catálogo central y validación de elegibilidad pública.
- Se reubicaron los accesos históricos equivalentes bajo Historial y se quitó el selector técnico de escenarios de la UI pública.

### Validación

- Contrato 122/122, TypeScript y build correctos.

## 2026-09-13 - P011 adaptacion UX/UI del Prode diario

### Objetivo

Recuperar la identidad visual editorial del producto en la experiencia diaria sin alterar reglas, auditoria, datos historicos ni Supabase.

### Cambios

- Navbar diario alineado a la navegacion existente, franja naranja contextual y hero de evento destacado con ranking por sala.
- Fondo geometrico reutilizable y agenda diaria en cards con fuente manual secundaria.
- Mi Prode y ranking completo pasan a composiciones apilables para movil.
- Se corrigieron los fallbacks de fecha/hora demo y se agrego un parcial al evento en curso.

### Validacion

- Contrato: 122/122; JSON, TypeScript, ESLint dirigido y build correctos.
- Browser automation no disponible en este host; pendiente capturas visuales externas.

## 2026-09-13 - P007 comando estable y regresiones del contrato

### Objetivo

Convertir el verificador sintetico en un comando reproducible sin agregar dependencias ni acceder a servicios externos.

### Cambios

- Se agrego `npm run daily-prode:verify-contract` con salida legible y JSON.
- El comando compila en temporal, no usa rutas locales absolutas y limpia sus artefactos.
- Se agregaron regresiones de excepciones, correcciones y auditoria; el total es 122 controles.

### Validacion

- Comando normal: 122 controles correctos; JSON y fallo sintetico con codigo 1 verificados.
- Typecheck, ESLint dirigido, build y `git diff --check`: correctos.

## 2026-09-13 - P006 fixtures sinteticos y contrato deportivo

### Objetivo

Crear un arnes determinista para validar proveedores futuros sin datos reales, UI, Supabase ni cambios de scoring.

### Cambios

- Se creo un contrato neutral con identidad externa, timestamps, hashes, estados, resultados por deporte y reemplazos.
- Se agregaron fixtures sinteticos de futbol, copa, tenis, boxeo, excepciones y actualizaciones.
- Se agrego un verificador local sin dependencias que ejecuto 108 controles.
- Se reforzo la deteccion de revisiones duplicadas con hash incompatible.

### Validacion

- Typecheck, ESLint dirigido, build y `git diff --check`: correctos.
- Verificador TypeScript/Node: 108 controles correctos, sin framework ni dependencia nueva.

## 2026-09-13 - P005 validacion contractual de proveedores

### Objetivo

Preparar la evidencia que Goalserve debe aportar para decidir un uso futuro, sin enviar contactos ni contratar servicios.

### Cambios

- Se creo el commit documental separado de P004: `cff4b01`.
- Se preparo una solicitud no enviada de muestras tecnicas y condiciones legales/comerciales.
- Se documentaron matrices de normalizacion y de decision por deporte.
- Se mantiene datos manuales para la maqueta; no se eligio proveedor de boxeo ni se implemento adaptador.

### Validacion

- Prompt P005 copiado integramente y verificado por hash.
- Typecheck y `git diff --check`: correctos; sin cambios de codigo ni suite de tests configurada.

## 2026-09-13 - P004 prueba controlada de Goalserve

### Objetivo

Comprobar si Goalserve puede alimentar el modelo aislado de Prode diario sin integrarlo ni modificar Supabase.

### Cambios

- Se inspecciono y consolido P001-P003 en el checkpoint local `41bc388`.
- Se revisaron referencias y muestras oficiales publicas de Goalserve sin utilizar credenciales ni guardar payloads.
- Se documento una matriz de futbol, copa, tenis, boxeo, correcciones, IDs y licencia.
- Goalserve queda apto solo para prototipo: faltan pruebas de copa, boxeo, correcciones y derechos de exhibicion.

### Validacion

- Typecheck, ESLint dirigido, build y `git diff --check`: correctos.
- No hay script de tests ni archivos de prueba configurados en el proyecto.

## 2026-09-13 - P003 reglas de resultados y proveedor

### Objetivo

Confirmar resultados de futbol y boxeo, revisar la capacidad de los proveedores y dejar listo el modelo sin integrar servicios externos.

### Cambios

- Se separan marcador a 90, alargue, penales y clasificado en el modelo de futbol V2.
- Se mantiene pendiente el puntaje del clasificado y se confirma la matriz inicial de boxeo.
- Se agrega la confirmacion administrativa al registro de auditoria aislado.
- Se documenta la comparacion entre Goalserve, Sportradar, API-Sports y TheSportsDB, con recomendacion condicionada a prueba de datos.

### Validacion

- `npx tsc --noEmit --pretty false`: OK.
- ESLint dirigido a P003: OK.
- Smoke test de copa y auditoria: OK.
- `npm run build`: OK.
- UI movil de resultado de copa: OK; sin overflow ni errores de consola.
- `git diff --check`: OK, con avisos CRLF de Windows.

## 2026-09-13 - Reglas funcionales P002 de Prode diario

## 2026-09-13 - Hito integral P010 de Prode diario

### Cambios

- Se agregan filtros de agenda por deporte, estado y participación, manteniendo jornada y sala.
- El laboratorio manual protegido permite cambiar competencia, deporte y formato; reinicia el resultado al cambiar su estructura.
- Se conserva fuente manual visible, auditoría local, separación del Mundial y ausencia de persistencia/Supabase.
- Se documenta el plan de rama y entorno de desarrollo aislado sin crear infraestructura.

### Validación

- Contrato diario: 122/122; TypeScript, lint dirigido, build y smoke HTTP local correctos.
- No hay navegador automatizado ni sesión admin local para el recorrido visual autenticado; pendiente explícito.

## 2026-09-13 - Reglas funcionales P002 de Prode diario

### Objetivo

Convertir la V2 en experiencia principal, formalizar reglas de salas y puntajes, y preparar modelos aislados para deportes y proveedores sin tocar datos del Mundial.

### Cambios

- Se crea la portada diaria `/` y se mantiene `/diario`.
- Se conserva la portada del Mundial en `/historial/mundial` y se amplian sus accesos desde `/historial`.
- Se centralizan scoring, ranking por sala y modelo V2 bajo `src/lib/daily-prode/`.
- Se agrega una maqueta demo para futbol, tenis y boxeo con estados y casos excepcionales.
- Se documentan reglas, propuestas y decisiones pendientes en `docs/ai/`.

### Validacion

- `npx tsc --noEmit --pretty false`: OK.
- `npx eslint` dirigido a P002: sin errores; warning heredado en la portada historica del Mundial por `img` HTML.
- Smoke test de scoring, participacion y empate: OK.
- `npm run build`: OK.
- `git diff --check`: OK, con avisos CRLF de Windows.
- `/`, `/diario` y `/historial`: 200 localmente; capturas en 320, 390, 768, 1024 y 1366 px. `/historial/mundial` conserva la portada previa pero requiere SUPABASE_SERVICE_ROLE_KEY local para terminar sus consultas existentes.
- Verificacion automatizada: los cinco anchos diarios no tuvieron overflow, errores de consola ni overlay; salas, estados y empate de la jornada cerrada demo respondieron correctamente.
- `npm run lint` global: 20 errores preexistentes fuera del alcance de P002.

## 2026-09-13 - Inicio V2 Prode diario

### Objetivo

Registrar reglas persistentes para la V2 y crear una primera maqueta local reversible de agenda diaria multideporte sin tocar datos reales, scoring, Supabase remoto ni deploy.

### Cambios

- Se agrega `docs/ai/` como documentacion canonica para V2, prompts, ejecuciones y decisiones.
- Se conserva el prompt P001 original en `docs/ai/prompts/P001-inicio-v2-prode-diario.md`.
- Se crea `/diario` con datos demo aislados para agenda, salas, participacion y clasificacion.
- Se crea `/historial` como acceso secundario al Mundial 2026.
- La navegacion principal agrega Prode diario e Historial.

### Validacion

- `npx tsc --noEmit --pretty false`: OK.`r`n- `npx eslint` dirigido a archivos modificados: OK.`r`n- `npm run build`: OK.`r`n- `git diff --check`: OK, con avisos CRLF de Windows.`r`n- `npm run lint` global falla por deuda preexistente fuera de P001.`r`n- Capturas responsive generadas con Playwright CLI.`r`n- Dev server respondio 200 en rutas nuevas, con panic de Turbopack sobre `/ranking` al cerrar.`r`n- No se hicieron migraciones, escrituras remotas, push ni deploy.

## 2026-07-19 - Cierre visual post Mundial y auditoría pública

### Objetivo

Pasar pantallas públicas a estado final del Mundial terminado sin tocar scoring, ranking, Supabase remoto, migraciones ni puntos.

### Cambios

- El detalle de ranking reutiliza el preview central de premios especiales para mostrar respuesta original, normalización, ganador oficial, estado y puntos.
- Home deriva la campeona desde la final y muestra ranking final, ganadores del Prode y mensaje de cierre.
- `/premios` mantiene premios económicos y agrega ganadores del Prode y premios especiales oficiales desde datos cargados.
- `/ranking` ajusta textos de estado final sin cambiar orden ni criterios.
- `/reglas` toma puntos de trayectoria y premios desde constantes compartidas y agrega aclaraciones auditables.

### Validación

- `npx tsc --noEmit --pretty false`: OK.
- `git diff --check`: OK, con warnings CRLF de Windows.
- Pendiente: auditoría matemática independiente completa de `group_points + knockout_points + trajectory_bonus + special_awards_bonus = total_points` para los 43 participantes.

## 2026-07-14 - Premios especiales admin y métricas Home

### Objetivo

Mejorar la herramienta admin de premios especiales sin tocar scoring, ranking, migraciones ni respuestas originales.

### Cambios

- La Home muestra partidos jugados como `100 / 104` y los premios con `$` alineado al importe.
- El admin agrupa elecciones por jugador canónico y premio, no por variante escrita.
- Se agregan detalles desplegables de participantes y respuesta original exacta.
- Se separan visualmente Bota de Oro, Balón de Oro y Guante de Oro.
- La tabla de goleadores queda manual e informativa, sin campos visibles de fuente o URL.
- Se traducen estados y acciones visibles de normalización.
- Se normaliza el render de banderas con caja estable.
- Las normalizaciones confirmadas conservan sus grupos por `raw_normalized`.
- Cada grupo confirmado puede volver a pendiente sin modificar `special_bets`.
- Las respuestas `Sin coincidencia` permanecen visibles, auditables y reversibles.
- Se eliminó la acción redundante `Dejar pendiente` de respuestas ya pendientes.
- Se separaron los códigos técnicos de selecciones de las abreviaturas visibles mediante `displayCode`.
- Fixture mobile, bracket compacto y fallback del ranking usan el helper centralizado.
- República Checa queda como nombre visible principal; Chequia y Czechia solo como aliases internos.
- Los headers públicos muestran `Estados Unidos · Canadá · México`.
- Los códigos técnicos guardados y `country_code` permanecen sin cambios.

### Validación

- `npx eslint` dirigido a archivos modificados: OK.
- `npx tsc --noEmit --pretty false`: OK.
- `git diff --check`: OK, salvo avisos CRLF de Windows.
- No se ejecutó build.
- No se hizo commit ni push.
- No se consultó ni modificó Supabase remoto.

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

## 2026-07-19 - Premios especiales en ranking

### Objetivo

Integrar Balon de Oro, Bota de Oro y Guante de Oro al ranking real sin persistir puntos manuales.

### Cambios

- Se agrega una capa derivada de premios especiales sobre el ranking ya enriquecido con trayectoria.
- Solo puntuan resultados `confirmed` y `locked`; `pending` y `draft` quedan en 0.
- El calculo reutiliza `buildSpecialAwardPreviews` para que el criterio coincida con el impacto proyectado del admin.
- `/ranking`, `/estadisticas`, `/ranking/[userId]`, Home/layout heredan la misma composicion final.
- El detalle de usuario muestra un desglose auditable de premios especiales.
- Las acciones admin revalidan ranking, detalle, estadisticas y Home.

### Validacion

- `git diff --check`: OK, solo avisos CRLF propios de Windows.
- No se ejecuto build por pedido explicito.
- No se hicieron migraciones, escrituras remotas ni commits.

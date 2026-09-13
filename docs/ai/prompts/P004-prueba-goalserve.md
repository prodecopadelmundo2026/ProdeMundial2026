# P004 — Prueba controlada del candidato Goalserve

Continuamos la V2 del Prode diario en:

`C:\Users\juana\Desktop\Proyectos\prode-mundial-2026`

## Estado actual

* Rama: `main`.
* Commit base informado: `22bd94e`.
* P001, P002 y P003 están aplicados como cambios locales sin commit.
* `supabase/.temp/` debe permanecer intacto y sin trackear.
* No hubo push, deploy, migraciones ni cambios externos.
* El candidato recomendado para una prueba es Goalserve, pero todavía no está elegido como proveedor definitivo.

Antes de comenzar, inspeccioná el diff completo. Si los cambios corresponden exclusivamente a P001–P003, creá un checkpoint local con un mensaje claro, por ejemplo:

`chore: checkpoint daily prode v2 foundation`

No incluyas `supabase/.temp/`, secretos, archivos ajenos ni cambios no relacionados. No hagas push ni deploy.

## Reglas que no deben modificarse

* Fútbol exacto a 90 minutos: 3 puntos.
* Fútbol resultado general a 90 minutos: 2 puntos.
* Fútbol incorrecto: 0 puntos.
* En fútbol de eliminación, el clasificado se representa separado del marcador a 90 minutos.
* Los goles de penales no forman parte del marcador exacto.
* Tenis con resultado exacto de sets: 3 puntos.
* Tenis con ganador correcto pero sets incorrectos: 1 punto.
* Tenis con ganador incorrecto: 0 puntos.
* Boxeo provisional:

  * 3 puntos por ganador, método KO/TKO y round exactos.
  * 2 puntos por ganador y método correcto, aunque el round sea incorrecto.
  * 2 puntos por ganador y decisión/no KO correctos.
  * 1 punto por ganador correcto con método incorrecto.
  * 0 puntos por ganador incorrecto.
* Una persona puede participar en varias salas por jornada, con una sola entrada por sala.
* El pozo de cada sala es independiente.
* Si hay empate en el primer puesto, el pozo se reparte entre los empatados.
* No hay segundo ni tercer premio.

No cambies estos puntajes ni inventes reglas para empate, no contest o pelea anulada.

## Objetivo

Realizar una prueba técnica y funcional de Goalserve como candidato de proveedor.

No integres todavía Goalserve a la aplicación principal, no conectes Supabase y no modifiques las tablas existentes.

La prueba debe determinar si el proveedor puede alimentar correctamente el modelo aislado de:

`src/lib/daily-prode/`

Revisá especialmente:

* `model.ts`.
* `scoring.ts`.
* `provider.ts`.
* La documentación de P003.
* Los componentes demo actuales.

## Acceso y seguridad

Consultá la documentación oficial y actualizada de Goalserve.

Si existe una credencial ya configurada en el entorno local, podés usarla únicamente para esta prueba. No muestres su valor, no la guardes en Git y no la incluyas en logs, capturas ni documentación.

No me pidas que pegue claves en el chat.

Si no hay credenciales disponibles, continuá con la documentación pública, muestras disponibles y un análisis de los campos esperados. Informá exactamente qué no pudo comprobarse.

No agregues dependencias nuevas salvo que sea imprescindible y quede expresamente justificado.

## Casos que hay que comprobar

### 1. Fútbol normal

Conseguí o identificá un ejemplo de partido que permita comprobar:

* ID externo del evento.
* Competencia.
* Temporada.
* Equipos o participantes.
* Fecha y hora.
* Zona horaria.
* Estado programado.
* Estado en vivo.
* Marcador a 90 minutos.
* Resultado final.
* Última actualización.

Verificá si el resultado permite calcular correctamente:

* Marcador exacto.
* Local, empate o visitante.
* Evento pendiente.
* Evento finalizado.

### 2. Fútbol de eliminación

Buscá un caso que permita comprobar la mayor cantidad posible de estos datos:

* Partido único o partido de vuelta.
* Marcador a 90 minutos.
* Alargue.
* Marcador después del alargue.
* Tanda de penales.
* Resultado de penales.
* Equipo ganador.
* Equipo clasificado.
* Identificación del partido de ida y vuelta.
* Identificación de la serie o llave.
* Estado de la definición.

Diferenciá claramente:

* Lo que Goalserve entrega directamente.
* Lo que puede calcularse sin riesgo.
* Lo que debería confirmarse manualmente.
* Lo que no entrega.

No supongas que el ganador del evento equivale siempre al clasificado de una serie.

### 3. Tenis

Comprobá partidos:

* Al mejor de 3.
* Al mejor de 5, si la cobertura lo permite.

Verificá si entrega:

* ID externo estable.
* Competencia y temporada.
* Jugadores.
* Ganador.
* Sets completos.
* Resultado parcial durante el partido.
* Resultado final.
* Tiebreaks.
* Retiro.
* Walkover.
* Partido suspendido.
* Partido reprogramado.

Confirmá si los sets pueden transformarse sin ambigüedad en:

* 2-0.
* 2-1.
* 3-0.
* 3-1.
* 3-2.

### 4. Boxeo

Buscá ejemplos de:

* Victoria por KO/TKO.
* Victoria por decisión/no KO.
* Resultado con round.
* Empate, si existe.
* No contest o pelea anulada, si existe.

Verificá si Goalserve entrega:

* Ganador.
* Método.
* Diferencia entre KO y TKO.
* Round.
* Fecha y hora.
* Estado de la pelea.
* Resultado pendiente.
* Reprogramación.
* Cancelación.

Confirmá específicamente si el método y el round son datos estructurados o solamente texto libre.

Si solamente aparecen en texto libre, documentá la dificultad y no implementes todavía un parser definitivo.

## Actualizaciones, correcciones e identificadores

Comprobá, mediante documentación o muestras, cómo funciona lo siguiente:

* Mismo evento recibido varias veces.
* Cambio de horario.
* Cambio de estado.
* Resultado parcial.
* Resultado corregido.
* Evento cancelado.
* Evento reprogramado.
* Cambio de ID externo.
* Evento reemplazado.
* Diferencia entre hora del evento y hora de recepción.
* Identificación de la fuente.
* Frecuencia de actualización.
* Límites de requests.
* Restricciones de uso o exhibición pública.
* Precio y condiciones del plan necesario.

Compará estos datos con el contrato actual de `provider.ts`.

Indicá qué campos faltan en el modelo actual y cuáles ya están cubiertos.

## Entregables técnicos

Podés crear un pequeño script o prueba local aislada para consultar el proveedor, preferentemente usando las herramientas ya disponibles y `fetch` nativo.

No conectes la consulta con la UI principal ni con Supabase.

Si guardás ejemplos, no conserves payloads completos del proveedor salvo que las condiciones de uso lo permitan. Preferí guardar:

* Fixtures mínimos y anonimizados.
* Campos relevantes.
* Mapeos normalizados.
* Hashes de payload.
* Fecha de consulta.
* Versión o documentación consultada.

Nunca guardes claves ni URLs con credenciales.

## Matriz de compatibilidad

Generá una tabla con estas columnas:

* Requisito.
* Goalserve lo entrega.
* Campo o endpoint.
* Nivel de confianza.
* Transformación necesaria.
* Riesgo.
* Acción recomendada.

Incluí como mínimo:

* Fútbol normal.
* Fútbol a 90 minutos.
* Alargue.
* Penales.
* Clasificado.
* Ida y vuelta.
* Tenis por sets.
* Tenis al mejor de 3.
* Tenis al mejor de 5.
* Boxeo por KO/TKO.
* Boxeo por decisión.
* Boxeo por round.
* Empate.
* No contest.
* Correcciones.
* Reprogramaciones.
* IDs estables.
* Última actualización.
* Licencia de exhibición pública.

## Decisión

No declares Goalserve como proveedor elegido solamente porque cubre nominalmente los tres deportes.

Al finalizar, clasificá cada área como:

* Confirmada con muestra.
* Confirmada solamente por documentación.
* Parcial.
* No comprobada.
* No compatible.

Emití una recomendación:

* Apto para continuar.
* Apto solamente para fútbol y tenis.
* Apto para prototipo, pero no para puntajes definitivos.
* No recomendable.

Si faltan muestras reales de boxeo o de fútbol con penales, indicá que la decisión queda condicionada y qué evidencia falta.

## Documentación

Conservá P001, P002 y P003 sin sobrescribirlos.

Registrá este prompt como:

`docs/ai/prompts/P004-prueba-goalserve.md`

Creá o actualizá:

* `docs/ai/README.md`
* `docs/ai/estado-actual.md`
* `docs/ai/decisiones/P004-prueba-goalserve.md`
* `docs/ai/ejecuciones/P004-prueba-goalserve.md`

Documentá también si Goalserve puede o no representar correctamente los campos:

* `scoreAt90`.
* `extraTimeScore`.
* `penaltyScore`.
* `qualifier`.
* `sets`.
* `boxingMethod`.
* `boxingRound`.
* `externalEventId`.
* `lastReceivedAt`.
* `payloadHash`.
* `manualOverride`.
* `replacementEventId`.

## Validación

Ejecutá:

* TypeScript.
* ESLint dirigido.
* Tests existentes.
* Build.
* `git diff --check`.

No intentes corregir la deuda previa de lint en archivos no relacionados.

Al finalizar devolveme:

1. Estado del repositorio.
2. Commit de checkpoint creado, si correspondía.
3. Cómo se hizo la prueba.
4. Qué ejemplos se pudieron verificar.
5. Matriz de compatibilidad.
6. Qué datos Goalserve no entrega o entrega de forma insuficiente.
7. Recomendación final.
8. Qué campos habría que agregar o ajustar antes de crear las tablas de Supabase.
9. Qué sigue para P005.

No hagas migraciones, integración productiva, push, deploy ni cambios externos.

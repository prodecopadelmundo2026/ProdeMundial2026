# P006 — Fixtures sintéticos y arnés de pruebas del contrato deportivo

Continuamos la V2 del Prode diario en:

`C:\Users\juana\Desktop\Proyectos\prode-mundial-2026`

## Estado actual

* Rama: `main`.

* La rama está `ahead 2` respecto del remoto.

* Último commit importante informado:

  `cff4b01 docs: document Goalserve provider evaluation`

* P005 dejó documentación local sin commitear.

* No hay integración con Goalserve.

* No hay credenciales reales.

* No hubo migraciones, cambios en Supabase, push ni deploy.

* `supabase/.temp/` debe permanecer intacto y sin trackear.

* Goalserve quedó como candidato parcial para prototipo, no como proveedor elegido.

* No existe todavía evidencia contractual suficiente para puntajes definitivos.

Antes de comenzar:

1. Verificá el estado real de Git.
2. Revisá que los cambios pendientes correspondan a P005.
3. Si es así, creá un commit local separado:

`docs: record provider validation outcome`

No incluyas archivos ajenos, secretos ni `supabase/.temp/`. No hagas push ni deploy.

## Objetivo

Crear un arnés de fixtures sintéticos y pruebas de contrato, completamente aislado de:

* UI.
* Supabase.
* Usuarios reales.
* Resultados reales.
* Goalserve.
* Puntajes definitivos.
* Pagos.
* Premios.

La finalidad es que el modelo interno pueda recibir información de cualquier proveedor futuro de manera determinista, auditable y validable.

Todo fixture sintético debe identificarse expresamente como:

`synthetic fixture — not supplied by provider`

No presentes estos fixtures como evidencia de Goalserve ni de ningún proveedor.

## Contrato interno

Revisá el modelo actual de:

* `src/lib/daily-prode/model.ts`
* `src/lib/daily-prode/provider.ts`
* `src/lib/daily-prode/scoring.ts`
* El resto de `src/lib/daily-prode/`

Sin romper las APIs internas existentes, prepará el contrato para representar, cuando corresponda:

* `externalEventId`.
* `externalCompetitionId`.
* `externalSeasonId`.
* `externalSeriesId`.
* `externalParticipantId`.
* `providerStatus`.
* `scheduledAt`.
* `startedAt`.
* `receivedAt`.
* `syncedAt`.
* `payloadHash`.
* `replacementEventId`.
* `scoreAt90`.
* `extraTimeScore`.
* `penaltyScore`.
* `qualifier`.
* `legNumber`.
* `aggregateScore`.
* Sets detallados de tenis.
* Tiebreaks.
* `boxingMethodRaw`.
* `boxingMethod`.
* `boxingRound`.
* Corrección manual.
* Bloqueo manual.
* Auditoría del cambio.

Si alguno ya existe con otro nombre, reutilizá la estructura actual y documentá la equivalencia.

No agregues campos solamente por anticipación si no tienen utilidad para el contrato. No crees tablas de base de datos.

## Fixtures obligatorios

Creá fixtures mínimos, pequeños y legibles. No guardes payloads completos ni copies documentación protegida.

### Fútbol normal

Fixture con:

* Partido programado.
* Partido en vivo.
* Partido finalizado.
* Marcador a 90 minutos.
* Local, visitante y empate.
* Timestamp de recepción.
* Estado del proveedor.
* ID externo.

### Fútbol de eliminación

Fixture con:

* Partido único.
* Marcador 1-1 a los 90 minutos.
* Marcador 2-1 después del alargue.
* Penales 4-3.
* Equipo ganador.
* Equipo clasificado.
* Serie o llave.
* Partido de vuelta.
* Número de partido de la serie.
* Marcador agregado.

Verificá que el contrato mantenga separados:

* `scoreAt90`.
* `extraTimeScore`.
* `penaltyScore`.
* `qualifier`.
* `aggregateScore`.

No calcules el clasificado a partir del ganador si el fixture no lo informa explícitamente.

No incluyas los goles de la tanda de penales dentro del marcador exacto a 90 minutos.

### Tenis al mejor de 3

Fixture con:

* Resultado 2-0.
* Resultado 2-1.
* Sets detallados.
* Un set con tiebreak.
* Resultado parcial.
* Resultado final.
* Ganador.
* Fecha de recepción.

### Tenis al mejor de 5

Fixture con:

* Resultado 3-0.
* Resultado 3-1.
* Resultado 3-2.
* Sets detallados.
* Tiebreak.
* Estado final.

Si el contrato no puede representar de forma inequívoca el mejor de 5, registrá el problema como una falla del contrato.

### Excepciones de tenis

Creá fixtures o casos de validación para:

* Retiro.
* Walkover.
* Suspensión.
* Cancelación.
* Reprogramación.
* Resultado pendiente.
* Resultado corregido.

No conviertas automáticamente un retiro en una victoria normal.

### Boxeo por KO/TKO

Fixture con:

* Ganador.
* Método KO o TKO.
* Round de finalización.
* Método crudo original.
* Método normalizado.
* Fecha de recepción.
* Estado final.

### Boxeo por decisión

Fixture con:

* Ganador.
* Decisión/no KO.
* Ausencia de round de finalización.
* Método crudo.
* Método normalizado.

Verificá que no se genere un round ficticio.

### Boxeo con resultado excepcional

Creá casos para:

* Empate.
* No contest.
* Pelea anulada.
* Pelea suspendida.
* Pelea reprogramada.
* Resultado sin ganador.

No asignes puntos ni declares ganador en estos casos.

## Ciclo de actualización

Probá el contrato con el mismo evento recibido varias veces:

1. Evento programado.
2. Evento en vivo.
3. Resultado parcial.
4. Resultado final.
5. Resultado corregido.
6. Evento cancelado o reprogramado.

Verificá:

* Que el mismo ID externo no genere eventos duplicados.
* Que el mismo payload sea idempotente.
* Que un cambio de payload genere una revisión nueva.
* Que `payloadHash` permita distinguir versiones.
* Que una corrección manual pueda bloquear una sobrescritura automática.
* Que una actualización automática posterior no elimine una corrección manual.
* Que `replacementEventId` permita reemplazar un evento sin perder la trazabilidad.
* Que los cambios puedan auditarse.

No uses la hora local como reemplazo silencioso de timestamps UTC.

## Validaciones obligatorias

El contrato debe rechazar o informar claramente:

* Evento sin ID externo.
* Participante sin ID cuando el proveedor debería entregarlo.
* Fecha inválida.
* Estado desconocido.
* Score ambiguo.
* Penales mezclados con el marcador a 90.
* Clasificado inferido sin evidencia.
* Sets imposibles para el formato.
* Round negativo o inexistente.
* KO/TKO sin round cuando el proveedor afirma que existe.
* Decisión con round ficticio.
* Resultado final sin ganador en un evento que no permite empate.
* Duplicado con datos incompatibles.
* Corrección que intenta sobrescribir un dato bloqueado manualmente.

Los errores deben ser descriptivos y no quedar ocultos.

## Puntajes

No modifiques las reglas de scoring en esta tarea.

Solamente verificá que los fixtures puedan alimentar correctamente:

* Fútbol 3/2/0.
* Tenis 3/1/0.
* Boxeo provisional 3/2/1/0.

No calcules premios, pozos ni posiciones.

El caso del clasificado en fútbol continúa pendiente de puntaje definitivo.

## Tests

Revisá primero qué herramientas de test ya existen en el proyecto.

Preferencias:

1. Usar el runner ya instalado.
2. Agregar pruebas puras sobre el contrato.
3. Ejecutar las pruebas de forma determinista.
4. No agregar un framework nuevo solamente para esta tarea.

Si no existe ningún runner compatible:

* No instales dependencias sin autorización.
* Creá un verificador local solamente si puede ejecutarse con las herramientas existentes.
* Documentá la limitación exacta.

Las pruebas deben cubrir como mínimo:

* Normalización de fútbol normal.
* Separación de 90 minutos, alargue y penales.
* Clasificado explícito.
* Ida y vuelta.
* Tenis al mejor de 3.
* Tenis al mejor de 5.
* Tiebreak.
* Retiro y walkover.
* Boxeo KO/TKO.
* Boxeo por decisión.
* Empate y no contest.
* Duplicados.
* Correcciones.
* `payloadHash`.
* Reemplazo de evento.
* Bloqueo manual.
* Estados inválidos.

## Estructura

Usá la estructura actual del proyecto. Si conviene, podés agregar una organización similar a:

* `src/lib/daily-prode/providers/fixtures/`
* `src/lib/daily-prode/providers/contract-tests/`
* `src/lib/daily-prode/providers/goalserve/`

No crees el adaptador real de Goalserve todavía. Si creás un adaptador de prueba, debe recibir únicamente fixtures sintéticos.

No conectes nada a la UI ni a Supabase.

## Documentación

Registrá este prompt como:

`docs/ai/prompts/P006-fixtures-y-contrato-deportivo.md`

Creá o actualizá:

* `docs/ai/README.md`
* `docs/ai/estado-actual.md`
* `docs/ai/decisiones/P006-contrato-deportivo.md`
* `docs/ai/ejecuciones/P006-fixtures-y-contrato-deportivo.md`
* `docs/ai/provider-evaluations/provider-contract.md`

Documentá:

* Qué representa cada campo.
* Qué campos son obligatorios.
* Qué campos son opcionales.
* Qué casos no pueden resolverse todavía.
* Qué datos deberían venir del proveedor.
* Qué datos requieren confirmación manual.
* Qué datos nunca deben inferirse.
* Qué diferencia hay entre resultado, corrección y reemplazo.
* Qué partes siguen siendo independientes del proveedor.

## Validación y entrega

Ejecutá:

* TypeScript.
* ESLint dirigido.
* Tests o verificador disponible.
* Build.
* `git diff --check`.

No corrijas la deuda previa de lint en archivos no relacionados.

Al finalizar devolveme:

1. Estado real del repositorio.
2. Commit local creado para P005.
3. Archivos agregados o modificados.
4. Fixtures creados.
5. Pruebas ejecutadas.
6. Resultado de cada grupo de pruebas.
7. Campos que faltan o quedaron ambiguos.
8. Casos que el contrato rechaza correctamente.
9. Casos que todavía requieren decisión funcional.
10. Si Goalserve podría mapearse a este contrato en el futuro.
11. Qué debería contener P007.

No integres proveedores reales, no uses datos reales, no hagas migraciones, no modifiques Supabase, no hagas push ni deploy.

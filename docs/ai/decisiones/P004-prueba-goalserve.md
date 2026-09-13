# P004 - Prueba controlada de Goalserve

Fecha: 2026-09-13

## Metodo y alcance

La prueba fue documental y de muestras publicas oficiales. No habia una variable de entorno cuyo nombre contuviera `GOALSERVE` o `GOAL_SERVE`; los archivos `.env` no se abrieron ni se registraron sus valores. Por lo tanto no se realizaron llamadas autenticadas, no se guardaron payloads del proveedor y no se incorporo ningun adaptador, dependencia, tabla ni migracion.

Fuentes revisadas:

- [Referencia API in-play](https://documentation.goalserve.com/): REST/JSON/XML, webhook, IDs, timestamps, estados y muestras de futbol y tenis.
- [Soccer API](https://www.goalserve.com/en/sport-data-feeds/soccer-api/description/7): fixtures, resultados, estado/minuto en vivo, UTC y refresco de 2 a 5 segundos.
- [Tennis API](https://www.goalserve.com/rurms-and-conditions/sport-data-feeds/tennis-api/description): muestra final con `set1` a `set5`, `sets_won`, ganador e IDs.
- [Full Package](https://www.goalserve.com/en/sport-data-feeds/full-package-api/description/14): futbol y tenis en vivo; boxeo solo como agenda, resultados finales y cuotas.
- [Terminos publicos](https://www.goalserve.com/en/terms-and-conditions): no constituyen una licencia explicita de exhibicion o redistribucion de datos deportivos.

Las conclusiones de muestra se refieren a los objetos publicados, no a una respuesta del tenant ni a cobertura de una competencia concreta.

## Hallazgos por deporte

### Futbol normal

La muestra in-play publica contiene `info.id`, `league`, `start_date`, `start_time`, `start_ts`, `period`, `score`, `state`, `team_info`, `core.updated`, `core.updated_ts` y banderas `finished`, `stopped` y `removed`. Esto respalda identidad externa, participantes, competencia, hora UTC, estado/marcador en vivo y hora de observacion del proveedor. La pagina comercial declara fixtures, resultados y estados Finished/Postponed/Cancelled/Live.

No se obtuvo una respuesta final autenticada ni una muestra que nombre expresamente un campo de marcador al minuto 90. Un marcador final comun puede servir para partidos sin alargue, pero no se debe mapear a `scoreAt90` en eliminacion sin un desglose verificable.

### Futbol de eliminacion

La referencia y las muestras publicas no documentan campos separados para alargue, tanda de penales, clasificado, partido de ida/vuelta, serie/llave, agregado ni reemplazo de evento. La referencia tampoco documenta una semantica de correccion de resultado final. No se puede inferir `qualifier` desde el ganador de un evento: una vuelta puede terminar empatada o el clasificado puede provenir del agregado.

Todo `scoreAt90`, `extraTimeScore`, `penaltyScore` o `qualifier` que no llegue estructurado debe quedar en revision administrativa; no se crea parser ni regla compensatoria en P004.

### Tenis

Hay evidencia publica estructurada: la muestra de resultado final usa `match.id`, `tournament.id`, IDs de jugadores, estado `Fin.`, `winner`, `sets_won` y `set1` a `set5`. La referencia in-play publica confirma ademas `updated_ts`, `period`, `score` y estadisticas `S1` a `S5`, `T`, `TBP` y `POINTS`. Es posible transformar resultados finales estructurados a 2-0 y 2-1; los cinco slots permiten modelar 3-0, 3-1 y 3-2 cuando el formato del torneo ya sea conocido.

No se obtuvo una muestra final de mejor de 5, ni prueba suficiente de que el feed exponga el formato del partido de forma explicita, ni una semantica documentada para retiro, walkover, suspension, reprogramacion o cambio de ID. El codigo de tiebreak existe como `TBP`, pero la muestra publica no prueba una representacion final por set sin ambiguedad.

### Boxeo

El paquete completo declara solamente agenda, resultados finales y cuotas de boxeo. No hay referencia publica encontrada que muestre ganador, KO frente a TKO, decision, round, empate, no contest, anulacion, estado, cancelacion o reprogramacion. Tampoco hay evidencia de si un eventual metodo seria estructurado o texto libre.

No se puede usar Goalserve para liquidar puntajes de boxeo con las reglas actuales hasta recibir una muestra contractual de resultados. No se debe deducir un resultado desde cuotas.

## Actualizaciones, identidad y contrato actual

La referencia in-play permite recibir el mismo evento repetidas veces: conserva una clave de evento y publica `updated_ts`; tambien presenta cambios de periodo, estado y marcador. El contrato actual de `provider.ts` ya protege identidad por proveedor/externalId/deporte, ordena por `revision`, conserva `syncedAt` y bloquea correcciones automaticas cuando existe una confirmacion manual.

`updated_ts` puede ser el candidato a `source.updatedAt` y, tras validacion de monotonia, a `revision`. `syncedAt` ya cumple la funcion de `lastReceivedAt` desde la aplicacion. No debe asumirse que `updated_ts` sea unico o estrictamente creciente entre endpoints: almacenar hash del payload y un contador propio evita ignorar una correccion con timestamp repetido.

La documentacion publica no confirma una politica de correcciones de resultados, sustitucion/reemplazo de IDs, una relacion entre eventos de ida/vuelta, limites de requests por plan ni derechos de exhibicion publica. La pagina comercial publica precios de paquetes, pero alcance, limites, territorios y licencia de publicacion deben quedar expresos en el contrato. Los terminos del sitio son genericos y no conceden esa licencia.

## Matriz de compatibilidad

| Requisito | Goalserve lo entrega | Campo o endpoint | Nivel de confianza | Transformacion necesaria | Riesgo | Accion recomendada |
| --- | --- | --- | --- | --- | --- | --- |
| Futbol normal | Si | in-play `info`, `team_info`, `core`; fixtures/results declarados | Confirmada con muestra publica | Adaptador por endpoint | Medio | Probar con cuenta antes de persistir |
| Futbol a 90 minutos | No separado | No documentado | No comprobada | Requiere desglose de periodo o confirmacion | Alto | No liquidar copas sin muestra |
| Alargue | No comprobado | No documentado | No comprobada | Campo estructurado requerido | Alto | Revision manual |
| Penales | No comprobado | No documentado | No comprobada | Campo estructurado requerido | Alto | Revision manual |
| Clasificado | No comprobado | No documentado | No compatible para inferencia | Relacion de llave/confirmacion | Alto | Nunca inferir del ganador del evento |
| Ida y vuelta | No comprobado | No documentado | No comprobada | `seriesId`, leg y agregado | Alto | Exigir muestra contractual |
| Tenis por sets | Si | `set1`-`set5`, `sets_won`, `S1`-`S5` | Confirmada con muestra publica | Normalizar pares de games y sets ganados | Bajo | Apto para adaptador aislado |
| Tenis al mejor de 3 | Si, si el formato se conoce | Sets finales estructurados | Confirmada con muestra publica | Contar sets definitivos | Medio | Validar competencia/formato |
| Tenis al mejor de 5 | Slots disponibles; sin final real de 5 | `set1`-`set5` / `S1`-`S5` | Parcial | Requiere formato fiable de torneo | Medio | Obtener muestra de Grand Slam |
| Tiebreak de tenis | Parcial | Codigo `TBP`; sin ejemplo final por set | Parcial | Guardar detalle sin usarlo para puntaje | Medio | Confirmar serializacion |
| Retiro/walkover/suspension tenis | No comprobado | `stopped` in-play sin semantica final | No comprobada | Estado de dominio explicito | Alto | No auto-confirmar |
| Boxeo KO/TKO | No comprobado | No hay muestra | No comprobada | Metodo estructurado y detalle crudo | Muy alto | No habilitar puntaje |
| Boxeo decision | No comprobado | No hay muestra | No comprobada | Metodo estructurado | Muy alto | No habilitar puntaje |
| Boxeo por round | No comprobado | No hay muestra | No comprobada | Numero de round | Muy alto | No habilitar puntaje |
| Empate/no contest/anulacion boxeo | No comprobado | No hay muestra | No comprobada | Outcome de dominio | Muy alto | Revision administrativa |
| Correcciones | Parcial | `updated_ts`, webhook; sin politica final | Parcial | Hash y auditoria | Alto | Conservar version y bloqueo manual |
| Reprogramaciones/cancelaciones | Estado comercial declarado; sin contrato de datos | Estado/listados no verificados | Confirmada solo por documentacion | Mapear solo estados conocidos | Alto | Requiere muestra y tabla de estados |
| IDs estables | ID presente; estabilidad historica no demostrada | `info.id`, `match.id` | Parcial | Resolver identidad interna | Alto | No reutilizar ID ante reemplazos |
| Ultima actualizacion | Si | `updated_ts`, `core.updated_ts` | Confirmada con muestra publica | UTC a ISO; registrar recepcion local | Bajo | Usar ambos timestamps |
| Licencia de exhibicion publica | No comprobada | Terminos generales y contrato comercial | No comprobada | Contrato/licencia | Muy alto | No publicar datos reales sin permiso escrito |

## Cobertura frente al modelo aislado

| Campo de dominio | Estado actual | Evidencia Goalserve | Ajuste previo a persistencia |
| --- | --- | --- | --- |
| `scoreAt90` | Ya existe | No separado para copa | Mantenerlo; exigir fuente estructurada o confirmacion |
| `extraTimeScore` | Ya existe | No comprobada | Mantenerlo opcional y auditado |
| `penaltyScore` | Ya existe | No comprobada | Mantenerlo opcional y auditado |
| `qualifier` | Ya existe | No comprobada | Asociar a llave, nunca inferir |
| `sets` | Solo `loserSets` | Sets individuales confirmados | Agregar detalle por set y tiebreak |
| `boxingMethod` | Solo `ko`/`decision` | No comprobada | Agregar valor crudo y normalizacion futura; no cambiar la regla |
| `boxingRound` | Ya existe | No comprobada | Mantener pendiente de fuente validada |
| `externalEventId` | `source.externalId` | ID publico confirmado | Conservar provider+sport+externalId |
| `lastReceivedAt` | Equivalente: `source.syncedAt` | Recepcion local, no proveedor | Renombrar o documentar semantica al persistir |
| `payloadHash` | Falta | Necesario para correcciones | Agregar |
| `manualOverride` | `manualLock` y auditoria | Independiente del proveedor | Persistir actor/motivo/fecha |
| `replacementEventId` | Falta | No comprobado | Agregar nullable; no poblar sin evidencia |

Antes de las tablas de Supabase, proponer sin migrar: `provider_competition_id`, `provider_season_id`, `provider_participant_id`, `provider_status`, `provider_updated_at`, `received_at`, `payload_hash`, `coverage_level`, `result_confirmed_at`, `replacement_event_id`, `series_id`, `leg`, `aggregate_score`, `tennis_set_scores`, `tennis_tiebreak_scores`, `boxing_method_raw`, `boxing_result_text`, `source_timezone` y `provider_license_scope`.

## Decision

Clasificacion final:

- Futbol normal y tenis por sets: confirmados con muestra publica, aunque falta prueba autenticada de la cobertura requerida.
- Futbol a 90 en eliminacion, alargue, penales, clasificado, series, estados de correccion y reprogramacion: no comprobados o parciales.
- Boxeo por KO/TKO, decision, round, empate y no contest: no comprobado.
- Licencia de exhibicion: no comprobada.

Recomendacion: **Apto para prototipo, pero no para puntajes definitivos**. La decision sobre Goalserve queda condicionada a una prueba con cuenta que aporte un partido de copa con desglose completo, un tenis final de mejor de 5 y resultados de boxeo con metodo y round estructurados, junto con limites, politica de correcciones/reemplazos y licencia escrita de exhibicion publica.

## Siguiente paso propuesto para P005

Solicitar trial o muestras contractuales sin conectar produccion. Con esa evidencia, construir un adaptador read-only fuera de la UI y de Supabase, fixtures minimos anonimizados y pruebas de contrato para futbol normal, copa, tenis de 3/5 y boxeo. La incorporacion a tablas o el cierre de reglas de excepcion quedarian para una tarea posterior y separada.

# P005 — Validación contractual y muestras reales de proveedores

Continuamos la V2 del Prode diario en:

`C:\Users\juana\Desktop\Proyectos\prode-mundial-2026`

## Estado actual

* Existe el checkpoint local:

  `41bc388 chore: checkpoint daily prode v2 foundation`

* P001, P002 y P003 están incluidos en ese checkpoint.

* La documentación de P004 está creada como cambio local posterior.

* `supabase/.temp/` debe permanecer intacto y sin trackear.

* No hubo push, deploy, migraciones ni cambios en Supabase.

* Goalserve quedó clasificado como candidato apto para prototipo, pero no como proveedor definitivo.

Antes de comenzar, verificá el diff actual y creá un commit local separado para P004, únicamente si los cambios corresponden a su documentación y archivos autorizados.

Mensaje sugerido:

`docs: document Goalserve provider evaluation`

No hagas push ni deploy.

## Objetivo

Obtener evidencia contractual o muestras reales suficientes para decidir si Goalserve puede utilizarse para puntajes definitivos.

No integres todavía el proveedor con la aplicación principal y no crees tablas nuevas en Supabase.

La validación debe cubrir:

* Fútbol de eliminación.
* Alargue.
* Penales.
* Clasificado.
* Ida y vuelta.
* Tenis al mejor de 5.
* Tiebreaks.
* Correcciones y reprogramaciones.
* Boxeo por KO/TKO.
* Boxeo por decisión.
* Round.
* Empate.
* No contest.
* Licencia para exhibir datos públicamente.

## Límites de autorización

No hagas ninguna de estas acciones sin autorización explícita:

* Crear una cuenta paga.
* Aceptar términos contractuales en nombre del usuario.
* Contratar un plan.
* Ingresar datos de pago.
* Enviar correos o consultas a Goalserve.
* Compartir datos personales.
* Publicar credenciales.
* Modificar configuraciones externas.

Si el proveedor requiere una cuenta o una contratación, prepará la información necesaria y dejá indicado exactamente qué debe hacer Juan manualmente.

Si ya existe una credencial configurada localmente, no la muestres ni la guardes. Si no existe, no la solicites por chat.

## Solicitud de muestras y condiciones

Prepará un documento con una solicitud concreta para Goalserve, sin enviarla:

`docs/ai/provider-evaluations/goalserve/solicitud-muestras-y-condiciones.md`

La solicitud debe pedir, como mínimo:

### Fútbol

* Un partido único de eliminación definido por penales.
* Un partido de vuelta que pueda tener alargue o penales.
* Marcador a 90 minutos.
* Marcador después del alargue.
* Resultado de la tanda de penales.
* Equipo ganador.
* Equipo clasificado.
* Identificación de serie, llave o agregado.
* Estados durante el partido.
* Correcciones posteriores al resultado.
* Reprogramación y cancelación.
* Identificadores de partido, competencia, temporada y serie.

### Tenis

* Un partido al mejor de 3.
* Un partido al mejor de 5.
* Sets completos.
* Tiebreaks.
* Resultado parcial.
* Resultado final.
* Retiro.
* Walkover.
* Corrección de resultado.
* Identificadores estables.

### Boxeo

* Pelea ganada por KO.
* Pelea ganada por TKO.
* Pelea ganada por decisión.
* Round de finalización.
* Ganador.
* Empate.
* No contest.
* Pelea anulada.
* Pelea suspendida o reprogramada.
* Método estructurado, no solamente una descripción de texto.

### Condiciones comerciales y legales

Pedir también:

* Plan requerido.
* Precio.
* Límite de requests.
* Frecuencia de actualización.
* Acceso a datos históricos.
* Uso de datos en una aplicación pública.
* Uso de nombres, escudos, logos y resultados.
* Retención y almacenamiento de payloads.
* Redistribución o exhibición pública.
* Correcciones y soporte.
* SLA o garantías de disponibilidad, si existen.
* Restricciones para calcular rankings, premios o resultados derivados.

No afirmes que una licencia existe porque el sitio tenga documentación pública. Debe haber una autorización contractual o una condición explícita aplicable al uso que tendrá el proyecto.

## Validación de muestras

Si Juan obtiene muestras o credenciales por fuera del proyecto, incorporalas solamente de forma segura y redactada.

No guardes:

* API keys.
* Tokens.
* URLs con credenciales.
* Datos personales.
* Payloads completos si las condiciones de uso no lo permiten.

Guardá, cuando sea posible:

* Fixture mínimo.
* Campos relevantes.
* Fecha de recepción.
* Fuente.
* Identificador externo.
* Hash del payload.
* Transformación aplicada.
* Resultado de la validación.

Usá esta estructura:

`docs/ai/provider-evaluations/goalserve/`

Con archivos separados por deporte y caso, por ejemplo:

* `football-knockout-sample.md`
* `football-penalty-shootout-sample.md`
* `tennis-best-of-five-sample.md`
* `boxing-ko-sample.md`
* `boxing-decision-sample.md`
* `normalization-matrix.md`

Si no se obtienen muestras reales, no inventes fixtures como si fueran datos de Goalserve. Podés crear fixtures sintéticos, pero deben identificarse claramente como:

`synthetic fixture — not supplied by provider`

## Adaptador read-only

Solamente si existen muestras suficientes, prepará un adaptador aislado y de solo lectura.

Ubicación sugerida:

`src/lib/daily-prode/providers/goalserve/`

El adaptador debe:

* Recibir un payload.
* Validar los campos mínimos.
* Normalizarlo al contrato interno.
* No escribir en Supabase.
* No modificar pronósticos.
* No calcular premios.
* No sobrescribir correcciones manuales.
* Mantener el identificador externo.
* Mantener la fuente.
* Mantener el timestamp de recepción.
* Generar o conservar el hash del payload.
* Informar campos ausentes o ambiguos.
* Rechazar silenciosamente los datos incompatibles no; debe devolver errores descriptivos.

Debe poder representar:

* `externalEventId`.
* `externalCompetitionId`.
* `externalSeasonId`.
* `externalSeriesId`.
* `providerStatus`.
* `receivedAt`.
* `payloadHash`.
* `replacementEventId`.
* `scoreAt90`.
* `extraTimeScore`.
* `penaltyScore`.
* `qualifier`.
* `sets`.
* `tiebreaks`.
* `boxingMethodRaw`.
* `boxingMethod`.
* `boxingRound`.

No agregues una dependencia nueva si puede resolverse con las herramientas actuales.

Si Goalserve no entrega un dato, el adaptador debe expresarlo como ausente o no comprobado. Nunca debe inferir alargue, penales, clasificado, round o método a partir de un texto ambiguo sin documentarlo.

## Proveedores múltiples

No asumas que un único proveedor tiene que cubrir obligatoriamente todos los deportes.

Si Goalserve es suficiente para fútbol y tenis, pero no para boxeo:

* Documentá la posibilidad de usar Goalserve para fútbol/tenis.
* Analizá un proveedor separado para boxeo.
* Mantené un contrato interno común.
* No mezcles identificadores entre proveedores.
* Conservá la fuente específica de cada evento.
* Documentá cómo se resolverían duplicados o eventos equivalentes.

No elijas el segundo proveedor todavía salvo que la evidencia lo vuelva necesario. En ese caso, presentá primero la comparación.

## Matriz final de decisión

Actualizá o creá:

`docs/ai/provider-evaluations/goalserve/decision-matrix.md`

La matriz debe incluir:

* Deporte.
* Caso funcional.
* Campo necesario.
* Campo entregado.
* Muestra real disponible.
* Nivel de confianza.
* Transformación.
* Riesgo.
* Impacto en puntaje.
* Requiere corrección manual.
* Compatible con exhibición pública.
* Decisión.

Clasificá cada caso como:

* Confirmado con muestra contractual.
* Confirmado con muestra pública.
* Confirmado solamente por documentación.
* Parcial.
* No comprobado.
* No compatible.

Emití un resultado por deporte:

* Apto para producción futura.
* Apto solamente para prototipo.
* Apto parcialmente.
* No apto.

## Decisión de arquitectura

Documentá una recomendación final entre estas alternativas:

1. Goalserve para los tres deportes.
2. Goalserve para fútbol y tenis, proveedor separado para boxeo.
3. Proveedor separado por deporte.
4. Continuar con datos manuales únicamente para la maqueta.
5. No avanzar con Goalserve.

La recomendación debe considerar la disponibilidad real de los datos, no solamente la lista comercial de deportes cubiertos.

## Documentación y entrega

Conservá P001, P002, P003 y P004 sin sobrescribirlos.

Registrá este prompt como:

`docs/ai/prompts/P005-validacion-contractual-proveedores.md`

Creá o actualizá:

* `docs/ai/README.md`
* `docs/ai/estado-actual.md`
* `docs/ai/decisiones/P005-proveedor-definitivo.md`
* `docs/ai/ejecuciones/P005-validacion-contractual-proveedores.md`

Al finalizar devolveme:

1. Estado real del repositorio.
2. Commit local creado para P004.
3. Si se obtuvieron muestras reales o solamente documentación.
4. Qué casos se pudieron validar.
5. Qué campos siguen faltando.
6. Si Goalserve sirve para fútbol.
7. Si Goalserve sirve para tenis.
8. Si Goalserve sirve para boxeo.
9. Qué problemas presenta la licencia de exhibición pública.
10. Si conviene una arquitectura con múltiples proveedores.
11. Qué se puede implementar en P006.
12. Qué evidencia todavía debe aportar el proveedor.

No crees tablas en Supabase, no hagas migraciones, no conectes el adaptador a producción, no contrates servicios y no hagas push ni deploy.

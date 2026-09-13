# P007 — Comando estable y regresiones del contrato deportivo

Continuamos la V2 del Prode diario en:

`C:\Users\juana\Desktop\Proyectos\prode-mundial-2026`

## Estado actual

* Rama: `main`.
* La rama está `ahead 3`.
* P005 fue confirmado en:

`70a0a35 docs: record provider validation outcome`

* P006 está implementado como cambio local sin commit.
* El verificador de contrato ejecuta 108 controles.
* No existe integración real con Goalserve.
* No hay credenciales de proveedor.
* No hubo migraciones ni cambios en Supabase.
* `supabase/.temp/` debe permanecer intacto y sin trackear.

Antes de iniciar:

1. Revisá el estado real de Git.
2. Confirmá que los cambios pendientes correspondan a P006.
3. Creá un commit local separado para P006:

`test: add synthetic daily prode provider contract harness`

No incluyas `supabase/.temp/`, secretos ni cambios ajenos. No hagas push ni deploy.

## Objetivo

Convertir el verificador actual en un comando estable, repetible y documentado del proyecto.

El comando debe poder ejecutarse por cualquier desarrollador o agente sin conocer la ubicación interna del archivo `verify.ts`.

Debe:

* Ejecutar todos los controles.
* Mostrar grupos y cantidad de controles.
* Informar controles aprobados.
* Informar controles fallidos.
* Mostrar errores descriptivos.
* Finalizar con código de salida distinto de cero si falla algún control.
* Ser determinista.
* No acceder a internet.
* No acceder a Supabase.
* No acceder a Goalserve.
* No depender de credenciales.
* No modificar archivos ni datos del proyecto.

## Comando del proyecto

Revisá primero:

* `package.json`.
* Scripts existentes.
* Dependencias instaladas.
* Configuración TypeScript.
* Configuración de lint.
* Herramientas disponibles para ejecutar TypeScript.

Agregá un script estable en `package.json`, con un nombre claro, por ejemplo:

`daily-prode:verify-contract`

Usá las herramientas ya instaladas.

No agregues una dependencia nueva si puede evitarse.

Si no existe un runner adecuado para TypeScript:

* Buscá una forma compatible con la configuración actual.
* No instales un framework de tests solamente para esta tarea.
* Si no es posible crear un comando estable sin una nueva dependencia, documentá la limitación y dejá preparado el comando de la forma menos invasiva posible.

El comando no debe depender de una ruta absoluta de la computadora de Juan.

El resultado debe poder utilizarse posteriormente en CI, aunque todavía no agregues un workflow de CI.

## Código actual

Revisá especialmente:

* `src/lib/daily-prode/model.ts`
* `src/lib/daily-prode/scoring.ts`
* `src/lib/daily-prode/provider.ts`
* `src/lib/daily-prode/providers/contract.ts`
* `src/lib/daily-prode/providers/fixtures/synthetic.ts`
* `src/lib/daily-prode/providers/contract-tests/verify.ts`

No cambies las reglas funcionales confirmadas:

* Fútbol: 3/2/0.
* Tenis: 3/1/0.
* Boxeo provisional: 3/2/1/0.
* Fútbol exacto evaluado a 90 minutos.
* Clasificado separado del marcador.
* Goles de penales separados del marcador a 90 minutos.
* Varias salas posibles por jornada.
* Una entrada por persona, sala y jornada.
* Pozo independiente por sala.
* Pozo repartido entre quienes empaten en el primer puesto.

P007 no debe modificar el cálculo de puntajes ni la UI.

## Regresiones obligatorias

Conservá los fixtures sintéticos existentes y agregá regresiones específicas para comprobar que futuras modificaciones no rompan el contrato.

Todos los casos deben estar explícitamente marcados como sintéticos.

### Fútbol

Cubrir:

* Partido normal a 90 minutos.
* Victoria local.
* Empate.
* Victoria visitante.
* Resultado exacto.
* Resultado general.
* Partido en vivo.
* Partido finalizado.
* Partido de eliminación.
* Marcador a 90 minutos.
* Alargue.
* Penales.
* Clasificado explícito.
* Serie de ida y vuelta.
* Marcador agregado.
* Penal score separado.
* Clasificado ausente.
* Clasificado inferido incorrectamente.
* Duplicado con mismo payload.
* Duplicado con hash incompatible.
* Resultado corregido.
* Evento reprogramado.
* Evento cancelado.

Verificá que nunca se incorporen los penales al marcador exacto de 90 minutos.

### Tenis

Cubrir:

* Mejor de 3 con resultado 2-0.
* Mejor de 3 con resultado 2-1.
* Mejor de 5 con resultado 3-0.
* Mejor de 5 con resultado 3-1.
* Mejor de 5 con resultado 3-2.
* Sets detallados.
* Tiebreak.
* Resultado parcial.
* Resultado final.
* Retiro.
* Walkover.
* Suspensión.
* Cancelación.
* Reprogramación.
* Resultado corregido.
* Sets imposibles para el formato.
* Jugador ganador ausente.

Verificá que no se acepte un resultado 3-2 en un evento al mejor de 3.

### Boxeo

Cubrir:

* KO con round.
* TKO con round.
* Decisión sin round.
* Método crudo y método normalizado.
* Ganador ausente.
* KO sin round.
* Decisión con round ficticio.
* Empate.
* No contest.
* Pelea anulada.
* Pelea suspendida.
* Pelea reprogramada.
* Resultado corregido.
* Método desconocido.

Verificá que el contrato no invente un round para una decisión ni convierta un resultado ambiguo en un resultado definitivo.

### Identificadores y fuente

Cubrir:

* ID externo obligatorio.
* IDs de competencia, temporada, serie y participante.
* Estado del proveedor.
* Fecha programada.
* Fecha de recepción.
* Fecha de sincronización.
* Fuente.
* `payloadHash`.
* `replacementEventId`.
* Revisión nueva por cambio de payload.
* Reemplazo de un evento.
* Evento duplicado con datos incompatibles.

### Auditoría y bloqueos

Cubrir:

* Actualización automática.
* Corrección manual.
* Confirmación administrativa.
* Dato bloqueado manualmente.
* Intento de sobrescritura automática.
* Registro del valor anterior.
* Registro del valor nuevo.
* Usuario.
* Fecha y hora.
* Motivo.
* Fuente del cambio.

Comprobá que una actualización automática posterior no elimine una corrección manual.

## Regresiones con forma de proveedor

Prepará, si resulta útil, un grupo de fixtures sintéticos con forma similar a un proveedor externo.

Si usás una forma parecida a Goalserve, rotulá cada archivo y salida como:

`synthetic provider-shaped fixture — not supplied by Goalserve`

No afirmes que los campos fueron entregados por Goalserve.

Estos fixtures deben comprobar cómo se mapearían:

* Identificadores externos.
* Estados.
* Timestamps.
* Marcadores.
* Sets.
* Tiebreaks.
* Método de boxeo.
* Round.
* Correcciones.
* Eventos reemplazados.

No crees todavía un adaptador real de Goalserve.

No uses endpoints ni credenciales.

## Resultado del comando

El comando debe mostrar un resumen similar a:

* Grupo.
* Controles ejecutados.
* Controles aprobados.
* Controles fallidos.
* Duración.
* Resultado general.

No hace falta respetar exactamente este formato, pero debe ser legible en terminal y útil para un agente.

Si existe un modo compatible, dejá también un resultado breve para automatización, sin agregar dependencias.

Los nombres de los controles deben ser estables para poder identificar regresiones futuras.

## Documentación

Registrá este prompt como:

`docs/ai/prompts/P007-comando-y-regresiones-contrato.md`

Creá o actualizá:

* `docs/ai/README.md`
* `docs/ai/estado-actual.md`
* `docs/ai/decisiones/P007-comando-de-contrato.md`
* `docs/ai/ejecuciones/P007-comando-y-regresiones-contrato.md`
* `docs/ai/provider-evaluations/contract-test-runbook.md`

El runbook debe explicar:

* Qué comando ejecutar.
* Qué valida.
* Qué no valida.
* Cómo interpretar un fallo.
* Cómo agregar un fixture nuevo.
* Cómo nombrar una regresión.
* Cómo diferenciar fixtures sintéticos de muestras reales.
* Que el comando no requiere proveedor ni Supabase.

## Validación

Ejecutá:

* El nuevo comando estable.
* TypeScript.
* ESLint dirigido.
* Build.
* `git diff --check`.

Confirmá que:

* Los 108 controles existentes siguen pasando.
* Las nuevas regresiones pasan.
* Un fallo sintético provoca código de salida distinto de cero.
* No hay acceso de red.
* No hay acceso a Supabase.
* No hay modificaciones en datos.
* No hay cambios en UI.
* No hay cambios en las reglas de puntaje.
* `supabase/.temp/` permanece intacto.

No corrijas la deuda previa de lint en archivos no relacionados.

## Entrega

Al finalizar devolveme:

1. Estado real del repositorio.
2. Commit local creado para P006.
3. Comando estable agregado.
4. Cantidad total de controles.
5. Grupos de regresiones agregados.
6. Resultado de la ejecución.
7. Archivos modificados.
8. Dependencias nuevas, si hubiera alguna.
9. Confirmación de que no se usaron datos reales.
10. Confirmación de que no se tocó Supabase.
11. Cómo se agregaría una futura prueba con una muestra contractual real.
12. Recomendación para P008.

P008 no debe crear tablas de Supabase hasta que exista evidencia suficiente del proveedor o se decida formalmente continuar con datos manuales.

# P008 — Protocolo de muestras autorizadas y modo manual temporal

Continuamos la V2 del Prode diario en:

`C:\Users\juana\Desktop\Proyectos\prode-mundial-2026`

## Estado actual

* Rama: `main`.
* P007 está implementado como cambio local sin commit.
* El verificador estable ejecuta 122 controles.
* P006 está confirmado en:

`04a6395 test: add synthetic daily prode provider contract harness`

* Goalserve continúa siendo solamente un candidato parcial.
* No existen credenciales ni muestras contractuales.
* No hubo integración real, migraciones, cambios en Supabase, push ni deploy.
* `supabase/.temp/` debe permanecer intacto y sin trackear.

Antes de comenzar:

1. Verificá el estado real de Git.
2. Confirmá que los cambios pendientes correspondan a P007.
3. Creá un commit local para P007:

`chore: stabilize daily prode contract verification`

No incluyas `supabase/.temp/`, secretos ni cambios ajenos. No hagas push ni deploy.

## Objetivo

Definir formalmente:

1. Cómo aceptar, conservar y validar futuras muestras contractuales de proveedores.
2. Cómo continuar temporalmente con datos manuales sin confundirlos con datos automáticos.
3. Qué condiciones deben cumplirse antes de seleccionar un proveedor y crear tablas de producción.

Esta tarea es principalmente documental. No integres Goalserve, no uses endpoints, no crees tablas y no hagas migraciones.

## Parte 1 — Protocolo de muestras autorizadas

Creá:

`docs/ai/provider-evaluations/sample-acceptance-protocol.md`

El protocolo debe indicar que una muestra real solamente puede incorporarse si existe autorización suficiente para conservarla y utilizarla dentro del repositorio.

Cada muestra debe registrar:

* Proveedor.
* Deporte.
* Competencia.
* Temporada.
* Evento.
* Endpoint o tipo de fuente, sin guardar credenciales.
* Fecha de consulta.
* Zona horaria.
* Versión de la documentación o contrato.
* Plan utilizado.
* Alcance de uso permitido.
* Restricciones de almacenamiento.
* Restricciones de exhibición pública.
* Si permite transformar los datos.
* Si permite calcular rankings, puntos o premios.
* Si permite guardar resultados históricos.
* Hash del contenido conservado.
* Persona o proceso que incorporó la muestra.
* Estado de revisión.
* Fecha de vencimiento o revisión de la autorización, si existe.

No guardar:

* API keys.
* Tokens.
* URLs con credenciales.
* Datos personales innecesarios.
* Payloads completos si no existe permiso para conservarlos.
* Logos, imágenes o contenido protegido sin autorización específica.

Si no puede conservarse el payload, registrar solamente un fixture mínimo autorizado, los campos relevantes, el hash y la referencia contractual.

Todo archivo real debe estar separado de los sintéticos. Usar una estructura similar a:

* `docs/ai/provider-evaluations/synthetic/`
* `docs/ai/provider-evaluations/authorized/`
* `docs/ai/provider-evaluations/requests/`
* `docs/ai/provider-evaluations/decisions/`

Los fixtures sintéticos deben continuar rotulados como:

`synthetic fixture — not supplied by provider`

Los fixtures reales deben indicar:

`authorized provider sample`

No mezclar ambos tipos.

## Parte 2 — Solicitud de evidencia al proveedor

Creá una plantilla reutilizable:

`docs/ai/provider-evaluations/provider-sample-request-template.md`

La plantilla debe solicitar evidencia mínima para:

### Fútbol

* Partido común.
* Partido único de eliminación.
* Partido de vuelta.
* Marcador a 90 minutos.
* Alargue.
* Penales.
* Clasificado.
* Serie y agregado.
* Estados.
* Reprogramación.
* Cancelación.
* Corrección de resultado.
* Identificadores estables.
* Historial o versión del evento.

### Tenis

* Mejor de 3.
* Mejor de 5.
* Sets.
* Tiebreaks.
* Resultado parcial.
* Resultado final.
* Retiro.
* Walkover.
* Suspensión.
* Cancelación.
* Reprogramación.
* Corrección.

### Boxeo

* KO.
* TKO.
* Decisión.
* Round.
* Empate.
* No contest.
* Anulación.
* Suspensión.
* Reprogramación.
* Método estructurado.

### Uso comercial y público

Solicitar confirmación expresa sobre:

* Uso en una aplicación pública.
* Almacenamiento de eventos.
* Exhibición de nombres y resultados.
* Uso de logos y escudos.
* Cálculo de rankings.
* Cálculo de puntos.
* Cálculo de pozos o premios.
* Conservación histórica.
* Correcciones y soporte.
* Límites del plan.
* Frecuencia de actualización.
* Identificadores y reemplazos.

La plantilla no debe enviarse automáticamente. No crear cuentas, aceptar términos ni contratar servicios.

## Parte 3 — Checklist de aceptación

Creá:

`docs/ai/provider-evaluations/sample-acceptance-checklist.md`

Una muestra solamente puede aprobarse cuando:

* El proveedor está identificado.
* El caso funcional está identificado.
* La fecha de consulta está registrada.
* La fuente es trazable.
* La muestra puede conservarse legalmente.
* La licencia de uso está documentada.
* Los campos relevantes están estructurados.
* Los IDs pueden relacionarse.
* Los estados son interpretables.
* Las correcciones son detectables.
* No contiene secretos.
* No contiene datos personales innecesarios.
* El fixture está separado de los sintéticos.
* El adaptador puede validarlo sin inferencias peligrosas.

Clasificá el resultado como:

* Aprobada.
* Aprobada solamente para prototipo.
* Parcial.
* Rechazada.
* Pendiente de autorización.

No convertir una muestra pública en “autorizada” solamente porque está visible en internet.

## Parte 4 — Modo manual temporal

Documentá un modo manual temporal para continuar con el desarrollo mientras no exista un proveedor aprobado.

Creá o actualizá:

`docs/ai/decisiones/P008-modo-manual-temporal.md`

El modo manual debe quedar definido como una fuente explícita:

`sourceType: manual`

No debe confundirse con:

* Datos automáticos.
* Datos de Goalserve.
* Fixtures sintéticos.
* Datos contractuales.

El modo manual debe contemplar:

* Creación administrativa de eventos.
* Modificación de horarios.
* Carga de resultados.
* Confirmación de resultados.
* Cancelación.
* Reprogramación.
* Corrección.
* Estado pendiente de revisión.
* Fuente manual.
* Usuario administrador.
* Fecha y hora.
* Motivo.
* Auditoría.
* Bloqueo manual.
* Revisión antes de asignar puntos.

La validación de datos manuales debe utilizar el mismo contrato neutral que usaría un proveedor.

No permitir que el modo manual:

* Se presente como actualización automática.
* Oculte la ausencia de una fuente deportiva real.
* Declare que Goalserve fue integrado.
* Cierre una jornada sin confirmación.
* Asigne puntos sobre resultados ambiguos.
* Sobrescriba correcciones auditadas.
* Modifique datos históricos sin registrar el cambio.

Por ahora el modo manual puede permanecer como definición y fixture de desarrollo. No lo conectes todavía a Supabase.

## Parte 5 — Puerta de decisión

Creá:

`docs/ai/provider-evaluations/provider-go-no-go.md`

Definí las condiciones para pasar a la siguiente etapa.

### Se puede crear un adaptador read-only si:

* Hay muestras suficientes.
* Los campos críticos están estructurados.
* Los estados son interpretables.
* Los IDs pueden conservarse.
* Las correcciones son detectables.
* Existe autorización de uso.
* El proveedor cubre los casos necesarios o se acepta una arquitectura multi-proveedor.

### Se pueden crear tablas nuevas si:

* El contrato interno está estable.
* Las reglas de fuente y auditoría están definidas.
* El modo manual o el proveedor inicial está decidido.
* Las migraciones son no destructivas.
* No se mezclan datos históricos del Mundial.
* Se conocen los campos necesarios para sincronización.
* Se definió cómo proteger correcciones manuales.

### Debe seguir el modo manual si:

* No hay muestras autorizadas.
* No existe licencia pública clara.
* Faltan campos críticos.
* Los datos de boxeo no tienen método o round.
* El proveedor no representa correctamente alargue, penales o clasificado.
* Los IDs o correcciones son inseguros.

La decisión debe separar:

* Apto para prototipo.
* Apto para fútbol.
* Apto para tenis.
* Apto para boxeo.
* Apto para producción.
* Apto solamente con múltiples proveedores.

## Parte 6 — Documentación de P008

Registrá este prompt como:

`docs/ai/prompts/P008-muestras-autorizadas-y-modo-manual.md`

Creá o actualizá:

* `docs/ai/README.md`
* `docs/ai/estado-actual.md`
* `docs/ai/provider-evaluations/sample-acceptance-protocol.md`
* `docs/ai/provider-evaluations/provider-sample-request-template.md`
* `docs/ai/provider-evaluations/sample-acceptance-checklist.md`
* `docs/ai/provider-evaluations/provider-go-no-go.md`
* `docs/ai/decisiones/P008-modo-manual-temporal.md`
* `docs/ai/ejecuciones/P008-muestras-y-modo-manual.md`

No sobrescribas P001–P007.

## Validación

Ejecutá:

* `npm run daily-prode:verify-contract`
* `npm run daily-prode:verify-contract -- --json`
* TypeScript.
* ESLint dirigido.
* Build.
* `git diff --check`.

Confirmá que:

* Siguen pasando los 122 controles.
* No se usaron endpoints ni credenciales.
* No se incorporaron muestras reales como sintéticas.
* No se tocó Supabase.
* No se agregaron dependencias.
* No se modificó la UI.
* No se modificaron puntajes.
* `supabase/.temp/` sigue intacto.

Al finalizar devolveme:

1. Estado real del repositorio.
2. Commit local creado para P007.
3. Documentos creados.
4. Protocolo definido.
5. Campos y evidencias requeridas.
6. Tratamiento del modo manual.
7. Condiciones de aprobación de un proveedor.
8. Qué sigue para P009.
9. Si ya existen condiciones suficientes para crear tablas nuevas o todavía no.

No crees cuentas, no envíes consultas, no contrates proveedores, no hagas migraciones, no integres Goalserve, no hagas push ni deploy.

# P009 — Implementación del modo manual de desarrollo

Continuamos la V2 del Prode diario en:

`C:\Users\juana\Desktop\Proyectos\prode-mundial-2026`

## Estado actual

* Rama: `main`.
* P007 está confirmado localmente en:

`aebf194 chore: stabilize daily prode contract verification`

* P008 está documentado como cambio local sin commit.
* El contrato sintético ejecuta 122 controles.
* Goalserve continúa como candidato parcial y no aprobado.
* No existen muestras contractuales autorizadas.
* No hay proveedor real integrado.
* No hubo cambios en Supabase ni migraciones.
* `supabase/.temp/` debe permanecer intacto y sin trackear.
* No hubo push ni deploy.

Antes de comenzar:

1. Verificá el estado real de Git.
2. Confirmá que los cambios pendientes correspondan a P008.
3. Creá un commit local para P008:

`docs: define provider evidence gate and manual fallback`

No incluyas `supabase/.temp/`, secretos ni archivos ajenos. No hagas push ni deploy.

## Objetivo

Implementar un modo manual de desarrollo para que la V2 pueda probar el flujo diario completo mientras no exista un proveedor deportivo aprobado.

Este modo debe ser claramente temporal y visible como:

`sourceType: manual`

No debe presentarse como:

* Integración automática.
* Goalserve.
* Datos reales sincronizados.
* Proveedor aprobado.
* Sistema listo para operar premios reales.

No crear tablas ni migraciones en Supabase.

No agregar pagos, retiros ni liquidación real de premios.

## Alcance

El modo manual debe funcionar sobre datos sintéticos existentes y estado local de desarrollo.

Podés usar:

* Fixtures existentes.
* Estado en memoria.
* Un repositorio local falso.
* Datos demo aislados.
* Componentes administrativos con estado local.

No hace falta persistencia permanente en esta tarea.

Si la edición se pierde al recargar, debe indicarse claramente como limitación del modo manual de desarrollo.

No uses `localStorage` para simular persistencia real salvo que sea necesario para la maqueta y quede documentado como demo. No mezcles ese estado con Supabase ni con datos históricos del Mundial.

## 1. Fuente manual

Revisá el contrato actual y agregá, si hace falta, una fuente manual explícita que utilice el contrato neutral.

La fuente debe poder representar:

* Jornada.
* Evento.
* Deporte.
* Competencia.
* Participantes.
* Fecha y hora.
* Estado.
* Fuente manual.
* Resultado.
* Resultado parcial.
* Confirmación administrativa.
* Corrección manual.
* Bloqueo manual.
* Auditoría.
* Última actualización.
* Estado de revisión.

La fuente manual debe pasar por las mismas validaciones que usaría un proveedor externo.

No permitas que el modo manual evite:

* IDs.
* Fechas válidas.
* Estados válidos.
* Separación entre 90 minutos, alargue y penales.
* Separación entre marcador y clasificado.
* Sets válidos.
* Método y round de boxeo.
* Auditoría de cambios.

## 2. Panel administrativo diario

Revisá las rutas y permisos administrativos existentes.

Agregá un flujo administrativo para la jornada diaria, reutilizando autenticación y autorización existentes.

No debilites permisos ni expongas controles administrativos a usuarios comunes.

El panel debe permitir, sobre datos sintéticos:

* Crear un evento.
* Editar participantes.
* Editar fecha y hora.
* Cambiar estado.
* Marcar evento en vivo.
* Cargar resultado parcial.
* Cargar resultado final.
* Confirmar resultado.
* Cancelar evento.
* Reprogramar evento.
* Corregir un resultado.
* Bloquear manualmente un resultado.
* Desbloquearlo solamente con una acción explícita y motivo.
* Consultar el historial de cambios.
* Restablecer los datos demo.

Cada operación debe mostrar una indicación de que se trata de modo manual de desarrollo.

No debe existir un botón que sugiera que los cambios se guardan en producción.

## 3. Casos de fútbol

El panel debe permitir probar:

### Partido normal

* Marcador a 90 minutos.
* Resultado exacto.
* Resultado local, empate o visitante.
* Estado en vivo.
* Resultado final.

### Partido de eliminación

* Marcador a 90 minutos.
* Marcador después del alargue.
* Resultado de penales.
* Equipo ganador.
* Equipo clasificado.
* Serie o agregado.

Mantener siempre separados:

* `scoreAt90`.
* `extraTimeScore`.
* `penaltyScore`.
* `qualifier`.

No sumar los penales al marcador exacto de 90 minutos.

No asignar puntaje de clasificado, porque esa regla todavía está pendiente.

No permitir cerrar o confirmar el evento si los datos obligatorios son ambiguos.

## 4. Casos de tenis

El panel debe permitir probar:

* Mejor de 3.
* Mejor de 5.
* Sets detallados.
* Tiebreak.
* Resultado parcial.
* Resultado final.
* Retiro.
* Walkover.
* Suspensión.
* Cancelación.
* Reprogramación.
* Corrección.

No permitir resultados incompatibles con el formato.

No convertir retiro o walkover automáticamente en un resultado normal.

## 5. Casos de boxeo

El panel debe permitir probar:

* KO con round.
* TKO con round.
* Decisión sin round.
* Empate.
* No contest.
* Pelea anulada.
* Pelea suspendida.
* Pelea reprogramada.
* Método desconocido.
* Resultado sin ganador.

Validar que:

* KO/TKO requiera round.
* Decisión no tenga round ficticio.
* Método desconocido no se confirme automáticamente.
* Empate y no contest queden pendientes.
* No se asignen puntos a resultados ambiguos.

Mantener vigente la matriz provisional 3/2/1/0, pero no modificarla en P009.

## 6. Auditoría

Cada acción administrativa debe conservar:

* Tipo de operación.
* Entidad afectada.
* Valor anterior.
* Valor nuevo.
* Usuario.
* Fecha y hora.
* Motivo.
* Fuente manual.
* Estado de confirmación.
* Si el dato quedó bloqueado.

Mostrar una línea de tiempo legible en el panel.

Simular también una actualización automática posterior sobre un evento bloqueado manualmente y verificar que no sobrescriba el dato.

La interfaz debe explicar qué ocurrió cuando una actualización automática es rechazada por un bloqueo manual.

## 7. Experiencia pública

En `/` y `/diario`:

* Mostrar los eventos manuales de desarrollo.
* Identificar claramente que la fuente es manual/demo.
* Mostrar fecha de última actualización.
* Mostrar estados pendientes y confirmados.
* No presentar los datos como información deportiva real.
* No asignar puntos sobre resultados ambiguos.
* Mantener las salas, participaciones y rankings aislados.
* Mantener el Mundial separado en `/historial`.

No mostrar controles administrativos en la experiencia pública.

Si existe una configuración visual de demo, usar un indicador persistente como:

`Datos de demostración — fuente manual`

No ocultar ese indicador.

## 8. Estado de las jornadas

Implementar o simular estados claros:

* Abierta.
* En curso.
* Pendiente de resultados.
* Pendiente de revisión.
* Cerrada.
* Anulada.

Una jornada no puede cerrarse si existen eventos pendientes, ambiguos, suspendidos o sin confirmación.

No finalizar automáticamente una jornada solamente por llegar a medianoche.

Si la maqueta no persiste el estado al recargar, documentá esa limitación.

## 9. Separación del Mundial

No modifiques la lógica histórica del Mundial.

No reutilices sus datos para la jornada manual.

No recalcules sus rankings ni sus premios.

Verificá que los cambios del modo manual no afecten:

* `/historial`.
* `/historial/mundial`.
* Rankings históricos.
* Resultados históricos.
* Administración histórica.

## 10. Sin Supabase ni proveedor

No crear:

* Tablas.
* Migraciones.
* RPC.
* Triggers.
* Integraciones externas.
* Endpoints reales.
* Adaptador Goalserve.
* Dependencias nuevas.

La implementación debe quedar preparada para que, en una futura tarea, la fuente manual pueda reemplazarse por un repositorio persistente o un proveedor externo sin modificar la UI ni las reglas del contrato.

## 11. Documentación

Conservá P001–P008 sin sobrescribirlos.

Registrá este prompt como:

`docs/ai/prompts/P009-modo-manual-de-desarrollo.md`

Creá o actualizá:

* `docs/ai/README.md`
* `docs/ai/estado-actual.md`
* `docs/ai/decisiones/P009-modo-manual.md`
* `docs/ai/ejecuciones/P009-modo-manual.md`
* `docs/ai/provider-evaluations/contract-test-runbook.md`

Documentá:

* Qué permite el modo manual.
* Qué no permite.
* Qué datos son sintéticos.
* Qué se pierde al recargar.
* Qué auditoría se simula.
* Qué parte debe reemplazarse al agregar persistencia.
* Qué parte debe reemplazarse al agregar un proveedor.
* Que el modo manual no constituye una integración deportiva real.

## 12. Validación

Ejecutá:

* `npm run daily-prode:verify-contract`
* `npm run daily-prode:verify-contract -- --json`
* TypeScript.
* ESLint dirigido.
* Build.
* `git diff --check`.

Verificá manualmente:

* Usuario administrador.
* Usuario común.
* Crear evento.
* Editar evento.
* Confirmar resultado.
* Corregir resultado.
* Bloquear resultado.
* Intentar sobrescribirlo.
* Consultar auditoría.
* Restablecer datos demo.
* Fútbol normal.
* Fútbol con alargue y penales.
* Tenis al mejor de 3.
* Tenis al mejor de 5.
* Boxeo KO/TKO.
* Boxeo por decisión.
* Resultado ambiguo.
* Jornada con pendientes.
* Jornada cerrada.
* Acceso al historial.
* Responsive en celular y escritorio.
* Ausencia de datos reales.
* Ausencia de escrituras en Supabase.

No corrijas la deuda previa de lint en archivos no relacionados.

## Entrega

Al finalizar devolveme:

1. Estado real del repositorio.
2. Commit local creado para P008.
3. Archivos modificados.
4. Cómo se implementó el modo manual.
5. Qué operaciones administrativas se pueden probar.
6. Qué auditoría se registra.
7. Qué limitaciones tiene la falta de persistencia.
8. Confirmación de que no se tocó Supabase.
9. Confirmación de que no se usaron endpoints ni proveedores.
10. Resultado de todas las validaciones.
11. Qué debería contener P010.
12. Qué falta para reemplazar el modo manual por una fuente real.

No hagas migraciones, no integres Goalserve, no crees cuentas, no envíes solicitudes, no contrates servicios, no hagas push ni deploy.

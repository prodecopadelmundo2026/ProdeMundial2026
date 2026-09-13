# P008 - Modo manual temporal

Fecha: 2026-09-13

## Decision

Hasta seleccionar una fuente deportiva con evidencia autorizada, el proyecto continua con una fuente explicita `sourceType: manual`. Es una definicion operativa y de fixtures de desarrollo, no una integracion, un schema de Supabase ni una afirmacion de actualizacion automatica.

`sourceType: manual` no equivale a datos automaticos, Goalserve, fixtures sinteticos ni datos contractuales. Los datos manuales deben declararse como tales en su metadato y registro de auditoria; no pueden presentarse al usuario como sincronizados desde un proveedor.

## Operacion minima requerida

Una operacion administrativa manual debe registrar, para creacion de evento, cambio de horario, carga de resultado, confirmacion, cancelacion, reprogramacion o correccion:

- Fuente manual y estado del evento, incluido `pending review` cuando corresponda.
- Usuario administrador o proceso autorizado, fecha y hora UTC, motivo y referencia del cambio.
- Revision del evento, valores anterior y nuevo cuando se corrige, y auditoria inmutable.
- Bloqueo manual que impida que una futura actualizacion externa sobreescriba una correccion auditada sin revision humana.
- Revisor y confirmacion antes de asignar puntos o cerrar una jornada.

La validacion usa el mismo contrato neutral de proveedor: campos estructurados, IDs, estados, revisiones y resultados sin inferencia. El modo manual puede crear casos de desarrollo, pero no altera puntajes, UI, Supabase ni esquemas en P008.

## Limites de seguridad y negocio

- No declarar ni insinuar actualizacion automatica o integracion de Goalserve.
- No cerrar una jornada ni asignar puntos sobre resultados ambiguos, pendientes, cancelados, reprogramados o sin confirmacion.
- No sobrescribir correcciones auditadas ni modificar historicos sin registrar quien, cuando, por que y que version cambia.
- No deducir clasificados, penales, metodo de boxeo o round a partir de texto ambiguo.
- No utilizar una carga manual como evidencia contractual de un proveedor.

## Condicion de salida

El modo manual se mantiene hasta que un proveedor o arquitectura multi-proveedor cumpla la puerta Go/No-Go. Una eventual sincronizacion debera respetar los bloqueos y la auditoria manual, y requerira una decision posterior antes de crear tablas o migraciones.

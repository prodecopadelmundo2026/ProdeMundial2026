# P013 - Auditoria y datos validos

## Decision principal

La agenda publica queda vacia hasta que exista una fuente autorizada. No se reutilizan fixtures sinteticos como datos de producto, aunque sus nombres incluyan la palabra demo.

## Frontera de publicacion

- `src/lib/daily-prode/public-data.ts` es la unica fuente de datos para las rutas diarias publicas.
- Un evento futuro solo sera visible si pertenece al catalogo, tiene `sourceType: provider`, estado de verificacion `verified`, referencia de fuente y fecha de consulta valida.
- Los fixtures permanecen en `src/lib/daily-prode-demo.ts`, identificados con el aviso obligatorio, y se usan unicamente en `/admin/diario` para desarrollo local.
- Boxeo requiere cartelera identificada y MMA sigue deshabilitado hasta contar con reglas y fuente aprobadas.

## Separacion de experiencias

- Inicio es un resumen de jornada; `/diario` concentra filtros y agenda.
- `/mi-prode`, `/ranking` y `/reglas` no importan datos ni componentes del Mundial.
- El Mundial conserva sus pantallas bajo `/historial/mundial` y no se modificaron sus consultas ni sus reglas.

## Administracion manual

La consola privada sigue sin persistencia. Antes de guardar una configuracion exige referencia o URL, fecha de consulta, estado de verificacion y motivo de correccion; registra actor, antes/despues, bloqueo y confirmacion administrativa.

## Alcance pendiente

No hay proveedor integrado, datos reales, pagos, migraciones, variables ni cambios remotos de Supabase. El adaptador futuro debera poblar la fuente publica solo despues de cumplir el protocolo de evidencia vigente.

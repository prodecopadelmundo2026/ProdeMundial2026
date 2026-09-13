# P010 - Hito integral de Prode diario V2

Fecha: 2026-09-13

## Decision

La portada diaria sigue siendo principal y `/diario` conserva el alias. La agenda demo puede filtrarse por deporte, estado y participacion sin cambiar jornada ni sala. Las tarjetas mantienen fuente manual, actualizacion, formato y condiciones de cada deporte; el Mundial continua solo como historial.

El laboratorio `/admin/diario` permanece protegido por el guard existente. Permite editar competencia, deporte y formato en estado local; un cambio estructural reinicia el resultado para impedir que se valide bajo un formato anterior. Sigue mostrando `Modo manual de desarrollo — cambios no persistentes`.

## Limites

No cambian puntajes, pagos, Supabase, autenticacion, datos del Mundial, endpoints deportivos ni proveedores. No hay persistencia tras recargar. Adaptador, tablas y produccion continuan No-Go bajo P008.

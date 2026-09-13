# P006 - Fixtures sinteticos y contrato deportivo

Fecha: 2026-09-13

## Decision

Se agrego un contrato neutral bajo `src/lib/daily-prode/providers/` sin adaptador real. Amplia de forma opcional los metadatos de fuente y el detalle de tenis/boxeo, por lo que no rompe los consumidores actuales de `DailyEvent` ni cambia las reglas 3/2/0.

El contrato valida datos antes de normalizarlos y produce errores descriptivos. Para fixtures finalizados normales, el resultado queda confirmado solo a efectos de pruebas de scoring; no significa que una fuente real pueda confirmar automaticamente un resultado de produccion.

## Cobertura de fixtures

- Futbol normal: programado, en vivo, finalizado con local, visitante y empate.
- Copa: penales, alargue y vuelta con agregado, leg y clasificado explicito.
- Tenis: 2-0, 2-1, 3-0, 3-1, 3-2, tiebreak y estados excepcionales.
- Boxeo: KO, TKO, decision, empate, no contest, anulacion, suspension y reprogramacion.
- Actualizaciones: idempotencia, hash incompatible, revision, correccion manual protegida, auditoria y reemplazo.

La combinacion solicitada de 1-1 a 90, 2-1 tras alargue y luego penales en un mismo partido es internamente contradictoria: si el alargue termina 2-1, no hay tanda. El contrato la rechaza y los fixtures la representan en dos eventos validos separados.

## Campos pendientes o ambiguos

Goalserve u otro proveedor futuro debe aportar de forma estructurada los campos de copa, los estados excepcionales de tenis, los resultados completos de boxeo y la licencia de exhibicion. Sin esa evidencia, los campos se conservan como ausentes/revision y no se usan para puntajes definitivos.

## P007 propuesto

P007 puede convertir este verificador en un comando de proyecto y agregar fixtures sinteticos de regresion para cada proveedor candidato. No debe integrar Goalserve ni Supabase hasta que P005 obtenga muestras contractuales autorizadas.

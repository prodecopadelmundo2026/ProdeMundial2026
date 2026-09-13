# P005 - Validacion contractual y proveedor definitivo

Fecha: 2026-09-13

## Evidencia disponible

No hay credencial Goalserve local ni muestras reales recibidas. P005 no envio correos, no creo cuentas, no acepto terminos, no contrato servicios ni modifico configuraciones externas. La unica evidencia sigue siendo documentacion y muestras publicas registradas en P004.

## Decision vigente

No se elige proveedor definitivo. Goalserve queda:

- Futbol: prototipo parcial de partidos normales, no puntajes definitivos de copa.
- Tenis: prototipo parcial por sets, pendiente de mejor de 5, tiebreaks y excepciones.
- Boxeo: no apto para las reglas actuales.
- Licencia publica: bloqueada hasta obtener permiso contractual expreso.

La arquitectura actual recomendada es datos manuales para la maqueta. Una arquitectura multi-proveedor es probable a futuro, pero no se selecciona un proveedor de boxeo: la revision publica de alternativas no aporto evidencia de KO/TKO, decision, round, no contest y licencia para este caso. Sportradar muestra cobertura de boxeo en su producto de odds, no evidencia de un feed de resultados estructurados de boxeo para estas reglas; API-Sports lista MMA, no boxeo, en su catalogo actual. Ambas opciones requeririan una evaluacion contractual propia antes de ser candidatas.

## Condicion para avanzar

La solicitud no enviada en `docs/ai/provider-evaluations/goalserve/solicitud-muestras-y-condiciones.md` detalla la evidencia exigida. Sin respuestas contractuales y fixtures minimizados autorizados, no se crea el adaptador Goalserve ni se modifica `src/lib/daily-prode/`.

## P006 posible

P006 puede implementar un arnes de fixtures sinteticos y pruebas de contrato, separado de UI y Supabase, para validar los casos de error del futuro adaptador. Esos fixtures no servirian como prueba de cobertura del proveedor ni habilitarian puntajes reales.

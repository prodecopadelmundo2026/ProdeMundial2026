# P007 - Comando estable y regresiones del contrato

Fecha: 2026-09-13

## Decision

Se agrega `npm run daily-prode:verify-contract` como comando estable y portable. No se agrega framework ni dependencia: un script Node resuelve el TypeScript local, compila el verificador a un temporal, lo ejecuta y borra ese temporal.

El comando imprime grupos, controles, aprobados, fallidos, duracion y resultado. `--json` entrega un resumen para automatizacion futura. Ante compilacion o control fallido devuelve codigo no cero; esto se verifico con `--fail-synthetic` y codigo 1.

## Regresiones agregadas

- Futbol cancelado/reprogramado y clasificado ausente en eliminatoria.
- Correccion de tenis por revision nueva.
- Boxeo sin ganador final y metodo desconocido.
- Confirmacion administrativa con bloqueo y auditoria completa.
- Resumen por grupo estable para identificar futuras regresiones.

El total pasa de 108 a 122 controles. Los fixtures siguen siendo sinteticos; no hay forma Goalserve, endpoint, credencial, dato real ni adaptador real.

## P008 propuesto

P008 puede decidir un protocolo para incorporar muestras contractuales autorizadas como fixtures minimizados, separados de los sinteticos, o consolidar el flujo manual de la maqueta. No debe crear tablas de Supabase sin esa decision y evidencia suficiente.

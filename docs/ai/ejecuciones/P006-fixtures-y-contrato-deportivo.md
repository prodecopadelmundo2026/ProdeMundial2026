# P006 - Ejecucion de fixtures y contrato deportivo

Fecha: 2026-09-13

## Punto de partida

- Se confirmo P005 en `70a0a35 docs: record provider validation outcome`.
- No habia credenciales, proveedor real, migraciones, cambios de Supabase, push ni deploy.
- `supabase/.temp/` continua sin trackear.

## Implementacion

- Se agrego `contract.ts`: tipos, validacion descriptiva y normalizacion neutral de proveedor.
- Se agregaron metadatos opcionales de fuente, detalle de sets/tiebreak y metodo crudo/detallado de boxeo sin modificar scoring.
- Se agregaron fixtures legibles y explicitamente sinteticos.
- Se agrego un verificador TypeScript sin framework ni dependencias nuevas.
- `reconcileEvent` ahora rechaza una revision repetida con `payloadHash` incompatible y mantiene el comportamiento previo para fuentes sin hash.

## Pruebas del contrato

El verificador se compilo temporalmente con TypeScript existente y se ejecuto con Node. Resultado: 108 controles correctos en fixtures, scoring, futbol copa, tenis, boxeo, rechazos y actualizaciones.

## Validacion

- La copia del prompt P006 coincide por hash SHA-256 con el adjunto original.
- `npx tsc --noEmit --pretty false`: correcto.
- ESLint dirigido a contrato, fixtures, verificador, modelo, provider y scoring: correcto.
- Verificador temporal TypeScript/Node: 108 controles correctos en siete grupos.
- `npm run build`: correcto.
- `git diff --check`: correcto, con avisos CRLF habituales de Windows.
- No se uso framework ni dependencia nueva; el proyecto no declara script de tests.

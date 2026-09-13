# P008 - Muestras autorizadas y modo manual

Fecha: 2026-09-13

## Alcance ejecutado

- Se confirmo P007 como commit local `aebf194` sin incluir `supabase/.temp/`.
- Se documento un protocolo para aceptar, minimizar, hashear, revisar y separar muestras reales autorizadas de fixtures sinteticos.
- Se creo una plantilla no enviada para solicitar evidencia tecnica, derechos de uso y limites comerciales.
- Se incorporo un checklist con clasificaciones de aprobacion y una puerta Go/No-Go para adaptador, tablas y proveedor.
- Se definio el modo `sourceType: manual` como fuente temporal auditada que usa el contrato neutral y no se presenta como automatica.

## Limites preservados

- No se hicieron requests, no se crearon cuentas, no se aceptaron terminos ni se contrato un proveedor.
- No se integraron Goalserve u otros endpoints, ni se incorporaron credenciales, payloads reales o muestras autorizadas.
- No se modificaron Supabase, tablas, migraciones, UI, puntajes ni dependencias.
- `supabase/.temp/` queda sin trackear e intacto.

## Validacion ejecutada

- `npm run daily-prode:verify-contract`: correcto, 122/122 controles aprobados.
- `npm run daily-prode:verify-contract -- --json`: correcto, estado `passed` y total `122`.
- TypeScript: `npx tsc --noEmit`, correcto. El proyecto no declara un script `typecheck`, por lo que `npm run typecheck` informa script inexistente; no se agrego un script ni dependencia por esta tarea.
- ESLint dirigido a contrato, fixtures, verificador y script portable: correcto.
- `npm run build`: correcto.
- `git diff --check`: correcto.
- El hash SHA-256 del prompt copiado coincide con el adjunto original.

## Siguiente paso

P009 debe operar con datos manuales o clasificar evidencia recibida mediante este protocolo. No puede crear tablas ni un adaptador mientras la decision Go/No-Go permanezca en No-Go.

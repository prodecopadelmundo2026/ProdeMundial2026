# P007 - Ejecucion de comando y regresiones del contrato

Fecha: 2026-09-13

## Punto de partida

- P006 se confirmo en `04a6395 test: add synthetic daily prode provider contract harness`.
- `supabase/.temp/` sigue intacto y sin trackear.
- No hay proveedor real, credenciales, migraciones, cambios de Supabase, push ni deploy.

## Implementacion

- Se agrego el script portable `scripts/verify-daily-prode-contract.cjs`.
- Se agrego el script npm `daily-prode:verify-contract`.
- Se agrego salida legible, `--json` y modo controlado `--fail-synthetic`.
- Se ampliaron fixtures/verificaciones de excepciones, correcciones y auditoria.

## Ejecucion inicial

- Comando normal: 122 controles correctos en nueve grupos.
- Comando JSON: resumen estructurado correcto.
- Fallo sintetico: salida 1 confirmada.

## Validacion

- La copia del prompt P007 coincide por hash SHA-256 con el adjunto original.
- Comando normal: 122 controles correctos en nueve grupos.
- `--json`: resumen estructurado correcto.
- `--fail-synthetic`: codigo de salida 1 confirmado.
- Typecheck, ESLint dirigido y `npm run build`: correctos.
- `git diff --check`: correcto, con avisos CRLF habituales de Windows.
- No hubo red, proveedor, Supabase, cambios de datos, UI ni dependencias nuevas.

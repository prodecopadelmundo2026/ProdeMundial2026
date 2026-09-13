# Runbook del contrato deportivo

## Comando

Desde la raiz del repositorio ejecutar:

```powershell
npm run daily-prode:verify-contract
```

Para automatizacion compacta:

```powershell
npm run daily-prode:verify-contract -- --json
```

El comando usa el TypeScript instalado en el proyecto, compila solo los modulos puros en un directorio temporal del sistema, ejecuta el verificador y elimina ese temporal. No depende de rutas absolutas, internet, credenciales, Goalserve, Supabase, UI ni datos reales.

## Que valida

- Fixtures sinteticos y su marca `synthetic fixture — not supplied by provider`.
- Normalizacion y campos obligatorios del contrato neutral.
- Fútbol normal y de copa: 90 minutos, alargue, penales, clasificado explicito, agregado y vuelta.
- Tenis mejor de 3/5, sets, tiebreaks, correcciones y excepciones.
- Boxeo KO/TKO/decision, rounds y outcomes excepcionales.
- Reglas de scoring existentes sin modificarlas.
- Idempotencia, hash, revisiones, reemplazo, correccion manual, confirmacion administrativa y auditoria.

## Que no valida

No prueba cobertura, payloads, licencia, SLA, limites, correcciones ni resultados de ningun proveedor real. Tampoco prueba UI, Supabase, pagos, premios o reglas funcionales que no pertenezcan al contrato.

## Interpretar un fallo

El comando devuelve codigo distinto de cero ante error de compilacion o control fallido. La salida legible informa grupo, conteos y mensaje descriptivo; `--json` devuelve `status`, duracion, total y grupos para CI futura. El modo interno `--fail-synthetic` existe solo para comprobar el codigo de salida y no debe usarse como validacion normal.

## Agregar una regresion

1. Agregar un fixture minimo en `src/lib/daily-prode/providers/fixtures/synthetic.ts` con la marca sintetica exacta.
2. Agregar una asercion con nombre estable y descriptivo en `src/lib/daily-prode/providers/contract-tests/verify.ts`.
3. Si se incorpora un proveedor futuro, mantener la conversion en un adaptador separado; no cambiar los fixtures sinteticos para hacerlos pasar por muestras reales.
4. Ejecutar el comando normal, `--json`, TypeScript y lint dirigido.

Para una muestra contractual real, guardar solo un fixture minimizado y autorizado en una carpeta de evaluacion del proveedor, conservar fuente/fecha/hash/condiciones de uso, y crear una prueba de contrato con una etiqueta distinta. Nunca mezclarla con `synthetic fixture — not supplied by provider`.

# AGENTS

## Contexto de trabajo

Durante la etapa de desarrollo y testeo, `main` es la rama principal de integración y publicación. Todo cambio validado debe llegar a `main`. La rama `dev` debe permanecer sincronizada exactamente con `main`. Las ramas auxiliares son temporales y no reemplazan a `main`.

Este repo contiene el Prode Mundial 2026 y la V2 en preparacion como Prode diario. Es una app Next.js con Supabase donde ranking, scoring, auditoria, eliminatorias y bonus son zonas sensibles.

Antes de modificar un modulo, leer:

- `docs/ai/README.md` si la tarea toca la V2 o reglas de trabajo
- `docs/ai/estado-actual.md` para estado vigente de V2

- `docs/memory.md`
- `docs/worklog.md`
- la documentacion del modulo en `docs/modules/` si existe
- los archivos cercanos al cambio

## Reglas locales

- Preservar el Mundial; separar reglas V2 en `src/lib/daily-prode/` y usar datos ficticios en demos.
- En futbol V2 mantener separados marcador a 90, alargue, penales y clasificado; el proveedor se consume solo mediante adaptadores.
- Conservar auditoria con antes/despues, autor, fecha, motivo y fuente.
- No hacer cambios destructivos, deploy ni cambios externos sin autorizacion explicita.
- Documentar cada tarea V2 y verificar tipos, lint dirigido, tests y responsive.
- No hacer push sin autorizacion explicita.
- No cambiar reglas de scoring, bonus, ranking, snapshots, Supabase, RPCs, auth o admin salvo que la tarea lo pida de forma directa.
- Si aparece una inconsistencia de datos, documentarla antes de cambiar calculos.
- Preferir cambios chicos y verificables.
- Mantener la UI defensiva para mobile: sin overflow horizontal, textos largos contenidos y controles compactos.
- Usar las funciones de auditoria/ranking existentes como fuente de verdad; no duplicar reglas en componentes visuales.
- Actualizar `docs/worklog.md` cuando se haga una correccion relevante.

## Validacion esperada

- Ejecutar `npm run build` para cambios de Next.js cuando sea viable.
- Ejecutar `git diff --check`.
- Para UI, revisar al menos mobile chico, mobile medio, tablet y desktop.
- No dejar commits locales salvo que el usuario lo pida o lo autorice en la tarea vigente.

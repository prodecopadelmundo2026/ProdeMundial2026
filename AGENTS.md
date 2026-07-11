# AGENTS

## Contexto de trabajo

Este repo es el Prode Mundial 2026. Es una app Next.js con Supabase donde ranking, scoring, auditoria, eliminatorias y bonus son zonas sensibles.

Antes de modificar un modulo, leer:

- `docs/memory.md`
- `docs/worklog.md`
- la documentacion del modulo en `docs/modules/` si existe
- los archivos cercanos al cambio

## Reglas locales

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

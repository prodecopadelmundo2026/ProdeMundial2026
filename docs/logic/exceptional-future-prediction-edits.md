# Edicion excepcional de pronosticos futuros

## Auditoria actual

- El bloqueo global vive en `app_settings.key = prode_lock_override` y se consume desde `src/lib/prode-lock.ts`.
- Las acciones de guardado llaman `assertProdeOpen()`, por eso un bloqueo global impide editar aunque el partido sea futuro.
- Ademas del bloqueo global, las acciones vuelven a validar partido por partido:
  - `status = 'upcoming'`
  - `now < locked_at`
- Predicciones reales se guardan con `upsert(..., { onConflict: 'user_id,match_id' })`.
- Eliminatorias virtuales se guardan con `upsert(..., { onConflict: 'user_id,virtual_match_id' })`.
- Por lo tanto, editar pisa la fila existente y no genera duplicados historicos.

## Persistencia de eliminatorias

- Los partidos reales usan `public.predictions`.
- La llave proyectada del usuario usa `public.virtual_knockout_predictions` para `virtual-p73` a `virtual-p104`.
- Los desempates usan `public.user_prediction_tiebreakers`.
- `buildProjectedKnockoutMatches()` reconstruye cruces proyectados desde predicciones de grupos y eliminatorias.
- Hoy hay borrado manual por fases, pero no hay deteccion automatica fina de dependencias afectadas despues de cambiar un resultado previo.

## Riesgo principal

Si un cambio en grupos modifica clasificados, las predicciones virtuales posteriores pueden quedar apuntando a equipos que ya no salen de ese grupo. Lo mismo puede pasar si cambia el ganador de una ronda y hay predicciones cargadas en rondas posteriores.

## Propuesta segura

Crear una tabla independiente:

- `user_edit_overrides`
  - `id uuid primary key`
  - `user_id uuid not null references profiles(id)`
  - `enabled boolean not null default true`
  - `scope text not null default 'future_matches'`
  - `expires_at timestamptz null`
  - `reason text null`
  - `created_by uuid references profiles(id)`
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz not null default now()`

No conviene agregar columnas a `authorized_emails`: eso mezcla permisos de acceso/pago con permisos excepcionales temporales.

## Regla de acceso

`canEditProde(user)` debe ser verdadero si:

1. El Prode global esta abierto, o
2. Existe override activo para ese usuario, no vencido.

Siempre se mantiene la validacion por partido:

- solo `upcoming`
- solo `now < locked_at`
- nunca `live`
- nunca `finished`

## Cascada recomendada

Preferencia: opcion A, limpieza hacia adelante.

Flujo:

1. Antes de guardar, calcular la llave proyectada actual.
2. Guardar cambios abiertos con upsert.
3. Recalcular la llave proyectada nueva.
4. Comparar por match virtual:
   - si cambia home/away de `virtual-p73..p88`, limpiar desde dieciseisavos afectados hacia adelante.
   - si cambia un ganador de una ronda, limpiar rondas posteriores dependientes.
5. Borrar solo predicciones virtuales y desempates afectados.
6. Mostrar alerta:
   "Cambiaste un resultado que modifica los clasificados. Algunas fases posteriores quedaron desactualizadas y deben revisarse."

## Por que no reemplazo reactivo

Reemplazar automaticamente Austria por Jordania en fases posteriores parece comodo, pero puede inventar decisiones del usuario. Si cambia un cruce, tambien cambia rival, contexto y marcador probable. Limpiar hacia adelante es mas conservador y auditable.

## Implementacion sugerida

- Agregar helper puro `detectAffectedKnockoutStages(before, after)`.
- Devolver desde `saveFullProdeSafe()` algo como:
  - `affectedStages: MatchStage[]`
  - `deletedVirtualCount`
  - `requiresReview: boolean`
- En UI mostrar modal con boton `Revisar fases afectadas`.
- Registrar auditoria admin minima: usuario habilitado, admin que habilito, vencimiento y motivo.

## No implementar sin pruebas

No activar overrides hasta tener tests de:

- cambio de grupo que modifica segundo/tercero clasificado
- cambio de resultado que no modifica clasificados
- cambio en dieciseisavos que invalida octavos en adelante
- vencimiento de override
- intento de editar partido live/finished

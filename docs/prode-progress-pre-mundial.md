# Prode progress y ranking pre Mundial

## Tablas principales

- `public.authorized_emails`: whitelist y estado comercial/acceso. Usa `email`, `label`, `active`, `status`, `paid_at`, `trial_started_at`, `disabled_at`, `disabled_reason`, `deleted_at`.
- `public.profiles`: perfil del usuario autenticado. Usa `id`, `email`, `name`, `avatar_url`, `is_admin`.
- `public.matches`: fixture oficial y resultados reales. Usa `id`, `stage`, `group`, `status`, `home_score`, `away_score`.
- `public.predictions`: pronosticos de partidos reales de grupos. En la carga del Prode se consideran los partidos con `matches.stage = 'group'`.
- `public.virtual_knockout_predictions`: pronosticos de cruces virtuales de eliminatorias, `virtual-p73` a `virtual-p104`.
- `public.user_prediction_tiebreakers`: desempates necesarios para resolver grupos/llaves cuando una prediccion genera empates.
- `public.special_bets`: apuestas especiales (`balon`, `bota`, `guante`).

## Estados de acceso

El login valida Google contra `public.authorized_emails` mediante `current_user_has_access()`.

- `status = 'confirmed'`, `active = true`, `deleted_at IS NULL`: puede entrar, cuenta como jugador confirmado y suma al pozo.
- `status = 'trial'`, `active = true`, `deleted_at IS NULL`: puede entrar y cargar, pero no cuenta como confirmado ni suma al pozo.
- `status = 'disabled'` o `active = false`: no deberia poder entrar.
- `deleted_at IS NOT NULL`: baja logica; no aparece en ranking ni metricas publicas.

## Calculo de Prode cargado

La regla versionada en `get_public_ranking()` y reflejada en `src/lib/prode-progress.ts` calcula:

- Esperado de grupos: cantidad real de filas `public.matches` con `stage = 'group'`.
- Esperado de eliminatorias: 32 cruces virtuales.
- Esperado de especiales: 3 campos (`balon`, `bota`, `guante`).

No se suman desempates al denominador porque son condicionales: dependen de empates generados por los pronosticos. Si faltan, deben mostrarse dentro de la experiencia de carga, pero no bloquear el 100% general.

La funcion devuelve conceptualmente:

```ts
{
  loadedCount,
  expectedCount,
  percentage,
  status: 'not_started' | 'in_progress' | 'almost_done' | 'completed',
  missingSections
}
```

Umbrales:

- `completed`: 100%.
- `almost_done`: 70% a 99%.
- `in_progress`: mayor a casi nada y menor a 70%.
- `not_started`: 0% o avance menor a 5%.

## Ranking antes y despues de resultados

El modo se detecta automaticamente con `get_public_home_metrics().ranking_mode`.

- `pre_world_cup`: no hay partidos con resultado oficial valido (`status = 'finished'`, `home_score IS NOT NULL`, `away_score IS NOT NULL`). El ranking funciona como listado de participantes. Ordena por avance de carga y muestra porcentaje/estado.
- `live_world_cup`: existe al menos un resultado oficial valido. Vuelve a modo competitivo. Ordena por puntos, exactas, parciales y nombre; muestra posicion y puntaje.

En modo `pre_world_cup` no se deben mostrar exactas, parciales, incorrectas ni "Sin puntos" como dato principal aunque existan valores viejos persistidos en `public.predictions.points`.

Los invitados (`status = 'trial'`) se muestran separados y no participan por premios.

## Correccion de resultados oficiales

- Solo se considera resultado oficial valido un partido `status = 'finished'` con `home_score` y `away_score` no nulos.
- Un partido `upcoming` debe tener goles `NULL`; si el admin borra un resultado cargado por error, debe quedar `status = 'upcoming'`, `home_score = NULL`, `away_score = NULL`.
- Un partido `live` puede tener marcador parcial, pero no debe iniciar el ranking competitivo ni calcular puntos.
- No usar `updated_at` sobre `public.matches`; esa columna no existe.
- No convertir inputs vacios en 0: vacio es `NULL`, `"0"` es 0.

## Pozo acumulado

El pozo actual se calcula como:

```text
usuarios confirmados activos no eliminados * 20000
```

No cuentan usuarios `trial`, `disabled`, `active = false` ni eliminados logicamente.

## Query SQL de auditoria rapida

```sql
WITH expected_counts AS (
  SELECT
    COUNT(*) FILTER (WHERE stage = 'group')::int AS group_expected,
    32::int AS knockout_expected,
    3::int AS specials_expected
  FROM public.matches
),
participants AS (
  SELECT
    ae.email,
    COALESCE(NULLIF(pr.name, ''), NULLIF(ae.label, ''), 'Participante') AS nombre,
    ae.active,
    ae.status AS estado_acceso,
    ae.paid_at,
    ae.deleted_at,
    pr.id AS user_id
  FROM public.authorized_emails ae
  LEFT JOIN public.profiles pr
    ON lower(trim(pr.email)) = lower(trim(ae.email))
),
group_counts AS (
  SELECT p.user_id, COUNT(DISTINCT p.match_id)::int AS count
  FROM public.predictions p
  INNER JOIN public.matches m ON m.id = p.match_id
  WHERE m.stage = 'group'
  GROUP BY p.user_id
),
knockout_counts AS (
  SELECT user_id, COUNT(DISTINCT virtual_match_id)::int AS count
  FROM public.virtual_knockout_predictions
  GROUP BY user_id
),
special_counts AS (
  SELECT
    user_id,
    (
      CASE WHEN NULLIF(trim(COALESCE(balon, '')), '') IS NOT NULL THEN 1 ELSE 0 END +
      CASE WHEN NULLIF(trim(COALESCE(bota, '')), '') IS NOT NULL THEN 1 ELSE 0 END +
      CASE WHEN NULLIF(trim(COALESCE(guante, '')), '') IS NOT NULL THEN 1 ELSE 0 END
    )::int AS count
  FROM public.special_bets
)
SELECT
  p.email,
  p.nombre,
  p.estado_acceso,
  p.active AS activo,
  (p.estado_acceso = 'confirmed' AND p.active = true AND p.deleted_at IS NULL) AS confirmado,
  (p.estado_acceso = 'trial' AND p.active = true AND p.deleted_at IS NULL) AS prueba,
  (p.estado_acceso = 'disabled' OR p.active = false) AS deshabilitado,
  p.deleted_at IS NOT NULL AS eliminado_logico,
  COALESCE(g.count, 0) + COALESCE(k.count, 0) + COALESCE(s.count, 0) AS cantidad_cargada,
  ec.group_expected + ec.knockout_expected + ec.specials_expected AS cantidad_esperada,
  ROUND(
    ((COALESCE(g.count, 0) + COALESCE(k.count, 0) + COALESCE(s.count, 0))::numeric
      / NULLIF(ec.group_expected + ec.knockout_expected + ec.specials_expected, 0)::numeric) * 100
  )::int AS porcentaje_aproximado,
  CASE
    WHEN COALESCE(g.count, 0) + COALESCE(k.count, 0) + COALESCE(s.count, 0)
      >= ec.group_expected + ec.knockout_expected + ec.specials_expected THEN 'Terminado'
    WHEN COALESCE(g.count, 0) + COALESCE(k.count, 0) + COALESCE(s.count, 0) = 0 THEN 'Sin cargar'
    ELSE 'En proceso'
  END AS estado_final,
  p.paid_at AS fecha_de_pago
FROM participants p
CROSS JOIN expected_counts ec
LEFT JOIN group_counts g ON g.user_id = p.user_id
LEFT JOIN knockout_counts k ON k.user_id = p.user_id
LEFT JOIN special_counts s ON s.user_id = p.user_id
ORDER BY confirmado DESC, porcentaje_aproximado DESC NULLS LAST, p.email ASC;
```

## Queries de diagnostico para PROD

Revisar si hay partidos marcados como finalizados o con marcadores cargados:

```sql
SELECT
  id,
  stage,
  "group",
  home_team,
  away_team,
  status,
  home_score,
  away_score,
  scheduled_at,
  locked_at
FROM public.matches
WHERE status = 'finished'
   OR home_score IS NOT NULL
   OR away_score IS NOT NULL
ORDER BY scheduled_at ASC;
```

Revisar si existen puntos viejos persistidos en predicciones aunque no haya resultados oficiales validos:

```sql
SELECT
  pr.email,
  pr.name,
  p.user_id,
  COUNT(*) FILTER (WHERE p.points IS NOT NULL) AS predicciones_con_points,
  COUNT(*) FILTER (WHERE p.points = 3) AS exactas_persistidas,
  COUNT(*) FILTER (WHERE p.points = 1) AS parciales_persistidas,
  COUNT(*) FILTER (WHERE p.points = 0) AS incorrectas_persistidas
FROM public.predictions p
LEFT JOIN public.profiles pr ON pr.id = p.user_id
GROUP BY pr.email, pr.name, p.user_id
HAVING COUNT(*) FILTER (WHERE p.points IS NOT NULL) > 0
ORDER BY predicciones_con_points DESC, pr.email ASC;
```

Revisar la vista legacy `ranking_entries` si sigue existiendo y esta exponiendo metricas viejas:

```sql
SELECT
  user_id,
  name,
  total_points,
  exact_predictions,
  correct_result_predictions,
  rank
FROM public.ranking_entries
WHERE total_points <> 0
   OR exact_predictions <> 0
   OR correct_result_predictions <> 0
ORDER BY total_points DESC, exact_predictions DESC, name ASC;
```

Query de limpieza opcional, solo si se confirma que no hay resultados oficiales reales y se quiere borrar scoring viejo de pruebas. No ejecutarla sin confirmacion:

```sql
UPDATE public.predictions p
SET points = NULL,
    updated_at = now()
WHERE p.points IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.matches m
    WHERE m.status = 'finished'
      AND m.home_score IS NOT NULL
      AND m.away_score IS NOT NULL
  );
```

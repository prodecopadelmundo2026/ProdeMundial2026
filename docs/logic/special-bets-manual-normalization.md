# Normalizacion manual de apuestas especiales

## Objetivo

Permitir que admin revise respuestas reales de usuarios para Balon de Oro, Bota de Oro y Guante de Oro, las agrupe manualmente contra valores oficiales normalizados y, al cierre del Mundial, asigne puntos sin fuzzy matching ni IA.

## Estado actual auditado

- Las respuestas viven en `public.special_bets` con columnas `balon`, `bota` y `guante`.
- La UI de Mi Prode permite cargar/consultar esos tres campos.
- El ranking publico actual no suma puntos de especiales automaticamente.
- La pantalla admin ya menciona revision manual, pero no existe una herramienta completa de equivalencias.

## Arquitectura propuesta

Tablas nuevas:

- `special_bet_options`
  - `id uuid primary key`
  - `category text check in ('balon','bota','guante')`
  - `official_label text not null`
  - `created_at timestamptz`

- `special_bet_aliases`
  - `id uuid primary key`
  - `category text check in ('balon','bota','guante')`
  - `raw_value text not null`
  - `option_id uuid null references special_bet_options(id)`
  - `is_no_winner boolean not null default false`
  - `updated_by uuid references profiles(id)`
  - unique sobre `(category, lower(trim(raw_value)))`

- `special_bet_results`
  - `category text primary key`
  - `winning_option_id uuid null references special_bet_options(id)`
  - `no_winner boolean not null default false`
  - `locked_at timestamptz null`
  - `updated_by uuid references profiles(id)`

## Flujo admin

1. Ver respuestas reales agrupadas por categoria y texto crudo normalizado.
2. Crear valores oficiales manuales, por ejemplo `Emiliano Martinez`.
3. Asignar cada respuesta cruda a un valor oficial o marcarla como `Nadie acerto`.
4. Al cierre, seleccionar ganador oficial por categoria o `Nadie acerto`.
5. Recalcular puntos de especiales desde equivalencias cerradas.

## Reglas de seguridad

- Solo admins pueden crear opciones, asignar aliases y publicar ganadores.
- No se modifica `special_bets`: se preserva la respuesta original del usuario.
- El recalculo debe ser idempotente: correrlo dos veces no duplica puntos.
- No activar scoring automatico hasta tener UI admin y pruebas con datos reales.

## Pendiente de implementacion

- Migraciones con RLS y grants.
- Pantalla admin de agrupacion por categoria.
- Funcion SQL o Server Action idempotente para scoring.
- Tests con alias como `Dibu`, `Emi Martinez`, `Leo`, `Messi`, `Goat`.

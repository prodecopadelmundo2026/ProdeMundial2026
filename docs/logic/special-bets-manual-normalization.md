# Normalización manual de apuestas especiales

## Objetivo

Permitir que admin revise respuestas reales de usuarios para Balón de Oro, Bota de Oro y Guante de Oro, las agrupe manualmente contra jugadores canónicos y, al cierre del Mundial, asigne puntos sin fuzzy matching automático ni IA.

El diseño actualizado del modelo compartido de jugadores, aliases, mapeos manuales, resultados oficiales y estadísticas personales vive en `docs/logic/player-special-awards-and-stats.md`.

## Estado actual auditado

- Las respuestas viven en `public.special_bets` con columnas `balon`, `bota` y `guante`.
- La UI de Mi Prode permite cargar/consultar esos tres campos.
- El ranking público actual no suma puntos de especiales automáticamente.
- La pantalla admin ya menciona revisión manual, pero no existe una herramienta completa de equivalencias.
- `special_bets.points` existe, pero no debe usarse hasta que el scoring especial sea aprobado.

## Principio de auditoría

`public.special_bets` no se modifica. El texto original escrito por el usuario queda siempre como evidencia.

La interpretación canónica se guarda en tablas separadas y puede verse como:

- texto original exacto desde `special_bets`;
- texto normalizado de agrupación;
- jugador interpretado, si existe;
- estado de revisión: `matched`, `no_match` o `review`.

Una exclusión puntual por participante no debe borrar ni modificar la apuesta original. Debe resolverse por `user_id` estable, no por nombre visible, y afectar solo conteos elegibles o scoring futuro.

## Arquitectura propuesta

La normalización debe apoyarse en un catálogo canónico de jugadores para compartir datos entre:

- apuestas especiales;
- tabla de goleadores;
- futuras asistencias, amarillas, rojas, barridas ganadas y estadísticas personales.

Tablas propuestas:

- `players`
  - `id uuid primary key`
  - `display_name text not null`
  - `normalized_name text not null`
  - `country_code text null`
  - `country_name text null`
  - `created_at timestamptz`
  - `updated_at timestamptz`

- `player_aliases`
  - `id uuid primary key`
  - `player_id uuid references players(id)`
  - `alias_raw text not null`
  - `alias_normalized text not null`
  - `source text not null default 'manual'`
  - `created_at timestamptz`
  - `updated_at timestamptz`

- `special_bet_normalizations`
  - `id uuid primary key`
  - `tournament_key text not null`
  - `category text check in ('balon','bota','guante')`
  - `raw_value text not null`
  - `raw_normalized text not null`
  - `player_id uuid null references players(id)`
  - `status text check in ('matched','no_match','review')`
  - `reviewed_by uuid references profiles(id)`
  - `reviewed_at timestamptz`
  - `notes text`
  - unique sobre `(tournament_key, category, raw_normalized)`

La normalización es independiente para Balón, Bota y Guante aunque los tres textos estén en una misma fila de `special_bets`. Cada premio se representa por su `category`.

`raw_value` guarda una variante observada; `raw_normalized` agrupa equivalencias técnicas. El texto original que se muestra en detalle debe seguir saliendo de `special_bets`.

- `special_bet_results`
  - `id uuid primary key`
  - `tournament_key text not null`
  - `category text check in ('balon','bota','guante')`
  - `status text check in ('draft','confirmed','locked')`
  - `confirmed_at timestamptz null`
  - `confirmed_by uuid references profiles(id)`
  - `locked_at timestamptz null`
  - `locked_by uuid references profiles(id)`
  - `updated_by uuid references profiles(id)`
  - `created_at timestamptz`
  - `updated_at timestamptz`
  - unique sobre `(tournament_key, category)`

- `special_bet_result_winners`
  - `id uuid primary key`
  - `special_bet_result_id uuid references special_bet_results(id)`
  - `player_id uuid references players(id)`
  - `created_by uuid references profiles(id)`
  - `created_at timestamptz`
  - unique sobre `(special_bet_result_id, player_id)`

Este diseño permite múltiples ganadores por premio. Para Bota de Oro, si hay empate oficial entre dos o más goleadores, todos deben registrarse como ganadores, cualquier usuario que apostó por uno de ellos recibe puntaje completo y el puntaje no se divide.

- `player_stat_types`
  - `id uuid primary key`
  - `key text not null unique`
  - `label text not null`
  - `display_order integer not null default 0`
  - `is_active boolean not null default true`
  - `created_at timestamptz`
  - `updated_at timestamptz`

- `player_tournament_stat_values`
  - `id uuid primary key`
  - `tournament_key text not null`
  - `player_id uuid references players(id)`
  - `stat_type_id uuid references player_stat_types(id)`
  - `value integer not null default 0`
  - `source_note text null`
  - `source_url text null`
  - `updated_by uuid null references profiles(id) on delete set null`
  - `updated_at timestamptz`
  - unique sobre `(tournament_key, player_id, stat_type_id)`

El admin carga totales actuales, por ejemplo `7 goles`, no acciones incrementales como `sumar 1 gol`. Las actualizaciones deben ser upserts idempotentes para no duplicar estadísticas. La base debe usar `auth.uid()` para `updated_by` cuando exista sesión autenticada; si no existe, debe conservar el valor enviado o quedar `null`.

## Naturaleza visual de estadísticas

Goles, asistencias, amarillas, rojas, barridas ganadas y cualquier otra estadística personal son únicamente informativas y visuales.

Estas estadísticas no tienen relación con scoring, ranking, `predictions.points`, `special_bets.points` ni RPCs actuales. La tabla de goleadores sirve como referencia visual para seguir la apuesta de Bota de Oro, pero no activa scoring automáticamente.

La Etapa 3 solo confirma resultados oficiales de forma informativa. `locked` queda reservado para una etapa futura. No se debe activar scoring hasta diseñar, aprobar y probar ese proceso idempotente y auditado.

## Flujo admin

1. Ver respuestas reales agrupadas por categoría y texto crudo normalizado.
2. Crear o seleccionar jugadores canónicos, por ejemplo `Emiliano Martínez`.
3. Asignar cada respuesta cruda a un jugador canónico, marcarla como `no_match` o dejarla en `review`.
4. Mantener estadísticas visuales de jugadores, empezando por goles.
5. Cargar fuente o nota opcional para auditar una estadística.
6. Al cierre, seleccionar uno o más ganadores oficiales por categoría.
7. Confirmar el resultado oficial, sin modificar puntos ni ranking.
8. En una etapa futura, definir el bloqueo y ejecutar scoring idempotente y auditado.

## Reglas de seguridad

- Solo admins pueden crear jugadores, asignar aliases, publicar ganadores y cargar estadísticas.
- No se modifica `special_bets`: se preserva la respuesta original del usuario.
- El recalculo futuro debe ser idempotente: correrlo dos veces no duplica puntos.
- No activar scoring automático con la confirmación de Etapa 3; el bloqueo queda reservado para una etapa futura con pruebas y aprobación explícita.
- Bota de Oro puede usar tabla manual de goleadores como contexto, pero no debe puntuar hasta diseñar y aprobar el scoring futuro.
- En Etapa 2, RLS debe permitir lectura y escritura solo a administradores mediante `public.current_user_is_admin()`.
- En Etapa 2, se permite borrado admin de jugadores y valores estadísticos para corregir errores de carga, pero no de tipos de estadística iniciales.
- La lectura pública de goleadores queda para Etapa 4, idealmente mediante una vista o grants limitados a columnas públicas.

## Aliases confirmados

Los aliases confirmados deben guardarse como valores literales:

- Lionel Messi: Messi, Lionel Messi, Lionel  Messi, Fressi.
- Kylian Mbappé: Mbappe, Mbappé, Kylian Mbappe, Kylian Mbappé, mbbape.
- Emiliano Martínez: Dibu, DIBU, Dibu Martínez, Dibu Martinez, Dibu martinez, Dibu  Martinez, Dibuu, Dibujo, Martínez dibu, Emi Martinez, Emiliano Martinez, Emiliano Martínez, Emiliano Marínez, Emiliano martinez.
- Julián Álvarez: J Álvarez, Julian Alvarez, Julián Alvarez, Julián Álvarez, Álvarez Julián.
- Cristiano Ronaldo: C Ronaldo, Cristiano Ronaldo, Ronaldo.
- Raphinha: Raphina.
- Vinícius Jr.: Vinicius.
- Rayan Cherki: Cherki.
- Ousmane Dembélé: dembele, Dembele.
- Michael Olise: Olise, olise, Michael Olise, Olisse.
- Erling Haaland: Haaland.
- Lautaro Martínez: Lautaro, Lautaro Martinez.
- Harry Kane: Kane, Harry Kane.
- Mike Maignan: Maigan, maignan, Mike Maignan.
- Unai Simón: Unai Simon, Unai Simón.
- Diogo Costa: Diogo costa.
- Jordan Pickford: Pickford.
- Manuel Neuer: Neuer.
- Bruno Fernandes: Bruno Fernandes.
- Enzo Fernández: Enzo Fernández.
- Lamine Yamal: Lamine Yamal.
- David Raya: David Raya.

## Exclusión pendiente

Pendiente confirmar si kevsaul045@gmail.com / Kevin Saúl corresponde al participante identificado previamente como Kevin Garcia y registrar su user_id exacto antes de generar datos iniciales o scoring.

La exclusión no debe aplicarse sobre aliases compartidos ni mapeos globales, porque el mismo texto puede pertenecer a usuarios válidos.

## Pendiente de implementación

- Aplicar y validar la migración de Etapa 3.
- Revisar la herramienta admin con datos reales.
- Vista pública de goleadores en Mundial en vivo.
- Vista de goleadores en Mi Prode / Bota de Oro.
- Mostrar interpretación de votos a usuarios.
- Definir bloqueo futuro.
- Scoring idempotente y auditado, recién cuando se apruebe esa etapa.

# Premios especiales y estadísticas personales

## Objetivo

Preparar el módulo de premios especiales y estadísticas personales de jugadores sin activar scoring ni tocar ranking.

Este documento cubre:

- Normalización auditada de `public.special_bets`.
- Catálogo canónico de jugadores.
- Aliases confirmados para respuestas escritas a mano.
- Tabla manual/extensible de estadísticas personales.
- Resultados oficiales de Balón de Oro, Bota de Oro y Guante de Oro.
- Integraciones futuras en admin, Mundial en vivo, Mi Prode y detalle de ranking.

## Estado actual

Las apuestas especiales actuales viven en `public.special_bets`:

- `user_id`.
- `balon`.
- `bota`.
- `guante`.
- `points`.

`special_bets.points` existe, pero hoy no se suma al ranking público. No hay scoring activo de especiales. Las pantallas muestran estas apuestas como pendientes.

La tabla se usa hoy para:

- carga de usuario en `/mi-prode`;
- conteo de progreso del Prode;
- detalle visible de un participante en `/ranking/[userId]`;
- revisión admin read-only en `/admin`.

## Reglas confirmadas

- El texto original guardado por el usuario no se pisa.
- La normalización debe vivir en registros separados y auditables.
- `public.special_bets` queda intacta.
- La exclusión de una apuesta debe resolverse por un dato estable, preferentemente `user_id`, no por nombre visible.
- ProdeMun dial2026 cuenta.
- No se suman puntos hasta que se diseñe, apruebe y pruebe una etapa futura de bloqueo y scoring idempotente.
- No se modifica ranking ni scoring actual en las etapas de normalización o estadísticas.
- No se integra API externa para estadísticas de jugadores en el MVP.
- Las estadísticas personales son informativas y visuales: no modifican `predictions.points`, `special_bets.points`, ranking, auditoría actual ni RPCs actuales.

## Premios

- `balon`: Balón de Oro.
- `bota`: Bota de Oro.
- `guante`: Guante de Oro.

Balón de Oro y Guante de Oro se definen por confirmación oficial al final del Mundial. Bota de Oro se puede acompañar con tabla de goleadores, pero ser máximo goleador en la tabla visual no activa scoring automáticamente.

La Etapa 3 solo confirma resultados oficiales de forma informativa. `locked` queda reservado para una etapa futura y no se debe activar scoring hasta diseñar, aprobar y probar ese proceso.

## Regla cerrada para empates en Bota de Oro

Si el resultado oficial de la Bota de Oro reconoce empate entre dos o más goleadores:

- todos esos jugadores deben registrarse como ganadores oficiales;
- los usuarios que apostaron por cualquiera de esos jugadores reciben el puntaje completo definido por reglamento;
- el puntaje no se divide entre ganadores empatados;
- la tabla visual de goleadores sirve como referencia, pero no determina ni activa scoring por sí sola.

Esta regla queda documentada ahora. No se implementa todavía en scoring.

## Aliases confirmados

Estos aliases ya fueron revisados manualmente. En futuros archivos SQL deben cargarse como aliases literales, no modificar `special_bets`.

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

## Conteo normalizado confirmado

Conteo confirmado excluyendo la apuesta pendiente de identificar como Kevin Garcia.

Balón de Oro:

- Lionel Messi: 15.
- Kylian Mbappé: 7.
- Michael Olise: 6.
- Lamine Yamal: 6.
- Julián Álvarez: 2.
- Rayan Cherki: 1.
- Bruno Fernandes: 1.
- Cristiano Ronaldo: 1.
- Enzo Fernández: 1.
- Raphinha: 1.
- Ousmane Dembélé: 1.
- Erling Haaland: 1.

Bota de Oro:

- Kylian Mbappé: 17.
- Julián Álvarez: 6.
- Lionel Messi: 4.
- Harry Kane: 4.
- Lautaro Martínez: 3.
- Cristiano Ronaldo: 3.
- Michael Olise: 2.
- Ousmane Dembélé: 2.
- Vinícius Jr.: 1.
- Erling Haaland: 1.

Guante de Oro:

- Emiliano Martínez: 33.
- Unai Simón: 4.
- Mike Maignan: 3.
- David Raya: 1.
- Diogo Costa: 1.
- Jordan Pickford: 1.

## Exclusión pendiente

La exclusión corresponde a una apuesta individual y debe resolverse por `special_bets.user_id`.

Datos conocidos para investigar antes de seeds, datos iniciales o scoring:

- posible email: `kevsaul045@gmail.com`;
- posible nombre visible: `Kevin Saúl`;
- estado observado: cuenta eliminada o deshabilitada.

No se confirma todavía que `kevsaul045@gmail.com` / `Kevin Saúl` sea la misma persona identificada previamente como Kevin Garcia. No se debe consultar Supabase remoto ni modificar datos en esta etapa.

Reglas para documentar la exclusión:

- no excluir por nombre visible;
- el email puede ayudar a localizar la cuenta, pero la regla estable debe usar `user_id`;
- que una cuenta esté eliminada o deshabilitada no garantiza que sus filas históricas en `special_bets` hayan desaparecido;
- no borrar ni modificar la apuesta original;
- preservar evidencia;
- la exclusión afecta solo conteos elegibles y scoring futuro;
- no excluir una normalización compartida por texto, porque el mismo texto puede haber sido escrito por usuarios válidos.

Pendiente confirmar si kevsaul045@gmail.com / Kevin Saúl corresponde al participante identificado previamente como Kevin Garcia y registrar su user_id exacto antes de generar datos iniciales o scoring.

## Modelo propuesto

### `players`

Catálogo canónico interno.

- `id uuid primary key`.
- `display_name text not null`.
- `normalized_name text not null`.
- `country_code text null`.
- `country_name text null`.
- `created_at timestamptz not null`.
- `updated_at timestamptz not null`.

### `player_aliases`

Aliases confirmados para resolver textos manuales.

- `id uuid primary key`.
- `player_id uuid not null references players(id)`.
- `alias_raw text not null`.
- `alias_normalized text not null`.
- `source text not null default 'manual'`.
- `created_at timestamptz not null`.
- `updated_at timestamptz not null`.

Debe tener unicidad razonable sobre `alias_normalized`, o sobre `(player_id, alias_normalized)` si se decide permitir aliases compartidos para revisión.

### `special_bet_normalizations`

Interpretación compartida de respuestas reales de usuarios, independiente para cada premio.

- `id uuid primary key`.
- `tournament_key text not null`.
- `category text not null check (category in ('balon','bota','guante'))`.
- `raw_value text not null`.
- `raw_normalized text not null`.
- `player_id uuid null references players(id)`.
- `status text not null check (status in ('matched','no_match','review'))`.
- `reviewed_by uuid null references profiles(id)`.
- `reviewed_at timestamptz null`.
- `notes text null`.
- `created_at timestamptz not null`.
- `updated_at timestamptz not null`.

La clave natural debería ser `(tournament_key, category, raw_normalized)`. No debe depender de `user_id` porque varios usuarios pueden escribir el mismo texto.

`raw_value` representa una variante original observada. `raw_normalized` agrupa equivalencias técnicas como trim, minúsculas y colapso de espacios. En vistas individuales, el texto mostrado al usuario debe salir siempre del campo exacto de `special_bets`; la interpretación canónica sale de `special_bet_normalizations`.

Como `special_bets` tiene `balon`, `bota` y `guante` dentro de una misma fila, la normalización independiente se representa con una fila por combinación `(tournament_key, category, raw_normalized)`. Así, el mismo texto puede mapearse distinto por premio si alguna vez fuera necesario.

### `special_bet_results`

Cabecera del resultado oficial confirmado por admin.

- `id uuid primary key`.
- `tournament_key text not null`.
- `category text not null check (category in ('balon','bota','guante'))`.
- `status text not null check (status in ('draft','confirmed','locked'))`.
- `confirmed_at timestamptz null`.
- `confirmed_by uuid null references profiles(id)`.
- `locked_at timestamptz null`.
- `locked_by uuid null references profiles(id)`.
- `updated_by uuid null references profiles(id)`.
- `created_at timestamptz not null`.
- `updated_at timestamptz not null`.

Debe tener unique sobre `(tournament_key, category)`.

En Etapa 3 la UI usa `draft` y `confirmed`. `locked` queda reservado para una etapa futura de scoring. El scoring solo podrá activarse en una etapa posterior, cuando exista resultado oficial completo y se apruebe el proceso idempotente de puntos.

### `special_bet_result_winners`

Jugadores ganadores asociados a una cabecera de resultado oficial.

- `id uuid primary key`.
- `special_bet_result_id uuid not null references special_bet_results(id)`.
- `player_id uuid not null references players(id)`.
- `created_by uuid null references profiles(id)`.
- `created_at timestamptz not null`.

Debe tener unique sobre `(special_bet_result_id, player_id)` para permitir varios ganadores por premio y evitar duplicar al mismo jugador.

El modelo soporta múltiples ganadores para `balon`, `bota` y `guante`. Aunque Balón de Oro y Guante de Oro normalmente tengan un único ganador, conviene mantener el mismo modelo para todas las categorías: simplifica auditoría, evita reglas especiales innecesarias y deja cubiertos empates o decisiones oficiales excepcionales.

### `player_stat_types`

Catálogo extensible de tipos de estadísticas personales.

- `id uuid primary key`.
- `key text not null unique`.
- `label text not null`.
- `display_order integer not null default 0`.
- `is_active boolean not null default true`.
- `created_at timestamptz not null`.
- `updated_at timestamptz not null`.

Tipos iniciales propuestos:

- `goals`: Goles.
- `assists`: Asistencias.
- `yellow_cards`: Tarjetas amarillas.
- `red_cards`: Tarjetas rojas.
- `tackles_won`: Barridas ganadas.

### `player_tournament_stat_values`

Valor actual de una estadística para un jugador en un torneo.

- `id uuid primary key`.
- `tournament_key text not null`.
- `player_id uuid not null references players(id)`.
- `stat_type_id uuid not null references player_stat_types(id)`.
- `value integer not null default 0`.
- `source_note text null`.
- `source_url text null`.
- `updated_by uuid null references profiles(id) on delete set null`.
- `updated_at timestamptz not null`.

Alcance inicial por defecto: `tournament_key = 'world-cup-2026'`. No se crea todavía una tabla completa de torneos.

Debe tener unique sobre `(tournament_key, player_id, stat_type_id)`.

El admin carga el total actual de una estadística, por ejemplo `7 goles`, en lugar de ejecutar acciones incrementales como `sumar 1 gol`. La actualización debe pensarse como upsert idempotente sobre `(tournament_key, player_id, stat_type_id)`, para evitar duplicar estadísticas al corregir o refrescar totales. La base debe usar `auth.uid()` para `updated_by` cuando exista sesión autenticada; si no existe, debe conservar el valor enviado o quedar `null`.

Para el MVP, solo hace falta cargar `goals` para la tabla de goleadores. El modelo queda preparado para asistencias, tarjetas amarillas, tarjetas rojas, barridas ganadas y futuras estadísticas sin modificar la estructura principal.

## Naturaleza visual de estadísticas personales

Goles, asistencias, tarjetas amarillas, tarjetas rojas, barridas ganadas y cualquier otra estadística personal son únicamente informativas y visuales.

Estas estadísticas:

- no suman puntos;
- no modifican ranking;
- no modifican `predictions.points`;
- no modifican `special_bets.points`;
- no intervienen en RPCs actuales;
- no determinan ganadores oficiales automáticamente;
- no activan scoring especial.

La tabla de goleadores sirve como información visual y como referencia para seguir la apuesta de Bota de Oro. No reemplaza la carga oficial de resultados especiales.

## Integraciones futuras

### Admin

Agregar herramientas protegidas para admins:

- Cargar y editar jugadores canónicos.
- Cargar aliases literales.
- Revisar respuestas agrupadas de `special_bets`.
- Asignar `matched`, `no_match` o `review`.
- Cargar valores actuales de estadísticas personales, empezando por goles.
- Cargar fuente o nota opcional para auditar el dato estadístico.
- Cargar uno o más ganadores oficiales por premio.
- Confirmar resultado oficial cuando esté completo, sin modificar puntos ni ranking.

La pantalla actual de `/admin` ya tiene sección de especiales read-only. Puede evolucionar ahí o dividirse en subcomponentes para no agrandar `src/app/admin/page.tsx`.

### Mundial en vivo

`src/app/(app)/mundial-en-vivo/page.tsx` hoy consume `matches` y calcula grupos/llave. La sección nueva debería leer estadísticas personales y mostrar:

- top goleadores;
- luego asistencias, amarillas y rojas;
- top 5 o top 6 con botón "Ver más";
- layout compacto mobile sin overflow horizontal.

### Mi Prode

`src/app/(app)/mi-prode/SpecialsTab.tsx` debe mantener el input libre, pero el bloque de Bota de Oro puede mostrar una tabla compacta de goleadores para contexto. Esa tabla no debe modificar la apuesta del usuario por sí sola.

### Detalle de ranking

`src/app/(app)/ranking/[userId]/page.tsx` puede mostrar, para cada premio:

- texto escrito;
- interpretación canónica si existe;
- estado de revisión;
- ganador oficial y puntos solo cuando la categoría esté cerrada.

Mientras no haya ganador oficial, debe seguir mostrando pendiente.

### Estadísticas del Prode

`/estadisticas` es hoy una página de métricas del Prode, no de jugadores. Si se agregan estadísticas personales, conviene mantenerlas como bloque separado o enlazarlas desde Mundial en vivo para no mezclar con scoring/ranking histórico.

## Seguridad y RLS

Tablas de escritura admin (`players`, `player_aliases`, `special_bet_normalizations`, `special_bet_results`, `special_bet_result_winners`, `player_stat_types`, `player_tournament_stat_values`) deben tener RLS habilitado.

Políticas propuestas:

- Etapa 2: lectura y escritura exclusiva de administradores usando `public.current_user_is_admin()` para `players`, `player_stat_types` y `player_tournament_stat_values`;
- Etapa 2: permitir borrado admin de jugadores y valores estadísticos para corregir errores de carga, pero no de tipos de estadística iniciales;
- Etapa 4: diseñar exposición pública segura para goleadores, probablemente con vista o grants limitados a columnas públicas;
- preservar `reviewed_by`, `updated_by`, `created_by`, `reviewed_at`, `updated_at` y `created_at`;
- no exponer funciones `SECURITY DEFINER` sin checks internos de admin;
- evitar escritura pública directa sobre tablas de normalización, resultados y estadísticas.

## Flujo admin separado

El admin debe poder mantener estos flujos sin mezclarlos:

1. Jugadores y aliases.
2. Normalización manual de respuestas.
3. Carga visual de estadísticas personales.
4. Carga y confirmación de resultados oficiales.
5. Futuro scoring idempotente y auditado.

La carga visual de goleadores no debe adelantar ni disparar el scoring de Bota de Oro.

## Riesgos

- `special_bets.points` puede inducir a activar scoring antes de tiempo.
- Si la normalización se basa solo en texto agrupado, dos jugadores con alias ambiguo pueden requerir estado `review`.
- Si se usa `unaccent`, primero hay que confirmar extensión disponible; el MVP puede usar lower, trim y colapso de espacios.
- La tabla manual de goleadores puede quedar desactualizada si no hay workflow admin claro.
- La exclusión de Kevin Garcia requiere confirmar `user_id` exacto antes de generar seeds, datos iniciales o scoring.
- Los empates oficiales deben representarse como múltiples ganadores, no como reparto parcial de puntos.

## Etapas

1. Documentación y diseño.
2. Modelo base de jugadores y estadísticas.
3. Admin para tabla de goleadores, normalización de elecciones y confirmación informativa de premios oficiales, sin scoring.
4. Aplicar y validar la migración de Etapa 3 con datos reales.
5. Tabla pública de goleadores en Mundial en vivo.
6. Tabla de goleadores en Mi Prode / Bota de Oro.
7. Mostrar a los usuarios la interpretación normalizada de sus elecciones.
8. Diseñar el bloqueo futuro de resultados y el scoring idempotente y auditado de premios especiales.

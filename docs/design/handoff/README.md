# Handoff — Prode 26 · v6

Pack de diseño para implementar el sitio completo del Prode Mundial 2026.

**Cambios v6** (sobre v5):
- Nueva página **`/premios`** con podio + banner del pozo + card de referidos
- Nueva página **`/reglas`** con puntaje por partido + apuestas especiales (mismo layout que premios)
- Home: sección de premios y de reglas **removidas** (viven en sus propias páginas)
- Home: nueva sección **Top 10** con podio del ranking + fila pinned del usuario logueado
- Premios: monto del 3º puesto pasa a `$100.000` cash (antes Smart TV)
- Tipografía del podio rediseada con jerarquía interna (rank italic + monto multi-peso)

## Contenido

```
handoff/
├── README.md                      ← este documento
├── globals.snippet.css            ← @theme de Tailwind v4 + utilidades
├── MIGRATION-LOGIN.md             ← guía paso a paso del login viejo → nuevo
├── COMPONENT-MATCHCARD.md         ← detalle del componente crítico
└── mocks/
    ├── Home.html                  ← Home (guest + auth — navbar varía)
    ├── Login.html                 ← Login con form nombre + email
    ├── MiProde-Locked.html        ← Mi Prode sin sesión (gate WhatsApp)
    ├── MiProde-Auth.html          ← Mi Prode autenticado
    ├── Premios.html               ← Página /premios · NUEVO en v6
    └── Reglas.html                ← Página /reglas · NUEVO en v6
```

> ⚠️ Los `.html` son mocks de referencia visual. NO copiarlos al codebase — recrear en React + Tailwind v4.

---

## 1. Stack target (confirmado por el cliente)

- **Next.js 14** con **App Router** (`src/app/`)
- **TypeScript**
- **Tailwind CSS v4** (sin `tailwind.config.ts` — todo en `@theme` dentro de `globals.css`)
- **Supabase** (48 equipos, 80 partidos ya cargados)
- `'use client'` solo donde haya interactividad real

---

## 2. Mapa de rutas y mocks

| Ruta | Mock | Auth | Contenido |
|---|---|---|---|
| `/` | `Home.html` | guest + auth | Hero + Stats + Próximos partidos + Top 10 ranking |
| `/login` | `Login.html` | guest only | Form nombre + email contra DB |
| `/mi-prode` (locked) | `MiProde-Locked.html` | sin sesión | Gate con CTA WhatsApp |
| `/mi-prode` (auth) | `MiProde-Auth.html` | con sesión | Banner apuestas especiales + combo grupos/fases + partidos + tabla del grupo |
| `/premios` | **`Premios.html`** | guest + auth | Podio (Oro/Plata/Bronce) + banner del pozo + card de referidos |
| `/reglas` | **`Reglas.html`** | guest + auth | Puntaje por partido + apuestas especiales |
| `/ranking` | (pendiente) | guest + auth | Podio + tabla completa |

---

## 3. Reglas de acceso

- Login = nombre + email. Si el email está en `profiles`, OK. Si no, error inline "Usuario no registrado"
- Sin sesión se puede ver: `/`, `/ranking`, `/premios`, `/reglas`
- Sin sesión en `/mi-prode` → mostrar `<MiProdeLocked />`
- Google sign-in = **placeholder visual**, no implementar
- WhatsApp organizadores: `https://wa.me/5491100000000?text=...` (reemplazar nro real)

---

## 4. Design tokens

Todos en `globals.snippet.css`. Highlights:

### Colores

| Token | Hex | Uso |
|---|---|---|
| `--color-orange` | `#FF6B00` | CTAs primarios, "Falta cargar", strip de MatchCard abierta |
| `--color-purple` | `#5B2D8E` | Secundario, status "Cerrado" (clases `bg-purple/18`), Balón de Oro, banner apuestas |
| `--color-yellow` | `#FFE040` | +3 exacto, premio Oro |
| `--color-blue` | `#1565C0` | Guante de Oro |
| `--color-mint` | `#A8F0D8` | Status "Abierto", +1 parcial, premio Plata, WhatsApp CTA, indicador ranking ↑ |
| `--color-bg` | `#0A0A0A` | Fondo base |
| `--color-panel` | `#141414` | Cards |
| `--color-panel-2` | `#1C1C1C` | Cards hover |
| `--color-line` | `rgba(255,255,255,0.08)` | Bordes |
| `--color-text` | `#FFFFFF` | Texto principal |
| `--color-muted` | `#8A8A8A` | Texto secundario |
| `--color-status-live` | `#FF3B3B` | Status "En vivo" |
| `--color-danger` | `#FF5A5A` | Errores |

**Regla del naranja**: exclusivo de CTAs + urgencia. NO usarlo para badges de status (el status "Cerrado" es púrpura ahora).

### Tipografía

- `Archivo Black` → display (h1, h2, números grandes, score inputs)
- `Archivo` 500-900 → UI
- `JetBrains Mono` → códigos de equipo (ARG, BRA), fechas

Cargar con `next/font/google` y exponer como CSS variables.

---

## 5. Componentes a construir

### Comunes
- `<Navbar />` — 2 variants: **guest** (botón "Entrar" naranja) / **auth** (pill puntos + avatar con dropdown)
- `<Footer />`
- `<Button />` — variants: primary, ghost, wa
- `<StatusBadge status={'open'|'closed'|'live'|'finished'} />`
- `<PtsBadge variant={'exact'|'partial'|'miss'} points />`
- **`<MatchCard />`** — ver `COMPONENT-MATCHCARD.md`

### Home (`src/app/page.tsx`)
- `<Hero />`, `<StatsStrip />`, `<UpcomingMatches />` (hasta 6 cards en grid 3 cols), `<Top10 />` (ranking compacto en card list)
- **Ya no** incluye podio de premios ni grilla de reglas — cada uno vive en su página (`/premios`, `/reglas`)

### Premios (`src/app/premios/page.tsx`) — sección 7
### Reglas (`src/app/reglas/page.tsx`) — sección 8

### Login (`src/app/login/page.tsx`)
- Ver `MIGRATION-LOGIN.md` para migración paso a paso

### Mi Prode autenticado (`src/app/mi-prode/page.tsx`) — sección 6 abajo

---

## 6. Mi Prode autenticado · detalle de implementación

> Mock: `mocks/MiProde-Auth.html`

### 6.1 Navbar variant `auth`

- **Solo el avatar** del lado derecho (sin pill de puntos/ranking — toda la info del usuario vive en el dropdown del avatar)
- Avatar 36px gradiente purple→blue, **clickable** → abre dropdown `<UserMenu />`
- Cursor pointer + hover effect (scale 1.05)

### 6.2 `<UserMenu />` (dropdown del avatar)

Posicionado `absolute` debajo del avatar, alineado a la derecha. Tres secciones:

1. **Head** — avatar grande + eyebrow "INFORMACIÓN GENERAL" + nombre
2. **Stats** — grid 3 columnas: Puntos (247, +12), Ranking (#34 en mint, ↑6), Aciertos (68%, 12 exactos)
3. **Foot** — link "Cerrar sesión" (en color rojo `#FF8585`)

> Como el navbar ya no muestra puntos/ranking, este dropdown es la **única fuente de verdad** de las stats del usuario en Mi Prode. Mantenerlo bien accesible (cursor pointer en el avatar, indicador visual claro de que es clickable).

Comportamiento:
- Click en avatar → toggle clase `.open`
- Click fuera del menú → cerrar
- Tecla `Escape` → cerrar
- Transición opacity + translateY 150ms

### 6.3 Sin sección de "user header" en el body

El usuario VE sus stats al abrir el dropdown del avatar. La página principal arranca directo con el banner de apuestas especiales.

### 6.4 `<SpecialsBanner />` (apuestas especiales — slim bar)

Barra delgada (~54px de altura) full-width arriba de la página. **Solo visible** si el usuario NO completó las 3 apuestas especiales. Pensada para ser descubrible pero NO dominante — el prode (los partidos) es el protagonista.

Layout (1 sola fila, flex row):
- Icono SVG de trofeo en cuadrado púrpura chico (28×28px)
- Copy compacto inline: `<h4>Balón, Bota y Guante de Oro sin cargar.</h4> <p>Hasta <b>+50 pts</b> antes del 11 jun.</p>`
- CTA outline púrpura "Cargar" → abre modal `<SpecialBetsModal />` (pendiente diseñar)
- Botón X dismiss a la derecha (oculta el banner; persistir el dismiss en localStorage o user setting para que no reaparezca en cada navegación)

Colores: `bg-purple/16` con `border-purple/20` — sutiles, no llaman demasiado la atención.

**Estados** (toggle entre 3):
- Default: 0 apuestas cargadas — banner visible
- Parcial: 1 o 2 cargadas — banner visible con copy adaptado (`Falta cargar Guante de Oro.` etc.)
- Todas cargadas: banner NO se renderiza

### 6.5 Phase tabs

Pill segmentado `<button>Grupos</button> / <button>Eliminatorias</button>`. Alineado a la derecha del h1 "Mi Prode".

Al cambiar:
- Tab activa swap (background naranja)
- Cambia el combo dropdown (12 grupos vs 5 fases)
- Cambia el texto del `<ComboMeta />` ("6 partidos · 11–22 junio" vs "16 partidos · 28 jun – 02 jul")
- Si está en Eliminatorias, **oculta** la `<StandingsBlock />`

### 6.6 Combo dropdowns

#### Combo grupos
Native `<select>` estilizado. Opciones: `Grupo A` ... `Grupo L` (solo el nombre, sin info adicional).

#### Combo eliminatorias
Opciones: `Dieciseisavos de final`, `Octavos de final`, `Cuartos de final`, `Semifinal`, `Final y 3.º/4.º puesto`.

**Crítico para v4**: el styling del `<option>` requiere:
```css
.group-combo select option {
  background: #000;
  color: #fff;
  font-weight: 700;
}
```

Sin esto el dropdown nativo se ve con fondo claro en algunos browsers.

#### Combo meta (leyenda inline)
Span **al lado** del combo (mismo flex container con `align-items: center; gap: 18px; flex-wrap: wrap`), color muted, formato: `<b>6</b> partidos · 11–22 junio`. Cambia con la fase. NO debajo del combo — inline.

### 6.7 `<MatchGrid />` y `<MatchCard />`

Ver `COMPONENT-MATCHCARD.md`. Cambios para esta vista:
- El chip del grupo arriba muestra **jornada** también: `A · J1`, `A · J2`
- Bottom hint usa copy editorial: "Marcador exacto. La rompiste." / "No le pegaste — mañana hay revancha." / "Aún sin guardar"

### 6.8 `<StandingsBlock />` (tabla del grupo)

**Embebida debajo del match grid**, no en página aparte.

Estructura:
- Header: título "Tabla del grupo" + status note "Actualizada en vivo" con dot mint
- Tabla con columnas: `#` `Equipo` `PJ` `PTS` `GF` `GC` `DG`
- Filas con clase `.adv` (los 2 primeros = clasifican a octavos) tienen una franja mint a la izquierda
- Trend indicator (▲▼=) al lado del nombre del equipo
- Diferencia de goles coloreada: mint si positivo, rojo si negativo, gris si cero
- Legend: explicación de PJ/GF/GC/DG + indicador de "clasifica"

### 6.9 `<Tiebreaks />` (desempates predictivos)

Sección debajo de la tabla. Una card por cada empate (mismo PTS y DG).

Cada tiebreak:
- Header naranja: nombres de los equipos empatados + pregunta ("¿quién pasa primera?", "¿quién termina tercera?")
- Opciones: pills con bandera + nombre, una seleccionada (highlight naranja)
- Click toggles selection (radio behavior dentro del tiebreak)

**Sugerencia de puntaje**: +2 pts por cada desempate acertado.

**Lógica de cuándo mostrarlo**: solo si hay teams con `PTS` y `DG` iguales en el grupo. Si no hay empate, no se renderiza.

---

## 7. Premios · detalle de implementación

> Mock: `mocks/Premios.html` · Ruta: `src/app/premios/page.tsx`

Página pública (guest + auth). Header sigue el mismo patrón que `/reglas`:
- Eyebrow uppercase muted: `QUÉ SE GANA`
- H1 display: `Podio de premios` (premios en italic naranja)
- Sub mono: `Mundial 2026 · USA · Canadá · México`

### 7.1 `<PotBanner />` (banner del pozo)

Banner amarillo tenue arriba del podio. Comunica que el pozo es **dinámico** según inscriptos. Layout: icono SVG en cuadrado amarillo + título + párrafo. Copy:

> **"El pozo crece con cada inscripción"**
> Los premios actuales son **base garantizada**. Si llegamos a **más de 200 inscriptos**, el pozo acumulado **aumenta proporcionalmente**. Por cada persona que referís y se inscribe, **ganás una comisión**.

### 7.2 `<PrizePodium />`

3 cards en grid 1fr / 3fr (mobile / desktop). Cada card es un bloque sólido de color con jerarquía tipográfica interna:

| Puesto | Color bg | Monto | Altura mínima | Rank size |
|---|---|---|---|---|
| 1º | `--color-yellow` | $800.000 | 360px | 120px |
| 2º | `--color-mint` | $200.000 | 320px | 84px |
| 3º | `#E8A87C` | $100.000 | 300px | 72px |

**Cinta diagonal "CAMPEÓN"** solo en el 1º puesto (`::after` rotado 45deg).

Anatomía de cada card:
- `prize-head`: pill mono "1º Puesto" + rank gigante "1er" (letra ordinal italic 30% + opacity 55%)
- `prize-name`: nombre del premio uppercase (Oro / Plata / Bronce)
- `prize-amount`: `$` mono chico opacity 50% + número grande italic + puntos miles atenuados 35%
- `prize-tag`: línea mono con guion al inicio (`— PREMIO MAYOR` / `— SUBCAMPEÓN` / `— TERCER LUGAR`)

Cada card tiene una **forma decorativa orgánica distinta** (círculo abajo-der / petal arriba-der / petal abajo-izq) — evita que se vean clonadas.

### 7.3 `<ReferralCard />`

Card panel debajo del podio. Layout grid `1.2fr .8fr`:
- Izquierda: h3 "Más amigos, **más premio**" + copy explicando el sistema de referidos
- Derecha: botón naranja "Compartir invitación" (icono SVG share)

> NO mostrar el link de referido como texto visible — el botón abre nativamente `navigator.share()` o un menú de share (WhatsApp, copiar, etc.).

---

## 8. Reglas · detalle de implementación

> Mock: `mocks/Reglas.html` · Ruta: `src/app/reglas/page.tsx`

Página pública (guest + auth). **Layout idéntico a `/premios`** — son páginas hermanas visualmente.

### Header
- Eyebrow: `CÓMO JUGAR`
- H1: `Reglas del juego` (juego en italic naranja)
- Sub mono: `Mundial 2026 · USA · Canadá · México` (idéntico a premios)

### `<InfoBanner />`
Banner mint tenue (mismo formato que el pozo en premios, distinto color). Copy:
> **"El que más le pega, gana"**
> Pronosticá el resultado de los **80 partidos** del Mundial. Sumás puntos partido a partido. Hasta **50 puntos extra** con las apuestas especiales.

### Bloque 1: `<ScoringRules />` — Puntaje por partido
3 cards en grid 3 cols. Cada card tiene:
- Edge izquierdo 3px del color temático
- Pill mono "Acierto pleno / Acierto parcial / Sin acierto"
- Puntos grandes (display 72px) del color: yellow / mint / gris
- Nombre uppercase + descripción muted

Reglas:
- **+3 Resultado exacto** (yellow)
- **+1 Ganador o empate** (mint)
- **0 Incorrecto** (gris)

### Bloque 2: `<SpecialBets />` — Apuestas especiales
Mismo patrón visual que ScoringRules. Edge izquierdo + pill mono + puntos + nombre + descripción.

Reglas:
- **+20 Balón de Oro** (purple) — mejor jugador
- **+15 Bota de Oro** (orange) — máximo goleador
- **+15 Guante de Oro** (blue) — mejor arquero

---

## 9. Datos Supabase

```sql
-- Login
select id, name from profiles where lower(email) = lower($1) limit 1;

-- Home stats
select count(*) as participants from profiles;
select count(*) as predictions_count from predictions;

-- Upcoming matches (home — 6 más próximos)
select m.*,
  ht.name as home_name, ht.code as home_code, ht.flag as home_flag,
  at.name as away_name, at.code as away_code, at.flag as away_flag,
  p.home_goals as pred_home, p.away_goals as pred_away,
  p.points_earned, p.saved_at
from matches m
join teams ht on ht.id = m.home_team_id
join teams at on at.id = m.away_team_id
left join predictions p on p.match_id = m.id and p.user_id = auth.uid()
where m.kickoff > now() - interval '2 hours'
order by m.kickoff asc limit 6;

-- Mi Prode: matches de un grupo + predicciones del usuario
select m.*, ht.*, at.*, p.*
from matches m
join teams ht on ht.id = m.home_team_id
join teams at on at.id = m.away_team_id
left join predictions p on p.match_id = m.id and p.user_id = auth.uid()
where m.group_letter = $1
order by m.kickoff asc;

-- User stats (avatar dropdown)
select
  total_points,
  ranking_position,
  prev_ranking_position,
  exact_predictions_count,
  partial_predictions_count,
  total_predictions_count
from user_stats_view
where user_id = auth.uid();

-- Standings del grupo (live)
select
  t.id, t.name, t.code, t.flag,
  ts.played, ts.points, ts.goals_for, ts.goals_against,
  ts.goals_for - ts.goals_against as goal_diff,
  ts.prev_position, ts.position
from teams t
join team_standings ts on ts.team_id = t.id
where t.group_letter = $1
order by ts.points desc, goal_diff desc;
```

---

## 10. Animaciones y accesibilidad (ya implementado en mocks)

- `:focus-visible` global con outline naranja 2px offset 3px
- `@media (prefers-reduced-motion: reduce)` cancela todas las animaciones
- Inputs con `aria-label`
- Dropdowns con `aria-haspopup`, `aria-expanded`, manejan `Escape`
- Contraste 4.5:1 mínimo
- Sin scroll horizontal (probado a 390px)

---

## 11. Schema necesario para la tabla del grupo + desempates

```sql
-- Tabla de posiciones materializada (recalcular cada vez que termina un partido)
create table team_standings (
  team_id uuid primary key references teams(id),
  group_letter text,
  played int default 0,
  wins int default 0,
  draws int default 0,
  losses int default 0,
  goals_for int default 0,
  goals_against int default 0,
  points int default 0,
  position int,
  prev_position int
);

-- Pronósticos de desempate
create table tiebreak_predictions (
  user_id uuid references profiles(id),
  group_letter text,
  -- equipo que el usuario predice que pasa de los dos empatados
  team_a_id uuid references teams(id),
  team_b_id uuid references teams(id),
  picked_team_id uuid references teams(id),
  created_at timestamptz default now(),
  primary key (user_id, group_letter, team_a_id, team_b_id)
);
```

---

## 12. Cómo arrancar en Claude Code

1. Descomprimí este folder en `docs/design/prode26/` de tu repo
2. Si todavía no implementaste login → leer `MIGRATION-LOGIN.md` primero
3. Prompt para arrancar las páginas nuevas (Premios + Reglas):

> *Leí `docs/design/prode26/README.md` secciones 7 y 8 y los mocks `Premios.html` + `Reglas.html`. Creá las páginas en `src/app/premios/page.tsx` y `src/app/reglas/page.tsx`, públicas (guest + auth), siguiendo el mismo page-head (eyebrow + h1 + sub mono). Reutilizá el `<Navbar />` con los items "Premios" y "Reglas" linkeados. Además en la Home (`src/app/page.tsx`): sacaá las secciones de premios y reglas — ahora viven en sus propias páginas. Agregá la nueva sección `<Top10 />` del ranking debajo de "Próximos partidos".*

4. Prompt para Mi Prode auth (si no lo hiciste aún): ver instrucciones en la versión anterior del README.

---

## 13. Qué NO hacer

- ❌ No copiar HTML de los mocks tal cual
- ❌ No usar logo oficial de FIFA / Copa Mundial 26
- ❌ No agregar emoji decorativos (banderas sí, vienen del equipo en DB)
- ❌ No usar naranja para badges de status — naranja es solo para CTAs y urgencia
- ❌ No mostrar el `<SpecialsBanner />` si el usuario ya cargó las 3 apuestas especiales
- ❌ No mostrar `<Tiebreaks />` si no hay equipos empatados en el grupo

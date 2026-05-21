# Handoff — Prode 26 · v7

Pack de diseño para implementar el sitio completo del Prode Mundial 2026.

**Cambios v7** (sobre v6):
- **Nueva página Ranking** (`/ranking`) alineada al patrón de Premios/Reglas. Search bar, top 3 con color (oro/plata/bronce), fila del usuario destacada en su posición + sticky bottom cuando se scrollea fuera del viewport
- **Mi Prode autenticado**: 3 tabs (Grupos / Eliminatorias / **Apuestas especiales** nueva)
- **MatchCards compactas**: padding/banderas/inputs reducidos ~40% → entran 4 cards en desktop (antes 3), mejor uso de espacio en mobile
- **Estados simplificados**: solo `open` y `finished` (eliminados live + closed)
- **Copy limpio**: removidos hints "Aún sin guardar", "Cierra HH:MM", "Marcador exacto. La rompiste.", countdown. "0 falló" → "0 incorrecto"
- **Header de Mi Prode** alineado al patrón Premios/Reglas/Ranking (eyebrow + h1 italic + sub mono)
- **Toolbar admin** colapsada en un solo grupo (Aleatorio + delete icon) en lugar de banner gigante
- **Apuestas especiales como tab dedicada** con 3 cards (Balón/Bota/Guante de Oro), inputs para nombres, slim bar de recordatorio en otras tabs

## Contenido

```
handoff/
├── README.md                      ← este documento
├── globals.snippet.css            ← @theme de Tailwind v4 + utilidades
├── MIGRATION-LOGIN.md             ← guía paso a paso del login viejo → nuevo
├── COMPONENT-MATCHCARD.md         ← detalle del componente crítico
└── mocks/
    ├── Home.html                  ← Home + Top 10 ranking
    ├── Login.html                 ← Form nombre + email
    ├── MiProde-Locked.html        ← Sin sesión (gate WhatsApp)
    ├── MiProde-Auth.html          ← Autenticado · 3 tabs + cards compactas
    ├── Premios.html               ← Podio + pozo + referidos
    ├── Reglas.html                ← Puntaje + apuestas especiales
    └── Ranking.html               ← Lista completa + sticky bottom · NUEVO en v7
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
| `/` | `Home.html` | guest + auth | Hero + Stats + Próximos partidos + Top 10 |
| `/login` | `Login.html` | guest only | Form nombre + email contra DB |
| `/mi-prode` (locked) | `MiProde-Locked.html` | sin sesión | Gate con CTA WhatsApp |
| `/mi-prode` (auth) | `MiProde-Auth.html` | con sesión | 3 tabs: Grupos / Eliminatorias / Apuestas especiales |
| `/premios` | `Premios.html` | guest + auth | Podio (Oro/Plata/Bronce) + pozo + referidos |
| `/reglas` | `Reglas.html` | guest + auth | Puntaje por partido + apuestas especiales |
| `/ranking` | `Ranking.html` | guest + auth | Lista completa con search + fila del user destacada |

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
| `--color-orange` | `#FF6B00` | CTAs primarios, strip de MatchCard abierta |
| `--color-purple` | `#5B2D8E` | Secundario, Balón de Oro, slim bar apuestas |
| `--color-yellow` | `#FFE040` | +3 exacto, premio Oro |
| `--color-blue` | `#1565C0` | Guante de Oro |
| `--color-mint` | `#A8F0D8` | Status "Abierto", +1 parcial, premio Plata, WhatsApp CTA, ranking ↑ |
| `--color-bg` | `#0A0A0A` | Fondo base |
| `--color-panel` | `#141414` | Cards |
| `--color-panel-2` | `#1C1C1C` | Cards hover |
| `--color-line` | `rgba(255,255,255,0.08)` | Bordes |
| `--color-text` | `#FFFFFF` | Texto principal |
| `--color-muted` | `#8A8A8A` | Texto secundario |
| `--color-danger` | `#FF5A5A` | Errores |

**Regla del naranja**: exclusivo de CTAs + urgencia. NO usarlo para badges de status.

### Tipografía

- `Archivo Black` → display (h1, h2, números grandes, score inputs)
- `Archivo` 500-900 → UI
- `JetBrains Mono` → códigos, fechas, sub-stats

Cargar con `next/font/google` y exponer como CSS variables.

### Patrón page-head (compartido por Premios/Reglas/Ranking/Mi Prode)

```tsx
<header className="page-head">
  <span className="eyebrow-label">{ETIQUETA_FUNCIONAL}</span>  {/* ej: "QUÉ SE GANA" */}
  <h1 className="page-title">{TÍTULO} <em>{PALABRA_ACENTO}</em></h1>
  <p className="page-sub">Mundial 2026 · USA · Canadá · México</p>
</header>
```

- Eyebrow: 12px uppercase muted, letter-spacing 0.22em
- H1: display, clamp(48px, 9vw, 108px), uppercase, palabra en italic naranja
- Sub: mono 13px, color muted

---

## 5. Componentes a construir

### Comunes
- `<Navbar />` — 2 variants: **guest** (botón "Entrar" naranja) / **auth** (solo avatar con dropdown)
- `<Footer />`
- `<Button />` — variants: primary, ghost, wa
- `<StatusBadge status={'open'|'finished'} />` (eliminados live y closed)
- `<PtsBadge variant={'exact'|'partial'|'miss'} points />`
- **`<MatchCard />`** — ver `COMPONENT-MATCHCARD.md`
- `<PageHead eyebrow title accent sub />` — el patrón compartido

### Home (`src/app/page.tsx`)
- `<Hero />`, `<StatsStrip />`, `<UpcomingMatches />` (hasta 6 cards en grid 3 cols), `<Top10 />`
- **Ya no** incluye podio de premios ni grilla de reglas

### Login (`src/app/login/page.tsx`) — ver `MIGRATION-LOGIN.md`

### Mi Prode (`src/app/mi-prode/page.tsx`) — sección 6
### Premios (`src/app/premios/page.tsx`) — sección 7
### Reglas (`src/app/reglas/page.tsx`) — sección 8
### Ranking (`src/app/ranking/page.tsx`) — sección 9

---

## 6. Mi Prode autenticado · detalle de implementación

> Mock: `mocks/MiProde-Auth.html`

### 6.1 Navbar variant `auth`
- **Solo el avatar** del lado derecho (sin pill de puntos/ranking — toda la info vive en el dropdown del avatar)
- Avatar 36px gradiente purple→blue, clickable → abre `<UserMenu />`

### 6.2 `<UserMenu />` (dropdown del avatar)
Posicionado `absolute` debajo del avatar. Secciones:
1. **Head** — avatar grande + eyebrow "INFORMACIÓN GENERAL" + nombre
2. **Stats** — grid 3 cols: Puntos / Ranking (mint) / Aciertos
3. **Foot** — link "Cerrar sesión" en rojo

Comportamiento: click avatar → toggle, click fuera → cerrar, Escape → cerrar.

### 6.3 Page head
Patrón estándar: eyebrow "TUS PRONÓSTICOS" + h1 "Mi **Prode**" + sub mono.

### 6.4 `<SpecialsBanner />` (slim bar)
Bar delgada (~54px) púrpura sutil. Visible si el usuario NO completó las 3 apuestas. Click "Cargar" → switch automático a tab Apuestas Especiales + scroll top. Botón X dismiss persistente.

### 6.5 Toolbar
Layout `justify-between`:
- **Izquierda**: 3 phase tabs (Grupos / Eliminatorias / Apuestas especiales)
- **Derecha**: acciones admin (botón "Aleatorio" ghost + delete icon-only)

### 6.6 Tab "Grupos"
- Combo dropdown nativo estilizado con 12 opciones (Grupo A → L, solo nombre)
- Leyenda inline al lado: `<b>6</b> partidos · 11–22 junio`
- `<MatchGrid />` con cards compactas (ver COMPONENT-MATCHCARD.md)
- `<StandingsBlock />` debajo: tabla de posiciones del grupo (live)

### 6.7 Tab "Eliminatorias"
- Combo con 5 opciones: Dieciseisavos / Octavos / Cuartos / Semifinal / Final y 3.º/4.º puesto
- Leyenda inline: `<b>16</b> partidos · 28 jun – 02 jul`
- `<MatchGrid />` con cards de eliminación
- **NO se muestra** `<StandingsBlock />` en esta fase

### 6.8 Tab "Apuestas especiales" ⭐ NUEVO
Sección dedicada con 3 cards stacked:
- **Balón de Oro** (+20, edge púrpura) — input "Nombre del jugador"
- **Bota de Oro** (+15, edge naranja) — input "Nombre del jugador"
- **Guante de Oro** (+15, edge azul) — input "Nombre del arquero"

Cada card:
```tsx
<article className="special special-{ball|boot|glove}">
  <header className="special-head">
    <div>
      <h4 className="special-title">{NOMBRE}</h4>
      <p className="special-sub">{SUBTITULO}</p>
    </div>
    <span className="special-pts">+{PUNTOS}</span>
  </header>
  <div className="special-input-wrap">
    <label>Jugador</label>
    <input className="special-input" />
    <span className="special-saved">✓ Guardado</span>
  </div>
</article>
```

Al final: `<div className="specials-save">` con info "Podés editarlas hasta el 11 jun · 15:30" + botón "Guardar cambios" naranja.

Al estar activa esta tab:
- Se ocultan: combo, match-grid, standings
- Se oculta: la slim bar de recordatorio (ya estás acá)

### 6.9 `<StandingsBlock />` (solo en tab Grupos)
- Header: "Tabla del grupo" + status note "Actualizada en vivo" con dot mint
- Tabla: `#` `Equipo` `PJ` `PTS` `GF` `GC` `DG`
- Filas `.adv` (top 2 = clasifican) con franja mint izquierda
- Trend indicator (▲▼=) al lado del nombre
- DG coloreada mint/rojo/gris

---

## 7. Premios · detalle de implementación

> Mock: `mocks/Premios.html` · Ruta: `src/app/premios/page.tsx`

Página pública. Header: eyebrow "QUÉ SE GANA" + h1 "Podio de **premios**" + sub mono.

### 7.1 `<PotBanner />`
Banner amarillo tenue arriba. Copy:
> **"El pozo crece con cada inscripción"** — base garantizada + si superamos 200 inscriptos el pozo aumenta proporcionalmente + comisión por referido.

### 7.2 `<PrizePodium />`
3 cards. Cada una:
- Cinta "CAMPEÓN" solo en 1º
- Pill mono "1º/2º/3º Puesto"
- Rank gigante con ordinal italic chico opacity 55%
- Nombre del premio uppercase
- Monto: $ mono chico + número grande italic + puntos atenuados
- Subtítulo mono con guion

Tamaños: 1º (yellow, 360px h, rank 120px) · 2º (mint, 320px, 84px) · 3º (#E8A87C, 300px, 72px).
Formas decorativas distintas por card.

### 7.3 `<ReferralCard />`
Card panel debajo. h3 "Más amigos, **más premio**" + copy + botón naranja "Compartir invitación" con ícono share. **NO mostrar el link visible** — usar `navigator.share()` o menú nativo.

---

## 8. Reglas · detalle de implementación

> Mock: `mocks/Reglas.html` · Ruta: `src/app/reglas/page.tsx`

Layout idéntico a Premios. Header: eyebrow "CÓMO JUGAR" + h1 "Reglas del **juego**" + sub mono idéntico.

### `<InfoBanner />`
Banner mint tenue:
> **"El que más le pega, gana"** — 80 partidos del Mundial, sumás partido a partido + hasta 50 pts extra con las apuestas especiales.

### Bloque 1: `<ScoringRules />`
3 cards en grid 3 cols. Edge izquierdo 3px del color temático + pill mono + puntos grandes + nombre + descripción:
- **+3 Resultado exacto** (yellow)
- **+1 Ganador o empate** (mint)
- **0 Incorrecto** (gris)

### Bloque 2: `<SpecialBets />`
Mismo patrón:
- **+20 Balón de Oro** (purple) — mejor jugador
- **+15 Bota de Oro** (orange) — máximo goleador
- **+15 Guante de Oro** (blue) — mejor arquero

---

## 9. Ranking · detalle de implementación ⭐ NUEVO

> Mock: `mocks/Ranking.html` · Ruta: `src/app/ranking/page.tsx`

Página pública. Header: eyebrow "TABLA EN VIVO" + h1 "**Ranking**" (todo italic naranja, sin palabra previa) + sub mono.

### 9.1 Banner contextual
- **Pre-mundial**: banner mint con dot pulsante "El ranking arranca con el primer pitazo · 11 jun 16:00"
- **Durante**: banner equivalente con "X participantes · Actualizado en vivo"

### 9.2 Search row
- Input "Buscar participante…" con ícono lupa
- Pill mono al lado: `<b>9</b> PARTICIPANTES` (count que se actualiza con el filtro)

### 9.3 Lista de filas (max-width 880px, no full bleed)
Container panel con filas compactas:
- Grid `54px 1fr auto`
- Posición (display, color por puesto: amarillo/mint/cobre top 3, muted resto)
- Avatar 36px + nombre + sub mono "0 exactas · 0 parciales"
- Puntos display + "pts" mono muted

### 9.4 Fila del usuario destacada (en su posición real)
La fila correspondiente al usuario logueado tiene:
- `bg-orange/10` + `border-orange/28`
- Pill "VOS" mono naranja al lado del nombre
- Posición en color naranja

### 9.5 Sticky bottom (UX importante)
Cuando el usuario hace scroll y la fila real sale del viewport por **arriba**:
- Aparece una `<aside class="you-sticky">` fixed bottom con la misma info
- Fade in/out con IntersectionObserver
- Lógica: mostrar solo si `!isIntersecting && boundingClientRect.top < 0`

Esto evita que el usuario pierda el contexto al scrollear largo.

### 9.6 Trend indicators (FUTURO)
Por ahora NO se muestran. Cuando haya histórico de ranking, agregar al lado del nombre: ▲6 (mint), ▼2 (rojo), = (gris).

---

## 10. Datos Supabase

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
  partial_predictions_count
from user_stats_view
where user_id = auth.uid();

-- Ranking completo
select
  rank() over (order by us.total_points desc) as position,
  u.id, u.name,
  us.total_points,
  us.exact_predictions_count, us.partial_predictions_count
from profiles u
join user_stats_view us on us.user_id = u.id
order by us.total_points desc;

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

-- Apuestas especiales del usuario
select bet_type, player_name
from special_bets
where user_id = auth.uid();
-- bet_type: 'ball' | 'boot' | 'glove'
```

---

## 11. Accesibilidad (ya implementado en mocks)
- `:focus-visible` global con outline naranja 2px offset 3px
- `@media (prefers-reduced-motion: reduce)` cancela animaciones
- Inputs con `aria-label`
- Dropdowns con `aria-haspopup`, `aria-expanded`, manejan `Escape`
- Contraste 4.5:1 mínimo
- Sin scroll horizontal (probado a 390px)

---

## 12. Schema necesario

```sql
-- Standings materializadas (recalcular al terminar cada partido)
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

-- Apuestas especiales del usuario
create table special_bets (
  user_id uuid references profiles(id),
  bet_type text check (bet_type in ('ball', 'boot', 'glove')),
  player_name text,
  updated_at timestamptz default now(),
  primary key (user_id, bet_type)
);
```

---

## 13. Cómo arrancar en Claude Code

1. Descomprimí este folder en `docs/design/handoff/` de tu repo
2. Para cada página, prompt sugerido:

> *Leí `docs/design/handoff/README.md` y el mock correspondiente en `mocks/`. Implementá `src/app/<ruta>/page.tsx` siguiendo el patrón page-head compartido (eyebrow + h1 italic + sub mono) y los componentes descritos. Hacé los queries de Supabase de la sección 10.*

Orden sugerido:
1. **Login** (`MIGRATION-LOGIN.md` ya hecho)
2. **Home** (sin secciones de premios/reglas, agregar Top10)
3. **Premios** + **Reglas** (páginas hermanas, mismo layout)
4. **Ranking**
5. **Mi Prode auth** (más complejo: 3 tabs + apuestas especiales)

---

## 14. Qué NO hacer

- ❌ No copiar HTML de los mocks tal cual
- ❌ No usar logo oficial de FIFA / Copa Mundial 26
- ❌ No agregar emoji decorativos. Banderas sí (vienen como string del equipo)
- ❌ No usar naranja para badges de status — naranja es solo para CTAs y urgencia
- ❌ NO incluir estados `live` o `closed` en MatchCard — solo `open` y `finished`
- ❌ NO mostrar hints "Aún sin guardar" / "Cierra HH:MM" / "Marcador exacto" — el diseño ahora es más limpio
- ❌ "0 incorrecto", NO "0 falló"

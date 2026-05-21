# Componente · MatchCard (v7)

Componente crítico del Prode 26. Aparece en Home (`<UpcomingMatches />`), Mi Prode autenticado (`<MatchGrid />`).

> Mock: ver `mocks/MiProde-Auth.html` → sección Grupos. 4 cards en desktop.

---

## Props

```ts
interface MatchCardProps {
  match: Match;
  prediction?: { home_score: number; away_score: number } | null;
  noAutosave?: boolean;                     // si true, no hace upsert automático (batch save externo)
  initialHome?: string;                     // valor inicial del input local
  initialAway?: string;
  onValuesChange?: (home: string, away: string) => void;
  onSaveStateChange?: (state: 'idle' | 'dirty' | 'saving' | 'saved' | 'error') => void;
  readOnly?: boolean;                       // oculta inputs, muestra pronóstico como texto
}
```

> ⚠️ v7: eliminados `liveMinute`, `realScore`, `pointsEarned`, `predictionSavedAt`, `kickoff` como prop aparte — se leen del objeto `match`.

---

## Anatomía

```
┌─────────────────────────────────────────┐  ← Card (bg-panel, border-line, rounded-[18px], p-[14px_14px_12px])
│ │ [GRUPO A]  Jue 11 Jun · 16:00  [STATUS]│  ← match-top
│ │                                         │
│ │   🇲🇽  38px       VS 11px       🇨🇦  38px│  ← teams (flag 38px, no code)
│ │  México 12px                  Canadá    │
│ │                                         │
│ │  [Resultado final        1 — 2]         │  ← score-context (solo finished)
│ │                                         │
│ │ ┌─────┬───┬─────┐                      │
│ │ │  2  │ — │  1  │ h-[42px] text-[26px] │  ← score-row (p-1.5, rounded-xl)
│ │ └─────┴───┴─────┘                      │
│ │                              [+3 exacto]│  ← match-bottom (solo si hay pts badge)
└─────────────────────────────────────────┘
 ↑ strip izquierdo 4px
```

---

## Strip izquierdo

`position: absolute; left: 0; top: 0; bottom: 0; width: 4px;`

| Estado | Color |
|---|---|
| open | naranja `#FF6B00` |
| todo lo demás | gris `#3A3A3A` |

> v7: eliminados strips púrpura (closed) y rojo (live).

---

## Status badge (`<StatusBadge />`)

Pill `padding 5px 10px`, uppercase 10px, letra-spacing 0.18em, con dot 6px:

| Estado | Bg | Text | Dot |
|---|---|---|---|
| `open` (upcoming + now < lockedAt) | `rgba(168,240,216,.14)` | `#A8F0D8` | mint |
| `finished` (o live tratado igual) | `rgba(255,255,255,.06)` | `#9a9a9a` | gris |

> v7: eliminados `closed` (púrpura) y `live` (rojo pulsante).

---

## Header (match-top)

- Grupo chip `9px uppercase` + fecha `10px mono uppercase muted`
- Status badge a la derecha

---

## Teams row

Grid `1fr auto 1fr`. Cada team:
- Flag `38×38px` round (`bg #0A0A0A`, border line)
- Nombre `12px extrabold`
- **Sin code** (oculto en v7)

Centro: `VS` display 11px muted. Siempre VS — nunca marcador en este slot.

---

## Score context banner (solo `finished` / `live`)

```tsx
{hasRealScore && (
  <div className="flex items-center justify-between mb-2 rounded-[10px] font-extrabold gap-3"
    style={{ padding: '9px 12px', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#9a9a9a' }}
  >
    <span className="text-[9px] font-extrabold uppercase tracking-[.18em]">Resultado final</span>
    <span className="font-display text-[18px] text-white tabular-nums">{match.home_score} — {match.away_score}</span>
  </div>
)}
```

> v7: un solo banner gris "Resultado final" para `finished` y `live`. Eliminado el banner rojo pulsante de live.

---

## Score row

Grid `1fr auto 1fr`. `bg-[#0A0A0A]` (locked: `#0d0d0d`), border line, `rounded-[12px]`, `p-[6px]`.

### Inputs
- `height: 42px`, sin border, font-display, `text-[26px]`, tabular-nums
- Focus: `bg-orange/12` + `inset 0 0 0 2px orange`, 150ms
- Locked: `disabled`, `cursor-not-allowed`

### Separador
`—` display 18px gris `#3a3a3a`

---

## Bottom row

Solo visible cuando hay algo concreto que mostrar. Flex `justify-between`.

- **Pts badge** (derecha): cuando hay resultado y pronóstico
- **Error save** (izquierda, `#FF6B6B`): solo cuando el autosave falla

> v7: eliminados "Aún sin guardar", "Guardado hace X min", "Empieza en HH:MM:SS", "Marcador exacto. La rompiste.", "Acertaste el ganador.", "No le pegaste — mañana hay revancha.", countdown.

### PtsBadge

| Tipo | Bg | Color | Label |
|---|---|---|---|
| `exact` (+3) | `#FFE040` | `#0A0A0A` | exacto |
| `partial` (+1) | `#A8F0D8` | `#0A0A0A` | parcial |
| `miss` (0) | `#2a2a2a` | `#9a9a9a` | **incorrecto** |

> v7: "0 falló" → "**0 incorrecto**"

---

## Estados — ejemplos

### 1. Abierto sin cargar
```ts
{ status: 'upcoming', lockedAt: future, prediction: undefined }
```
Strip naranja, badge "Abierto", inputs vacíos con placeholder `–`, sin bottom row.

### 2. Abierto con pronóstico
```ts
{ status: 'upcoming', lockedAt: future, prediction: { home: 2, away: 1 } }
```
Strip naranja, badge "Abierto", inputs con valores, sin bottom row.

### 3. Finalizado exacto
```ts
{ status: 'finished', home_score: 3, away_score: 1, prediction: { home: 3, away: 1 } }
```
Strip gris, badge "Finalizado", banner "Resultado final · 3 — 1", inputs locked, badge `+3 exacto`.

### 4. Finalizado parcial
```ts
{ status: 'finished', home_score: 2, away_score: 1, prediction: { home: 3, away: 2 } }
```
Strip gris, badge "Finalizado", banner "Resultado final · 2 — 1", badge `+1 parcial`.

### 5. Finalizado incorrecto
```ts
{ status: 'finished', home_score: 0, away_score: 3, prediction: { home: 1, away: 1 } }
```
Strip gris, badge "Finalizado", banner "Resultado final · 0 — 3", badge `0 incorrecto`.

---

## Interactividad

- `onValuesChange` se dispara en cada keystroke → el padre puede hacer batch save
- Autosave (cuando `!noAutosave`): debounce 500ms → `upsertPrediction`
- Si el match pasa de `upcoming` a `finished` → re-render desde el servidor (polling o Supabase Realtime cada 30s)

---

## Grid de cards

```css
/* match-grid */
display: grid;
gap: 12px;
grid-template-columns: 1fr;          /* mobile */

@media (min-width: 640px)  { grid-template-columns: repeat(2, 1fr); }
@media (min-width: 1024px) { grid-template-columns: repeat(3, 1fr); }
@media (min-width: 1280px) { grid-template-columns: repeat(4, 1fr); }  /* ← v7: 4 cols */
```

---

## Hover

```css
transition: transform 0.2s, border-color 0.2s;
&:hover { transform: translateY(-3px); border-color: rgba(255,255,255,0.18); }
```

---

## Accesibilidad

- Cada input con `aria-label="Goles {team.name}"`
- Inputs `disabled` (no `readonly`) cuando locked
- Status badge incluye texto además del color
- Focus visible: outline naranja 2px (heredado del global)

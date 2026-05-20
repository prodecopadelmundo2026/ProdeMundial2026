# Componente · MatchCard

Componente crítico del Prode 26. Aparece en Home (`<UpcomingMatches />`), Mi Prode autenticado (`<MatchGrid />`), y eventualmente en Ranking.

> Mock: ver cualquier `.html` en `mocks/`. La grid de "Próximos partidos" en `Home.html` muestra los 6 estados principales lado a lado.

---

## Props

```ts
interface MatchCardProps {
  id: string;
  group: 'A' | 'B' | 'C' | ... | 'L';
  matchday?: 1 | 2 | 3;                    // J1, J2, J3 — opcional, se muestra como "A · J2" si está
  home: { name: string; code: string; flag: string };  // flag = emoji o URL
  away: { name: string; code: string; flag: string };
  kickoff: Date;                            // En zona ART (GMT-3)
  status: 'open' | 'closed' | 'live' | 'finished';
  liveMinute?: number;                      // solo si status='live'
  realScore?: { home: number; away: number }; // si status='live' o 'finished'
  prediction?: { home: number; away: number };
  pointsEarned?: 0 | 1 | 3;                 // solo si status='finished'
  predictionSavedAt?: Date;                 // para "Guardado hace 4 min"
  onPredictionChange?: (home: number, away: number) => void;
}
```

---

## Anatomía

```
┌─────────────────────────────────────────┐  ← Card (bg-panel, border-line, rounded-card, p-[22px])
│ │ [A · J2]  Jue 11 Jun · 17:00    [STATUS]│  ← match-top
│ │                                          │
│ │     🇲🇽           VS           🇨🇦       │  ← teams
│ │   México                     Canadá      │
│ │     MEX                        CAN       │
│ │                                          │
│ │ [Banner marcador en vivo / final]        │  ← score-context (solo live/finished)
│ │                                          │
│ │ TU PRONÓSTICO     [FALTA CARGAR]         │  ← pred-label
│ │ ┌─────┬───┬─────┐                       │
│ │ │  2  │ — │  1  │                       │  ← score-row
│ │ └─────┴───┴─────┘                       │
│ │                                          │
│ │ Guardado hace 4 min      [+3 exacto]    │  ← match-bottom
└─────────────────────────────────────────┘
 ↑ strip izquierdo 4px (color según status)
```

---

## Strip izquierdo (`::before`)

`position: absolute; left: 0; top: 0; bottom: 0; width: 4px;`

| Status | Color | Token |
|---|---|---|
| open | naranja | `var(--color-orange)` `#FF6B00` |
| closed | púrpura claro | `#7A5BC9` |
| live | rojo | `#FF3B3B` |
| finished | gris | `#3A3A3A` |

---

## Header (match-top)

- Grupo chip + fecha mono uppercase 11px muted (con jornada si está disponible)
- Status badge a la derecha

### StatusBadge

Pill `padding 5px 10px`, uppercase 10px `letter-spacing: .18em`, con dot 6px:

| Status | Bg | Text | Dot |
|---|---|---|---|
| open | `rgba(168,240,216,.14)` | `var(--color-mint)` | mint |
| closed | `rgba(123,92,210,.18)` | `#A892E8` | `#A892E8` |
| live | `rgba(255,59,59,.18)` | `#FF6B6B` | `#FF6B6B` (animación `blink 1s infinite`) |
| finished | `rgba(255,255,255,.06)` | `#9a9a9a` | `#9a9a9a` |

---

## Teams row

Grid `1fr auto 1fr`. Cada team es columna vertical:
- Flag 56×56 round (bg `#0A0A0A`, border line)
- Nombre 15px bold tracking-tight
- Code mono 10px muted `letter-spacing: .2em`

Centro: **siempre** `VS` (display 14px muted). NUNCA usar este slot para mostrar el marcador real — eso va al banner separado.

---

## Score context banner (live/finished)

Solo si `status === 'live' || status === 'finished'`.

Pill horizontal arriba del pronóstico. Marcador real claramente separado del pronóstico del usuario:

```tsx
{status === 'live' && (
  <div className="bg-gradient-to-r from-red-500/22 to-red-500/6 border border-red-500/30 text-[#FF8585] flex items-center justify-between p-3 rounded-xl mb-2.5">
    <span className="text-[10px] font-extrabold uppercase tracking-[.18em] inline-flex items-center gap-2">
      <span className="w-1.5 h-1.5 rounded-full bg-current animate-blink"/>
      Marcador en vivo
    </span>
    <span className="font-display text-xl text-white tabular-nums">{realScore.home} — {realScore.away}</span>
  </div>
)}

{status === 'finished' && (
  <div className="bg-white/[.04] border border-line text-[#9a9a9a] flex items-center justify-between p-3 rounded-xl mb-2.5">
    <span className="text-[10px] font-extrabold uppercase tracking-[.18em]">Resultado final</span>
    <span className="font-display text-xl text-white tabular-nums">{realScore.home} — {realScore.away}</span>
  </div>
)}
```

---

## Pred label

Eyebrow encima del score-row. Texto izq fijo "Tu pronóstico". Eyebrow derecho varía:

- `open` sin guardar: `<span className="text-orange">Falta cargar</span>`
- `open` guardado: `+3 si exacto`
- `closed`: `Bloqueado`
- `live` / `finished`: vacío

---

## Score row

Grid `1fr auto 1fr` con `bg-[#0A0A0A]`, border line, `rounded-xl`, `p-2.5`.

### Inputs
- `height: 54px`, sin border, `font-display`, `text-[34px]`, `tabular-nums`
- Focus: `bg-orange/12` + `inset 0 0 0 2px orange`, transition 150ms
- Locked (status closed/live/finished): `disabled`, `cursor-not-allowed`, opacity 1 (mostrar el valor en blanco). Card padre con clase `locked` que cambia bg a `#0d0d0d`

### Separador
Caracter `—` en display 24px gris `#3a3a3a`

### Validación
- Min 0, max 20
- Auto-clamp en `onInput`

---

## Bottom

Flex `justify-between`. Izquierda: hint editorial. Derecha: PtsBadge si hay puntos, o info extra.

### Hint editorial (izq)
Copy varía según estado:
- Abierto sin guardar: `Aún sin guardar` (muted)
- Abierto guardado: `Guardado hace 4 min` (con `<b className="text-mint">`)
- Cerrado: `Empieza en HH:MM:SS` (con countdown)
- Live: `Si termina así, ganás +3` o `Podés sumar hasta +3 según cómo termine`
- Finished exacto: `Marcador exacto. La rompiste.`
- Finished parcial: `Acertaste el ganador.`
- Finished miss: `No le pegaste — mañana hay revancha.`

### PtsBadge (der, solo finished/live)
Pill con número en display 14px + label small:
- `exact` (+3): `bg-yellow text-black`
- `partial` (+1): `bg-mint text-black`
- `miss` (0): `bg-[#2a2a2a] text-[#9a9a9a]`

---

## Estados — ejemplos reales

### 1. Abierto sin cargar
```ts
{ status: 'open', prediction: undefined }
```
Inputs vacíos con placeholder `–`, hint izq "Aún sin guardar", eyebrow derecho "Falta cargar" naranja.

### 2. Abierto cargado
```ts
{ status: 'open', prediction: {home: 2, away: 1}, predictionSavedAt: <recent> }
```
Inputs con valores, hint izq "Guardado hace 4 min" (con b mint), eyebrow "+3 si exacto".

### 3. Cerrado
```ts
{ status: 'closed', prediction: {home: 1, away: 2}, kickoff: <near future> }
```
Inputs locked, hint izq "Empieza en 02:14:32", eyebrow "Bloqueado".

### 4. En vivo
```ts
{ status: 'live', liveMinute: 67, realScore: {home: 2, away: 0}, prediction: {home: 2, away: 1} }
```
Status pulsando rojo con minuto, banner rojo "Marcador en vivo · 2 — 0", inputs locked, hint "Si termina así, ganás +1", badge mint "+1 parcial" (predictivo).

### 5. Finalizado exacto
```ts
{ status: 'finished', realScore: {home: 3, away: 1}, prediction: {home: 3, away: 1}, pointsEarned: 3 }
```
Banner gris "Resultado final · 3 — 1", inputs locked, hint "Marcador exacto. La rompiste.", badge amarillo "+3 exacto".

### 6. Finalizado parcial
```ts
{ status: 'finished', realScore: {home: 2, away: 1}, prediction: {home: 3, away: 2}, pointsEarned: 1 }
```
Banner gris "Resultado final · 2 — 1", inputs locked, hint "Acertaste el ganador.", badge mint "+1 parcial".

### 7. Finalizado miss
```ts
{ status: 'finished', realScore: {home: 0, away: 3}, prediction: {home: 1, away: 1}, pointsEarned: 0 }
```
Banner gris "Resultado final · 0 — 3", inputs locked, hint "No le pegaste — mañana hay revancha.", badge gris "0 falló".

---

## Interactividad (cliente)

- `onPredictionChange` se dispara con debounce de 500ms → autosave a Supabase
- Optimistic UI: actualizar `predictionSavedAt` inmediatamente, revertir si Supabase falla
- Si el usuario edita cualquier input → opcionalmente mostrar una sticky bar abajo del viewport "N cambios sin guardar · [Guardar]"
- Si `status` cambia (ej. partido pasa a live), re-render con polling cada 30s o subscribe a Supabase Realtime

---

## Hover

```css
.match {
  transition: transform 0.2s, border-color 0.2s;
}
.match:hover {
  transform: translateY(-3px);
  border-color: rgba(255,255,255,0.18);
}
```

---

## Accesibilidad

- Cada input con `aria-label="Goles {team.name}"`
- Si el card es una fecha pasada (closed/live/finished), los inputs son `disabled` (no `readonly`)
- Status badge incluye **texto** además del color (no depende solo del color)
- Focus visible naranja outline 2px (heredado del `:focus-visible` global)

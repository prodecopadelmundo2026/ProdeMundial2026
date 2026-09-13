# P014 - Home, calendario y móvil

- `/` es la única agenda pública; `/diario` redirige permanentemente a `/`.
- La fecha de jornada usa `America/Argentina/Buenos_Aires` desde `journey.ts`; instantes y `lockAt` permanecen en UTC.
- El calendario nativo permite elegir día, mes y año y las flechas navegan fechas sin límite artificial. Mientras la fuente pública esté vacía, los días muestran el estado honesto sin eventos.
- Los filtros rápidos se ubican junto a Jornada y Salas, en el tercer módulo de escritorio; en móvil permanecen en un carril propio, sin desbordar la página.
- Regla MVP: `lockAt` es cinco minutos antes del primer evento elegible. Reprogramaciones futuras recalculan antes del cierre; nunca reabren automáticamente una jornada cerrada.
- No se integró proveedor ni se habilitó dinero, cuotas, notificaciones, Supabase o cambios al Mundial.

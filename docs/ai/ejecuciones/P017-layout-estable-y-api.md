# P017 - Ejecución

- Inicio: `main`, `dev`, `origin/main` y `origin/dev` estaban en `6acb76f`; `supabase/.temp/` permanecía sin seguimiento.
- Se reestructura `DailyProdePreview`: hero de dos columnas desde escritorio, título reservado, estado/next event estable y controles en una caja propia. En mobile se conserva un flujo vertical sin recortes de texto.
- Las tarjetas principales reservan altura mínima, y el resumen mantiene su posición al alternar hoy, mañana, fecha larga, jornada cerrada, filtros o ausencia de eventos.
- `DailyJourneySelector` muestra una fecha breve completa y mantiene la fecha larga en `aria-label`. `DailyCountdown` no se muestra sin evento u horario ISO válido.
- Credenciales P017: no hay variable deportiva local; Vercel CLI está en una cuenta/equipo sin scope productivo. No se hicieron requests, scraping, adaptadores, persistencia, migraciones, SQL ni cambios de Supabase.
- Validación: contrato diario `122/122` en modo legible y JSON, jornada/contador `10/10`, ESLint dirigido, TypeScript, build y `git diff --check` aprobados. Las rutas `/`, `/mi-prode`, `/ranking`, `/reglas`, `/historial` y `/historial/mundial` respondieron 200 localmente; `/diario` emitió `NEXT_REDIRECT;replace;/;308`.
- Administración: `/admin/diario` conserva comprobación de usuario y perfil admin tanto en middleware como en su página de servidor. El HTTP 200 sin sesión corresponde al documento de transición de Next; no se expone la consola administrativa.
- Responsive: capturas revisadas en 768, 1024, 1280 y 1440 px confirman el hero apilado antes de escritorio y dos columnas desde 1024 px, sin superposiciones. Se generaron capturas de 320, 360 y 390 px con escala móvil y se reforzaron `min-w-0`, ancho máximo y quiebre de textos; Chrome headless mantiene un viewport interno mínimo, por lo que la comprobación de píxeles exacta en esos tres anchos queda limitada por la herramienta local.
- Publicación funcional: `22437bdb9bea403fd32def3ebbb14467333312d6` llegó a `main`. Vercel completó el deployment `2127zb4T4dRYQ8fNX36tN84RaFB2` en `https://prode-mundial2026-728rbfmjc-prodecopadelmundo2026s-projects.vercel.app`.
- Smoke de producción: `/`, `/mi-prode`, `/ranking`, `/reglas`, `/historial` y `/historial/mundial` respondieron 200; `/diario` emitió `NEXT_REDIRECT;replace;/;308` hacia `/`.
- Cierre: el registro documental se integra en `main` y `dev` se alinea por avance rápido con el SHA final; se preserva `backup/dev-before-p014-20260913`.

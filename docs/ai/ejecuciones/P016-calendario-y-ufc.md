# P016 - Ejecución

- Inicio en `main` `49f46ae`; las cuatro referencias estaban alineadas y `supabase/.temp/` sin seguimiento.
- Credenciales: se revisaron los nombres de variables locales sin leer valores. No existe una credencial deportiva; Vercel solo expone el equipo `juan-ascenzi-dev` a esta sesión y el scope productivo no está disponible para enumerar variables.
- Implementación: `DailyJourneySelector` deja de usar `input type="date"` y ofrece popover propio con navegación de día y mes, selector de mes, Hoy, marcadores, cierre exterior/Escape, navegación por teclado y labels accesibles. Se usa en las tres vistas diarias.
- Datos: no se creó adaptador, request, polling, tabla, migración, payload ni evento público. La fuente pública permanece vacía y el catálogo visible excluye Boxeo/MMA/UFC hasta contar con datos suficientes.
- Contador: detiene el intervalo al superar el inicio. El arnés cubre evento futuro, inminente, iniciado, en vivo, sin horario, reprogramado, `lockAt`, jornada cerrada y fecha argentina.
- Validación: contrato diario `122/122` en modo legible y JSON, jornada/contador `10/10`, ESLint dirigido, `npx tsc --noEmit --pretty false`, `npm run build` y `git diff --check` aprobados. `/diario` conserva la señal `NEXT_REDIRECT;replace;/;308` hacia `/`.
- Responsive: se revisaron capturas en 768, 1024 y 1440 px para la agenda, y en 768 px para `/mi-prode` y `/ranking`, sin recorte visible. Se solicitaron capturas en 320 y 390 px, pero Chrome headless aplica un viewport interno mínimo y recorta la imagen resultante; el selector quedó con `min-w-0` y truncado para esos anchos, pero esa certificación visual queda limitada por la herramienta local.
- Publicación funcional: commit `b597f2804a5d5e8076c08b8f4d1b94a00359cab2` enviado a `main`. Vercel completó `8VA6PRFc9ZrhmXgU4yxPpbStKCpv` con estado `success` en `https://prode-mundial2026-2hpulqd3g-prodecopadelmundo2026s-projects.vercel.app`.
- Smoke de producción: `/`, `/mi-prode`, `/ranking`, `/reglas`, `/historial` y `/historial/mundial` respondieron 200. `/diario` conserva su redirección técnica con `NEXT_REDIRECT;replace;/;308`.
- Sincronización: `main`, `dev`, `origin/main` y `origin/dev` quedaron en el SHA funcional publicado. Se preservó `backup/dev-before-p014-20260913` en `df8fd826714db8182bd1adcb0e898c0f6422f7d2`.

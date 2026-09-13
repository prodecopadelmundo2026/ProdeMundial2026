# P016 - Ejecución

- Inicio en `main` `49f46ae`; las cuatro referencias estaban alineadas y `supabase/.temp/` sin seguimiento.
- Credenciales: se revisaron los nombres de variables locales sin leer valores. No existe una credencial deportiva; Vercel solo expone el equipo `juan-ascenzi-dev` a esta sesión y el scope productivo no está disponible para enumerar variables.
- Implementación: `DailyJourneySelector` deja de usar `input type="date"` y ofrece popover propio con navegación de día y mes, selector de mes, Hoy, marcadores, cierre exterior/Escape, navegación por teclado y labels accesibles. Se usa en las tres vistas diarias.
- Datos: no se creó adaptador, request, polling, tabla, migración, payload ni evento público. La fuente pública permanece vacía y el catálogo visible excluye Boxeo/MMA/UFC hasta contar con datos suficientes.
- Contador: detiene el intervalo al superar el inicio. El arnés cubre evento futuro, inminente, iniciado, en vivo, sin horario, reprogramado, `lockAt`, jornada cerrada y fecha argentina.
- Validación: contrato diario `122/122` en modo legible y JSON, jornada/contador `10/10`, ESLint dirigido, `npx tsc --noEmit --pretty false`, `npm run build` y `git diff --check` aprobados. `/diario` conserva la señal `NEXT_REDIRECT;replace;/;308` hacia `/`.
- Responsive: se revisaron capturas en 768, 1024 y 1440 px para la agenda, y en 768 px para `/mi-prode` y `/ranking`, sin recorte visible. Se solicitaron capturas en 320 y 390 px, pero Chrome headless aplica un viewport interno mínimo y recorta la imagen resultante; el selector quedó con `min-w-0` y truncado para esos anchos, pero esa certificación visual queda limitada por la herramienta local.
- Pendiente de cierre: commit, publicación de `main`, despliegue Vercel y sincronización final de `dev`.

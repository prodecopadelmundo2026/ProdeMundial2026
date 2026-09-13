# P014 - Ejecución

- Inicio: P013 `1700e08`; rama `codex/p014-home-calendario-mobile`.
- Prompt SHA-256: `9545AABBF7DE01ECBA5879B192FADF21C6952EF74B2E85D17B6790A109148094`.
- `/` unifica calendario, navegación, filtros, agenda, contador y resumen; `/diario` redirige permanentemente.
- Se creó respaldo local `backup/dev-before-p014-20260913` en `df8fd82`; `dev` y `origin/dev` avanzaron por fast-forward a `bea8ca2`, igual que `main` y `origin/main`.
- Sin proveedor autorizado, agenda, salas, ranking y contador muestran estados vacíos, sin fixtures.
- Validación local: contrato `122/122`, JSON correcto, regresiones de jornada/contador `8/8`, TypeScript, ESLint dirigido, build y `git diff --check` correctos.
- Smoke local: `/`, `/mi-prode`, `/ranking`, `/reglas`, `/historial` y `/historial/mundial` responden; las rutas diarias no incluyen Mundial ni fixtures, y `/admin/diario` conserva el redirect de acceso sin sesión.
- Limitación: no hay navegador automatizado instalado para certificar visualmente 320, 375, 390, 768, 1024, 1280 y 1440 px. Los grids, controles y carriles de filtros se definieron responsive sin scroll horizontal de página.
- SHA de implementación: `bd19901 feat: unify daily home with calendar and journey lock`.
- Pendiente: push y Preview.

# P015 — Publicar P014 en main, sincronizar dev e iniciar API deportiva

Trabajá sobre:

`C:\Users\juana\Desktop\Proyectos\prode-mundial-2026`

## Regla operativa definitiva

El proyecto está en etapa de desarrollo y testeo.

Por lo tanto:

* `main` es la rama principal de trabajo;
* los cambios validados deben llegar a `main`;
* Vercel debe desplegar `main`;
* `dev` debe quedar exactamente igual que `main`;
* no dejar una funcionalidad terminada únicamente en una rama auxiliar;
* una rama auxiliar puede utilizarse durante el desarrollo, pero debe integrarse a `main` al finalizar;
* no asumir que `main` debe permanecer sin cambios;
* el usuario quiere probar los cambios directamente en producción durante esta etapa.

## 1. Revisar estado

Antes de modificar:

1. Leer `AGENTS.md`.
2. Leer `docs/ai/README.md`.
3. Leer documentación P001–P014.
4. Revisar `git status`.
5. Revisar ramas y remotos.
6. Confirmar el estado de:

   * `main`;
   * `origin/main`;
   * `dev`;
   * `origin/dev`;
   * `codex/p014-home-calendario-mobile`.
7. Preservar `supabase/.temp/`.
8. No pisar cambios locales ajenos.

## 2. Publicar P014 en main

P014 quedó implementado en:

`codex/p014-home-calendario-mobile`

Commit final:

`e367252`

Verificar primero:

* TypeScript;
* ESLint dirigido;
* build;
* contrato `122/122`;
* pruebas de calendario, contador y cierre;
* `git diff --check`;
* rutas públicas;
* redirección `/diario` hacia `/`;
* protección de `/admin/diario`.

Si las validaciones pasan:

1. Integrar los cambios de P014 en `main`.
2. Crear un commit descriptivo si hace falta.
3. Hacer push a `origin/main`.
4. Esperar el deployment de Vercel.
5. Confirmar que el deployment quede listo.
6. Informar la URL productiva.
7. Verificar en producción:

   * `/`;
   * `/diario`;
   * `/mi-prode`;
   * `/ranking`;
   * `/reglas`;
   * `/historial`;
   * `/historial/mundial`.

La producción debe mostrar:

* `/` como única agenda diaria;
* `/diario` redirigiendo;
* calendario;
* navegación entre fechas;
* contador;
* filtros;
* estados vacíos honestos;
* ningún evento ficticio público;
* ningún dato del Mundial en las vistas diarias.

## 3. Sincronizar dev con main

Una vez actualizado `main`, `dev` debe quedar exactamente igual.

Antes de modificar `dev`:

1. Verificar que no tenga cambios sin guardar.
2. Preservar la rama de respaldo existente:
   `backup/dev-before-p014-20260913`
3. Actualizar referencias remotas.
4. Alinear `dev` con `main`.
5. Alinear `origin/dev` con `origin/main`.
6. Utilizar `--force-with-lease` solo si es necesario.
7. No borrar la rama de respaldo.
8. No utilizar `git push --force`.

Al final, estos cuatro comandos deben devolver el mismo SHA:

```bash
git rev-parse main
git rev-parse dev
git rev-parse origin/main
git rev-parse origin/dev
```

## 4. Investigar y conectar una API real

La investigación de APIs debe avanzar ahora.

Revisar proveedores para:

* fútbol argentino;
* Primera Nacional;
* Copa Argentina;
* Supercopa Argentina;
* Libertadores;
* Sudamericana;
* ATP 250;
* ATP 500;
* ATP Masters 1000;
* Roland Garros;
* Wimbledon;
* Australian Open;
* US Open;
* boxeo;
* MMA/UFC.

Evaluar:

* próximos eventos;
* eventos en vivo;
* resultados;
* estados;
* horarios;
* reprogramaciones;
* cancelaciones;
* correcciones;
* IDs estables;
* sets y tiebreaks;
* KO/TKO;
* método;
* round;
* empate;
* no contest;
* límites;
* precio;
* trial;
* licencia;
* redistribución pública.

## 5. Si existe una credencial configurada

Revisar variables locales y de Vercel sin mostrar secretos.

Si existe una API key autorizada:

1. Identificar a qué proveedor corresponde.
2. Confirmar su documentación y cobertura.
3. Implementar el adaptador read-only.
4. Mantener la clave exclusivamente en servidor.
5. No exponerla al navegador.
6. Obtener eventos próximos.
7. Normalizarlos al contrato neutral existente.
8. Aplicar el catálogo de competencias permitido.
9. Excluir amistosos, exhibiciones y competencias desconocidas.
10. Guardar fuente, fecha de consulta, external ID, hash y timestamps.
11. Mostrar `Actualizado hace...`.
12. Preparar actualización de eventos en vivo.
13. Mantener las correcciones manuales protegidas.
14. No asignar puntos sobre resultados ambiguos.

## 6. Si no existe credencial

No detener la publicación de P014.

En ese caso:

* publicar igualmente P014 en `main`;
* dejar la agenda vacía;
* terminar la matriz comparativa;
* indicar qué proveedor conviene probar primero;
* indicar exactamente qué credencial, trial o autorización falta;
* no inventar eventos;
* no simular una API conectada.

No crear cuentas pagas ni contratar planes sin autorización.

## 7. Cierre de pronósticos

Mantener la regla MVP:

```text
lockAt = inicio del primer evento elegible de la jornada - 5 minutos
```

Antes del cierre:

* permitir participación;
* permitir cargar pronósticos;
* permitir editarlos;
* permitir planificar fechas futuras.

Después del cierre:

* bloquear nuevas participaciones;
* bloquear cambios;
* conservar auditoría;
* actualizar únicamente resultados y estados deportivos.

## 8. Documentación

Actualizar:

* `docs/ai/prompts/P015-publicar-main-y-api.md`
* `docs/ai/decisiones/P015-publicacion-main-y-api.md`
* `docs/ai/ejecuciones/P015-publicacion-main-y-api.md`
* `docs/ai/provider-evaluations/api-provider-matrix.md`

Documentar también en `AGENTS.md` esta regla:

> Durante la etapa de desarrollo y testeo, `main` es la rama principal de integración y publicación. Todo cambio validado debe llegar a `main`. La rama `dev` debe permanecer sincronizada exactamente con `main`. Las ramas auxiliares son temporales y no reemplazan a `main`.

Copiar este prompt íntegramente y calcular SHA-256.

## 9. Validación final

Ejecutar:

* `npm run daily-prode:verify-contract`;
* modo JSON;
* TypeScript;
* ESLint dirigido;
* build;
* `git diff --check`.

Informar:

* SHA final de `main`;
* SHA final de `dev`;
* SHA de `origin/main`;
* SHA de `origin/dev`;
* URL productiva;
* deployment Vercel;
* proveedor conectado o motivo del bloqueo;
* competencias habilitadas;
* validaciones;
* confirmación de que Supabase no fue modificado;
* confirmación de que `supabase/.temp/` sigue intacto.

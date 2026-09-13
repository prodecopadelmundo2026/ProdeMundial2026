# Estado actual

Fecha: 2026-09-13

## Repo verificado

- Ruta local real: `C:\Users\juana\Desktop\Proyectos\prode-mundial-2026`.
- Ruta mencionada en P001 y registrada por Codex: `C:\Users\juana\Desktop\prode-mundial-2026`, no existe en disco durante esta ejecucion.
- Remoto: `https://github.com/prodecopadelmundo2026/ProdeMundial2026`.
- Rama de partida: `main`.
- Commit de partida: `22bd94e`.
- Estado inicial: sin cambios trackeados; `supabase/.temp/` estaba sin trackear y se dejo intacto.

## Implementado en P001 y P002

- Documentacion `docs/ai/` para reglas de trabajo, vision, estado, prompt y ejecucion.
- Ruta local `/diario` con maqueta navegable de agenda diaria multideporte.
- Datos de demostracion separados en `src/lib/daily-prode-demo.ts`.
- Seleccion de fecha y sala en cliente sin escrituras remotas.
- Vista de sala con participantes, pozo, clasificacion provisional y participacion del usuario demo.
- Ruta `/historial` como acceso secundario a Mundial 2026.
- Navegacion principal simplificada para mostrar `Prode diario` e `Historial`.
- La portada `/` ahora muestra Prode diario; `/diario` se conserva como alias.
- La portada anterior del Mundial queda disponible en `/historial/mundial` y las otras rutas del Mundial siguen intactas.
- Modelo V2 aislado en `src/lib/daily-prode/`: puntajes, participaciones, ranking por sala y contrato de proveedor/auditoria.
- Maqueta con futbol normal y de eliminacion, tenis mejor de 3 y 5, boxeo KO y decision, estados excepcionales, carga, error y datos de demostracion.
- Resultados de futbol separados en marcador a 90, alargue, penales y clasificado; los puntos del marcador se calculan sin incluir el criterio aun pendiente del clasificado.
- Auditoria aislada preparada para sincronizacion automatica, correccion manual y confirmacion administrativa.
- Analisis de proveedores documentado; Goalserve queda como candidato para prueba de datos, sin eleccion ni integracion.
- P004 dejo un checkpoint local de P001-P003 en `41bc388` y evaluo Goalserve solo con documentacion y muestras publicas: futbol/tenis son utilizables para prototipo, pero copa y boxeo no estan verificados para puntajes definitivos.
- P005 confirmo la documentacion P004 en `cff4b01`, preparo la solicitud contractual sin enviarla y mantiene la maqueta con datos manuales hasta recibir evidencia real autorizada.
- P006 confirmo P005 en `70a0a35`, agrego fixtures sinteticos y un contrato neutral validable; siguen aislados de proveedores, UI y Supabase.
- P007 confirmo P006 en `04a6395`, agrego un comando repetible de contrato y elevo las regresiones sinteticas a 122 controles.
- P008 confirma P007 en `aebf194`, define el protocolo de muestras autorizadas y mantiene la operacion como fuente manual explicita hasta contar con evidencia y licencia suficientes. No incorpora muestras reales ni adaptadores.
- P009 confirma P008 en `b38006a`, implementa el laboratorio local `sourceType: manual` protegido en `/admin/diario`. Sus cambios viven en memoria del navegador y no escriben en Supabase.
- P010 amplia la experiencia con filtros por deporte, estado y participacion, tarjetas con contexto de fuente y configuracion manual de competencia, deporte y formato.
- P011 restaura el lenguaje visual del producto para la experiencia diaria: navbar compartido, franja naranja con cinco metricas de sala, fondo geometrico con movimiento reducido, hero de evento destacado, ranking diario top 5 y agenda editorial responsiva.
- Las cinco metricas P011 se calculan desde la sala y jornada activas: participantes, eventos finalizados/total, pozo demo, puntaje propio y lider. No reutilizan participantes, premios ni puntajes historicos.
- El ranking diario se calcula con `roomRanking`, queda marcado como provisional mientras haya eventos sin resolver y enlaza a la clasificacion completa de la misma sala dentro de la portada.
- El modo manual continua en memoria. P011 no crea persistencia, tablas, migraciones, RPCs ni cambios de Supabase.

## No implementado

- P013 deja la agenda publica vacia hasta contar con fuente autorizada y eventos verificados; los fixtures permanecen solo en el laboratorio privado.

- No se modifico schema, RLS, RPCs ni datos de Supabase.
- No se implementaron puntajes de eliminacion definitivos ni operacion con dinero real.
- No se eligio proveedor, ni se creo schema, tabla o migracion para V2.
- No se implemento Goalserve: no habia credencial local con nombre Goalserve y no se hicieron requests autenticados.
- No hay proveedor definitivo, muestras contractuales ni licencia publica confirmada; por eso tampoco hay adaptador Goalserve.
- No hay autorizacion para conservar payloads reales de un proveedor. Cualquier evidencia futura debe pasar por el protocolo, checklist y decision Go/No-Go de P008 antes de ingresar al repositorio.
- La fuente `sourceType: manual` esta definida documentalmente para desarrollo y operacion temporal; todavia no esta conectada a Supabase, tablas ni UI administrativa.
- El modo manual no es una fuente deportiva real: los eventos de `/` y `/diario` son datos demo, y el laboratorio administrativo se reinicia al recargar.
- P012 separa `/` como resumen y `/diario` como operación. `/mi-prode`, `/ranking` y `/reglas` son rutas diarias en memoria; las pantallas históricas equivalentes pasan a `/historial/mundial/mi-prode`, `/historial/mundial/ranking` y `/historial/mundial/reglas`.
- El catálogo `competition-catalog.ts` limita la agenda a fútbol argentino/CONMEBOL y ATP/Grand Slam. Boxeo requiere una cartelera identificada; MMA queda solo como categoría futura.
- La portada y agenda usan participantes genéricos y competencias permitidas marcadas como demo. No hay partidos de exhibición ni peleas inventadas publicados.
- La infraestructura de desarrollo sigue pendiente de confirmar proyecto, costo, RLS y credenciales aisladas; P010 no creo ni modifico infraestructura.
- Los fixtures P006 son sinteticos y no son evidencia de Goalserve ni habilitan resultados o puntajes reales.
- El comando P007 no accede a red, proveedores, Supabase ni archivos del proyecto fuera de temporales propios del sistema.
- No se hicieron pagos, premios reales, deploy, push ni cambios de dominio.

## Bloqueos o advertencias

- La ruta local esperada en el prompt no coincide con la ruta real encontrada.
- El sandbox de Codex tenia como raiz escribible la ruta inexistente; las escrituras en el repo real requirieron permiso elevado local.
- No se confirmo Obsidian ni MCP de Supabase conectado. Se continuo con archivos locales.
- La portada historica del Mundial requiere SUPABASE_SERVICE_ROLE_KEY en este entorno local para completar sus consultas existentes; no se modifico esa configuracion.

## Validacion P002

- Typecheck y build de produccion: correctos.
- Lint dirigido: sin errores; hay un warning heredado en la portada historica del Mundial por img HTML.
- Lint global: mantiene 20 errores preexistentes fuera del alcance de P002.
- Smoke test: puntaje de futbol, tenis y boxeo; unicidad por sala y reparto de empate, correcto.
- Rutas locales /, /diario y /historial respondieron 200. La portada historica conserva su codigo, pero necesita SUPABASE_SERVICE_ROLE_KEY local.
- Capturas generadas en 320, 390, 768, 1024 y 1366 px. Se corrigio una hidratacion por formato de fecha/hora dependiente del locale.
- Verificacion automatizada en esos cinco anchos: sin overflow horizontal, errores de consola ni overlay de Next en la experiencia diaria.

## Validacion P003

- Typecheck, lint dirigido y build: correctos.
- Smoke test: marcador de copa a 90 minutos puntua independientemente del clasificado y la confirmacion administrativa queda auditada.
- UI movil: resultados de 90 minutos, penales, clasificado y criterio pendiente visibles sin overflow ni errores de consola.

## Validacion P004

- Typecheck, ESLint dirigido y build: correctos.
- No hay script ni archivos de test configurados en el proyecto.
- Goalserve fue evaluado solo con documentacion y muestras publicas; no hubo consulta autenticada, integracion, cambios de Supabase ni payloads guardados.
- La recomendacion vigente es `Apto para prototipo, pero no para puntajes definitivos` hasta verificar copa, boxeo, correcciones y licencia.

## Validacion P001`r`n`r`n- Typecheck: OK.`r`n- ESLint dirigido a archivos P001: OK.`r`n- Build: OK.`r`n- Lint global: bloqueado por deuda previa en archivos no tocados.`r`n- Capturas responsive: generadas con Playwright CLI.`r`n- Dev server: rutas nuevas respondieron 200; Turbopack registro panic sobre `/ranking` al cerrar, pendiente de investigar si se repite.`r`n`r`n## Proximo paso sugerido

Revisar visualmente `/diario`, decidir si esta maqueta debe pasar a ser la portada y definir los primeros criterios de datos reales: proveedor, IDs estables, estados y flujo de confirmacion manual.

## Siguiente paso P005

Solicitar trial o muestras contractuales de Goalserve para copa, tenis a cinco sets y boxeo; validar correcciones, reemplazos, limites y derechos de exhibicion. Con esa evidencia se podra crear un adaptador read-only con fixtures de contrato, todavia fuera de Supabase y de la UI.

## Siguiente paso P006

Preparar, sin proveedor ni Supabase, un arnes de pruebas con fixtures explicitamente sinteticos para definir errores, campos obligatorios y normalizacion segura del adaptador futuro. La evidencia contractual pendiente sigue siendo bloqueante para integrar o liquidar puntajes.

## Siguiente paso P007

Mantener el arnes como regresion de contrato y decidir si se incorpora como comando de proyecto. La integracion de cualquier proveedor sigue condicionada a las muestras contractuales, la politica de correcciones y la licencia de exhibicion solicitadas en P005.

## Siguiente paso P008

Definir un protocolo de fixtures contractuales reales autorizados o confirmar que la maqueta continuara con datos manuales. No crear tablas ni migraciones hasta que esa decision exista y la evidencia de proveedor sea suficiente.

## Siguiente paso P009

Conservar el modo manual mientras se reciben muestras y derechos de uso por los canales autorizados. Al llegar evidencia, clasificarla con P008 y solo entonces decidir un adaptador read-only o, si no hay aprobacion, preparar el flujo administrativo manual sobre el contrato neutral sin crear tablas todavia.

## Siguiente paso P010

Validar el flujo manual con usuarios administradores autorizados y decidir la interfaz de persistencia futura. Antes de sustituirlo por una fuente real deben existir muestras autorizadas, licencia, adaptador read-only aprobado, estrategia de sincronizacion y migraciones no destructivas separadas.

## Siguiente paso P011

Recorrer el laboratorio con una sesion admin autorizada y decidir el repositorio persistente de desarrollo. Adaptador y migraciones V2 solo pueden empezar tras cumplir P008 en una base aislada con RLS revisado.

## Validacion P011

- Contrato diario: 122/122 en modo legible y JSON.
- TypeScript, ESLint dirigido y build de produccion: correctos.
- Servidor local: `/`, `/diario`, `/historial`, `/historial/mundial`, `/ranking`, `/admin/diario` y `/login` respondieron.
- No habia `agent-browser` ni Playwright local para capturas automatizadas. La revision de pixeles en 320, 390, 768, 1024, 1366 y 1440 queda pendiente de un entorno con navegador.
- El servidor local mantiene el requisito heredado de `SUPABASE_SERVICE_ROLE_KEY` para enriquecer paginas historicas; no se modificaron variables ni Supabase.

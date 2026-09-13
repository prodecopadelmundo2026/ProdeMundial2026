# P013 — Auditoría integral de experiencia diaria, eventos válidos y responsive

Trabajá sobre el repositorio:

`C:\Users\juana\Desktop\Proyectos\prode-mundial-2026`

## Contexto actual

El proyecto está en `main`, con P012 publicado en:

`https://prode-mundial2026-kappa.vercel.app/`

El commit informado de P012 es:

`bea8ca2 feat: separate daily experience and sports competition filters`

Antes de modificar cualquier archivo:

1. Leer `AGENTS.md`.
2. Leer `docs/ai/README.md`.
3. Leer las decisiones y ejecuciones P001 a P012.
4. Revisar `git status`, rama actual, `git log` y diferencias entre `main`, `origin/main` y `dev`.
5. Preservar completamente:

   * `supabase/.temp/`
   * el Mundial histórico
   * `/historial/mundial`
   * las rutas históricas existentes
   * cualquier cambio local ajeno a este prompt.

No sobrescribas trabajo local no commiteado.

## Objetivo

Auditar y corregir la experiencia diaria para que el producto deje de parecer una continuación visible del Mundial y funcione como una aplicación independiente de pronósticos diarios multideporte.

El resultado debe ser:

* claro para un usuario nuevo;
* visualmente coherente con el antiguo Prode;
* completamente responsive;
* sin eventos inventados presentados como reales;
* sin datos del Mundial visibles en las pantallas diarias;
* preparado para recibir datos reales cuando exista una fuente autorizada;
* mantenible y documentado.

No cambies los puntajes ni integres todavía ningún proveedor deportivo real.

## 1. Separación estricta entre diario e histórico

Verificá y corregí todas las rutas, links, componentes y datos para que:

### Experiencia diaria

* `/` sea el resumen diario.
* `/diario` sea la agenda completa de eventos y pronósticos.
* `/mi-prode` muestre únicamente las predicciones diarias del usuario.
* `/ranking` muestre únicamente el ranking de la jornada y sala seleccionadas.
* `/reglas` muestre únicamente las reglas vigentes del Prode diario.
* El navbar diario no debe llevar a datos del Mundial.
* Si el usuario entra a “Mi Prode”, debe ver:

  * sus pronósticos de hoy;
  * sus pronósticos de jornadas futuras;
  * sus eventos pendientes;
  * sus eventos acertados;
  * sus eventos fallados;
  * puntos obtenidos;
  * puntos todavía pendientes;
  * sala e importe de cada participación.

### Experiencia histórica

El Mundial debe poder consultarse solamente desde:

* `/historial`
* `/historial/mundial`
* sus subrutas históricas existentes.

No deben aparecer en las pantallas diarias:

* “España campeona del mundo”;
* “ranking final”;
* premios de primer, segundo o tercer puesto del Mundial;
* cantidad de partidos del Mundial;
* textos sobre Copa del Mundo;
* predicciones o participantes históricos;
* datos provenientes de `ranking_entries` legacy;
* reglas especiales del Mundial.

Si encontrás componentes compartidos que mezclan datos diarios con datos históricos, separalos sin romper las vistas históricas.

## 2. Navbar y arquitectura visual

Conservá el lenguaje visual de la versión anterior:

* navbar negro;
* marca `PRODE 26'`;
* línea naranja para la sección activa;
* tipografías y jerarquía editorial;
* fondo oscuro;
* formas geométricas animadas;
* colores naranja, blanco, amarillo y verde claro;
* botones redondeados;
* tarjetas negras o gris muy oscuro;
* bordes sutiles;
* alto contraste;
* soporte para `prefers-reduced-motion`.

La experiencia diaria debe sentirse como el mismo producto, pero con otra lógica.

Los links del navbar deben tener destinos inequívocos:

* Inicio → `/`
* Prode diario → `/diario`
* Mi Prode → `/mi-prode`
* Ranking → `/ranking`
* Historial → `/historial`
* Reglas → `/reglas`

No muestres dos pantallas idénticas sin explicar su diferencia.

## 3. Home diario

Revisá `/` y asegurate de que no sea una copia simplificada de `/diario`.

La portada debe funcionar como un dashboard resumido:

### Hero principal

En el espacio que antes mostraba “España campeona del mundo”, mostrar:

* evento en curso, si existe;
* si no, próximo evento verificado;
* deporte;
* competencia;
* participantes;
* horario en zona `America/Argentina/Buenos_Aires`;
* estado;
* marcador o resultado, si corresponde;
* botón para ir a pronosticar;
* botón para ver la agenda completa.

Si no hay un evento verificado, mostrar un estado vacío honesto:

> No hay eventos verificados para mostrar en este momento.

No reemplazarlo por equipos inventados.

### Panel lateral

Usar el espacio derecho para mostrar información realmente útil:

* filtros activos;
* próximo evento;
* top 5 del ranking diario;
* sala seleccionada;
* importe de participación;
* botón `Ver ranking completo`;
* botón `Ver mis pronósticos`.

El contenido debe cambiar cuando el usuario modifica los filtros.

### Tarjetas superiores

Las tarjetas superiores deben mostrar datos de la jornada actual, nunca del Mundial:

* participantes de la sala;
* eventos finalizados / eventos totales;
* pozo estimado de la sala;
* puntos del usuario;
* líder de la jornada.

Todos los datos demo deben estar claramente marcados como demo.

No muestres segundo o tercer premio del Mundial. El sistema actual distribuye el pozo entre quienes terminan primeros empatados; no inventes una estructura de premios antigua.

## 4. Prode diario y filtros

En `/diario` mantener la agenda completa, pero mejorar el uso:

* filtros por deporte;
* filtros por competencia;
* filtros por estado;
* opción `Mis pronósticos`;
* selector de sala;
* selector de jornada;
* fecha anterior y siguiente;
* filtros visibles y fáciles de limpiar;
* indicador de cantidad de eventos encontrados;
* estado vacío específico cuando no haya resultados.

Los deportes iniciales deben ser:

* Fútbol;
* Tenis;
* Boxeo;
* MMA, como categoría futura deshabilitada si todavía no existe contrato de puntaje y fuente válida.

No mostrar un selector técnico como `Escenario demo` al usuario público.

## 5. Catálogo válido de competencias

Centralizá el catálogo y aplicalo tanto a la interfaz pública como a la consola admin.

### Fútbol permitido

Incluir únicamente competencias oficiales configuradas:

* Liga Profesional Argentina / Primera División;
* Primera Nacional;
* Copa Argentina;
* Supercopa Argentina;
* Copa Libertadores;
* Copa Sudamericana;
* otras copas nacionales únicamente cuando estén explícitamente incorporadas al catálogo.

Excluir:

* partidos de exhibición;
* amistosos;
* equipos inventados;
* ligas desconocidas;
* competencias no verificadas;
* partidos generados solamente para llenar la pantalla.

### Tenis permitido

Incluir:

* ATP Masters 1000;
* ATP 500;
* ATP 250;
* Australian Open;
* Roland Garros;
* Wimbledon;
* US Open.

No mostrar:

* circuitos de exhibición;
* torneos sin categoría identificada;
* partidos sin competencia oficial;
* participantes sintéticos como si fueran tenistas reales.

### Boxeo y MMA

No mostrar carteleras ficticias.

Solo publicar un evento si existe:

* fuente identificable;
* participantes verificables;
* fecha y hora;
* resultado;
* método;
* round, cuando corresponda;
* estado inequívoco.

MMA debe quedar como `Próximamente` o deshabilitado hasta definir:

* puntaje;
* tipos de pronóstico;
* métodos válidos;
* fuente de resultados;
* tratamiento de empate, no contest y decisión técnica.

## 6. Política de datos demo

Los fixtures sintéticos pueden seguir existiendo para pruebas internas, pero jamás deben parecer eventos reales.

Todo fixture sintético debe:

* estar separado del dataset público;
* tener una marca visible para admin/desarrollo;
* usar nombres claramente sintéticos;
* contener el texto `Fixture sintético de demostración — no corresponde a un evento real`;
* no aparecer como una jornada real para usuarios públicos.

Si no hay eventos reales autorizados, la interfaz debe mostrar un estado vacío bien diseñado.

Es preferible una agenda vacía y honesta antes que mostrar:

* `Club Deportivo Puerto del Horizonte`;
* `Unión del Valle`;
* `Deportivo Estación Central`;
* `Atlético Costa Clara`;
* `Liga de exhibición`;
* o cualquier partido ficticio sin identificación evidente.

## 7. Reglas y puntajes

No modificar los puntajes ya definidos:

### Fútbol

* resultado exacto: 3 puntos;
* resultado normal correcto: 2 puntos;
* resultado incorrecto: 0 puntos;
* el resultado base se evalúa a los 90 minutos;
* prórroga, penales y clasificado permanecen separados;
* no inferir clasificados automáticamente.

### Tenis

* ganador y sets exactos: 3 puntos;
* ganador correcto sin sets exactos: 1 punto;
* ganador incorrecto: 0 puntos;
* no existe empate normal.

### Boxeo

Mantener la propuesta provisional existente, sin presentarla como definitiva, hasta validar reglas de:

* ganador;
* KO/TKO;
* decisión;
* round;
* empate;
* no contest.

No desarrollar todavía apuestas al campeón de una tabla anual. Dejarlo como posible funcionalidad futura documentada, no visible ni operativa.

## 8. Consola admin

Mantener `/admin/diario` protegida y separada del usuario público.

La consola debe permitir administrar datos manuales, pero exigir:

* fuente;
* URL o referencia;
* fecha de consulta;
* estado de verificación;
* motivo de corrección;
* actor;
* auditoría antes/después;
* bloqueo manual;
* confirmación administrativa.

No habilitar cierre automático de jornadas con resultados ambiguos.

No integrar Goalserve ni otro proveedor todavía. El contrato neutral y el modo manual deben seguir funcionando.

## 9. Responsive y accesibilidad

Verificar como mínimo:

* 320 px;
* 375 px;
* 390 px;
* 768 px;
* 1024 px;
* 1280 px;
* 1440 px.

Corregir:

* overflow horizontal;
* tablas que obliguen a desplazarse lateralmente;
* tarjetas demasiado anchas;
* textos cortados;
* filtros que se salgan de pantalla;
* botones imposibles de tocar;
* navbar ilegible;
* rankings que rompan el layout;
* hero con alturas excesivas;
* espacios vacíos sin utilidad.

En celular:

* convertir tablas en tarjetas o filas apiladas;
* mantener visible deporte, evento, estado, pronóstico y puntos;
* permitir expandir detalles;
* usar filtros en un panel o acordeón;
* mantener botones accesibles;
* no ocultar información esencial detrás de scroll horizontal.

Si existe `agent-browser`, Playwright u otra herramienta disponible, usarla para verificar producción o Preview. Si no existe, realizar la mejor validación automatizada disponible y documentar claramente la limitación.

## 10. Supabase y ambientes

No crear tablas, migraciones, seeds, RPC, usuarios, pagos ni datos remotos en este prompt.

No modificar variables de Vercel ni Supabase.

Solo actualizar, si hace falta, la documentación del plan futuro para mantener:

* producción separada de desarrollo;
* `main` como producción;
* rama de desarrollo independiente;
* Supabase productivo separado de Supabase dev;
* nunca copiar `auth.users`, predicciones, códigos usados ni datos personales;
* copiar únicamente schema, migraciones, matches, resultados y configuración pública cuando corresponda.

No crear una base de datos clonada automáticamente.

## 11. Documentación

Crear o actualizar:

* `docs/ai/prompts/P013-auditoria-experiencia-diaria.md`
* `docs/ai/decisiones/P013-auditoria-y-datos-validos.md`
* `docs/ai/ejecuciones/P013-auditoria-y-datos-validos.md`

Registrar:

* estado inicial;
* archivos modificados;
* rutas revisadas;
* diferencias entre diario e histórico;
* catálogo de competencias;
* eventos excluidos;
* pruebas responsive;
* limitaciones;
* decisiones tomadas;
* SHA final;
* estado de Preview o producción.

Copiar este prompt íntegramente en el archivo del prompt y calcular su hash SHA-256.

## 12. Git y publicación

No trabajar directamente sobre `main` sin revisar antes el estado real.

Crear una rama de trabajo desde el `main` actual, por ejemplo:

`codex/p013-auditoria-experiencia-diaria`

No modificar ni sobrescribir `dev`.

Al terminar:

1. Ejecutar contrato deportivo: `122/122`.
2. Ejecutar modo JSON.
3. Ejecutar TypeScript.
4. Ejecutar ESLint dirigido.
5. Ejecutar build.
6. Ejecutar `git diff --check`.
7. Verificar rutas públicas.
8. Verificar que `/admin/diario` siga redirigiendo sin sesión.
9. Verificar que no haya referencias del Mundial en `/`, `/diario`, `/mi-prode`, `/ranking` ni `/reglas`.
10. Confirmar que no haya eventos ficticios visibles como reales.
11. Crear un commit descriptivo.
12. Push de la rama de trabajo.
13. Generar y verificar un Preview de Vercel.

No hagas merge ni push a `main` hasta que el responsable pruebe el Preview y lo autorice expresamente.

Si algo requiere credenciales, licencia, proveedor real o permisos externos, detener esa parte, documentarla y dejar una implementación segura con estado vacío. No inventar datos ni simular una integración exitosa.

## Criterios de aceptación

P013 se considera correcto si:

* el Mundial solo aparece dentro de Historial;
* Mi Prode ya no muestra predicciones del Mundial;
* Ranking ya no muestra el ranking final del Mundial;
* Reglas ya no habla de la Copa del Mundo;
* Inicio y Prode diario tienen propósitos distintos;
* el hero muestra un evento verificado o un estado vacío honesto;
* no aparecen partidos inventados como reales;
* los filtros cambian agenda, hero, métricas y ranking;
* las competencias visibles pertenecen al catálogo permitido;
* boxeo y MMA no muestran datos sin fuente;
* no hay overflow horizontal;
* el contrato queda en `122/122`;
* el Mundial histórico continúa funcionando;
* no se toca Supabase remoto;
* queda una Preview verificable;
* toda la ejecución queda documentada.

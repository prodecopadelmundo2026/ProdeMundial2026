# P012 — Separación de experiencias, catálogo deportivo y filtros diarios

Continuamos la V2 del Prode diario en:

`C:\Users\juana\Desktop\Proyectos\prode-mundial-2026`

## Estado actual

* Última versión publicada en:

`https://prode-mundial2026-kappa.vercel.app/`

* `main` y `origin/main` están en:

`0c35add feat: restore prode visual language for daily experience`

* La rama `dev` continúa deliberadamente en:

`df8fd82`

* La página diaria recuperó el lenguaje visual del Mundial.
* El modo diario funciona con datos demo y `sourceType: manual`.
* No hay proveedor deportivo real integrado.
* Goalserve continúa sin aprobación contractual.
* El contrato deportivo tiene 122 controles.
* No hay tablas nuevas ni migraciones en Supabase.
* `supabase/.temp/` debe continuar intacto y sin trackear.

La tarea debe trabajar sobre `main`, actualizarla, hacer push y publicar la nueva versión en Vercel.

No sobrescribas ni reinicies `dev`.

## 1. Problemas funcionales detectados

Actualmente:

* `Inicio` y `Prode diario` muestran prácticamente lo mismo.
* `Mi Prode` todavía lleva a datos cargados durante el Mundial.
* `Ranking` todavía muestra información del Mundial.
* `Reglas` todavía habla de la Copa del Mundo y del sistema anterior.
* La agenda muestra partidos ficticios o de exhibición que no corresponden al alcance deseado.
* La interfaz muestra demasiados eventos.
* Faltan filtros deportivos visibles y cómodos.
* Existe espacio vacío en la zona derecha del hero.
* El próximo evento y el contenido destacado no se actualizan claramente según los filtros.
* El selector técnico `Escenario demo` aparece en la experiencia pública.
* La portada diaria todavía necesita una diferencia real respecto del espacio operativo del Prode diario.

No soluciones esto ocultando textos o cambiando solamente etiquetas. Revisá las fuentes de datos, las rutas, los componentes y los scopes utilizados.

## 2. Separación funcional obligatoria

### `/` — Inicio

La portada debe ser un resumen visual de la jornada.

Debe incluir:

* Navbar completo.
* Franja de métricas.
* Hero visual.
* Eventos en curso o próximos destacados.
* Ranking del día resumido.
* Top 5 de la sala seleccionada.
* Filtros rápidos de deportes.
* Próximo evento según los filtros.
* Resumen de participación.
* Botón claro hacia `Prode diario`.
* Botón hacia `Mi Prode`.
* Botón hacia ranking completo.

No debe mostrar la agenda completa ni todos los formularios de pronóstico.

La portada debe ser más editorial y resumida.

### `/diario` — Prode diario

Debe ser el espacio operativo completo.

Debe incluir:

* Selector de jornada.
* Selector de fecha.
* Selector de sala.
* Filtros deportivos.
* Filtros por competencia.
* Filtros por estado.
* Opción `Solo mi participación`.
* Agenda completa.
* Pronósticos.
* Resultados parciales.
* Resultados finales.
* Puntos.
* Estado de cada evento.
* Acceso a la clasificación de la sala.

No debe ser visualmente idéntico a `/`.

Puede reutilizar componentes, tokens, navbar y fondo, pero debe tener una jerarquía y densidad claramente más funcional.

### `/mi-prode` — Mi Prode diario

Esta ruta debe mostrar únicamente las participaciones diarias del usuario.

No debe cargar datos ni consultas del Mundial.

Debe permitir consultar:

* Jornada actual.
* Jornada de hoy.
* Jornada de mañana.
* Próximas jornadas disponibles.
* Fecha seleccionada.
* Sala seleccionada.
* Pronósticos realizados.
* Pronósticos pendientes.
* Resultados parciales.
* Resultados finales.
* Puntos por evento.
* Total acumulado.
* Posición dentro de la sala.
* Estado de la jornada.

Agregar navegación por fecha o pestañas equivalentes:

* Hoy.
* Mañana.
* Próximas.
* Historial diario.

Si todavía no existe información real para mañana, mostrar un estado claro y no inventar participaciones.

Los datos demo deben identificarse como demo, pero no mostrar información técnica innecesaria.

### `/ranking` — Ranking diario

Esta ruta debe mostrar únicamente rankings de la V2 diaria.

Debe incluir:

* Jornada.
* Fecha.
* Sala.
* Pozo demo estimado.
* Participantes.
* Clasificación.
* Puntaje.
* Top 5 destacado.
* Ranking completo.
* Usuario actual.
* Empates en primer puesto.
* Estado provisional o final.
* Botón para volver al Prode diario.

No debe mostrar:

* Ranking final del Mundial.
* Puntajes históricos.
* Participantes del Mundial.
* Premios históricos.
* España campeona.
* 104 / 104.
* Valores de la edición anterior.

El ranking del Mundial debe quedar únicamente dentro del historial.

Si existen rutas antiguas para ranking histórico, preservalas en una estructura equivalente a:

`/historial/mundial/ranking`

No hace falta que la URL sea exactamente esa si la arquitectura existente tiene otra, pero debe quedar debajo de `/historial`.

### `/reglas` — Reglas del Prode diario

Reemplazá el contenido de reglas del Mundial por las reglas actuales de la V2.

Debe explicar:

#### Participación

* Se puede participar en varias salas en una misma jornada.
* Una entrada por persona, sala y jornada.
* Cada sala tiene sus propios participantes.
* Cada sala tiene su propio pozo.
* No se mezclan salas.
* No hay segundo ni tercer premio.
* Si hay empate en el primer puesto, el pozo se reparte entre los empatados.
* Los importes actuales son demo.
* No hay pagos reales implementados todavía.

#### Fútbol

* Exacto a 90 minutos: 3 puntos.
* Resultado general local/empate/visitante: 2 puntos.
* Incorrecto: 0 puntos.
* En eliminación se separan:

  * Resultado a 90.
  * Alargue.
  * Penales.
  * Clasificado.
* El puntaje del clasificado todavía está pendiente.
* Los penales no forman parte del marcador exacto a 90 minutos.

#### Tenis

* Resultado exacto de sets: 3 puntos.
* Ganador correcto con sets incorrectos: 1 punto.
* Ganador incorrecto: 0 puntos.
* Diferenciar mejor de 3 y mejor de 5.
* No permitir resultados imposibles.

#### Boxeo

* Ganador + KO/TKO + round exacto: 3 puntos.
* Ganador + método correcto, round incorrecto: 2 puntos.
* Ganador + decisión/no KO: 2 puntos.
* Ganador correcto con método incorrecto: 1 punto.
* Ganador incorrecto: 0 puntos.
* Empate, no contest y pelea anulada: pendiente.

#### MMA

Mostrarlo como deporte futuro o próximamente disponible.

No mostrar eventos de MMA ni permitir puntajes hasta que se definan:

* Proveedor.
* Tipos de resultado.
* Método.
* Round.
* Decisión.
* Empate.
* No contest.
* Puntaje.

Las reglas del Mundial deben mantenerse únicamente dentro de la sección histórica.

## 3. Navegación

Adaptá el navbar compartido para que tenga estos destinos diarios:

* `Inicio` → `/`
* `Prode diario` → `/diario`
* `Mi Prode` → `/mi-prode`
* `Ranking` → `/ranking`
* `Historial` → `/historial`
* `Reglas` → `/reglas`

El estado activo debe seguir usando:

* Línea naranja.
* Contraste claro.
* Estado de foco.
* Responsive.

El contenido histórico debe tener sus propios enlaces internos.

Dentro de `/historial/mundial`, agregar o conservar accesos a:

* Ranking histórico.
* Reglas del Mundial.
* Mi Prode del Mundial.
* Premios.
* Auditoría.
* Resultados.

No dejes enlaces diarios apuntando a componentes del Mundial.

No alcanza con cambiar el texto del enlace. Verificá que cada ruta consuma la fuente de datos correcta.

Si alguna ruta histórica antigua sigue siendo utilizada por enlaces existentes, podés conservar una redirección técnica hacia su equivalente debajo de `/historial`, pero no debe aparecer en la navegación diaria.

## 4. Catálogo de deportes y competencias

Creá una configuración centralizada para definir qué competencias son válidas para la V2.

Usá una estructura equivalente a:

`src/lib/daily-prode/competition-catalog.ts`

No distribuyas nombres de competencias en múltiples componentes.

### Fútbol permitido inicialmente

Incluir como mínimo:

* Liga Profesional de Fútbol / Primera División de Argentina.
* Primera Nacional de Argentina.
* Copa Argentina.
* Supercopa Argentina.
* Otras copas nacionales argentinas oficiales que sean incorporadas explícitamente al catálogo.
* Copa Libertadores.
* Copa Sudamericana.

La configuración debe permitir agregar futuras competencias sin modificar toda la UI.

### Tenis permitido inicialmente

Incluir:

* ATP Masters 1000.
* ATP 500.
* ATP 250.
* Australian Open.
* Roland Garros.
* Wimbledon.
* US Open.

Mostrar los Grand Slam como una categoría propia y no confundirlos con ATP 250, 500 o Masters 1000.

No incluir por defecto:

* Exhibiciones.
* Partidos amistosos.
* Eventos sin competencia oficial.
* Torneos desconocidos.
* Circuitos sin clasificación clara.
* Partidos sueltos que no puedan relacionarse con una competencia válida.

### Boxeo

Mantener la categoría disponible, pero no inventar eventos ni competencias.

Los eventos de boxeo solamente deben aparecer si:

* Tienen una competencia o cartelera identificable.
* Tienen participantes válidos.
* Tienen fecha y hora.
* La fuente es manual demo o proveedor autorizado.
* Se puede distinguir el estado.

### MMA

Dejar la categoría preparada como futura.

No mostrar peleas inventadas ni eventos sin fuente válida.

## 5. Regla de elegibilidad de eventos

Crear una función o servicio centralizado equivalente a:

`isEligibleDailyEvent`

Debe impedir que aparezcan públicamente eventos:

* De exhibición.
* Amistosos no solicitados.
* Con competencia desconocida.
* Sin deporte reconocido.
* Sin participantes.
* Sin fecha u horario.
* Sin estado válido.
* Sin fuente.
* Con datos ambiguos.
* Que no pertenezcan al catálogo permitido.

Si un evento manual no pertenece al catálogo, el panel admin debe informar el motivo y no permitir publicarlo normalmente.

Podés permitir una excepción administrativa futura, pero debe requerir:

* Motivo.
* Usuario.
* Fecha.
* Auditoría.
* Identificación visible de excepción.

No uses esa excepción para mostrar los actuales partidos ficticios en la portada.

## 6. Datos demo

Revisá los fixtures actuales.

Eliminar de la experiencia pública los ejemplos que aparecen como:

* Liga de exhibición.
* Club Deportivo Puerto del Horizonte.
* Unión del Valle.
* Deportivo Estación Central.
* Atlético Costa Clara.
* Cualquier otro evento ficticio presentado como si fuera una agenda real.

No inventes partidos reales entre equipos existentes.

Como todavía no existe un proveedor real, hay dos alternativas válidas:

### Alternativa A: demo sintético explícito

Usar participantes genéricos como:

* `Equipo local demo`.
* `Equipo visitante demo`.
* `Jugador A demo`.
* `Jugador B demo`.
* `Peleador A demo`.
* `Peleador B demo`.

Mostrar claramente:

`Fixture sintético de demostración — no corresponde a un evento real`

La competencia debe ser una categoría permitida, pero también debe figurar como demo.

### Alternativa B: estado sin eventos reales

Mostrar:

`Todavía no hay eventos deportivos reales sincronizados`

y ofrecer:

* Ver datos demo.
* Ir al panel administrativo.
* Consultar reglas.
* Ver jornadas anteriores.

Elegí la alternativa que permita probar mejor la interfaz, pero nunca presentes datos sintéticos como agenda deportiva real.

El selector `Escenario demo` no debe aparecer en la portada pública ni en `/diario`.

Si se conserva, debe estar solamente en:

* Panel admin.
* Consola de desarrollo.
* Herramienta de testeo.

## 7. Filtros deportivos

En `/` y `/diario`, agregá filtros de deportes con selección múltiple.

Debe existir:

* Todos.
* Fútbol.
* Tenis.
* Boxeo.
* MMA próximamente.

El usuario debe poder:

* Activar un deporte.
* Desactivarlo.
* Activar varios.
* Desactivar todos.
* Volver a `Todos`.
* Ver visualmente qué filtros están activos.

No usar solamente un `<select>` que esconda la selección actual.

Preferir:

* Chips seleccionables.
* Botones toggle.
* Tabs multiselección.
* Checkboxes visuales.
* Estados activos en naranja.

### Filtros adicionales

Agregar, según el espacio disponible:

* Competencia.
* Estado.
* Solo mi participación.
* Próximos.
* En curso.
* Finalizados.

En la portada usar una versión compacta.

En `/diario` usar la versión completa.

## 8. Contenido dinámico según filtros

Cuando cambien los filtros, actualizar en conjunto:

* Cantidad de eventos visibles.
* Próximo evento.
* Eventos en curso.
* Agenda.
* Resumen de la jornada.
* Métrica de eventos finalizados.
* Estado de participación.
* Cards del hero.

El próximo evento debe ser:

1. Un evento en curso, si existe.
2. Si no, el próximo evento por horario.
3. Si no hay eventos dentro del filtro, un estado vacío claro.

No dejes que el hero siga mostrando un evento que el usuario acaba de ocultar.

No muestres datos desactualizados de una sala o jornada anterior.

## 9. Uso del espacio vacío del hero

Aprovechá el espacio derecho que actualmente queda vacío.

Crear un panel contextual que pueda contener:

### Filtros rápidos

* Deportes.
* Competencias.
* Estados.
* Solo mi participación.

### Próximo evento filtrado

* Deporte.
* Competencia.
* Participantes.
* Hora.
* Estado.
* Resultado parcial.
* Botón de pronóstico.
* Fuente demo o manual, en formato secundario.

### Ranking resumido

* `RANKING DEL DÍA`.
* Sala seleccionada.
* Top 5.
* Puntaje.
* Usuario actual.
* Empate en primer lugar.
* Estado provisional.
* Botón `Ver ranking total`.

No llenes el espacio con una tarjeta decorativa sin función.

Si la pantalla queda demasiado cargada, usá una composición vertical de tarjetas compactas.

En móvil, estas tarjetas deben apilarse correctamente.

## 10. Ranking y filtros

El ranking diario debe respetar:

* Sala.
* Jornada.
* Participantes.
* Puntos.
* Empates.

Por defecto, el ranking debe representar el total de la jornada y sala seleccionadas.

Si el filtro deportivo cambia también la clasificación, debe quedar explícito con una etiqueta como:

* `Ranking total de la jornada`.
* `Ranking según filtros`.

No cambies silenciosamente el significado del puntaje.

Si el modelo actual no permite calcular de manera segura un ranking filtrado, mantené el ranking total y documentá esa decisión.

Nunca mezcles:

* Puntos históricos.
* Puntos diarios.
* Salas distintas.
* Deportes fuera del filtro.
* Datos del Mundial.

## 11. Tarjetas superiores

Mantener el estilo de la franja naranja, pero actualizar su información según:

* Fecha.
* Sala.
* Filtros.

Las tarjetas deben mostrar:

1. Participantes de la sala.
2. Eventos visibles finalizados / total.
3. Pozo demo estimado.
4. Puntaje propio.
5. Líder del día.

No volver a mostrar:

* Segundo premio.
* Tercer premio.
* Mundial terminado.
* Premios históricos.
* Ranking final.
* Datos del Mundial.

Si hay filtros activos, la tarjeta de eventos debe indicarlo correctamente.

El pozo y los participantes siguen siendo de la sala seleccionada, no del filtro deportivo, salvo que eso esté claramente rotulado.

## 12. Panel administrativo

Conservá `/admin/diario` protegido.

Adaptalo para que la carga manual utilice el catálogo de competencias.

Al crear o editar un evento, permitir seleccionar:

* Deporte.
* Competencia.
* Tipo de evento.
* Fecha.
* Hora.
* Participantes.
* Estado.
* Formato.
* Fuente.
* Indicador demo.
* Indicador de evento elegible.

Bloquear o advertir:

* Competencias desconocidas.
* Eventos de exhibición.
* Eventos sin fecha.
* Eventos sin participantes.
* Boxeo sin método o round cuando corresponda.
* Tenis con formato inválido.
* Fútbol de eliminación sin separación entre marcador y clasificado.

Mantener:

* Corrección.
* Confirmación.
* Bloqueo.
* Desbloqueo con motivo.
* Simulación automática.
* Auditoría.
* Restablecimiento demo.

No mostrar el selector técnico de escenarios en las páginas públicas.

## 13. Auditoría y Mundial

No modificar la auditoría histórica.

No eliminar información del Mundial.

Toda separación de rutas debe permitir que:

* El Mundial se audite.
* Sus resultados sigan intactos.
* Sus reglas sigan consultables.
* Sus rankings sigan disponibles.
* Sus premios sigan disponibles.

Pero todo eso debe quedar dentro de `/historial`.

Las rutas diarias jamás deben consultar por defecto los datos históricos del Mundial.

## 14. Supabase

No crear tablas ni migraciones en P012.

No ejecutar escrituras en Supabase.

No cambiar variables.

No crear proyectos ni branches de Supabase.

Dejar documentado que la separación actual es de rutas, dominio y datos demo en memoria.

Preparar el código para que, en una futura tarea, las rutas diarias puedan conectarse a un repositorio persistente sin volver a cargar componentes del Mundial.

## 15. Validación

Ejecutá:

`npm run daily-prode:verify-contract`

`npm run daily-prode:verify-contract -- --json`

`npx tsc --noEmit --pretty false`

`npm run build`

`git diff --check`

ESLint dirigido sobre todos los archivos modificados.

Verificá funcionalmente:

* `/` no es idéntico a `/diario`.
* `/mi-prode` no muestra datos del Mundial.
* `/ranking` no muestra datos del Mundial.
* `/reglas` no muestra reglas del Mundial.
* `/historial` sigue mostrando el Mundial.
* `/historial/mundial` sigue funcionando.
* Los filtros son multiselección.
* `Todos` activa todos los deportes.
* Se puede apagar un deporte.
* Se pueden combinar deportes.
* El próximo evento cambia con el filtro.
* El hero no muestra eventos ocultos.
* No aparecen partidos de exhibición.
* No aparecen competencias desconocidas.
* No aparecen nombres ficticios como si fueran reales.
* El ranking respeta sala y jornada.
* El botón `Ver ranking total` lleva al ranking diario correcto.
* La franja naranja usa datos diarios.
* El panel admin sigue protegido.
* Los cambios del panel no aparecen como persistentes.
* El contrato sigue en verde.
* No se tocó Supabase.

Verificá responsive en:

* 320 px.
* 390 px.
* 768 px.
* 1024 px.
* 1366 px.
* 1440 px.

Revisá especialmente:

* Navbar.
* Filtros.
* Hero.
* Panel derecho.
* Ranking.
* Cards superiores.
* Agenda.
* Mi Prode.
* Ranking completo.
* Reglas.
* Historial.
* Ausencia de scroll horizontal.
* Textos largos.
* Varios filtros activos.
* Estado vacío.

Si hay navegador automatizado disponible, generá capturas de `/`, `/diario`, `/mi-prode`, `/ranking` y `/reglas`.

Si no está disponible, hacé las verificaciones posibles y no afirmes una validación visual por píxeles que no se haya ejecutado.

## 16. Documentación

Conservá P001–P011 sin sobrescribirlos.

Registrá este prompt como:

`docs/ai/prompts/P012-separacion-diario-catalogo-y-filtros.md`

Creá o actualizá:

* `docs/ai/README.md`
* `docs/ai/estado-actual.md`
* `docs/ai/vision-v2.md`
* `docs/ai/decisiones/P012-separacion-de-experiencias.md`
* `docs/ai/ejecuciones/P012-separacion-diario-catalogo-y-filtros.md`
* `docs/ai/competition-catalog.md`

Documentá:

* Diferencia entre Inicio y Prode diario.
* Alcance de Mi Prode.
* Alcance del ranking diario.
* Ubicación del Mundial histórico.
* Reglas diarias.
* Competencias permitidas.
* Competencias excluidas.
* Tratamiento de exhibiciones.
* Tratamiento de MMA.
* Estado de los datos reales.
* Estado de los datos demo.
* Funcionamiento de filtros.
* Comportamiento del ranking con filtros.
* Limitaciones por no tener proveedor.
* Pendientes para la integración real.

## 17. Commit y publicación

Cuando la tarea esté terminada:

1. Revisá el diff completo.
2. Confirmá que no haya secretos.
3. Confirmá que `supabase/.temp/` no esté incluido.
4. Confirmá que no haya cambios en Supabase.
5. Creá un commit:

`feat: separate daily experience and sports competition filters`

6. Ejecutá:

`git push origin main`

7. Esperá el deployment de Vercel.
8. Verificá que el deployment corresponda al SHA final.
9. Probá:

`https://prode-mundial2026-kappa.vercel.app/`

10. No modifiques la rama `dev`.
11. No uses force push.
12. No cambies dominio ni variables externas.

## 18. Entrega final

Devolveme:

1. Estado final de Git.
2. Commit creado.
3. Archivos modificados.
4. Diferencia implementada entre `/` y `/diario`.
5. Qué muestra ahora `Mi Prode`.
6. Qué muestra ahora `Ranking`.
7. Qué muestra ahora `Reglas`.
8. Cómo quedó aislado el Mundial.
9. Competencias habilitadas.
10. Competencias excluidas.
11. Funcionamiento de los filtros.
12. Funcionamiento del panel derecho.
13. Tratamiento de datos demo.
14. Resultado del contrato de 122 controles.
15. Resultado de TypeScript.
16. Resultado del build.
17. Estado del push.
18. Estado del deployment.
19. URL pública verificada.
20. Limitaciones por no tener proveedor real.
21. Próximo paso recomendado.

No integres todavía proveedores, no crees tablas, no hagas migraciones, no uses partidos ficticios como reales y no vuelvas a mezclar la experiencia diaria con el Mundial.

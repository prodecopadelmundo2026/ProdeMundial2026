# P011 — Adaptación completa del UX/UI del Mundial a Prode diario

Continuamos el proyecto sobre el repositorio:

`C:\Users\juana\Desktop\Proyectos\prode-mundial-2026`

La V2 ya está implementada y publicada, pero la experiencia visual diaria no respeta suficientemente la identidad UX/UI de la versión anterior del Prode Mundial.

Esta tarea debe recuperar esa identidad visual y adaptarla correctamente a la lógica actual del Prode diario multideporte.

No quiero una página nueva genérica ni un dashboard estándar. Quiero que la V2 se sienta como una evolución directa del producto anterior.

## 1. Estado actual

* Rama principal: `main`.
* Última versión publicada:

`https://prode-mundial2026-kappa.vercel.app/`

* El deployment anterior fue exitoso.
* Existe también la rama `dev`.
* El Mundial histórico sigue disponible.
* El modo diario utiliza datos sintéticos y fuente manual.
* El contrato deportivo tiene 122 controles.
* No hay proveedor deportivo real integrado.
* No hay migraciones ni tablas nuevas en Supabase.
* `supabase/.temp/` debe permanecer intacto y sin trackear.
* No cambiar dominio.
* No cambiar variables externas.
* No modificar el proyecto de Supabase.

Antes de comenzar:

1. Ejecutá `git status`.
2. Verificá la rama actual.
3. Revisá los últimos commits.
4. Leé `AGENTS.md`.
5. Leé `docs/ai/README.md`.
6. Leé `docs/ai/estado-actual.md`.
7. Revisá la implementación actual de `/`, `/diario`, `/historial`, `/historial/mundial` y `/admin/diario`.
8. Revisá el código y estilos existentes de la versión histórica del Mundial.

No borres cambios existentes ni uses comandos destructivos.

## 2. Referencia visual obligatoria

Las capturas entregadas corresponden a la versión anterior del Prode Mundial y deben tomarse como referencia de estructura, densidad, jerarquía y lenguaje visual.

### Referencia 1: ranking histórico

La versión anterior tenía:

* Navbar negro de ancho completo.
* Logo `PRODE 26'` a la izquierda.
* Navegación:

  * Inicio.
  * Prode diario.
  * Mi Prode.
  * Ranking.
  * Historial.
  * Reglas.
* Elemento activo marcado con una línea naranja inferior.
* Avatar circular del usuario a la derecha.
* Franja naranja debajo del navbar.
* Tarjetas negras dentro de la franja naranja.
* Etiquetas pequeñas en tipografía monoespaciada y mayúscula.
* Números grandes y blancos.
* Fondo negro.
* Títulos grandes en blanco con palabras destacadas en naranja y cursiva.
* Listas dentro de tarjetas oscuras.
* Botones negros con borde y flecha.
* Tarjetas secundarias con borde fino, esquinas redondeadas y jerarquía clara.

### Referencia 2: hero histórico

La portada histórica utilizaba:

* Fondo negro profundo.
* Formas geométricas grandes, abstractas y animadas.
* Degradados oscuros en violeta, amarillo, naranja y verde.
* Formas parcialmente cortadas por los bordes.
* Movimiento visual sutil detrás del contenido.
* Un hero muy amplio.
* Tipografía display enorme.
* Composición de dos columnas:

  * Contenido principal a la izquierda.
  * Tarjeta secundaria de ranking a la derecha.
* Tarjeta de ranking con borde redondeado y detalle naranja superior.
* Estados como `MUNDIAL TERMINADO`.
* Mucha presencia visual sin llenar todo con componentes pequeños.

### Referencia 3: portada diaria actual

La portada diaria actual es funcional, pero visualmente demasiado simple:

* Navbar reducido.
* Mucho espacio vacío.
* Fondo plano.
* No conserva las formas visuales animadas.
* La agenda aparece demasiado pronto como una lista técnica.
* La jerarquía visual no se parece suficientemente al producto anterior.
* La etiqueta `Datos de demostración — fuente manual` ocupa demasiado protagonismo.
* La fecha demo aparece como `Fecha pendiente`.
* Algunos eventos muestran `--:--`.
* Falta una portada con presencia visual.
* No existe un hero equivalente al anterior.
* Falta un ranking del día visible arriba.

La tarea es corregir esto sin perder la lógica actual.

## 3. Objetivo visual

La portada diaria debe parecer:

> El mismo Prode que ya conocían los usuarios, convertido en una experiencia diaria multideporte.

No debe parecer:

* Un dashboard administrativo.
* Una tabla de API.
* Una aplicación genérica de resultados deportivos.
* Una página vacía con filtros.
* Una copia literal de la final del Mundial.

El resultado debe conservar:

* Oscuridad.
* Naranja como color de acción.
* Tipografía fuerte.
* Fondo abstracto animado.
* Tarjetas negras.
* Botones consistentes.
* Bordes redondeados.
* Etiquetas monoespaciadas.
* Jerarquía editorial.
* Sensación de producto terminado.

## 4. Reutilizar el lenguaje visual existente

Antes de inventar estilos nuevos:

1. Identificá dónde están definidos:

   * Fondo.
   * Formas animadas.
   * Tipografías.
   * Tokens de color.
   * Navbar.
   * Botones.
   * Cards.
   * Badges.
   * Animaciones.
2. Reutilizá componentes y clases existentes cuando sea razonable.
3. Si los estilos históricos están acoplados a la página del Mundial, extraé solamente las piezas visuales reutilizables.
4. No modifiques visualmente la página histórica más de lo necesario.
5. No dupliques grandes bloques de CSS si podés crear componentes compartidos.
6. No reemplaces todo por una librería visual genérica.
7. No cambies la arquitectura funcional del modo diario.

La página `/historial/mundial` debe conservar su contenido, datos, ranking y experiencia histórica.

La nueva portada debe reutilizar su lenguaje visual, no sus textos ni sus datos.

## 5. Navbar de la V2

Adaptá el navbar diario para que recupere la estética del navbar anterior.

Debe incluir, según las rutas reales disponibles:

* Logo `PRODE 26'` o el equivalente visual actual.
* Inicio.
* Prode diario.
* Mi Prode.
* Ranking.
* Historial.
* Reglas.
* Avatar o acceso de usuario.

El enlace activo debe marcarse con:

* Línea naranja inferior.
* Estado visual claro.
* Contraste suficiente.

No dejes enlaces rotos.

Si alguna ruta todavía no tiene una implementación completa:

* Usá la ruta existente correspondiente.
* No crees una página vacía solamente para completar el navbar.
* Documentá la ruta pendiente.
* No elimines el acceso histórico.

En móvil:

* El navbar debe transformarse correctamente.
* No debe provocar overflow horizontal.
* Debe existir un menú o composición equivalente usable.
* Los enlaces principales deben seguir accesibles.
* El usuario debe identificar claramente dónde está.

## 6. Franja superior de información

La versión anterior tenía una franja naranja con tarjetas negras:

* Participantes.
* Mundial terminado.
* Primer premio.
* Segundo premio.
* Tercer premio.

En la V2 no se deben mostrar premios de segundo ni tercer puesto.

Reemplazá esa franja por información real de la jornada y de la sala seleccionada.

Usá cinco tarjetas o una composición visual equivalente con información contextual:

1. `PARTICIPANTES DE LA SALA`

   * Cantidad de participantes de la sala seleccionada.
   * No mezclar participantes de otras salas.

2. `EVENTOS DE LA JORNADA`

   * Eventos finalizados / total de eventos.
   * Ejemplo visual: `6 / 18`.
   * Usar los datos demo actuales, no inventar datos del Mundial.

3. `POZO DE LA SALA`

   * Pozo demo de la sala seleccionada.
   * Dejar claro que es estimado o demo.
   * No presentar dinero real.

4. `MI PUNTAJE`

   * Puntaje acumulado del usuario en esa sala y jornada.
   * Si el usuario no participa, mostrar un estado claro como:
     `Sin participación`.

5. `LÍDER DEL DÍA`

   * Nombre o identificador del primer puesto.
   * Puntaje actual.
   * Si hay empate, indicarlo.
   * No mostrar segundo o tercer premio.

Las tarjetas deben actualizarse cuando se cambia:

* Jornada.
* Sala.
* Escenario demo.
* Participación del usuario.

No hardcodees valores del Mundial:

* 44 participantes.
* 104 / 104.
* $600.000.
* $150.000.
* $50.000.
* España.
* Ganadores históricos.
* Ranking histórico.

No reutilices nombres ni puntajes del Mundial en la portada diaria.

Si el modelo actual no contiene un dato necesario, usá un estado demo coherente y documentado. No pongas textos vacíos ni `undefined`.

## 7. Hero principal diario

El gran espacio que anteriormente decía:

`ESPAÑA CAMPEONA DEL MUNDO`

debe convertirse en una pieza principal del Prode diario.

No debe contener:

* España campeona.
* Mundial terminado.
* Ranking final.
* Ganadores históricos.
* Premios históricos.
* Textos de cierre del Mundial.

Debe mostrar los próximos partidos y eventos o los eventos en curso.

### Composición recomendada

Mantener una composición de dos columnas.

#### Columna izquierda: próximo evento o eventos en curso

Mostrar el evento más importante de la jornada:

* Deporte.
* Competencia.
* Participantes.
* Hora.
* Estado.
* Resultado parcial, si está en curso.
* Marcador.
* Sets, si es tenis.
* Round y método, si es boxeo.
* Indicador de eliminación, si corresponde.
* Botón para ver o editar el pronóstico demo.
* Etiqueta `Próximo` o `En curso`.

Si hay un evento en curso, debe tener prioridad sobre los próximos.

Si no hay eventos en curso, mostrar el próximo evento por horario.

No mostrar una tarjeta vacía.

#### Eventos secundarios

Dentro del mismo hero o debajo del evento principal, mostrar dos o tres eventos próximos adicionales:

* Hora.
* Deporte.
* Participantes.
* Estado.
* Indicador de pronóstico.

No convertir el hero en una tabla.

Usar tarjetas compactas o una composición editorial.

#### Columna derecha: ranking del día

Reemplazar la tarjeta histórica de `RANKING FINAL` por:

* Etiqueta `RANKING DEL DÍA`.
* Nombre de la sala seleccionada.
* Top 5 de la jornada.
* Puntaje actual de cada participante.
* Destacar al usuario actual.
* Indicar si la clasificación es provisional.
* Mostrar empate en primer puesto si corresponde.
* Botón:

  `Ver ranking total`

El botón debe llevar al ranking completo de la jornada y sala seleccionadas.

No debe llevar automáticamente al ranking histórico del Mundial.

El ranking del día debe utilizar el ranking actual de la V2:

* Sin copiar participantes históricos.
* Sin usar el ranking del Mundial.
* Sin mezclar salas.
* Sin mostrar segundos o terceros premios.
* Sin declarar ganador definitivo mientras existan eventos pendientes.

Si la persona no está autenticada, el ranking general puede mostrarse, pero la sección de “Mi posición” debe llevar al login o mostrar un estado coherente.

## 8. Agenda diaria debajo del hero

Conservá la lógica actual de la agenda, pero adaptá su presentación visual.

Organizá los eventos por estado:

* En curso.
* Próximos.
* Finalizados.
* Suspendidos.
* Cancelados.
* Reprogramados.
* Pendientes de revisión.

La agenda debe seguir ordenando los próximos eventos por horario ascendente.

Cada tarjeta debe conservar:

* Deporte.
* Competencia.
* Participantes.
* Fecha.
* Hora.
* Estado.
* Resultado.
* Fuente.
* Última actualización.
* Tipo de evento.
* Indicador de eliminación.
* Indicador de mejor de 3 o mejor de 5.
* Indicador de KO/TKO o decisión.
* Acción de pronóstico.

Mejorá especialmente la presentación de:

* Fecha pendiente.
* Hora `--:--`.
* Estados largos.
* Fuentes.
* Datos demo.

La maqueta debe tener una fecha demo concreta y horarios demo concretos. No usar `Fecha pendiente` ni `--:--` cuando se trate de un fixture de demostración.

Los datos deben seguir identificados como:

`Datos de demostración — fuente manual`

Pero esa indicación debe integrarse como una badge o etiqueta secundaria, no dominar visualmente toda la portada.

## 9. Mi Prode y seguimiento

Conservá la lógica actual de participación y pronósticos.

Visualmente, la sección debe seguir el lenguaje de las tarjetas históricas.

Mostrar:

* Sala seleccionada.
* Pronósticos del usuario.
* Eventos acertados.
* Eventos no acertados.
* Eventos pendientes.
* Puntos obtenidos.
* Total acumulado.
* Posición.
* Diferencia con el primer puesto.
* Estado provisional o final.

No usar una tabla ancha en móvil.

En escritorio puede haber una tabla o lista amplia si entra correctamente. En móvil debe transformarse en:

* Cards.
* Filas apiladas.
* Acordeones.
* Detalles desplegables.

No esconder información importante por desborde.

## 10. Botones y cards

Recuperá el estilo de la versión anterior para:

* Botones primarios.
* Botones secundarios.
* Flechas.
* Cards informativas.
* Cards de ranking.
* Badges.
* Estados.
* Labels monoespaciados.
* Hover.
* Focus.
* Active.
* Disabled.

El botón principal debe usar el naranja del producto.

Los botones secundarios deben conservar:

* Fondo oscuro.
* Borde fino.
* Texto blanco.
* Flecha o indicador de navegación cuando corresponda.

No reemplaces los botones existentes por botones genéricos de una librería sin adaptar su estética.

Todos los botones deben seguir siendo accesibles.

## 11. Fondo animado

Recuperá el fondo con formas abstractas de la versión anterior.

Preferencias:

* Fondo negro.
* Formas grandes recortadas.
* Movimiento lento y sutil.
* Degradados oscuros.
* Naranja, violeta, amarillo y verde en baja intensidad.
* Formas detrás del contenido.
* El contenido debe seguir siendo legible.
* No usar animaciones agresivas.
* No generar ruido visual en las tarjetas.

Reutilizá la implementación existente si está disponible.

Si hay que refactorizarla:

* Separá el fondo como componente reutilizable.
* Evitá repetirlo manualmente en cada página.
* Mantené la página histórica funcionando.
* Respetá `prefers-reduced-motion`.
* Con movimiento reducido, las formas pueden quedar estáticas o con una animación mínima.

No uses imágenes externas para reemplazar este fondo si ya existe una implementación CSS o SVG adecuada.

## 12. Reglas que no se deben romper

No alterar:

* Fútbol 3/2/0.
* Tenis 3/1/0.
* Boxeo provisional 3/2/1/0.
* Marcador de fútbol a 90 minutos.
* Separación de alargue y penales.
* Clasificado separado.
* Sets de tenis.
* KO/TKO, método y round.
* Una entrada por persona, sala y jornada.
* Varias salas por jornada.
* Pozos independientes.
* Reparto del pozo entre empatados en el primer puesto.
* Auditoría.
* Bloqueos manuales.
* Correcciones.
* Fuente manual.
* Estados de jornada.
* Protección de `/admin/diario`.

Esta tarea es de adaptación UX/UI y composición de la experiencia. No cambies la lógica funcional para resolver un problema visual.

## 13. Historial del Mundial

No modifiques el contenido funcional de:

* `/historial`
* `/historial/mundial`

No elimines:

* Ranking final.
* España campeona.
* Premios históricos.
* Participantes históricos.
* Resultados históricos.
* Auditoría histórica.

Es correcto que esos textos sigan existiendo dentro del historial.

Lo que no debe ocurrir es que aparezcan en:

* `/`
* `/diario`
* El ranking diario.
* Las salas diarias.
* La agenda diaria.
* Mi Prode diario.

## 14. Responsive

Verificá como mínimo:

* 320 px.
* 390 px.
* 768 px.
* 1024 px.
* 1366 px.
* 1440 px.

En escritorio:

* Navbar completo.
* Franja naranja de tarjetas.
* Hero de dos columnas.
* Agenda con buena densidad.
* Ranking lateral.
* Fondo visible.
* Márgenes similares a la referencia.

En tablet:

* Hero adaptado.
* Ranking debajo o al costado según espacio.
* Cards de métricas en grilla.
* Navegación usable.

En móvil:

* Navbar compacto.
* Franja de métricas en grilla vertical o de dos columnas.
* No usar scroll horizontal para métricas.
* Hero apilado.
* Evento principal arriba.
* Ranking del día debajo.
* Agenda en cards.
* Mi Prode en cards o acordeones.
* Botones a ancho cómodo.
* Texto legible.
* No cortar títulos.
* No esconder la acción principal.
* No generar overflow horizontal.

No resolver responsive con `overflow-x: auto` como solución general.

## 15. Estados visuales

Verificá estos escenarios:

* Jornada con eventos próximos.
* Jornada con eventos en curso.
* Jornada con eventos finalizados.
* Jornada sin eventos.
* Jornada con error.
* Jornada cargando.
* Usuario sin participación.
* Usuario participando en una sala.
* Usuario participando en varias salas.
* Sala de $5.000.
* Sala de $10.000.
* Sala de $20.000.
* Ranking con líder.
* Ranking con empate en primer puesto.
* Clasificación provisional.
* Jornada cerrada.
* Partido de fútbol normal.
* Partido de fútbol con eliminación.
* Partido con alargue y penales.
* Tenis al mejor de 3.
* Tenis al mejor de 5.
* Boxeo KO/TKO.
* Boxeo por decisión.
* Evento suspendido.
* Evento cancelado.
* Evento reprogramado.
* Datos demo manuales.
* Panel admin protegido.
* Usuario no autenticado.

Ningún estado debe mostrar textos del Mundial dentro de la experiencia diaria.

## 16. No tocar Supabase

No crear:

* Tablas.
* Migraciones.
* RPC.
* Triggers.
* Policies.
* Branches de Supabase.
* Proyectos nuevos.
* Datos persistentes.
* Variables de entorno.
* Cambios de producción.

Podés inspeccionar documentación o configuración solamente si es necesario para no romper la integración actual, pero no realices escrituras.

El modo diario continúa siendo demo/manual y en memoria.

Documentá que la mejora visual no incorpora persistencia.

## 17. Documentación

Conservá P001–P010 sin sobrescribirlos.

Registrá este prompt como:

`docs/ai/prompts/P011-adaptacion-ux-ui-prode-diario.md`

Creá o actualizá:

* `docs/ai/README.md`
* `docs/ai/estado-actual.md`
* `docs/ai/vision-v2.md`
* `docs/ai/decisiones/P011-adaptacion-ux-ui.md`
* `docs/ai/ejecuciones/P011-adaptacion-ux-ui.md`

Documentá:

* Qué elementos visuales del Mundial se reutilizaron.
* Qué elementos se adaptaron.
* Qué información histórica fue reemplazada.
* Cómo se construye el ranking del día.
* Cómo se calcula el contenido de la franja superior.
* Qué ocurre cuando faltan datos.
* Qué queda como demo.
* Cómo se preservó la página histórica.
* Qué componentes visuales quedaron reutilizables.
* Qué se verificó en responsive.

## 18. Testeo funcional y visual

Ejecutá:

`npm run daily-prode:verify-contract`

`npm run daily-prode:verify-contract -- --json`

`npx tsc --noEmit --pretty false`

`npm run build`

`git diff --check`

Ejecutá ESLint dirigido sobre los archivos modificados.

No corrijas la deuda previa de lint en archivos no relacionados salvo que una modificación de P011 la afecte directamente.

Si existe navegador automatizado o Playwright, realizá una revisión visual de:

* `/`
* `/diario`
* `/historial`
* `/historial/mundial`
* `/ranking`
* `/admin/diario`
* `/login`

Verificá:

* Navbar.
* Franja naranja.
* Hero.
* Ranking del día.
* Botón `Ver ranking total`.
* Agenda.
* Cambio de salas.
* Cambio de fecha.
* Estados de evento.
* Responsive.
* Fondo animado.
* Ausencia de overflow.
* Ausencia de errores de consola.
* Ausencia de overlays.
* Protección del panel admin.

Compará la composición contra las capturas de referencia.

No alcanza con validar solamente que la ruta responda `200`.

Si no existe navegador automatizado, hacé las validaciones disponibles y dejá explícito qué parte visual no pudo comprobarse.

## 19. Commit y publicación

Cuando el desarrollo y el testeo estén completos:

1. Revisá todos los cambios.
2. Confirmá que no haya secretos.
3. Confirmá que `supabase/.temp/` no esté incluido.
4. Confirmá que no haya cambios de Supabase.
5. Creá un commit local:

`feat: restore prode visual language for daily experience`

6. Ejecutá:

`git push origin main`

7. Esperá el deployment asociado a `main`.
8. Verificá que Vercel haya publicado el commit correcto.
9. Comprobá la URL pública:

`https://prode-mundial2026-kappa.vercel.app/`

10. No cambies el dominio.
11. No cambies la configuración de Vercel.
12. No actualices automáticamente la rama `dev` si eso implica sobrescribir commits propios.
13. Informá el estado de `dev`.

Si el push falla por permisos o autenticación:

* No fuerces el push.
* No cambies el remoto.
* No subas credenciales.
* Informá el bloqueo exacto.

Si Vercel falla:

* Revisá logs.
* Corregí solamente errores causados por P011.
* Volvé a validar.
* Hacé un nuevo commit si corresponde.
* Volvé a subir `main`.
* No declares la tarea finalizada hasta verificar la URL o informar el bloqueo.

## 20. Criterios de aceptación

P011 se considera terminado cuando:

* La portada diaria conserva claramente la identidad visual del Mundial.
* El navbar vuelve a tener una composición equivalente.
* La franja naranja muestra información diaria, no premios históricos.
* No aparecen segundo ni tercer premio.
* El hero muestra próximos eventos o eventos en curso.
* Existe un ranking del día visible.
* El ranking muestra top 5.
* Existe el botón `Ver ranking total`.
* El ranking respeta la sala seleccionada.
* La agenda mantiene la lógica actual.
* Se conservan estados, filtros y pronósticos.
* El fondo abstracto está recuperado.
* El fondo respeta movimiento reducido.
* Las tarjetas y botones respetan la estética anterior.
* No aparecen textos del Mundial fuera del historial.
* La experiencia funciona en móvil, tablet y escritorio.
* No existe overflow horizontal.
* No hay datos demo con fecha u hora vacía.
* El panel admin sigue protegido.
* La auditoría sigue funcionando.
* No se modificó el scoring.
* No se modificó Supabase.
* El contrato sigue en verde.
* TypeScript pasa.
* El build pasa.
* El cambio está commiteado.
* `main` fue subido.
* Vercel publicó la nueva versión.
* La URL pública fue verificada.

## 21. Entrega final

Devolveme:

1. Estado final de Git.
2. Commit creado.
3. Archivos visuales modificados.
4. Componentes históricos reutilizados.
5. Qué cambió en la portada.
6. Qué muestran ahora las cinco tarjetas superiores.
7. Cómo funciona el ranking del día.
8. Qué contiene el hero.
9. Cómo se adaptó el responsive.
10. Qué se verificó en las capturas.
11. Resultado del contrato de 122 controles.
12. Resultado de TypeScript.
13. Resultado del build.
14. Estado del push.
15. Estado del deployment.
16. URL pública verificada.
17. Estado de la rama `dev`.
18. Limitaciones que continúan.
19. Próximo paso recomendado.

No te detengas en un plan. Implementá la adaptación completa, testeala, commiteala, subila a `main` y verificá la publicación.

# P002 — Reglas funcionales y base de V2: Prode diario multideporte

Continuamos el trabajo sobre la V2 del proyecto.

## Contexto verificado

El repositorio correcto es:

`C:\Users\juana\Desktop\Proyectos\prode-mundial-2026`

Datos conocidos:

* Remoto: `https://github.com/prodecopadelmundo2026/ProdeMundial2026`
* Rama: `main`
* Commit base informado: `22bd94e`
* Stack: Next.js, TypeScript, Supabase y Vercel.
* Se debe conservar sin modificar `supabase/.temp/`, que ya estaba sin trackear.

En el avance anterior se implementaron:

* `/diario`
* `/historial`
* Datos demo aislados.
* Componentes de agenda y participación.
* Documentación en `docs/ai/`.
* Prompt P001.
* Build y TypeScript correctos.
* Lint global con deuda previa en archivos no tocados.
* Capturas responsive en 320, 390, 768, 1024 y 1366 píxeles.

Antes de tocar nada, verificá el estado actual de Git, el commit real, los cambios existentes y la documentación. No supongas que el estado actual coincide exactamente con este resumen.

## 1. Objetivo general de la V2

El proyecto deja de estar centrado en el Mundial y pasa a funcionar como un prode diario con eventos de distintos deportes:

* Fútbol.
* Tenis.
* Boxeo.
* Otros deportes que podamos agregar después.

Cada jornada tendrá eventos del día. Los usuarios podrán participar en distintas salas según el importe de entrada.

Ejemplos de salas:

* $5.000.
* $10.000.
* $20.000.

Cada sala debe tener sus propios participantes, pozo y clasificación. No se deben mezclar resultados, puntos ni premios entre salas.

La persona podrá participar en varias salas durante una misma jornada, pero inicialmente tendrá una sola participación por sala y por jornada.

No se permiten varias entradas dentro de la misma sala hasta que se defina expresamente esa funcionalidad.

El ganador es quien más puntos obtenga dentro de cada sala. No existen premios para segundo ni tercer puesto.

Si dos o más personas empatan en el primer lugar, el pozo se reparte entre ellas en partes iguales.

La clasificación puede mostrar todas las posiciones, pero solamente el primer puesto, o los primeros puestos empatados, recibe el premio.

Todavía no se deben implementar pagos, retiros ni liquidación de dinero real. Las salas y los importes pueden mostrarse como datos demo.

## 2. Portada y navegación

La experiencia diaria debe convertirse en la portada principal `/`.

Mantener `/diario` funcionando como ruta equivalente o alias, para no romper enlaces ni pruebas existentes.

El Mundial debe dejar de ocupar la portada, pero no debe borrarse.

Mantener una sección histórica accesible desde `/historial`, donde se pueda consultar el Mundial y las ediciones anteriores.

No eliminar datos, rankings, resultados, pronósticos, premios ni funciones administrativas del Mundial.

No recalcular el Mundial usando las reglas nuevas.

Separar claramente:

* Jornadas actuales.
* Salas actuales.
* Historial del Mundial.
* Futuras jornadas cerradas.

## 3. Puntaje confirmado para fútbol

Implementar el concepto de que acertar el resultado exacto otorga más puntos que acertar solamente el resultado general.

Usar inicialmente una escala configurable basada en unidades:

* Resultado exacto: 3 puntos.
* Resultado general: 2 puntos.
* Resultado incorrecto: 0 puntos.

El resultado general significa acertar:

* Victoria del local.
* Empate.
* Victoria del visitante.

Por ejemplo:

* Pronóstico: 2-1.
* Resultado real: 2-1.
* Puntaje: 3.

Otro caso:

* Pronóstico: 2-1.
* Resultado real: 1-0.
* Ambos indican victoria local.
* Puntaje: 2.

Otro caso:

* Pronóstico: 2-1.
* Resultado real: 0-2.
* Puntaje: 0.

Dejá estos valores configurables y documentados, no distribuidos como números mágicos por distintos componentes.

## 4. Partidos de eliminación con alargue o penales

No trates todos los partidos de fútbol como si un empate siempre fuera el resultado final.

En partidos de copa que puedan definirse por alargue o penales, especialmente:

* Partidos únicos.
* Partidos de vuelta.
* Partidos donde se define un clasificado.

El modelo debe distinguir como mínimo:

1. Marcador del partido.
2. Resultado general del partido.
3. Equipo que gana o clasifica después del criterio de desempate correspondiente.

La interfaz debe poder pedir una predicción adicional cuando el evento lo requiera:

* Quién gana o clasifica.
* Marcador exacto del partido.
* Si corresponde, si la definición fue en tiempo reglamentario, alargue o penales.

No inventes todavía una regla definitiva para el puntaje de esta situación si el código actual no permite representarla correctamente.

Prepará el modelo y la interfaz para que estos casos no se confundan con un empate común.

Documentá como decisión pendiente:

* Si el resultado exacto se refiere a los 90 minutos, a los 120 minutos o al resultado final sin contar el marcador de penales.
* Si acertar el clasificado tendrá un puntaje independiente.
* Cómo se puntúa acertar el ganador pero no el marcador.

Si necesitás una propuesta para avanzar con la maqueta, usá una configuración provisional claramente marcada como demo y dejá la regla lista para cambiarse desde un único lugar.

## 5. Puntaje confirmado para tenis

En tenis no existe el empate.

La predicción debe permitir seleccionar el ganador y, según el formato del partido, el resultado exacto en sets.

Ejemplos:

* Al mejor de 3: 2-0 o 2-1.
* Al mejor de 5: 3-0, 3-1 o 3-2.

Puntaje inicial:

* Resultado exacto de sets: 3 puntos.
* Ganador correcto, pero resultado de sets incorrecto: 1 punto.
* Ganador incorrecto: 0 puntos.

Es decir, si una persona pronostica 2-0 y gana la jugadora correcta, pero el partido termina 2-1, obtiene 1 punto.

Si no acierta quién ganó, obtiene 0 puntos, aunque haya elegido una cantidad de sets parecida.

El formato del evento debe indicar si es al mejor de 3 o al mejor de 5. No mostrar opciones imposibles para ese formato.

Los valores deben ser configurables y estar centralizados.

## 6. Puntaje inicial propuesto para boxeo

El boxeo debe permitir pronosticar:

* Ganador.
* Si la pelea termina por KO/TKO o por decisión/no KO.
* Round exacto cuando corresponda un KO/TKO.

Como propuesta inicial configurable:

* Ganador correcto + método correcto + round exacto: 3 puntos.
* Ganador correcto + método correcto, pero round incorrecto: 2 puntos.
* Ganador correcto, pero método incorrecto: 1 punto.
* Ganador incorrecto: 0 puntos.

Esta matriz debe quedar identificada como propuesta inicial hasta que la confirmemos funcionalmente.

Para decisiones, empates o resultados anulados, prepará estados específicos. No fuerces un evento de boxeo a comportarse como un partido de fútbol.

La interfaz debe ocultar el selector de round cuando la persona indique que la pelea terminará por decisión/no KO.

Si el resultado real todavía no permite determinar los puntos, mostrarlo como pendiente de resolución.

## 7. Seguimiento de la participación

En la portada, debajo de la agenda, el usuario debe poder ver su participación en la sala seleccionada.

Mostrar:

* Evento.
* Deporte.
* Pronóstico realizado.
* Resultado actual.
* Estado del evento.
* Estado del pronóstico.
* Puntos obtenidos.
* Total acumulado.
* Posición dentro de la sala.
* Pozo estimado de la sala.
* Estado provisional o final de la jornada.

Distinguir claramente:

* Pendiente.
* En curso.
* Acertado parcialmente.
* Acertado exactamente.
* No acertado.
* Suspendido.
* Cancelado.
* Anulado.
* Pendiente de revisión.

No mostrar puntos definitivos cuando el resultado todavía sea parcial o pueda cambiar.

## 8. Agenda diaria

La portada debe mostrar los eventos del día ordenados de arriba hacia abajo según el horario de inicio.

Mostrar primero:

* Eventos próximos, ordenados por horario ascendente.
* Eventos en curso.
* Eventos finalizados.

Cada tarjeta o fila debe incluir:

* Deporte.
* Competencia.
* Participantes.
* Fecha.
* Hora de inicio.
* Estado.
* Resultado, cuando exista.
* Fuente de la información.
* Última actualización.
* Indicador de evento suspendido, reprogramado o cancelado.

Usar inicialmente horario de Buenos Aires y documentar ese supuesto.

No confundir:

* Hora de transmisión.
* Hora programada de inicio.
* Hora real de comienzo.

Si la fuente futura entrega ambos valores, conservarlos separados.

Preparar navegación por fecha, pero no crear todavía calendarios por torneo ni llaves eliminatorias.

## 9. Resultados automáticos y administración

La carga manual no debe ser el funcionamiento principal de la V2.

Preparar el sistema para recibir automáticamente:

* Calendario.
* Horarios.
* Estados.
* Resultados.
* Participantes.
* Marcadores.
* Sets.
* Rounds.
* Método de victoria.

Todavía no elegir ni contratar un proveedor.

Crear una capa o interfaz de adaptación para que el proveedor futuro se adapte al modelo interno del proyecto.

Contemplar desde el modelo:

* Identificadores estables.
* Prevención de eventos duplicados.
* Actualizaciones repetidas.
* Eventos suspendidos.
* Eventos cancelados.
* Eventos reprogramados.
* Resultados parciales.
* Resultados corregidos.
* Fuentes diferentes según el deporte.
* Fecha de última sincronización.

Mantener la herramienta de administración para que un administrador pueda:

* Corregir datos.
* Completar datos faltantes.
* Confirmar resultados.
* Revisar resultados automáticos.
* Resolver eventos excepcionales.

Toda modificación manual debe registrar:

* Valor anterior.
* Valor nuevo.
* Usuario.
* Fecha y hora.
* Motivo o comentario.
* Fuente del cambio.
* Si fue una corrección manual o automática.

Una actualización automática no debe sobrescribir silenciosamente una corrección manual.

Todavía no decidir si cada resultado requiere confirmación manual, pero dejar documentada una propuesta para manejar conflictos entre datos automáticos y ediciones administrativas.

## 10. Responsive y UX/UI

Conservar la identidad visual y los componentes actuales que funcionen bien.

La experiencia debe funcionar correctamente en:

* Celulares.
* Tablets.
* Notebooks.
* Monitores de escritorio.

No utilizar tablas que obliguen a desplazarse horizontalmente.

En pantallas pequeñas, adaptar la información con:

* Tarjetas.
* Filas apiladas.
* Detalles desplegables.
* Secciones colapsables.
* Indicadores resumidos.

La clasificación debe seguir siendo legible sin scroll horizontal.

Verificar como mínimo:

* 320 px.
* 390 px.
* 768 px.
* 1024 px.
* 1366 px.

Probar especialmente:

* Nombres largos.
* Muchos eventos.
* Muchas personas en una sala.
* Resultados extensos.
* Estados de carga.
* Errores.
* Jornadas sin eventos.
* Usuario sin participación.
* Usuario en varias salas.
* Evento en curso.
* Evento cancelado.

No reutilizar la estructura visual de la llave del Mundial.

## 11. Modelo conceptual sugerido

Revisá el modelo actual y proponé cómo representar, sin romper lo existente:

* Jornada.
* Sala.
* Importe de entrada.
* Participación.
* Evento.
* Deporte.
* Competencia.
* Formato del evento.
* Participantes.
* Pronóstico.
* Resultado.
* Regla de puntaje.
* Puntos obtenidos.
* Pozo.
* Clasificación.
* Ganador.
* Auditoría.
* Fuente de datos.
* Corrección administrativa.

No crees migraciones destructivas.

Si el modelo actual del Mundial está muy acoplado a sus reglas, separá progresivamente la lógica nueva sin eliminar la anterior.

El puntaje debe estar centralizado y ser configurable por tipo de deporte o formato de evento.

## 12. Documentación obligatoria

Verificá si existe un `AGENTS.md` en la raíz.

Si no existe, crealo con reglas breves para que Codex:

* Consulte primero la documentación de `docs/ai/`.
* Preserve el historial del Mundial.
* No haga cambios destructivos.
* No use datos reales para demos.
* Mantenga la auditoría.
* Testee antes de finalizar.
* Documente cada tarea.
* No haga deploy ni cambios externos sin autorización explícita.

Conservá P001 sin sobrescribirlo.

Registrá este prompt como:

`docs/ai/prompts/P002-reglas-funcionales-v2.md`

Actualizá o creá los documentos necesarios:

* `docs/ai/README.md`
* `docs/ai/vision-v2.md`
* `docs/ai/estado-actual.md`
* `docs/ai/decisiones/P002-reglas-puntaje.md`
* `docs/ai/ejecuciones/P002-reglas-funcionales-v2.md`

En la documentación diferenciá:

* Reglas confirmadas.
* Propuestas iniciales.
* Supuestos de maqueta.
* Decisiones pendientes.
* Funcionalidad implementada.
* Funcionalidad todavía simulada.

## 13. Alcance autorizado

En este avance podés:

1. Crear o actualizar `AGENTS.md`.
2. Documentar las reglas funcionales.
3. Centralizar la configuración provisional de puntajes.
4. Convertir `/` en la portada diaria, manteniendo `/diario`.
5. Mejorar la maqueta de agenda, salas, participación y clasificación.
6. Preparar el modelo para eventos de fútbol, tenis y boxeo.
7. Mantener el Mundial separado e intacto.
8. Agregar datos demo claramente aislados.
9. Testear y verificar responsive.

No podés todavía:

* Integrar un proveedor real.
* Activar pagos.
* Crear retiros.
* Liquidar premios reales.
* Hacer migraciones destructivas.
* Borrar información del Mundial.
* Recalcular rankings históricos.
* Cambiar el dominio.
* Cambiar configuraciones externas de Vercel o Supabase.
* Instalar servicios pagos.
* Solucionar deuda previa de lint en archivos no relacionados.
* Hacer push o deploy sin autorización explícita.

## 14. Testeo y entrega

Ejecutá los comandos disponibles para:

* TypeScript.
* ESLint dirigido.
* Tests.
* Build.
* `git diff --check`.

No tomes como falla nueva la deuda previa de lint global si continúa limitada a archivos no tocados. Informá exactamente qué archivos fallan.

Verificá visualmente:

* `/`
* `/diario`
* `/historial`
* Usuario sin participación.
* Usuario en varias salas.
* Fútbol normal.
* Fútbol de eliminación.
* Tenis al mejor de 3.
* Tenis al mejor de 5.
* Boxeo con KO.
* Boxeo por decisión.
* Evento pendiente.
* Evento finalizado.
* Evento suspendido o cancelado.
* Clasificación con empate en el primer puesto.
* Ausencia de scroll horizontal.

Al finalizar devolveme:

1. Estado real del repositorio.
2. Archivos creados o modificados.
3. Qué reglas quedaron implementadas.
4. Qué reglas quedaron configurables.
5. Qué reglas siguen pendientes de definición.
6. Cómo se resolvió el pase de `/diario` a `/`.
7. Cómo se preservó el Mundial.
8. Qué documentación se actualizó.
9. Qué testeos se ejecutaron.
10. Qué falló y si ya existía previamente.
11. Qué falta para conectar eventos y resultados reales.
12. Hasta tres preguntas concretas cuya respuesta sea necesaria para continuar.

No inventes decisiones sobre los casos ambiguos de fútbol con penales ni sobre detalles del boxeo sin dejarlas expresamente marcadas como propuestas.

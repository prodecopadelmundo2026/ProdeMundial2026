# P003 — Definición de reglas de resultados y selección del proveedor deportivo

Continuamos la V2 del Prode diario sobre el repositorio:

`C:\Users\juana\Desktop\Proyectos\prode-mundial-2026`

Antes de trabajar:

* Verificá el estado real de Git, rama, remoto y commit actual.
* Conservá intacto `supabase/.temp/`.
* Revisá si existe `AGENTS.md` en la raíz. Si no existe, informalo y crealo con las reglas persistentes del proyecto.
* No hagas push, deploy, cambios externos ni modificaciones en Supabase con esta tarea.
* No borres ni recalcules información del Mundial.
* No soluciones la deuda previa de lint en archivos no relacionados.

## Reglas funcionales confirmadas

### Participación

* Una persona puede participar en varias salas durante la misma jornada.
* Tiene una sola participación por sala y por jornada.
* No puede duplicar entradas dentro de la misma sala hasta que se defina esa funcionalidad.
* Cada sala tiene sus propios participantes, pozo y clasificación.
* No se mezclan puntos ni premios entre salas.
* El ganador es quien más puntos obtiene en cada sala.
* No hay segundo ni tercer premio.
* Si hay empate en el primer puesto, el pozo se reparte en partes iguales entre los empatados.

### Fútbol

Puntaje inicial:

* Resultado exacto: 3 puntos.
* Resultado general — local, empate o visitante: 2 puntos.
* Resultado incorrecto: 0 puntos.

En partidos comunes, el resultado exacto se evalúa con el marcador a los 90 minutos.

En partidos de copa o eliminación que puedan definirse mediante alargue o penales:

* El marcador exacto continúa siendo el marcador a los 90 minutos.
* Los penales no forman parte del marcador exacto.
* Debe existir una predicción separada para el equipo que gana o clasifica.
* El ganador o clasificado se determina después del alargue o de los penales, según corresponda.
* La interfaz debe informar si el partido puede definirse de esa manera.
* No se debe tratar un empate a los 90 minutos como resultado definitivo si el partido define un clasificado.

El puntaje específico de acertar el equipo clasificado todavía queda pendiente. Prepará el modelo para soportarlo sin inventar todavía su valor definitivo.

Conservá separados:

* Marcador a los 90 minutos.
* Marcador después del alargue, si existe.
* Resultado de la tanda de penales, si existe.
* Equipo ganador o clasificado.

### Tenis

Puntaje inicial:

* Resultado exacto en sets: 3 puntos.
* Ganador correcto, pero sets incorrectos: 1 punto.
* Ganador incorrecto: 0 puntos.

El formato debe distinguir entre:

* Mejor de 3 sets.
* Mejor de 5 sets.

No mostrar opciones imposibles según el formato del partido.

### Boxeo

Usar inicialmente esta matriz configurable:

* 3 puntos: ganador correcto, método KO/TKO correcto y round exacto.
* 2 puntos: ganador correcto y método correcto, pero round incorrecto.
* 2 puntos: ganador correcto y victoria por decisión/no KO.
* 1 punto: ganador correcto, pero método incorrecto.
* 0 puntos: ganador incorrecto.

En una pelea por decisión/no KO no debe mostrarse selector de round.

Dejar pendientes de definición:

* Empate.
* No contest.
* Pelea anulada.
* Pelea suspendida.
* Pelea reprogramada.
* Si una pelea anulada devuelve la participación, la deja sin efecto o se reemplaza.

No inventar automáticamente esas reglas.

## Auditoría

Toda actualización automática o manual de resultados debe poder registrar:

* Valor anterior.
* Valor nuevo.
* Usuario o proceso que realizó el cambio.
* Fecha y hora.
* Fuente.
* Motivo.
* Si fue una actualización automática, una corrección manual o una confirmación administrativa.

Una corrección manual no debe ser sobrescrita silenciosamente por la siguiente actualización automática.

## Próximo objetivo: definir proveedor

Todavía no integres ningún proveedor y no agregues dependencias.

Realizá un análisis comparativo de proveedores capaces de entregar, como mínimo:

* Calendarios de fútbol.
* Partidos en vivo y estados.
* Resultados finales.
* Alargue y penales.
* Torneos y partidos de vuelta.
* Tenis con marcador por sets.
* Boxeo con ganador, método y round cuando esos datos estén disponibles.
* Identificadores estables.
* Estados de suspendido, cancelado, reprogramado y finalizado.
* Fecha y hora de última actualización.
* Datos compatibles con horario de Buenos Aires.

Para cada alternativa investigá:

* Deportes y competencias cubiertas.
* Calidad y detalle de los datos.
* Frecuencia de actualización.
* Identificadores y deduplicación.
* Tratamiento de eventos en vivo.
* Tratamiento de resultados corregidos.
* Límites de la API.
* Plan gratuito o costo estimado.
* Condiciones de uso y licencias para mostrar los datos públicamente.
* Documentación oficial.
* Complejidad de integración con Next.js, TypeScript y Supabase.
* Riesgo de depender de un único proveedor.

No elijas ni contrates automáticamente.

Presentá una comparación y una recomendación razonada. Si una alternativa cubre bien fútbol y tenis pero no boxeo, dejalo explícito y proponé cómo podría resolverse sin acoplar todo el modelo a ese proveedor.

## Modelo y Supabase

No crees todavía migraciones ni tablas.

Revisá si el modelo aislado en `src/lib/daily-prode/` puede representar los datos necesarios de los proveedores analizados.

Si detectás campos faltantes, documentalos como propuesta. No modifiques todavía la base.

La próxima tarea, después de elegir proveedor, será crear tablas nuevas mediante migraciones no destructivas para:

* Jornadas.
* Salas.
* Participaciones.
* Eventos.
* Participantes.
* Pronósticos.
* Resultados.
* Fuentes.
* Sincronizaciones.
* Correcciones.
* Auditoría.
* Reglas de puntaje.

## Documentación

Conservá P001 y P002 sin sobrescribirlos.

Registrá este prompt como:

`docs/ai/prompts/P003-proveedor-y-reglas-de-resultados.md`

Actualizá:

* `docs/ai/README.md`
* `docs/ai/vision-v2.md`
* `docs/ai/estado-actual.md`
* `docs/ai/decisiones/P003-proveedor-y-reglas-de-resultados.md`
* `docs/ai/ejecuciones/P003-proveedor-y-reglas-de-resultados.md`

Diferenciá claramente:

* Reglas confirmadas.
* Reglas provisionales.
* Reglas pendientes.
* Datos que cada proveedor puede entregar.
* Datos que deberán ser corregidos manualmente.

## Entrega

Devolveme:

1. Estado real del repositorio.
2. Si existe `AGENTS.md` y qué reglas contiene.
3. Cómo quedó modelado cada tipo de evento.
4. Cómo quedó representado el marcador a 90 minutos y el clasificado.
5. Qué proveedores analizaste.
6. Qué proveedor recomendás y por qué.
7. Qué limitaciones tiene cada alternativa.
8. Qué campos faltan para integrar datos reales.
9. Qué quedó documentado.
10. Qué sigue después de esta tarea.

No hagas integración real, migraciones, push ni deploy hasta que el proveedor esté elegido explícitamente.

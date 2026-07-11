# Special Bets

Este documento describe la lógica esperada para apuestas especiales del Prode.

## Objetivo

Las apuestas especiales permiten sumar puntos por predicciones no asociadas a un partido individual, por ejemplo:

- Balón de Oro.
- Botín/Bota de Oro.
- Guante de Oro.

## Funcionamiento

El usuario carga una respuesta por cada categoría habilitada. Esas respuestas se guardan separadas de los pronósticos de partidos.

Reglas esperadas:

- No mezclarlas con predicciones de partidos.
- No recalcularlas hasta tener resultado oficial de la apuesta especial.
- No incluirlas dentro de "Cargar eliminatorias disponibles".
- Mantener carga admin de prueba separada.
- Mantener el texto original de `public.special_bets` como evidencia.
- Guardar cualquier interpretación contra jugadores canónicos en tablas separadas.
- No usar `special_bets.points` ni tocar ranking hasta que admin cargue, confirme y bloquee ganador oficial.
- Permitir más de un ganador oficial por premio cuando el resultado oficial lo requiera.

## Normalización de nombres

Los nombres deben normalizarse para evitar diferencias artificiales.

Normalización esperada:

- Trim.
- Colapsar espacios múltiples.
- Comparación case-insensitive.
- No usar `unaccent` hasta confirmar que la extensión existe.

Ejemplos equivalentes deseables si se definen como aliases válidos:

- `Emiliano Martinez`.
- `Emiliano Martínez`.
- `Dibu Martinez`.
- `Dibu Martínez`.

La normalización técnica agrupa textos, pero no pisa el valor original guardado por el usuario.

## Sugerencias y autocomplete

Para reducir errores de escritura, la UI debería evolucionar hacia:

- Autocomplete de jugadores.
- Lista curada por selección o torneo.
- Validación visual si el nombre no coincide con ninguna sugerencia.

Mientras no exista fuente oficial conectada, puede mantenerse input libre con normalización.

## Revisión manual admin

Como las apuestas especiales pueden tener aliases y nombres ambiguos, el admin debería poder revisar:

- Respuestas originales.
- Versión normalizada.
- Equivalencias aplicadas.
- Estado de revisión.
- Resultado oficial cargado.
- Puntos otorgados solo cuando exista scoring especial aprobado.

El diseño actualizado para normalización, catálogo de jugadores, ganadores múltiples y estadísticas personales está documentado en `docs/logic/player-special-awards-and-stats.md`.

## Botín de Oro

La tabla de goleadores es información visual y una referencia para seguir la apuesta de Botín de Oro.

Ser máximo goleador en esa tabla no debe activar scoring automáticamente. El scoring especial solo podrá ejecutarse cuando admin confirme y bloquee el resultado oficial.

Si hay empate oficial entre dos o más goleadores:

- todos deben registrarse como ganadores oficiales;
- los usuarios que hayan apostado por cualquiera de ellos reciben el puntaje completo definido por reglamento;
- el puntaje no se divide.

Esta lógica se documenta ahora, pero no se implementa todavía en scoring.

## Estadísticas personales

Goles, asistencias, tarjetas amarillas, tarjetas rojas, barridas ganadas y cualquier otra estadística personal son únicamente informativas y visuales.

No tienen relación con scoring, ranking, `predictions.points`, `special_bets.points` ni RPCs actuales.

El modelo propuesto usa:

- `player_stat_types` como catálogo extensible de estadísticas;
- `player_tournament_stat_values` como valor actual por torneo, jugador y tipo.

El admin carga totales actuales, por ejemplo `7 goles`, mediante una actualización idempotente sobre `(tournament_key, player_id, stat_type_id)`. No se registran acciones incrementales como `sumar 1 gol`.

## Equivalencias inteligentes

Futuro deseable:

- Tabla de aliases por jugador.
- Matching sin acentos si la infraestructura lo permite.
- Matching por nombre/apellido.
- Advertencia cuando haya múltiples candidatos.

La equivalencia inteligente no debe modificar el texto original cargado por el usuario; debe usarse para evaluar y auditar.

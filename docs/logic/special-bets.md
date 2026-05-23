# Special Bets

Este documento describe la logica esperada para apuestas especiales del Prode.

## Objetivo

Las apuestas especiales permiten sumar puntos por predicciones no asociadas a un partido individual, por ejemplo:

- Balon de Oro.
- Bota de Oro.
- Guante de Oro.

## Funcionamiento

El usuario carga una respuesta por cada categoria habilitada. Esas respuestas se guardan separadas de los pronosticos de partidos.

Reglas esperadas:

- No mezclarlas con predicciones de partidos.
- No recalcularlas hasta tener resultado oficial de la apuesta especial.
- No incluirlas dentro de "Cargar eliminatorias disponibles".
- Mantener carga admin de prueba separada.

## Normalizacion De Nombres

Los nombres deben normalizarse para evitar diferencias artificiales.

Normalizacion esperada:

- Trim.
- Colapsar espacios multiples.
- Comparacion case-insensitive.
- Idealmente remover o igualar acentos para comparacion.

Ejemplos equivalentes deseables:

- `Emiliano Martinez`.
- `Emiliano Martínez`.
- `Dibu Martinez` si se define como alias valido.

## Sugerencias Y Autocomplete

Para reducir errores de escritura, la UI deberia evolucionar hacia:

- Autocomplete de jugadores.
- Lista curada por seleccion o torneo.
- Validacion visual si el nombre no coincide con ninguna sugerencia.

Mientras no exista fuente oficial conectada, puede mantenerse input libre con normalizacion.

## Revision Manual Admin

Como las apuestas especiales pueden tener aliases y nombres ambiguos, el admin deberia poder revisar:

- Respuestas originales.
- Version normalizada.
- Equivalencias aplicadas.
- Resultado oficial cargado.
- Puntos otorgados.

## Equivalencias Inteligentes

Futuro deseable:

- Tabla de aliases por jugador.
- Matching sin acentos.
- Matching por nombre/apellido.
- Advertencia cuando haya multiples candidatos.

La equivalencia inteligente no debe modificar el texto original cargado por el usuario; debe usarse para evaluar y auditar.

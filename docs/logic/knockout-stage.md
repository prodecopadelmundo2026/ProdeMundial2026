# Knockout Stage

Este documento describe la logica esperada para armar eliminatorias del Mundial 2026 dentro de Mi Prode.

## Regla De Clasificacion

El torneo tiene:

- 12 grupos de 4 equipos.
- Clasifican primero y segundo de cada grupo.
- Clasifican tambien los 8 mejores terceros.

Si hay empates que el sistema no puede resolver automaticamente, se mantiene la logica de desempate manual del usuario. Mientras existan desempates pendientes, no deben armarse eliminatorias definitivas.

## Calculo De Posiciones

La tabla de cada grupo se calcula desde los pronosticos de fase de grupos del usuario.

Criterios base:

- Puntos.
- Diferencia de gol.
- Goles a favor.
- Desempate manual si persiste una igualdad no resoluble.

La logica debe evitar asumir un orden arbitrario cuando hay empate pendiente.

## Mejores Terceros

Los terceros de los 12 grupos se ordenan para obtener los 8 mejores.

Criterios esperados:

- Puntos.
- Diferencia de gol.
- Goles a favor.
- Desempate manual si aplica.

La lista de mejores terceros no alcanza por si sola para asignar cruces. La ubicacion de cada tercero depende de la combinacion de grupos clasificados.

## Generacion Automatica De Cruces

Los cruces fijos de dieciseisavos se resuelven directo desde posiciones de grupo.

Cruces fijos:

- Match 73: 2A vs 2B.
- Match 75: 1F vs 2C.
- Match 76: 1C vs 2F.
- Match 78: 2E vs 2I.
- Match 83: 2K vs 2L.
- Match 84: 1H vs 2J.
- Match 86: 1J vs 2H.
- Match 88: 2D vs 2G.

Los cruces contra terceros usan mapping dinamico segun la combinacion de grupos que aportan mejores terceros. No deben tratarse como slots fijos.

## Rondas Futuras Y Placeholders

El usuario debe poder ver siempre todas las fases de eliminatorias:

- Dieciseisavos.
- Octavos.
- Cuartos.
- Semis.
- Final.
- 3er puesto si aplica.

Si una ronda futura aun no puede resolverse, debe mostrarse con placeholders claros, por ejemplo:

- `Ganador P73`.
- `Perdedor P101`.
- `1 Grupo A`.
- `3 Grupo C/E/F/H/I`.

No se deben ocultar rondas futuras solo porque todavia no tengan equipos reales.

## Comportamiento Esperado

- Si grupos estan incompletos, eliminatorias pueden explorarse pero no deberian cargarse como definitivas.
- Si hay desempates pendientes, mostrar aviso y bloquear armado definitivo.
- Si se borran predicciones de una fase, las fases dependientes deben limpiarse en cascada.
- Borrar cuartos borra cuartos, semis, final y 3er puesto.
- Borrar octavos borra octavos, cuartos, semis, final y 3er puesto.
- Borrar grupos borra grupos y todas las eliminatorias dependientes.
- No borrar equipos, partidos, resultados oficiales, nombres, flags ni fotos.

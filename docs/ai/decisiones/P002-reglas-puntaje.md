# P002 - Reglas de puntaje y resultados

Fecha: 2026-09-13

## Reglas confirmadas implementadas

- Futbol de liga: resultado exacto 3 puntos, resultado general 2, incorrecto 0.
- Tenis: sets exactos 3, ganador correcto con sets distintos 1, ganador incorrecto 0.
- Una persona puede participar en varias salas de una jornada, una sola vez por sala.
- Cada sala calcula participantes, pozo, puntos, posiciones y premio de forma independiente.
- Solo el primer puesto cobra; si hay empate en primero, se divide el pozo en partes iguales.
- Los puntos son provisionales mientras un resultado no este confirmado y la jornada no haya cerrado.

## Propuesta inicial implementada

- Boxeo: ganador + KO/TKO + round exacto 3; ganador + metodo 2; solo ganador 1; incorrecto 0.
- Boxeo por decision/no KO: ganador y metodo correcto 2 puntos demo.
- El resultado de futbol de eliminacion se muestra como marcador de 90 minutos en la maqueta.

## Pendiente de definicion

- Futbol de eliminacion: si el exacto toma 90, 120 o resultado sin penales; puntos por clasificado; puntos por ganador sin marcador.
- Boxeo: criterio final para decision, empate, no contest, anulacion y resultados revisados.
- Desempate fuera de igualdad de puntos y reglas de cierre operativo.
- Validacion legal y operativa antes de dinero real.

## Centralizacion

src/lib/daily-prode/scoring.ts es la unica fuente de escalas. Las pantallas consumen SCORING y scorePrediction; no contienen numeros de puntaje.

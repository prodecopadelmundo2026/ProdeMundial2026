# Scoring System

Este documento resume la relacion entre resultados oficiales, predicciones y puntaje.

## Reglas De Puntaje

El sistema debe centralizar las reglas de scoring para que ranking, fixture, Mi Prode y perfil publico muestren lo mismo.

Categorias generales:

- Exacta: el usuario acierta goles de ambos equipos.
- Parcial: el usuario acierta el signo o ganador sin acertar marcador exacto.
- Fallida: no acierta resultado.
- Pendiente: el partido aun no tiene resultado oficial.

Los valores numericos deben documentarse junto a la funcion real de calculo cuando queden cerrados.

## Triggers Automaticos

Cuando se carga un resultado oficial, el sistema deberia recalcular los puntos de las predicciones afectadas.

Responsabilidades esperadas:

- Detectar predicciones del partido.
- Calcular puntos segun resultado oficial.
- Guardar puntos en `predictions.points` o estructura equivalente.
- Revalidar vistas dependientes.

## Cuando Recalcula

Debe recalcular cuando:

- Se carga por primera vez un resultado oficial.
- Se corrige un resultado oficial.
- Se confirma resultado final de un partido.

No debe recalcular por:

- Carga aleatoria de pronosticos.
- Borrado de pronosticos propios.
- Cambios en whitelist.
- Navegacion entre pantallas.

## Relacion Resultados Oficiales Y Predicciones

Los resultados oficiales viven en partidos o estructura equivalente de fixture. Las predicciones viven por usuario y partido.

Reglas:

- Una prediccion no debe modificar el resultado oficial.
- Un resultado oficial no debe modificar el marcador predicho por el usuario.
- El resultado oficial solo afecta el puntaje calculado.
- El ranking debe derivarse de puntos calculados, no de predicciones crudas sin evaluar.

## Auditoria

Cada puntaje deberia poder explicarse con:

- Partido.
- Usuario.
- Prediccion.
- Resultado oficial.
- Regla aplicada.
- Puntos otorgados.

Esto es clave para resolver reclamos y para que futuras IAs puedan modificar la logica sin romper consistencia.

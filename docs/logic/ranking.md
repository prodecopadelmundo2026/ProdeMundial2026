# Ranking

Este documento resume el comportamiento esperado del ranking global y su relacion con predicciones y resultados oficiales.

## Objetivo

El ranking muestra el rendimiento de los participantes segun sus predicciones y apuestas especiales. Debe ser transparente, auditable y recalculable.

## Sistema De Puntos

Cada prediccion puede sumar puntos cuando existe resultado oficial para el partido correspondiente.

Casos generales:

- Prediccion exacta: acierta marcador completo.
- Prediccion parcial: acierta ganador o empate sin acertar marcador exacto.
- Sin acierto: no suma puntos.

Las reglas numericas concretas deben mantenerse centralizadas en la logica de scoring para evitar diferencias entre ranking, fixture y perfil publico.

## Ranking Global

El ranking global deberia ordenar participantes por:

- Puntaje total.
- Criterios secundarios definidos por producto si hay empate.

El ranking no debe actualizarse por acciones admin de testing que solo cargan predicciones. Debe depender de resultados oficiales y del recalculo de puntos.

## Transparencia Y Auditoria

Para que el ranking sea confiable:

- Cada prediccion deberia poder auditarse contra el resultado oficial.
- Cada puntaje deberia poder explicarse por regla aplicada.
- Los cambios de resultados oficiales deben poder recalcular puntos de forma consistente.
- Los errores de recalculo deben registrarse con detalle.

## Perfil Publico De Participante

El perfil publico deberia permitir revisar:

- Pronosticos visibles del participante segun reglas de privacidad/cierre.
- Puntos obtenidos por partido.
- Apuestas especiales si corresponde.
- Resumen de exactas, parciales y total.

El perfil no debe permitir modificar predicciones ni resultados.

## Recalculo Automatico

Cuando se carga o modifica un resultado oficial:

- Se recalculan puntos de predicciones relacionadas.
- Se actualiza el ranking global.
- No se deben tocar predicciones originales del usuario.
- No se deben crear ni borrar participantes.

Pendiente: documentar la funcion o trigger exacto responsable del recalculo cuando quede estabilizado.

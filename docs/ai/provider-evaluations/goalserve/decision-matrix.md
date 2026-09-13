# Goalserve - Matriz final de decision P005

Fecha: 2026-09-13

No hay muestra contractual ni payload autenticado disponible. Las referencias publicas citadas en P004 confirman objetos in-play de futbol/tenis, pero no validan la cobertura, licencia o semantica para los casos siguientes.

| Deporte | Caso funcional | Campo necesario | Campo entregado | Muestra real disponible | Nivel de confianza | Transformacion | Riesgo | Impacto en puntaje | Correccion manual | Exhibicion publica | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Futbol | Partido normal | ID, equipos, inicio, estado, score | ID, equipos, inicio y score in-play publico | No | Confirmado con muestra publica | Adaptador por endpoint | Medio | Permite estado, no liquidacion de copa | Segun resultado final | No comprobada | Apto solo para prototipo |
| Futbol | Exacto a 90 | `scoreAt90` | No separado en evidencia | No | No comprobado | Ninguna inferencia desde final | Alto | Critico | Si | No comprobada | No apto para puntaje definitivo |
| Futbol | Alargue | `extraTimeScore` | No comprobado | No | No comprobado | Copia directa solamente | Alto | Critico | Si | No comprobada | No apto |
| Futbol | Penales | `penaltyScore` | No comprobado | No | No comprobado | Copia directa solamente | Muy alto | Critico | Si | No comprobada | No apto |
| Futbol | Clasificado | `qualifier`/serie | No comprobado | No | No compatible para inferir | Relacion de llave explicita | Muy alto | Critico | Si | No comprobada | No apto |
| Futbol | Ida y vuelta | serie, leg, agregado | No comprobado | No | No comprobado | IDs separados por proveedor | Muy alto | Critico | Si | No comprobada | No apto |
| Futbol | Correccion/reprogramacion | estado, reemplazo, revision | Timestamps in-play; semantica final no probada | No | Parcial | Hash, auditoria y tabla de estados | Alto | Alto | Si | No comprobada | Prototipo solo |
| Tenis | Mejor de 3 | sets y ganador | Sets/ganador en muestra publica | No | Confirmado con muestra publica | Contar sets completos | Medio | Alto | Segun estado final | No comprobada | Apto solo para prototipo |
| Tenis | Mejor de 5 | formato, S1-S5 y ganador | Slots S1-S5; sin final real de 5 | No | Parcial | Requiere formato contractual | Alto | Critico | Si | No comprobada | No apto definitivo |
| Tenis | Tiebreak | detalle de tiebreak | Codigo `TBP`; sin final verificable | No | Parcial | Guardar detalle estructurado | Medio | Medio | Si | No comprobada | Prototipo solo |
| Tenis | Retiro/walkover/suspension | estado y motivo | No comprobado | No | No comprobado | Tabla de estados explicita | Alto | Alto | Si | No comprobada | No apto definitivo |
| Tenis | Correccion/ID estable | revision y reemplazo | Timestamp/ID sin garantia historica | No | Parcial | Hash y auditoria | Alto | Alto | Si | No comprobada | Prototipo solo |
| Boxeo | KO | ganador, metodo, round | No comprobado | No | No comprobado | Ninguna | Muy alto | Critico | Si | No comprobada | No apto |
| Boxeo | TKO | ganador, metodo, round | No comprobado | No | No comprobado | Ninguna | Muy alto | Critico | Si | No comprobada | No apto |
| Boxeo | Decision | ganador, metodo | No comprobado | No | No comprobado | Ninguna | Muy alto | Critico | Si | No comprobada | No apto |
| Boxeo | Empate/no contest/anulacion | outcome y motivo | No comprobado | No | No comprobado | Ninguna | Muy alto | Critico | Si | No comprobada | No apto |
| Boxeo | Suspendida/reprogramada | estado y reemplazo | No comprobado | No | No comprobado | Ninguna | Muy alto | Alto | Si | No comprobada | No apto |
| Legal | Exhibicion publica | licencia de datos | Terminos web generales solamente | No | No comprobado | Contrato y licencia escrita | Muy alto | Bloqueante | No aplica | No comprobada | No publicar |

## Resultado por deporte

- Futbol: **Apto parcialmente** para un prototipo read-only de partidos normales; no apto para produccion futura ni puntajes de eliminacion sin evidencia contractual.
- Tenis: **Apto parcialmente** para un prototipo de sets; no apto para produccion futura hasta validar mejor de 5, tiebreaks, excepciones y licencia.
- Boxeo: **No apto**. La pagina comercial declara agenda, resultados finales y cuotas, pero no prueba los campos que requieren las reglas de puntaje.

## Decision de arquitectura

Alternativa elegida para el estado actual: **4. Continuar con datos manuales unicamente para la maqueta**. No hay evidencia contractual suficiente para una fuente productiva.

Alternativa condicionada para una etapa posterior: **2. Goalserve para futbol y tenis, proveedor separado para boxeo**. Solo tiene sentido si Goalserve entrega las muestras y licencia solicitadas para futbol/tenis, y si un segundo proveedor demuestra por contrato KO, TKO, decision, round y outcomes excepcionales de boxeo.

El contrato interno debe preservar `source.provider`, `source.externalId` y los IDs de competencia/serie por proveedor. Los eventos equivalentes entre fuentes deben relacionarse en una capa interna de equivalencias auditada; nunca se deben unir por nombre, fecha aproximada o participante sin una revision humana.

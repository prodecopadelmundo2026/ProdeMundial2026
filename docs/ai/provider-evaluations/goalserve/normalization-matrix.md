# Goalserve - Matriz de normalizacion propuesta

Estado: sin muestras reales. Esta matriz define el comportamiento que tendria un adaptador futuro; no constituye una implementacion ni interpreta payloads no verificados.

| Campo interno | Evidencia actual | Fuente esperada | Regla de normalizacion | Si falta o es ambiguo |
| --- | --- | --- | --- | --- |
| `source.externalId` | Muestra publica futbol/tenis | ID de evento Goalserve | Conservar junto con proveedor y deporte | Rechazar payload |
| competencia/temporada | Competencia publica; temporada no verificada | IDs de competencia y temporada | Persistir separados, no usar nombres como ID | Marcar `review` |
| `source.updatedAt` | `updated_ts` publico | Timestamp del proveedor | Convertir a ISO UTC | Rechazar si no es fecha valida |
| `source.syncedAt` | Campo local | Reloj del adaptador | Registrar hora de recepcion UTC | Obligatorio |
| `payloadHash` | No existe en modelo actual | Payload recibido | SHA-256 del contenido original permitido | No confirmar ni deduplicar solo por timestamp |
| `source.revision` | Parcial | `updated_ts` o contador local | Usar solo tras verificar monotonia | Mantener en revision |
| `scoreAt90` | No probado para copa | Campo o desglose a 90 | Copiar solo si es explicito | No inferir desde final |
| `extraTimeScore` | No comprobado | Campo estructurado | Copiar como opcional | Ausente y `review` |
| `penaltyScore` | No comprobado | Campo estructurado | Copiar como opcional | Ausente y `review` |
| `qualifier` | No comprobado | Campo de llave/serie | Copiar solo si proveedor lo declara | Nunca derivar del ganador |
| serie, leg, agregado, reemplazo | No comprobado | IDs de serie y reemplazo | Conservar IDs por proveedor | Marcar incompatibilidad de copa |
| sets/tiebreaks | Sets publicos; tiebreak final no probado | Arrays estructurados por set | Convertir todos los sets, no solo perdidos | No calcular formato definitivo |
| `boxingMethodRaw` | No comprobado | Valor original de metodo | Conservar sin modificar | No puntuar |
| `boxingMethod` | No comprobado | Enum KO/TKO/decision | Normalizar con tabla versionada | No inferir desde texto |
| `boxingRound` | No comprobado | Numero de round | Validar entero dentro de rounds pactados | No puntuar |
| estado y correccion | Parcial | Estado del proveedor y motivo | Mapear solo tabla de estados confirmada | `review` y auditoria manual |

El adaptador sugerido en P005 no se crea porque faltan muestras contractuales para validar las rutas de normalizacion con mayor riesgo. Un fixture sintetico futuro debe rotularse exactamente `synthetic fixture — not supplied by provider` y no puede presentarse como evidencia de Goalserve.

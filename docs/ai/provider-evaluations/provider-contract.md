# Contrato de proveedor deportivo V2

Estado: contrato neutral de proveedor para pruebas sinteticas. No representa un adaptador de Goalserve ni evidencia de cobertura real.

## Limites y equivalencias

El evento de dominio sigue siendo `DailyEvent`. Su `source.externalId` equivale a `externalEventId`; `scheduledStart` equivale a `scheduledAt`; `actualStart` equivale a `startedAt`; y `source.syncedAt` es la hora UTC de recepcion, equivalente a `receivedAt`.

Los nuevos metadatos opcionales de `source` mantienen `externalCompetitionId`, `externalSeasonId`, `externalSeriesId`, IDs externos de participantes, `providerStatus`, `payloadHash` y `replacementEventId`. Son de trazabilidad: no cambian el scoring ni se exponen a la UI.

## Campos requeridos para normalizar

| Campo | Regla |
| --- | --- |
| proveedor, deporte y `externalEventId` | Obligatorios; identifican el evento sin mezclar fuentes. |
| IDs externos de participantes | Obligatorios en el contrato sintetico; un adaptador debe informar su ausencia. |
| competencia, `scheduledAt`, `receivedAt`, `providerUpdatedAt`, revision y `payloadHash` | Obligatorios y con fecha UTC valida. |
| `providerStatus` | Debe pertenecer al vocabulario conocido; un estado desconocido se rechaza. |
| `externalCompetitionId`, `externalSeasonId`, `externalSeriesId`, `replacementEventId`, `startedAt` | Opcionales, pero se conservan cuando la fuente los entrega. |

## Reglas por deporte

- Futbol: `scoreAt90`, `extraTimeScore`, `penaltyScore`, `qualifier`, `legNumber` y `aggregateScore` son independientes. El clasificado exige evidencia `explicit`; nunca se deduce del ganador. Si hay penales, el alargue debe continuar empatado y sus goles no contaminan `scoreAt90`.
- Tenis: cada set conserva games de ambos lados y puede incluir tiebreak. Un final normal debe tener ganador y el numero exacto de sets ganados para mejor de 3 o 5. Retiro, walkover, suspension, cancelacion y reprogramacion se normalizan a revision, sin resultado puntuable.
- Boxeo: el contrato distingue `boxingMethodRaw` y metodo normalizado KO/TKO/decision. Para preservar el scoring actual, TKO se agrupa internamente como `ko` y queda diferenciado en `methodDetail`. KO/TKO requieren round valido; una decision no puede tener round de finalizacion; empate/no contest y excepciones no producen ganador ni puntos.

## Resultado, correccion y reemplazo

Un resultado es una version recibida con ID externo, revision y hash. Una correccion conserva el evento y aumenta su revision; si hay bloqueo manual, queda pendiente y auditada sin sobrescribir el dato administrativo. Un reemplazo es otro evento con nuevo ID externo y `replacementEventId` apuntando al anterior. Ninguno borra la trazabilidad.

El mismo ID con misma revision y mismo hash es idempotente. El mismo ID y revision con hash distinto se rechaza como duplicado incompatible. Un hash no sustituye al timestamp externo: ambos se guardan y se interpretan en UTC.

## Datos que requieren confirmacion manual

- Cualquier `scoreAt90`, alargue, penales o clasificado que la fuente no separe estructuradamente.
- Estados de copa, retiro, walkover, anulacion, correccion y reemplazo cuya semantica contractual no este confirmada.
- Resultado de boxeo sin metodo y round estructurados.
- Derechos de uso, exhibicion publica y retencion de datos.

## Datos que nunca deben inferirse

- Clasificado de una serie desde el ganador del partido.
- Penales desde el marcador final o viceversa.
- Round de una decision o metodo de boxeo desde texto ambiguo.
- Ganador normal de retiro, walkover, empate, no contest, anulacion o suspension.
- Identidad o equivalencia entre proveedores a partir de nombres o fecha aproximada.

## Independiente del proveedor

Scoring, salas, participaciones, pozos, posiciones, premios, UI, Supabase y autenticacion permanecen fuera del contrato. El arnes usa solamente fixtures con la marca exacta `synthetic fixture — not supplied by provider`.

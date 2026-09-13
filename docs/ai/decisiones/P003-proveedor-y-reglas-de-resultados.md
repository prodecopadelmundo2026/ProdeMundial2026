# P003 - Reglas de resultados y proveedor deportivo

Fecha: 2026-09-13

## Reglas confirmadas

- Una persona tiene una participacion por sala y jornada; puede entrar en varias salas.
- Cada sala conserva participantes, pozo, puntos y premios independientes. Solo el primer puesto cobra; un empate en primero divide el pozo.
- Futbol: exacto 3, resultado general 2 e incorrecto 0. Todo marcador se evalua a los 90 minutos.
- En eliminacion, marcador a 90, marcador tras alargue, tanda de penales y clasificado son datos diferentes. El clasificado se predice separado y su puntaje sigue pendiente.
- Tenis: sets exactos 3, ganador correcto 1 e incorrecto 0. Las opciones respetan mejor de 3 o mejor de 5.
- Boxeo: KO/TKO y round exacto 3; ganador y metodo 2; ganador y decision/no KO 2; solo ganador 1; incorrecto 0.

## Reglas pendientes

- Puntaje por acertar clasificado de futbol.
- Tratamiento de empate, no contest, anulacion, suspension, reprogramacion y reemplazo de una pelea de boxeo.
- Cualquier pago, devolucion o liquidacion real.

## Comparacion de proveedores

| Proveedor | Futbol y tenis | Boxeo | Actualizaciones e identidad | Precio y licencia | Limite principal |
| --- | --- | --- | --- | --- | --- |
| Goalserve | Declara fixtures, resultados y live scores de futbol; tenis con live stats y point-by-point. JSON y XML. | Declara agenda, resultados finales y odds. Su pagina publica no confirma metodo KO/TKO ni round. | Futbol declara refresh de 3 a 5 segundos. Se debe validar con muestras la estabilidad de IDs, correcciones y reemplazos. | Trial y cotizacion comercial; los derechos de exhibicion publica deben constar en contrato. | El detalle necesario para puntuar boxeo no esta confirmado publicamente. |
| Sportradar | Futbol y tenis con APIs B2B, IDs de eventos, estados, feeds de cambios y correcciones post-partido. Tenis declara 4.000+ competencias y actualizacion live de 1 segundo en la cobertura aplicable. | La documentacion actual revisada no confirma un feed de resultados de boxeo con metodo y round. | Muy fuerte: estados de futbol, eventos reemplazados y cambios incrementales. | Trial posible; precio y derechos bajo cotizacion B2B. | Requeriria otra fuente o revision manual para boxeo. |
| API-Sports | API-Football tiene fixtures, live y resultados; su catalogo actual no presenta una API de tenis ni boxeo. | No cubre el requisito. | IDs de fixture y cuotas por plan; validar correcciones en prueba. | Plan gratis de 100 requests/dia para futbol y planes pagos publicados. | No es una solucion multideporte para esta V2. |
| TheSportsDB | Base amplia y accesible con fixtures y livescores; es util para prototipos. | Cobertura amplia declarada, pero sin garantia de metodo o round. | IDs propios; calidad y completitud dependen de datos comunitarios. | Gratis con 30 req/min; premium desde USD 9/mes y 100 req/min. | No ofrece la confiabilidad necesaria para resolver puntajes y premios. |

Fuentes oficiales: Goalserve Full Package, Goalserve Soccer API, Sportradar Soccer/Tennis APIs y flujos de estado, API-Sports Football, TheSportsDB Documentation.

## Recomendacion

Recomendar Goalserve como candidato numero uno para una prueba de datos, no como proveedor ya elegido. Es el unico de los comparados que declara futbol, tenis y boxeo en un mismo paquete. Antes de firmar o integrar, exigir: muestra JSON de un partido de copa con 90 minutos, alargue, penales y clasificado; muestra de sets de tenis; muestra de boxeo con ganador, metodo y round; politica de correcciones; IDs de evento reemplazado; limites; precio; y licencia expresa para mostrar datos en la app.

Si Goalserve no entrega metodo y round de boxeo, mantener futbol y tenis por proveedor y dejar boxeo en estado pendiente de revision administrativa. No inferir resultados de boxeo desde cuotas.

## Modelo y propuesta para la proxima migracion

El modelo actual ya representa jornada, sala, participacion, fuente, revision, auditoria, marcador a 90, alargue, penales y clasificado. Para persistencia real faltan propuestas de campos: provider_competition_id, provider_season_id, provider_participant_id, provider_status, source_timezone, observed_at, received_at, payload_hash, coverage_level, result_confirmed_at, replacement_event_id, tie_id, aggregate_score, tennis_set_scores, boxing_method_detail y provider_license_scope.

Los timestamps externos deben conservarse en UTC y presentarse en America/Buenos_Aires. Las adaptaciones deben quedar por proveedor y deporte; nunca mezclar el payload externo con el modelo de dominio.

# Solicitud de muestras y condiciones para Goalserve

Estado: borrador preparado, no enviado.

## Contexto tecnico

Estamos evaluando datos deportivos para un Prode diario multideporte. La prueba no requiere acceso productivo ni autorizacion de cobro. Necesitamos ejemplos redactados o acceso trial que permitan validar el contrato de datos antes de cualquier integracion.

Por favor confirmar por escrito si cada campo esta disponible como dato estructurado, el endpoint o feed aplicable, la cobertura, y cualquier limitacion por competencia, pais o plan. No incluir claves, tokens ni URLs que las contengan en las respuestas de ejemplo.

## Muestras de futbol requeridas

Entregar payloads JSON o XML minimizados, con valores no sensibles, para:

1. Un partido unico de eliminacion definido por penales.
2. Un partido de vuelta que incluya alargue o penales.
3. Un caso de correccion posterior de resultado.
4. Un caso de reprogramacion y uno de cancelacion.

Para cada caso, requerimos identificadores estables de partido, competencia, temporada, participantes y serie/llave; fecha, hora y zona horaria; estado y timestamps de actualizacion; marcador a 90 minutos; marcador despues del alargue; resultado de penales; ganador; clasificado; leg/ida-vuelta; agregado; y la relacion con un evento reemplazado, si existiera.

Indicar explicitamente si ganador de partido y clasificado de serie son campos independientes, y como se representa una correccion del mismo evento frente al reemplazo por un nuevo ID.

## Muestras de tenis requeridas

Entregar payloads minimizados para:

1. Un partido finalizado al mejor de 3.
2. Un partido finalizado al mejor de 5.
3. Un tiebreak con su detalle por set.
4. Un resultado parcial en vivo y su resultado final.
5. Retiro, walkover, suspension/reanudacion, reprogramacion y correccion de resultado.

Cada muestra debe incluir IDs estables de partido, torneo, temporada y jugadores; formato mejor de 3 o mejor de 5; ganador; sets completos; tiebreaks; estado; hora UTC; timestamp de actualizacion y semantica de correcciones.

## Muestras de boxeo requeridas

Entregar payloads minimizados para una victoria por KO, una por TKO, una por decision, un empate, un no contest, una pelea anulada y una suspendida o reprogramada.

Cada payload debe incluir ID estable de pelea, evento, competencia/cartelera, participantes, fecha/hora, estado, ganador u outcome, metodo crudo, metodo normalizado, round de finalizacion y motivo de cancelacion/anulacion cuando corresponda. Confirmar que KO, TKO y decision son campos estructurados y no solamente texto descriptivo.

## Condiciones comerciales y legales requeridas

Confirmar por escrito:

- Plan necesario, precio, moneda, minimo contractual y cobertura por deporte/competencia.
- Limites de requests, frecuencia de actualizacion, historial, webhook/push y SLA o garantias aplicables.
- Politica de correcciones, reprogramaciones, eventos reemplazados y soporte.
- Derecho de usar datos, nombres, escudos, logos y resultados en una aplicacion publica.
- Derecho de almacenar payloads, hashes, resultados normalizados e historicos de auditoria.
- Derecho de redistribucion o exhibicion publica, incluidos rankings, puntajes, premios y resultados derivados.
- Restricciones territoriales, atribucion obligatoria, retencion, eliminacion y sublicencias.

La confirmacion debe aplicar especificamente al uso anterior. Las paginas publicas, un trial generico o una lista de deportes no reemplazan una licencia o condicion contractual explicita.

## Formato de entrega solicitado

Para cada muestra: fuente, fecha de entrega, version/documento, hash SHA-256 opcional y una tabla de campos. No conservariamos payloads completos salvo autorizacion expresa; se usarian solamente fixtures minimos redactados para pruebas de contrato.

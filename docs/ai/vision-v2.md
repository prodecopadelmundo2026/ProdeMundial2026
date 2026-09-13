# Vision V2 - Prode diario

## Objetivo confirmado

La V2 deja de estar centrada en el Mundial 2026 y pasa a una experiencia diaria multideporte. La denominacion funcional provisoria es `Prode diario`.

La experiencia principal debe permitir:

- Ver eventos del dia, horarios y estado.
- Participar con pronosticos.
- Seguir resultados y desempeno propio.
- Consultar la clasificacion de la sala.
- Revisar jornadas anteriores.
- Filtrar agenda por deporte, estado y participacion sin perder la jornada elegida.
- Operar un laboratorio manual protegido y auditable mientras no exista un proveedor aprobado.
- Conservar el lenguaje editorial del producto: navegacion oscura, acento naranja, franja de contexto, hero de jornada y ranking diario por sala.

## Reglas confirmadas

- Cada sala tiene su propio pozo, participantes y clasificacion.
- Quien mas puntos sume gana el pozo completo de su sala.
- Una persona puede participar en varias salas de una jornada, con una sola participacion por sala.
- Si hay empate en el primer lugar, el pozo se divide en partes iguales entre los primeros puestos empatados.
- Futbol de liga: exacto 3, resultado general 2 e incorrecto 0 puntos.
- Tenis: sets exactos 3, ganador correcto 1 e incorrecto 0 puntos.
- Futbol de eliminacion: el marcador exacto usa 90 minutos; alargue, penales y clasificado se conservan separados. El puntaje del clasificado sigue pendiente.
- Boxeo: ganador + KO/TKO + round 3; ganador + metodo 2; ganador + decision/no KO 2; solo ganador 1; incorrecto 0.
- No hay premios para segundo ni tercer puesto.
- El Mundial debe dejar de dominar la experiencia principal, pero debe conservar acceso historico.
- No se deben borrar datos, reiniciar tablas ni recalcular el Mundial con reglas nuevas.
- La documentacion de desarrollo no reemplaza la auditoria operativa de resultados, pronosticos y correcciones.
- La fuente manual de desarrollo no es una integracion deportiva, no persiste al recargar y debe identificarse visiblemente como demo.
- La portada diaria debe diferenciar por completo sus datos de los registros historicos: metricas, ranking, pozo y eventos se derivan de la jornada y sala seleccionadas.

## Pendiente de definicion

- Puntaje del clasificado en eliminacion y desempates operativos.
- Tratamiento de boxeo para empate, no contest, anulacion, suspension y reprogramacion.
- Proveedor seleccionado, licencia de exhibicion y politica de correcciones.
- Moneda e importes finales.
- Si una persona puede entrar en varias salas o con varias entradas.
- Proveedor real de calendario, estados y resultados.
- Criterio ante conflictos entre sincronizacion automatica y correcciones manuales.
- Condiciones legales, operativas y del proveedor de pagos antes de dinero real.
- Marca definitiva, nombre publico, dominio y hosting.

## Alcance excluido por ahora

- Cobros, retiros o pagos reales.
- Liquidacion automatica de premios.
- Puntajes o desempates definitivos.
- Migraciones destructivas.
- Reescritura completa.
- Cambios de dominio o infraestructura.
- Apuestas por torneos, llaves eliminatorias o premios por temporadas.

## Supuestos de maqueta P001

- Zona horaria: America/Buenos_Aires.
- Los eventos son ficticios y no representan informacion deportiva real.
- Los importes $5.000, $10.000 y $20.000 son ejemplos visuales.
- Los puntos mostrados como `Demo` o `A definir` no deben conectarse al calculo real.

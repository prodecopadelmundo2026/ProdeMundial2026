# Puerta Go/No-Go de proveedores y datos manuales

Fecha: 2026-09-13

## Puertas para avanzar

### Adaptador read-only

Se puede crear un adaptador read-only solo si existen muestras autorizadas suficientes, los campos criticos son estructurados, los estados se interpretan, los IDs se pueden conservar, las correcciones son detectables y existe autorizacion de uso. El proveedor debe cubrir los casos requeridos o debe aceptarse expresamente una arquitectura multi-proveedor con equivalencias auditadas.

### Tablas nuevas

Se pueden proponer tablas nuevas solo si el contrato interno es estable, las reglas de fuente y auditoria estan definidas, se decidio el modo manual o proveedor inicial, las migraciones son no destructivas, no se mezclan datos historicos del Mundial y se conocen los campos de sincronizacion y la proteccion de correcciones manuales.

### Continuidad manual obligatoria

Debe continuar el modo manual cuando no hay muestras autorizadas, no existe licencia publica clara, faltan campos criticos, boxeo no informa metodo o round, futbol no representa con certeza alargue, penales o clasificado, o los IDs y correcciones son inseguros.

## Decision vigente

| Dimension | Estado actual | Decision |
| --- | --- | --- |
| Apto para prototipo | La maqueta y fixtures sinteticos existen; Goalserve tiene evidencia publica parcial, sin permiso contractual. | Solo datos manuales y sinteticos; Goalserve no se integra. |
| Apto para futbol | Faltan muestras autorizadas de 90 minutos, alargue, penales, clasificado, series y correcciones. | No apto. |
| Apto para tenis | Faltan muestras autorizadas de mejor de 5, excepciones y correcciones. | No apto. |
| Apto para boxeo | No hay evidencia autorizada de KO, TKO, decision, round ni outcomes excepcionales. | No apto. |
| Apto para produccion | No hay licencia, muestras completas, proveedor seleccionado ni politica operativa aprobada. | No apto. |
| Apto solamente con multiples proveedores | Es una alternativa posible, pero faltan proveedores autorizados y una capa de equivalencias auditada. | Pendiente; no habilita implementacion. |
| Adaptador read-only | No se cumplen las condiciones de muestras autorizadas y licencia. | No-Go. |
| Tablas nuevas | La fuente inicial y los campos de sincronizacion no estan decididos. | No-Go. |

Goalserve permanece como candidato parcial de documentacion publica: no se lo clasifica como proveedor aprobado ni como fuente de resultados automáticos.

## Estado posterior a P010

La experiencia publica y el laboratorio manual estan listos para demostracion local, no para datos reales. Esta mejora de interfaz no cambia el No-Go de adaptador, tablas ni produccion: siguen faltando muestras autorizadas, licencia explicita, cobertura de casos criticos y politica de correcciones del proveedor.

## Evidencia para cambiar la decision

La decision puede reabrirse con solicitudes autorizadas, muestras clasificadas `Aprobada` para los casos necesarios, derechos de uso y exhibicion documentados, IDs y revisiones verificables, y una evaluacion del contrato neutral que no dependa de inferencias peligrosas. Toda aprobacion debe declarar deporte, competencia, plan, limites, fecha de vencimiento y alcance; una aprobacion para prototipo no se extiende automaticamente a produccion.

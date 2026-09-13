# Protocolo de aceptacion de muestras autorizadas

Fecha: 2026-09-13

## Proposito y alcance

Una muestra real de un proveedor solo puede incorporarse al repositorio cuando existe autorizacion suficiente y documentada para conservarla y utilizarla en este proyecto. Que un dato sea visible publicamente no implica permiso para copiarlo, almacenarlo, exhibirlo, transformarlo ni usarlo para puntajes o premios.

Este protocolo no habilita endpoints, cuentas, contrataciones ni adaptadores. En P008 no se incorpora ninguna muestra real.

## Separacion obligatoria

La evidencia debe mantenerse separada por tipo:

- `docs/ai/provider-evaluations/synthetic/`: fixtures de desarrollo. Deben llevar exactamente `synthetic fixture — not supplied by provider`.
- `docs/ai/provider-evaluations/authorized/`: muestras reales o fixtures minimizados cuyo uso y retencion fueron autorizados. Deben llevar exactamente `authorized provider sample`.
- `docs/ai/provider-evaluations/requests/`: solicitudes de evidencia, sin credenciales ni datos recibidos no autorizados.
- `docs/ai/provider-evaluations/decisions/`: checklist, evidencia de aprobacion y decisiones de uso.

Nunca se mezclan archivos reales y sinteticos, ni se reclasifica un fixture sintetico como evidencia del proveedor. Si una muestra no puede conservarse, se guarda solamente un fixture minimo autorizado con los campos relevantes, su hash y una referencia a la autorizacion contractual; no se conserva el payload completo.

## Registro minimo por muestra

Cada muestra o fixture minimizado debe tener un manifiesto asociado que registre:

| Campo | Evidencia requerida |
| --- | --- |
| Identificacion | Proveedor, deporte, competencia, temporada, evento e identificador estable cuando exista. |
| Origen | Endpoint o tipo de fuente sin credenciales, fecha de consulta y zona horaria. |
| Marco de uso | Version de documentacion o contrato, plan utilizado y alcance autorizado. |
| Derechos | Restricciones de almacenamiento y exhibicion publica; permiso o prohibicion de transformar datos, calcular rankings, puntos o premios, y conservar historicos. |
| Integridad | Hash SHA-256 del contenido conservado o del fixture minimizado, formato y fecha de alta. |
| Responsabilidad | Persona o proceso que lo incorporo, estado de revision, revisor y vencimiento o proxima revision de la autorizacion si existe. |
| Cobertura funcional | Caso representado, campos estructurados, IDs relacionados, estados, correccion/version y reemplazo cuando aplique. |

El manifiesto debe citar una referencia verificable de la licencia, correo, contrato o documento aplicable. Una referencia contractual no debe contener secretos.

## Reglas de conservacion y seguridad

No se guardan API keys, tokens, cabeceras de autorizacion, URLs con credenciales, datos personales innecesarios, logos, escudos, imagenes ni contenido protegido sin permiso especifico. Tampoco se guarda un payload completo si la autorizacion no permite su retencion.

El contenido autorizado se minimiza al caso funcional que prueba, se revisa antes de versionarlo y conserva su hash. Una modificacion exige nuevo hash, motivo, fecha, responsable y nueva revision del manifiesto. La autorizacion vencida, incompleta o no trazable bloquea su uso como fixture autorizado.

## Flujo de aceptacion

1. Registrar la solicitud y el caso funcional faltante, sin hacer consultas automaticas.
2. Recibir la evidencia por un canal autorizado y verificar alcance, retencion y exhibicion.
3. Minimizar el contenido cuando corresponda, calcular el hash y crear el manifiesto.
4. Ejecutar el checklist de aceptacion y verificar el fixture contra el contrato neutral, sin inferir campos ambiguos.
5. Registrar la decision en `decisions/`. Solo una decision `Aprobada` permite usarla como evidencia de integracion; `Aprobada solamente para prototipo` no habilita produccion ni liquidacion.

Las muestras se vuelven a revisar cuando venza la autorizacion, cambie el plan o contrato, o se modifique su contenido.

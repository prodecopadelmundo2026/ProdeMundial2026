# Checklist de aceptacion de muestras de proveedor

Fecha: 2026-09-13

Usar una copia de esta lista para cada muestra, conjunto de muestras o evidencia contractual. Una fuente publica no se convierte en `authorized provider sample` solamente por estar visible en internet.

## Trazabilidad y autorizacion

- [ ] El proveedor, producto y plan estan identificados.
- [ ] El caso funcional, deporte, competencia, temporada y evento estan identificados.
- [ ] La fecha de consulta y zona horaria estan registradas.
- [ ] La fuente es trazable a documentacion, contrato, correo autorizado o referencia verificable.
- [ ] La muestra puede conservarse legalmente y su licencia de uso esta documentada.
- [ ] El alcance para almacenamiento, exhibicion, transformacion, rankings, puntos, premios e historicos esta explicitado.
- [ ] La autorizacion tiene vencimiento o criterio de revision registrado cuando aplica.

## Contenido e integridad

- [ ] Se usa `authorized provider sample` y se mantiene separado de `synthetic fixture — not supplied by provider`.
- [ ] El contenido tiene hash SHA-256 y manifiesto con responsable, fecha y estado de revision.
- [ ] No contiene secretos, URLs con credenciales ni datos personales innecesarios.
- [ ] No incluye logos, imagenes u otro contenido protegido sin autorizacion especifica.
- [ ] Si no se permite retener el payload, existe un fixture minimo autorizado con campos relevantes, hash y referencia contractual.

## Compatibilidad con el contrato neutral

- [ ] Los campos relevantes son estructurados, no texto ambiguo.
- [ ] Los IDs de evento, participantes, competencia, temporada y serie pueden relacionarse sin inferencias por nombre o fecha.
- [ ] Los estados son interpretables y el evento conserva horario, origen, actualizacion y revision.
- [ ] Las correcciones, cancelaciones, reprogramaciones y reemplazos son detectables.
- [ ] El adaptador puede validar el caso sin deducir clasificado, penales, metodo o round de datos ambiguos.
- [ ] Para cada deporte se cubren los casos que el producto pretende usar antes de puntuar o publicar resultados.

## Clasificacion final

| Resultado | Uso permitido |
| --- | --- |
| `Aprobada` | Evidencia autorizada, trazable y compatible para el alcance documentado. Puede habilitar evaluacion de adaptador read-only. |
| `Aprobada solamente para prototipo` | Evidencia limitada o derechos restringidos; sirve solo para el prototipo expresamente delimitado, nunca para produccion, puntajes o premios. |
| `Parcial` | Algunos casos o campos son validos, pero faltan campos criticos, derechos o correcciones. No habilita integrar el alcance incompleto. |
| `Rechazada` | No hay permiso, integridad, trazabilidad o estructura suficiente; no se conserva ni se usa como muestra autorizada. |
| `Pendiente de autorizacion` | La evidencia tecnica existe, pero faltan derechos o confirmacion documentada. Se trata como no autorizada. |

La revision debe registrar responsable, fecha, decision, limitaciones y proxima accion en `docs/ai/provider-evaluations/decisions/`.

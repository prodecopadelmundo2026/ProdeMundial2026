# P009 - Implementacion del modo manual de desarrollo

Fecha: 2026-09-13

## Decision

Se implementa un laboratorio local protegido en `/admin/diario`. Reutiliza el guard existente de usuario autenticado y perfil administrador; usuarios comunes se redirigen a `/` y los controles no se renderizan en la experiencia publica.

La fuente se declara como `sourceType: manual`, con proveedor tecnico `manual-development`, IDs, fechas, revision, hash de desarrollo y estado trazable. Cada edicion manual incrementa la revision sin cambiar la identidad de proveedor/evento. Cada evento se normaliza con `normalizeProviderContract`, por lo que no evita las reglas neutrales de futbol, tenis o boxeo.

## Que permite

- Crear y restablecer fixtures manuales en memoria; editar participantes, horario y estados.
- Marcar eventos en vivo, cargar parciales/finales, confirmar, cancelar, reprogramar y corregir con motivo.
- Separar 90 minutos, alargue, penales, clasificado y agregado de futbol; los clasificados no otorgan puntaje.
- Probar tenis mejor de 3/5, sets, tiebreak, retiro, walkover y excepciones; estos ultimos no se convierten en victorias normales.
- Probar KO, TKO, decision, empate y no contest; KO/TKO exige round, decision no lo inventa y los outcomes ambiguos no son puntuables.
- Bloquear, desbloquear con motivo explicito, simular una actualizacion automatica posterior y revisar la linea de tiempo de auditoria.

## Limites

No hay persistencia: al recargar se restablecen los fixtures demo y no se usa `localStorage`. No se escriben tablas, RPC, migraciones ni datos de Supabase. No hay endpoint, Goalserve, proveedor aprobado, datos deportivos reales, pagos ni liquidacion de premios.

La interfaz publica mantiene el indicador permanente `Datos de demostracion — fuente manual`; salas, participaciones, rankings y el Mundial historico siguen aislados.

## Reemplazos futuros

Una persistencia futura debe reemplazar el repositorio local, manteniendo contrato, auditoria, bloqueos y UI. Un proveedor real debe entrar por un adaptador read-only aprobado bajo P008, no por los fixtures manuales. Ambos cambios requieren decisiones, pruebas y migraciones no destructivas en tareas posteriores.

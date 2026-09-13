# Matriz de proveedores P017

| Proveedor | Evidencia actual | Decisión |
| --- | --- | --- |
| Goalserve | Declara fútbol, tenis, boxeo y MMA/UFC, pero cobertura puntual, correcciones y licencia siguen sin evidencia contractual. | No-Go. |
| Sportradar | Documenta ATP/Grand Slam, cobertura por niveles, resultados en vivo y UFC; no hay trial o credencial autorizada y falta confirmar fútbol argentino/copa y los campos UFC bajo el plan elegido. | Primer candidato a prueba formal; No-Go hasta evidencia, licencia y redistribución. |
| API-Sports | Pendiente de prueba autorizada para Argentina, copa, tenis y combate. | No-Go. |
| Sportmonks | Documentación pública de fútbol/livescores; no valida el catálogo multideporte requerido. | No-Go multideporte. |
| SportsDataIO | Pendiente de evidencia de cobertura solicitada. | No-Go. |
| UFC específico | Falta proveedor y licencia que entregue cartelera, peleadores, horario, estado, ganador, KO/TKO, método, round, decisión, empate, no contest y correcciones. | No-Go; no se muestra públicamente. |

La elección exige muestras autorizadas, IDs estables, horarios, estados, sets/tiebreaks, KO/TKO/método/round, reprogramaciones, eliminaciones, webhooks o polling, límites, trial, precio, licencia de exhibición/redistribución y uso con premios. No se selecciona un proveedor por declararse multideporte.

## Estado de credenciales P017

- Variables locales revisadas por nombre: no existe una clave de proveedor deportivo; solo hay variables públicas de Supabase y una clave no deportiva de Obsidian en el entorno.
- Vercel CLI está autenticada únicamente en el equipo `juanascenzi-dev`; su único equipo visible es `juan-ascenzi-dev` y el scope del proyecto de producción no existe en esta sesión. Sus variables no pudieron enumerarse. No se modificó ninguna variable ni se supuso una clave remota.
- Sin credencial, trial autorizado, cobertura por competencia y licencia no se crea adaptador, request, polling, tabla, persistencia ni evento público.

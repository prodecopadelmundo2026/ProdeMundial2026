# Memory

## Proyecto

Prode Mundial 2026. App Next.js + Supabase con ranking publico, pronosticos, fixture, eliminatorias, auditoria y administracion de resultados.

## Zonas sensibles

- Scoring de fase de grupos y eliminatorias.
- Bonus por trayectoria y clasificados.
- Auditoria de ranking.
- Identificacion de partidos de eliminatorias por `bracket_slot`.
- RPCs de Supabase y estructura de datos.
- Admin de resultados, `qualified_team` y desempates.

No modificar esas zonas desde una tarea visual salvo autorizacion explicita.

## Hechos importantes

- `/ranking` puede enriquecer el ranking base con `addConfirmedTrajectoryToRanking`.
- `/estadisticas` es una vista de lectura y debe alinearse con el ranking oficial en el ultimo snapshot.
- Las fechas historicas pueden mostrar lideres distintos al ranking actual; eso es correcto si el corte temporal es anterior.
- En eliminatorias, un cruce exacto requiere el mismo partido oficial y el mismo orden real de local/visitante. Un cruce invertido no debe puntuar como exacto si las reglas vigentes no lo permiten.
- En resultados empatados con desempate, `qualified_team` es clave para resolver trayectoria y llave.

## Preferencias de mantenimiento

- Documentar primero las inconsistencias de datos.
- Evitar migraciones si no son estrictamente necesarias.
- Mantener los cambios acotados al modulo pedido.
- No usar la UI para esconder errores de ranking.
- Validar visualmente mobile y desktop en cambios de pantalla.

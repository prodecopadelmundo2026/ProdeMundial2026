# Catálogo deportivo diario

## Admitidas

- Fútbol: Liga Profesional de Fútbol, Primera Nacional, Copa Argentina, Supercopa Argentina, Copa Libertadores y Copa Sudamericana.
- Tenis: ATP Masters 1000, ATP 500, ATP 250, Australian Open, Roland Garros, Wimbledon y US Open. Los Grand Slam tienen categoría propia.
- Boxeo: solo cartelera identificada, participantes, fecha, hora, estado y fuente manual demo o proveedor autorizado.

## Excluidas

Exhibiciones, amistosos no solicitados, competencias desconocidas, eventos sin participantes, horario, estado o fuente, y MMA sin reglas aprobadas.

## Regla pública

`isEligibleDailyEvent` centraliza la validación. La consola manual exige una competencia de catálogo para guardar un evento publicable. No existe aún excepción administrativa persistente: requerirá motivo, usuario, fecha y auditoría en una tarea futura.

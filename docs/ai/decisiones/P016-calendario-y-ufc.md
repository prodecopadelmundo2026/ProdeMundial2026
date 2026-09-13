# P016 - Calendario y UFC

- El selector de fecha se reemplaza por un calendario propio, compartido entre las vistas diarias, para evitar la interfaz visual nativa y conservar el lenguaje del producto.
- La fecha de jornada se deriva siempre en `America/Argentina/Buenos_Aires`; los valores de inicio y `lockAt` son ISO UTC.
- La agenda pública continúa vacía hasta recibir eventos `provider`, verificados y dentro del catálogo. El calendario queda preparado para marcar eventos y cierres sin exponer fixtures.
- Fútbol y tenis son los únicos filtros públicos mientras no haya una fuente autorizada. No se muestra Boxeo, MMA genérico ni UFC: no hay evidencia de una fuente que cubra todos los campos UFC y sus correcciones.
- Sportradar sigue siendo el primer candidato de evaluación, pero no se eligió proveedor ni se integra un adaptador sin trial/credencial autorizada, cobertura confirmada, límites, licencia y derechos de exhibición/redistribución.
- El contrato neutral ya contempla fuente, external ID, hash y timestamps. No se persiste ni consulta una API en P016, por lo que no se altera Supabase ni las correcciones manuales.

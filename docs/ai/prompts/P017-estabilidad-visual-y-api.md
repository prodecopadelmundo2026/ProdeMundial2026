# P017 - Estabilidad visual del home y comienzo de integración deportiva

SHA-256 del prompt recibido: `C9F24D0DE6FC16E539CA2C8D9D245138B6C5AFEC601072E367B921EA8C17DBA4`.

## Objetivo

Estabilizar el home diario frente a cambios de fecha, estado, filtros, salas y eventos. Reorganizar el hero en escritorio con información a la izquierda y controles a la derecha, mantener una versión apilada en mobile y volver a revisar una integración deportiva autorizada.

## Requisitos relevantes

- Reservar una zona de título de hasta tres líneas, sin cortar palabras ni ocultar contenido.
- Mantener estable la posición de descripción, estado general, controles, tarjeta de eventos y resumen de jornada.
- Mostrar controles de jornada, sala y deportes dentro de una caja compacta; no incluir notificaciones, cuotas u odds.
- Mantener la agenda pública en `/`, el redirect técnico de `/diario`, Buenos Aires para fechas visibles y UTC para instantes.
- Usar una API solo con credencial autorizada, en servidor, y únicamente para el catálogo aprobado. UFC no se publica sin cartelera, luchadores, horario, estado, resultado y correcciones suficientes.
- Conservar la preparación PWA web sin crear app nativa, permisos, notificaciones o pagos.
- Validar contrato, TypeScript, ESLint, build, responsive, historial, admin y alineación de `main`/`dev`.

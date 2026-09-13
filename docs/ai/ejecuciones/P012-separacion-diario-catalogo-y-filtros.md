# P012 - Ejecución

## Implementado

- Catálogo y elegibilidad de eventos centralizados.
- Datos públicos sintéticos explícitos, sin exhibiciones presentadas como reales.
- Inicio, operación, Mi Prode, Ranking y Reglas diarios separados.
- Accesos históricos de ranking, reglas y Mi Prode bajo `/historial/mundial`.
- Filtros de deporte multiselección, competencia, estado y participación; hero y métrica de eventos responden a los filtros.
- Panel manual conectado al catálogo para bloquear competencias desconocidas.

## Validación

- Contrato diario normal y JSON: 122/122.
- TypeScript y build: correctos.
- ESLint dirigido: sin errores propios; se conserva el warning heredado por `img` en la pantalla histórica.
- No hay navegador automatizado instalado para la inspección de píxeles y capturas.

# Arquitectura de actualización en vivo

1. Un adaptador read-only consulta agenda próxima, eventos en vivo y correcciones sin exponer claves al navegador.
2. El normalizador valida IDs estables, UTC, estado, resultados y revisión contra el contrato neutral.
3. Cada sincronización conserva `lastSyncedAt`, hash, fuente y auditoría; la interfaz podrá indicar antigüedad.
4. Un bloqueo manual o corrección administrativa prevalece sobre actualizaciones automáticas y deja el cambio pendiente de revisión.
5. Sin credencial, muestras autorizadas y licencia de exhibición no se activa polling ni se publica ningún evento.

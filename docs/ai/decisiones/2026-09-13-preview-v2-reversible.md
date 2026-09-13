# Decision - Preview V2 reversible

Fecha: 2026-09-13

## Decision

Crear una ruta `/diario` para la primera maqueta V2 en vez de reemplazar inmediatamente `/`.

## Motivo

La portada actual del proyecto esta fuertemente acoplada a datos, ranking, metricas y cierre del Mundial 2026. Reemplazarla en P001 aumentaba el riesgo de romper accesos historicos o consultas existentes.

## Alternativas descartadas

- Reemplazar la Home en el primer avance: descartado por riesgo innecesario.
- Reutilizar directamente la estructura de llaves/fixture del Mundial: descartado porque la V2 necesita agenda diaria multideporte.
- Crear tablas o migraciones para jornadas diarias: descartado hasta definir proveedor, puntajes y desempates.

## Consecuencia

La maqueta queda navegable y reversible. Para convertirla en portada habra que definir el corte de navegacion, revisar SEO/metadatos y validar regresiones de login, ranking y admin.
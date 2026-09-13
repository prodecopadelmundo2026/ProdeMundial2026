# P011 - Decisiones de UX/UI diario

## Lenguaje reutilizado

- Se reutilizan la navegacion responsive `NavLinks`, los tokens globales de color y tipografia, la franja naranja de metricas y la jerarquia editorial del historial.
- `DailyVisualAtmosphere` separa el fondo abstracto en un componente reutilizable: figuras geometricas recortadas, baja intensidad y respeto por `prefers-reduced-motion`.

## Adaptacion diaria

- La franja superior no contiene premios ni datos historicos. Muestra participantes, eventos finalizados/total, pozo estimado demo, puntaje propio y lider de la sala activa.
- El hero prioriza un evento en curso y, si no existe, el proximo por horario. Las tarjetas secundarias muestran los siguientes eventos sin convertir el encabezado en tabla.
- El ranking diario toma `roomRanking` y solo participantes de la sala seleccionada. Muestra top 5, empate de lider cuando corresponde y clasificacion completa en el mismo contexto.
- Fechas y horarios demo usan datos concretos. Los fallbacks pasan a decir `Fecha por confirmar` y `Hora por confirmar`, sin marcadores tecnicos.

## Limites

- No hay autenticacion diaria, persistencia, proveedor, pagos ni dinero real.
- La pagina historica y sus datos no se modifican. Las rutas existentes de Mundial siguen siendo los destinos de navegacion historica hasta que exista una ruta diaria persistente independiente.

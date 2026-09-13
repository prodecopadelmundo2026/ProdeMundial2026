# P016 - Calendario visual propio e integración real de eventos

## Objetivo

Reemplazar el calendario nativo por uno propio en `/`, `/mi-prode` y `/ranking`, conservar `/` como agenda pública y comenzar una integración deportiva exclusivamente cuando exista una credencial autorizada.

## Requisitos recibidos

- Usar negro, bordes sutiles, naranja, blanco y mint del producto; respetar movimiento reducido.
- Incluir día anterior/siguiente, fecha central, selector de mes, vista mensual y acción Hoy, sin reproducir literalmente la referencia.
- Marcar hoy, selección, eventos, jornadas cerradas, futuras y fechas sin eventos; permitir navegar meses, teclado, Escape, click afuera y etiquetas accesibles.
- Mantener Buenos Aires para la jornada mostrada y UTC para instantes almacenados. `/diario` debe redirigir técnicamente a `/`.
- Si existe una credencial autorizada, normalizar próximos, live y resultados read-only con IDs externos, fuente, hash, timestamps y correcciones manuales protegidas.
- Priorizar fútbol argentino/CONMEBOL, ATP/Grand Slam y UFC. No mostrar Boxeo, MMA genérico ni UFC sin datos suficientes para los campos exigidos.
- Mantener `lockAt = inicio del primer evento elegible - 5 minutos` y probar futuro, inminencia, iniciado, horario ausente, reprogramación, cierre y zona argentina.
- Publicar el resultado validado en `main`, desplegar Vercel y alinear `dev` exactamente con `main`, preservando `supabase/.temp/` y el Mundial histórico.

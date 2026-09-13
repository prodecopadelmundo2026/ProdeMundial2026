# P017 - Layout estable y API

- El hero reserva `8.5rem` en mobile, `10rem` en tablet y `13.5rem` desde escritorio para el título. El texto usa `clamp()`, `text-wrap: balance`, ancho controlado y hasta tres líneas, sin `overflow: hidden` para ocultarlo.
- Desde 1024 px el hero se organiza en dos columnas: contenido y estado a la izquierda, caja de controles con altura mínima de `360px` a la derecha. En mobile y tablet se apilan naturalmente.
- Las tarjetas de evento vacío, evento destacado y resumen reservan `332px` como mínimo. Etiqueta, título, descripción y mensaje final usan filas propias para que una fecha larga no desplace el resumen.
- La fecha visible del control se expresa como día, mes abreviado y año completo. El nombre largo queda solo en el label accesible, evitando el truncado a mitad de palabra.
- No existe credencial deportiva autorizada local. La sesión de Vercel disponible no puede enumerar variables del proyecto productivo. Sin trial/clave, cobertura por competencia, límites y licencia no se crea adaptador ni se muestra dato público.
- Fútbol y tenis siguen siendo los únicos filtros públicos. Boxeo y UFC permanecen ocultos hasta tener una fuente autorizada con datos completos, incluida la política de correcciones.
- La PWA sigue como web preparada para manifest, iconos, safe areas, navegación táctil y enlaces profundos; service worker, Capacitor, permisos, notificaciones y pagos quedan fuera de P017.

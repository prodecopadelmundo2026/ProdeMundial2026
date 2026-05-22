# Admin Dashboard

Este documento resume el funcionamiento esperado del dashboard admin y las herramientas asociadas. La idea es que cualquier cambio futuro mantenga separadas las responsabilidades de administracion, predicciones del usuario y resultados oficiales.

## Objetivo

El dashboard admin centraliza tareas operativas del Prode:

- Gestionar participantes habilitados.
- Cargar o revisar resultados oficiales.
- Usar herramientas de testing para completar pronosticos del usuario admin.
- Navegar hacia secciones administrativas sin mezclar permisos ni afectar datos de otros usuarios.

## Participantes Habilitados

El sistema no tiene registro publico libre. Un usuario solo puede ingresar si su email esta cargado en la whitelist.

Reglas esperadas:

- El admin carga email, nombre y apellido del participante.
- El email debe normalizarse con `trim()` y `toLowerCase()` al guardar y al validar login.
- Si el email no esta autorizado, el usuario no debe acceder.
- La whitelist no debe crear predicciones, ranking ni datos deportivos por si sola.

## Carga De Resultados

La carga de resultados oficiales debe ser una herramienta admin separada de las predicciones.

Reglas esperadas:

- Solo admins pueden modificar resultados oficiales.
- La carga de resultados modifica partidos/resultados oficiales, no predicciones de usuarios.
- Al cargar o cambiar un resultado oficial, debe dispararse o quedar disponible el recalculo de puntos.
- Los errores deben mostrarse con detalle suficiente en logs o UI de preview/desarrollo.

## Herramientas Admin

Las herramientas admin de Mi Prode existen para acelerar testing antes del inicio del Mundial.

Herramientas actuales o esperadas:

- Cargar pronosticos aleatorios de grupos para el usuario autenticado.
- Cargar pronosticos aleatorios de eliminatorias disponibles para el usuario autenticado.
- Cargar apuestas especiales de prueba.
- Borrar pronosticos propios por fase, con cascada en eliminatorias.

Reglas:

- No tocar predicciones de otros usuarios.
- No tocar resultados oficiales.
- No tocar ranking directamente.
- No borrar partidos, equipos, nombres, flags ni fotos.
- Respetar partidos cerrados si la logica vigente los bloquea.

## Navegacion Esperada

La navegacion admin deberia evolucionar hacia un dashboard unico con secciones claras:

- Lista blanca.
- Cargar resultados.
- Herramientas de testing.

Pendiente UX: el boton actual de "Lista blanca" deberia pasar a llamarse "Dashboard" cuando el panel consolide esas secciones.

## Pendientes UX

- Separar visualmente herramientas de testing de herramientas oficiales.
- Mostrar errores reales de server actions en preview/desarrollo.
- Confirmar cambios destructivos con modales.
- Mostrar conteos de elementos afectados antes y despues de ejecutar acciones.
- Evitar botones que cambien bruscamente de estilo al hacer click.

# P014 — Home único, calendario diario, cierre de jornada, APIs deportivas y preparación móvil

Trabajá sobre:

`C:\Users\juana\Desktop\Proyectos\prode-mundial-2026`

## Estado inicial

P013 quedó en la rama:

`codex/p013-auditoria-experiencia-diaria`

Commit final informado:

`1700e08`

`main` permanece en:

`bea8ca2`

`dev` permanece en:

`df8fd82`

Antes de modificar:

1. Leer `AGENTS.md`.
2. Leer `docs/ai/README.md`.
3. Leer las decisiones y ejecuciones P001 a P013.
4. Revisar `git status`.
5. Revisar ramas locales y remotas.
6. Revisar diferencias entre `main`, `origin/main`, `dev` y `origin/dev`.
7. Confirmar que `supabase/.temp/` siga intacto y sin trackear.
8. No pisar cambios locales ajenos.

## Objetivo principal

Eliminar la duplicación entre `/` y `/diario`.

La aplicación debe tener una única agenda diaria pública, navegable por fecha, con filtros, eventos, pronósticos, estados y calendario.

Además:

* agregar navegación entre días;
* permitir consultar jornadas anteriores y futuras;
* agregar contador para el próximo evento;
* definir y preparar el cierre de pronósticos;
* continuar la investigación de APIs deportivas;
* preparar la web para convertirse más adelante en aplicación Android y iPhone;
* actualizar `dev` para que quede exactamente igual al último `main`.

No agregar notificaciones todavía.

No agregar botón de campana.

No agregar cuotas.

No modificar el Mundial histórico.

No crear tablas ni hacer migraciones en Supabase.

## 1. Eliminar `/diario` como experiencia pública

La ruta `/` debe ser la única agenda diaria pública.

Debe contener:

* hero;
* fecha seleccionada;
* calendario;
* botones anterior y siguiente;
* filtros;
* eventos;
* contador;
* estados;
* pronósticos;
* resumen de jornada;
* ranking diario resumido;
* acceso a Mi Prode;
* acceso al ranking completo.

La ruta `/diario` debe dejar de tener una página propia.

Implementar una redirección técnica desde `/diario` hacia `/`, preferentemente permanente, para que:

* no se rompan enlaces existentes;
* no haya dos implementaciones;
* no se dupliquen datos;
* no se dupliquen consultas;
* no se mantengan dos experiencias visuales;
* `/diario` no aparezca en el navbar.

No mostrar `/diario` como sección independiente.

El navbar diario debe quedar:

* Inicio → `/`
* Mi Prode → `/mi-prode`
* Ranking → `/ranking`
* Historial → `/historial`
* Reglas → `/reglas`

## 2. Calendario diario

Agregar en `/` un selector de fecha inspirado en la captura recibida, pero adaptado al lenguaje visual del Prode.

La estructura debe incluir:

* flecha para día anterior;
* fecha o título centrado;
* flecha para día siguiente;
* indicador visual de que la fecha seleccionada es `Hoy`;
* botón o control desplegable para abrir un calendario;
* selección de día, mes y año;
* indicadores de días con eventos;
* posibilidad de consultar días anteriores;
* posibilidad de consultar días futuros;
* estado visual para jornada abierta, cerrada o sin eventos.

Ejemplos de títulos:

* `PARTIDOS DE HOY`
* `EVENTOS DE HOY`
* `EVENTOS DE MAÑANA`
* `EVENTOS DEL 15 DE SEPTIEMBRE`
* `JORNADA CERRADA`
* `SIN EVENTOS VERIFICADOS`

No copiar literalmente el diseño de la captura. Tomar solamente la idea de navegación y selector.

Usar:

* fondo oscuro;
* tarjetas negras;
* borde sutil;
* naranja de marca;
* tipografía del proyecto;
* formas geométricas existentes;
* estados activos visibles;
* buen contraste;
* diseño responsive.

No incluir:

* campana;
* botón de notificaciones;
* botón de cuotas;
* odds;
* información de apuestas externas.

## 3. Navegación entre fechas

La fecha seleccionada debe estar centralizada en un único estado.

No calcular “hoy” de una manera distinta en cada componente.

Usar:

* zona horaria del producto: `America/Argentina/Buenos_Aires`;
* almacenamiento interno de fechas en UTC;
* conversión únicamente en presentación y reglas de jornada;
* una función central para obtener la fecha de jornada;
* una única fuente para el día actual.

Los botones deben funcionar así:

### Día anterior

* mostrar resultados y eventos de la fecha anterior;
* mostrar jornadas cerradas;
* mostrar puntos calculados si existen;
* permitir auditoría;
* no permitir modificar pronósticos cerrados.

### Día actual

* mostrar eventos próximos;
* mostrar eventos en vivo;
* permitir pronósticos si la jornada está abierta;
* mostrar contador;
* mostrar estado de cierre.

### Día siguiente

* mostrar eventos futuros publicados;
* permitir planificar;
* mostrar el horario estimado de cierre;
* permitir pronósticos si la jornada está abierta;
* mostrar claramente que todavía no es la jornada actual.

### Fechas sin datos

Mostrar:

> No hay eventos verificados para esta fecha.

No mostrar fixtures sintéticos como si fueran reales.

## 4. Filtros

Mantener filtros combinables:

* Todos;
* Fútbol;
* Tenis;
* Boxeo;
* MMA próximamente;
* competencia;
* estado;
* solo mis pronósticos.

En móvil, los filtros deben entrar en:

* una fila desplazable controlada;
* un panel desplegable;
* un acordeón;
* o una combinación equivalente.

No permitir overflow horizontal de toda la página.

Los filtros deben modificar:

* listado de eventos;
* hero;
* contador;
* métricas;
* ranking resumido;
* cantidad de resultados.

Mostrar cuántos eventos devuelve el filtro.

## 5. Eventos públicos

Los eventos públicos solo pueden ser:

* reales;
* identificables;
* pertenecientes a una competencia permitida;
* verificados;
* con fuente;
* con fecha de consulta;
* con horario confirmado o estado explícito.

Si todavía no existe proveedor autorizado, mostrar estado vacío.

Los fixtures sintéticos deben continuar únicamente en:

* tests;
* admin;
* desarrollo interno.

No deben aparecer en la experiencia pública.

No mostrar:

* equipos inventados;
* partidos de exhibición;
* amistosos no autorizados;
* ligas ficticias;
* torneos desconocidos;
* eventos sin fuente;
* eventos de prueba sin rotulado.

## 6. Contador del próximo evento

Crear un componente reutilizable para mostrar el tiempo restante del próximo evento válido.

Debe mostrar:

* días si faltan varios días;
* horas, minutos y segundos cuando corresponda;
* `Comienza ahora`;
* `En curso`;
* `Finalizado`;
* `Horario pendiente`;
* `Reprogramado`.

El contador debe:

* utilizar fecha UTC;
* mostrar la hora argentina;
* actualizarse una vez por segundo;
* no mostrar números negativos;
* detenerse cuando comience el evento;
* respetar `prefers-reduced-motion`;
* tener texto accesible;
* no depender únicamente de animaciones.

Mostrarlo en:

* hero;
* tarjeta del próximo evento;
* Mi Prode cuando corresponda;
* jornada futura si todavía acepta pronósticos.

No mostrar contador para:

* eventos cancelados;
* eventos anulados;
* eventos sin fecha;
* eventos sin fuente;
* horarios provisionales;
* fixtures sintéticos públicos.

Agregar tests para:

* evento en el futuro;
* evento dentro de cinco minutos;
* evento exactamente en cero;
* evento ya iniciado;
* evento sin horario;
* evento reprogramado;
* timezone argentina.

## 7. Regla de cierre de jornada

Implementar como regla MVP:

```text
lockAt = inicio del primer evento elegible publicado de la jornada - 5 minutos
```

La jornada completa se cierra cinco minutos antes del primer evento del día.

Esta regla es preferible para el pozo diario porque evita que una persona se incorpore cuando ya terminaron algunos eventos y pueda competir con información conocida.

### Antes del cierre

Permitir:

* ingresar a una sala;
* seleccionar importe;
* crear una participación única por sala;
* cargar pronósticos;
* editar pronósticos;
* cambiar pronósticos;
* planificar jornadas futuras;
* consultar el contador.

### Después del cierre

Impedir:

* nuevas participaciones;
* cambios de importe;
* nuevos pronósticos;
* edición de pronósticos;
* incorporación pública de eventos;
* modificación de la composición del pozo.

Mostrar:

> La jornada ya está cerrada. Las predicciones no se pueden modificar.

### Reprogramaciones antes del cierre

* recalcular `lockAt`;
* actualizar contador;
* registrar fecha anterior y nueva;
* registrar fuente;
* registrar actor;
* guardar auditoría.

### Reprogramaciones después del cierre

* no reabrir automáticamente;
* mantener el cierre;
* permitir decisión administrativa;
* registrar cualquier excepción.

### Eventos agregados después del cierre

* no incorporarlos silenciosamente;
* no permitir apuestas retroactivas;
* dejarlos pendientes de revisión;
* moverlos a otra jornada si corresponde.

## 8. Mi Prode

`/mi-prode` debe permitir elegir fecha con el mismo calendario o selector de jornadas.

Mostrar:

* hoy;
* mañana;
* fechas futuras;
* pronósticos editables;
* pronósticos bloqueados;
* eventos en curso;
* resultados confirmados;
* aciertos;
* errores;
* puntos;
* puntos pendientes;
* sala;
* importe;
* estado de la jornada.

No mezclar ningún dato del Mundial.

## 9. Ranking diario

`/ranking` debe actualizarse según:

* fecha seleccionada;
* sala seleccionada;
* eventos finalizados;
* puntos confirmados;
* pronósticos pendientes.

Mostrar:

* top 5;
* ranking completo;
* posición provisional;
* empates;
* puntos;
* eventos acertados;
* eventos pendientes.

El pozo se reparte entre los primeros empatados.

No mostrar premios históricos del Mundial.

## 10. Investigación de APIs deportivas

Continuar la investigación de:

* Goalserve;
* Sportradar;
* API-Sports;
* Sportmonks;
* SportsDataIO;
* proveedor específico de boxeo;
* proveedor específico de MMA.

La investigación debe evaluar:

* fútbol argentino;
* Primera Nacional;
* Copa Argentina;
* Supercopa Argentina;
* Libertadores;
* Sudamericana;
* ATP 250;
* ATP 500;
* ATP Masters 1000;
* Grand Slam;
* boxeo;
* MMA/UFC;
* horarios;
* estados;
* actualizaciones en vivo;
* sets;
* tiebreaks;
* KO/TKO;
* método;
* round;
* empate;
* no contest;
* reprogramaciones;
* cancelaciones;
* correcciones;
* eventos eliminados;
* IDs estables;
* webhooks;
* push;
* polling;
* límites;
* precios;
* trial;
* licencia de exhibición pública;
* redistribución;
* uso con premios o dinero.

No seleccionar proveedor solamente porque dice “multi-sport”.

No integrar una API real sin:

* credencial autorizada;
* evidencia de cobertura;
* muestras;
* autorización de uso;
* licencia de exhibición;
* revisión de límites;
* aprobación explícita.

Las claves nunca deben llegar al navegador.

Preparar solamente:

* contrato neutral;
* adaptador read-only;
* normalizador;
* política de actualización;
* manejo de estados;
* auditoría;
* tests;
* documentación.

## 11. Actualizaciones deportivas

Preparar arquitectura para:

* consultar eventos próximos;
* actualizar eventos en vivo;
* guardar `lastSyncedAt`;
* mostrar `Actualizado hace...`;
* detectar datos vencidos;
* manejar errores;
* conservar correcciones;
* respetar bloqueos manuales;
* no pisar correcciones administrativas.

No implementar todavía polling contra una API real si no existe credencial y licencia.

## 12. Preparación para aplicación Android y iPhone

No crear todavía los proyectos nativos completos si eso obliga a agregar complejidad innecesaria.

Preparar la aplicación web como PWA:

* manifest;
* nombre corto;
* iconos;
* colores de tema;
* viewport correcto;
* pantalla de carga;
* favicon;
* metadatos móviles;
* comportamiento responsive;
* estados de conexión;
* enlaces profundos;
* rutas estables;
* safe areas;
* navegación táctil;
* formularios cómodos en celular.

No agregar notificaciones ni solicitar permisos de notificaciones.

Crear documentación:

`docs/ai/infrastructure/mobile-app-plan.md`

Documentar estas etapas:

### Etapa 1

Web mobile-first y PWA instalable.

### Etapa 2

Empaquetado Android mediante Capacitor o Trusted Web Activity.

### Etapa 3

Empaquetado iOS mediante Capacitor/Xcode.

### Etapa 4

Pruebas en dispositivos reales.

### Etapa 5

Publicación en Play Store y App Store.

Registrar que una app con dinero real o apuestas puede necesitar:

* entidad legal;
* licencia;
* control de edad;
* geolocalización;
* términos y condiciones;
* política de privacidad;
* juego responsable;
* revisión específica de cada tienda;
* permisos sobre logos, nombres y datos deportivos.

No agregar pagos todavía.

## 13. Sincronizar `dev` con `main`

El usuario solicita que `dev` quede exactamente igual al último `main`.

Antes:

1. Confirmar que `dev` no tenga cambios sin guardar.
2. Confirmar SHA local y remoto.
3. Crear una referencia de respaldo local de `dev` antes de modificarla.
4. Actualizar referencias remotas.
5. Alinear `dev` con `main`.
6. Alinear `origin/dev` con `origin/main`.
7. Usar `--force-with-lease` únicamente si es estrictamente necesario.
8. No usar `git push --force`.
9. No borrar la rama anterior.
10. Registrar la operación en la documentación.

Al finalizar, verificar:

```text
git rev-parse main
git rev-parse dev
git rev-parse origin/main
git rev-parse origin/dev
```

Los cuatro valores deben coincidir exactamente.

Si `dev` tiene trabajo que no está en `main`, conservarlo mediante una rama de respaldo y documentar qué se preservó.

## 14. Documentación

Crear o actualizar:

* `docs/ai/prompts/P014-home-calendario-mobile.md`
* `docs/ai/decisiones/P014-home-calendario-y-mobile.md`
* `docs/ai/ejecuciones/P014-home-calendario-y-mobile.md`
* `docs/ai/infrastructure/mobile-app-plan.md`
* `docs/ai/infrastructure/live-update-architecture.md`
* `docs/ai/provider-evaluations/api-provider-matrix.md`

Copiar este prompt íntegramente.

Calcular y registrar SHA-256.

Documentar:

* eliminación de `/diario`;
* redirección técnica;
* calendario;
* navegación entre fechas;
* cierre de jornada;
* contador;
* API research;
* mobile readiness;
* sincronización de `dev`;
* archivos modificados;
* validaciones;
* SHA final;
* bloqueos.

## 15. Validaciones

Ejecutar:

* `npm run daily-prode:verify-contract`;
* modo JSON;
* TypeScript;
* ESLint dirigido;
* build;
* `git diff --check`.

Probar:

* `/`;
* `/diario`;
* `/mi-prode`;
* `/ranking`;
* `/reglas`;
* `/historial`;
* `/historial/mundial`;
* `/admin/diario`.

Verificar:

* `/diario` redirige a `/`;
* no existe una segunda página diaria;
* el calendario cambia correctamente la fecha;
* funcionan los botones anterior y siguiente;
* hoy, ayer y mañana muestran estados correctos;
* el contador no queda negativo;
* la jornada se bloquea cinco minutos antes del primer evento;
* no hay eventos sintéticos públicos;
* no hay referencias del Mundial en las pantallas diarias;
* no existe botón de notificaciones;
* no existe botón de cuotas;
* no hay scroll horizontal;
* el diseño funciona en 320, 375, 390, 768, 1024, 1280 y 1440 px;
* `/admin/diario` sigue protegido;
* el Mundial histórico sigue funcionando;
* Supabase remoto no fue modificado.

## 16. Git y entrega

Trabajar en:

`codex/p014-home-calendario-mobile`

Crear commit descriptivo.

Publicar la rama y generar Preview de Vercel.

No hacer merge a `main` hasta que el responsable pruebe la Preview.

No modificar `dev` con los cambios de P014: `dev` debe quedar exactamente igual que `main`.

La entrega debe informar:

* rama;
* SHA inicial;
* SHA final;
* SHA coincidente de `main`, `dev`, `origin/main` y `origin/dev`;
* Preview;
* rutas verificadas;
* validaciones;
* investigación de APIs;
* decisiones de cierre;
* estado PWA;
* próximos pasos;
* cualquier bloqueo por credenciales, licencias o permisos.

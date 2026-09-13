# P001 — Inicio de V2: prode diario multideporte y reglas de trabajo

Vamos a iniciar una segunda versión del proyecto. Necesito que establezcas una forma de trabajo documentada y empieces una primera maqueta local, aprovechando lo que ya funciona.

No quiero una reescritura completa ni perder el trabajo del Mundial.

## 1. Ubicación y antecedentes

Referencias de conversaciones anteriores, que debés verificar antes de trabajar:

* Proyecto: Prode Mundial 2026.
* Ruta local conocida: `C:\Users\juana\Desktop\prode-mundial-2026`.
* Repositorio: [ProdeMundial2026](https://github.com/prodecopadelmundo2026/ProdeMundial2026).
* URL conocida: [Prode Mundial 2026](https://prode-mundial2026-kappa.vercel.app).
* Stack registrado: Next.js, TypeScript, Supabase y Vercel.

No des por confirmado que la rama está limpia, que la configuración sigue igual o que los MCP están conectados.

Verificá la identidad del repositorio abierto. Si no coincide, consultame antes de modificarlo.

## 2. Qué buscamos con la V2

El producto deja de estar centrado en el Mundial y pasa a tener jornadas diarias con eventos de distintos deportes: fútbol, tenis, boxeo y otros que incorporemos.

La experiencia principal será:

1. Ver los eventos del día, sus horarios y su estado.
2. Participar con pronósticos.
3. Seguir los resultados y el desempeño propio.
4. Consultar la clasificación de la sala en la que se participa.
5. Poder revisar jornadas anteriores.

La regla confirmada es que quien más puntos sume gana el pozo completo de su sala. No habrá premios para segundo o tercer puesto.

Todavía NO están definidos los puntajes ni el desempate. No implementes reparto entre empatados, sorteos, acumulación del pozo ni otro criterio por tu cuenta.

Queremos explorar salas por importe: por ejemplo, $5.000, $10.000 y $20.000. Quienes participan en una sala compiten entre sí, con su propio pozo y clasificación.

Estos importes son ejemplos para la maqueta, no una configuración comercial definitiva. Documentá como pendientes la moneda, los importes finales y si una persona podrá participar en varias salas o con varias entradas.

Por ahora no desarrollaremos apuestas por torneos, llaves eliminatorias ni premios por temporadas.

Usá “Prode diario” como denominación funcional provisoria, sin decidir todavía la marca definitiva.

## 3. Forma de trabajo y comunicación

Vamos a trabajar así:

* En ChatGPT discutimos el producto y preparamos los prompts.
* Yo te paso esos prompts a Codex en el proyecto local.
* Vos inspeccionás, implementás lo autorizado, hacés el testeo y documentás.
* Me devolvés un resumen que pueda traer a ChatGPT para preparar el siguiente paso.

No dependas de recordar conversaciones anteriores. La documentación del repositorio debe permitir retomar el trabajo desde otra sesión.

Antes de cada tarea:

* Leé las instrucciones aplicables, el índice y el estado actual.
* Consultá después únicamente la documentación y el código relacionados con la tarea.
* Diferenciá lo confirmado, lo propuesto, lo implementado y lo pendiente.
* Si encontrás contradicciones entre documentación y código, señalalas. No asumas que una de las dos versiones expresa automáticamente lo que queremos.

Preguntame cuando una duda pueda cambiar reglas del juego, datos históricos, permisos, costos o alcance. Hacé pocas preguntas concretas y explicá qué decisión depende de cada respuesta.

Para decisiones visuales menores y reversibles, podés avanzar dejando registrado el supuesto. Las dudas de puntaje no deben bloquear la maqueta, pero tampoco autorizarte a inventar reglas.

Comunicate en español, directo y breve. No presentes como terminado algo que solamente está propuesto o simulado.

## 4. Reglas persistentes y documentación

Revisá primero si ya existen `AGENTS.md`, instrucciones por carpeta, `README.md`, `REPO_RULES.md`, `CLAUDE.md` u otros archivos equivalentes.

Integrá estas reglas sin borrar instrucciones válidas ni crear fuentes contradictorias. No modifiques configuraciones globales de otros proyectos.

Usaremos `docs/ai/`, salvo que exista una estructura equivalente que convenga mantener. En ese caso, explicá la equivalencia y evitá duplicarla.

Organización propuesta:

| Ubicación                  | Contenido                                                 |
| -------------------------- | --------------------------------------------------------- |
| `AGENTS.md`                | Reglas breves del proyecto y orden de lectura.            |
| `docs/ai/README.md`        | Índice con enlaces a la información vigente.              |
| `docs/ai/estado-actual.md` | Qué funciona, qué cambió, bloqueos y próximo paso.        |
| `docs/ai/vision-v2.md`     | Objetivo, alcance, reglas confirmadas y pendientes.       |
| `docs/ai/prompts/`         | Prompts recibidos, identificados y conservados.           |
| `docs/ai/ejecuciones/`     | Implementación, hallazgos y testeo de cada tarea.         |
| `docs/ai/decisiones/`      | Decisiones relevantes, motivo y alternativas descartadas. |

Reutilizá la documentación técnica existente. Creá documentos temáticos adicionales solamente cuando hagan falta.

### Registro de cada tarea

Empezá registrando este prompt. Si el identificador P001 ya existe, elegí el siguiente disponible sin sobrescribirlo.

Para cada tarea conservá:

* Identificador y fecha.
* Prompt original, sin reemplazarlo por un resumen.
* Objetivo y alcance.
* Rama y commit de partida verificados.
* Cambios realizados y archivos afectados.
* Decisiones, supuestos y preguntas pendientes.
* Testeo ejecutado y resultado real.
* Limitaciones y próximo paso.
* Referencia al commit correspondiente cuando exista.

No guardes contraseñas, tokens ni datos personales innecesarios. Si un prompt contiene secretos, reemplazalos por una marca de redacción.

El texto original del prompt se conserva. Las aclaraciones posteriores y los distintos intentos de ejecución se agregan como registros vinculados, sin borrar lo anterior.

Al cerrar una tarea, actualizá el estado actual y la documentación funcional afectada. No alcanza con acumular prompts si después nadie puede saber cómo funciona el sistema.

La documentación debe acompañar al código en Git. No hagas push ni deploy con este prompt.

### Obsidian y MCP

Inspeccioná cuáles están disponibles y qué proyecto o vault consultan realmente.

Usá Obsidian y las herramientas de búsqueda o memoria de código cuando ayuden a recuperar información puntual. No asumas conexiones ni reindexes todo por costumbre.

La documentación canónica debe quedar en el repositorio. Si Obsidian utiliza otra ubicación, primero identificá cómo evitar dos copias que se desactualicen.

Si una herramienta no está disponible, informalo y continuá con los archivos locales cuando sea posible. No instales complementos ni crees automatizaciones sin consultarme.

## 5. Preservación del Mundial y de las futuras jornadas

El Mundial debe dejar de dominar la portada y la navegación principal, pero no desaparecer.

Necesitamos un acceso secundario de “Historial” o “Ediciones anteriores” desde el que pueda consultarse lo realizado.

Preservá:

* Eventos y resultados.
* Pronósticos y participantes.
* Reglas que se utilizaron.
* Clasificaciones y premios registrados.
* Funciones administrativas y trazabilidad disponibles.

No borres datos, reinicies tablas ni recalculés el Mundial con reglas nuevas.

Revisá qué partes del sistema anterior podemos reutilizar y qué está demasiado ligado al Mundial. No copies automáticamente su lógica de puntajes, premios o excepciones de edición.

Quiero conservar la posibilidad de administrar lo archivado. Antes de implementar nuevas ediciones sobre históricos, consultame qué campos deben poder modificarse y qué efecto deberían tener.

Cualquier corrección histórica deberá conservar el valor anterior, el nuevo, quién la hizo, cuándo y por qué. Una corrección no debe modificar silenciosamente premios ya cerrados.

Separá dos cosas:

* La documentación y Git registran cómo desarrollamos el sistema.
* La auditoría de la aplicación registra cambios en resultados, pronósticos y demás datos operativos.

Una no reemplaza a la otra.

Las futuras jornadas también deben quedar consultables con sus reglas, resultados, clasificación y resolución del premio. No deben desaparecer cuando cambie el día.

## 6. Primera maqueta: agenda diaria y seguimiento

Conservá la identidad visual y los componentes actuales que funcionen bien.

La nueva pantalla principal debe priorizar:

### Agenda del día

* Hoy como fecha inicial y navegación a otras fechas.
* Lista vertical de eventos.
* Próximos eventos ordenados por horario ascendente.
* Eventos en curso claramente visibles.
* Finalizados identificados y separados de los próximos.
* Deporte, competencia, participantes, horario, estado y resultado cuando corresponda.
* Estados de carga, error y jornada sin eventos.

Para la maqueta, usá horario de Buenos Aires y dejá documentado ese supuesto. No confundas el comienzo de la transmisión con el inicio deportivo del evento; si existen ambos datos, deben distinguirse.

### Salas

Mostrá las salas de ejemplo por importe, con identificación clara de cuál está seleccionada.

Cada sala debe mostrar sus propios participantes, pozo y clasificación. No mezcles cifras entre salas ni entre jornadas.

### Mi participación

Debajo de la agenda, si el usuario participa, mostrá:

* Evento.
* Pronóstico propio.
* Resultado actual o confirmado.
* Estado del pronóstico.
* Puntos obtenidos, cuando exista una regla definida.
* Total y posición dentro de su sala.

Diferenciá pendiente, en curso, acertado, no acertado y anulado. Un resultado parcial no debe presentarse como acierto definitivo.

Como todavía no definimos el puntaje, usá valores claramente identificados como demostración o “A definir”. No conectes esos ejemplos al cálculo real.

### Clasificación

Mostrá la tabla de posiciones de la sala seleccionada y destacá al usuario.

La clasificación puede mostrar todas las posiciones; eso no implica premiar a todas. El único premio previsto corresponde al primer puesto.

Diferenciá clasificación provisional de clasificación final.

## 7. Responsive obligatorio

La información principal debe poder usarse en celulares, tablets y notebooks sin desplazarse de izquierda a derecha.

No resuelvas una tabla demasiado ancha solamente agregando scroll horizontal o escondiendo el desborde.

En pantallas pequeñas, usá tarjetas, filas adaptadas o detalles desplegables. Conservá accesibles los datos relevantes.

Verificá como mínimo anchos de 320, 390, 768, 1024 y 1366 píxeles, incluyendo:

* Nombres largos.
* Muchos eventos y participantes.
* Importes y resultados extensos.
* Estados vacíos y errores.
* Navegación por teclado y foco visible.
* Estados comprensibles sin depender solamente del color.

No reutilices la estructura de llaves del Mundial para esta experiencia diaria.

## 8. Resultados automáticos y administración

La V2 debe prepararse para recibir calendario, estados y resultados automáticamente. La carga manual no debe ser su funcionamiento principal.

En esta primera etapa:

* Separá los componentes visuales de la fuente de datos.
* Prepará una interfaz sencilla que permita reemplazar datos de demostración por una integración real.
* No elijas ni contrates un proveedor todavía.
* No presentes eventos de ejemplo como información deportiva real.
* Dejá documentado qué falta para conectar la fuente real.

La futura integración deberá contemplar:

* Identificadores estables y prevención de duplicados.
* Actualizaciones repetidas sin duplicar puntos.
* Fuente y fecha de última actualización.
* Datos atrasados o fallas de conexión.
* Suspensiones, cancelaciones y reprogramaciones.
* Correcciones de resultados.
* Diferencias entre deportes.

El panel admin debe mantenerse para corregir, completar o confirmar información cuando haga falta.

Una corrección manual debe quedar auditada y no ser sobrescrita silenciosamente por la siguiente sincronización. Proponé cómo gestionar ese conflicto, sin decidir todavía si todos los resultados necesitarán confirmación humana.

No cierres una jornada ni declares un ganador solamente porque llegó la medianoche: puede haber eventos todavía pendientes.

## 9. Alcance autorizado para este primer avance

Primero inspeccioná:

* Estado de Git, rama, remoto y cambios existentes.
* Documentación y reglas del repositorio.
* Estructura y componentes reutilizables.
* Autenticación, permisos, admin y ranking actuales.
* Modelo de datos y separación entre desarrollo y producción.
* Comandos reales de testeo y build.

No muestres secretos ni ejecutes escrituras en producción para inspeccionar.

Después avanzá con:

1. Reglas persistentes e historial de este primer prompt.
2. Documento de visión V2 y estado inicial.
3. Primera maqueta navegable de agenda, salas, participación y clasificación.
4. Separación visual entre la experiencia diaria y el Mundial histórico, preservando los accesos necesarios.
5. Datos de demostración aislados, sin mezclarlos con usuarios o resultados reales.
6. Testeo y documentación del resultado.

Si reemplazar la portada requiere cambios riesgosos, habilitá primero una ruta local de previsualización V2 y explicá qué falta para convertirla en portada. No rompas lo existente para cumplir visualmente este primer paso.

No implementes todavía:

* Cobros, retiros o pagos reales.
* Liquidación automática de premios.
* Puntajes o desempates definitivos.
* Migraciones destructivas.
* Una reescritura del sistema.
* Cambios de dominio o infraestructura.
* Instalaciones de nuevas skills o servicios pagos.

Antes de activar dinero real, dejá como pendiente revisar las condiciones legales, operativas y del proveedor de pagos aplicables. La maqueta no equivale a estar listo para operar.

## 10. Nombre y dominio

Revisá qué implicaría cambiar el nombre público y la URL.

Distinguí entre:

* Marca visible.
* Nombre del proyecto en el hosting.
* Dirección pública.
* Nombre del repositorio y carpeta local.

No hace falta renombrar todo junto.

Prepará un diagnóstico de dependencias: URLs de autenticación y recuperación de contraseña, redirecciones, variables de entorno, enlaces absolutos, metadatos y otras integraciones que encuentres.

No cambies nada externo todavía. Informá qué verificaste y qué no pudiste comprobar.

## 11. Testeo y entrega

Ejecutá los controles que correspondan al repositorio: tipos, lint, tests y build según los scripts disponibles.

Verificá especialmente:

* Navegación diaria y orden de horarios.
* Separación entre salas y jornadas.
* Usuario sin participación.
* Datos demostrativos claramente identificados.
* Ausencia de desborde horizontal.
* Acceso al historial.
* Ausencia de regresiones en login y admin.
* Que la maqueta no escriba sobre datos reales.

Si tenés navegador disponible, revisá visualmente los tamaños indicados y aportá capturas. Si no pudiste comprobar algo, decilo.

Al finalizar devolveme:

1. Qué encontraste.
2. Qué implementaste y dónde verlo localmente.
3. Qué documentación quedó creada o actualizada.
4. Qué testeaste y con qué resultado.
5. Qué sigue pendiente o simulado.
6. Qué implica cambiar el nombre y la URL.
7. Hasta tres preguntas importantes para continuar.

No te quedes solamente en un plan: ejecutá el alcance local y reversible cuando el entorno lo permita. Si aparece un bloqueo, identificá el punto exacto y no inventes una solución que cambie el producto.

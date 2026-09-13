# P010 — Hito integral V2: Prode diario auditable, responsive y publicado

Trabajá como agente principal senior de producto, frontend, backend, QA, Git y deployment.

No te limites a proponer un plan. Ejecutá todo el trabajo seguro y autorizado de este prompt, aunque requiera varias horas.

El resultado esperado es que la V2 del Prode diario quede ampliamente desarrollada, documentada, commiteada en `main`, subida al remoto y publicada en:

`https://prode-mundial2026-kappa.vercel.app/`

## 1. Repositorio y estado inicial

Repositorio local:

`C:\Users\juana\Desktop\Proyectos\prode-mundial-2026`

Repositorio remoto:

`https://github.com/prodecopadelmundo2026/ProdeMundial2026`

Rama principal:

`main`

Estado conocido:

* P001 a P009 están aplicados.
* P009 todavía puede tener cambios locales sin commit.
* P007 fue confirmado en:

`aebf194 chore: stabilize daily prode contract verification`

* P008 fue confirmado en:

`b38006a docs: define provider evidence gate and manual fallback`

* P006 fue confirmado en:

`04a6395 test: add synthetic daily prode provider contract harness`

* P005 fue confirmado en:

`70a0a35 docs: record provider validation outcome`

* P004 fue confirmado en:

`cff4b01 docs: document Goalserve provider evaluation`

* El verificador del contrato ejecuta 122 controles.
* No hay proveedor deportivo real integrado.
* No hay credenciales Goalserve.
* No se obtuvieron muestras contractuales autorizadas.
* No hubo migraciones ni cambios de Supabase.
* `supabase/.temp/` existe, está sin trackear y debe permanecer intacto.

Antes de modificar:

1. Ejecutá `git status`.
2. Ejecutá `git branch --show-current`.
3. Ejecutá `git log --oneline --decorate -10`.
4. Verificá remoto y rama.
5. Revisá el diff completo.
6. Confirmá que el proyecto correcto es el repositorio indicado.
7. Leé `AGENTS.md`.
8. Leé `docs/ai/README.md`.
9. Leé `docs/ai/estado-actual.md`.
10. Consultá solamente la documentación relacionada con cada tarea.

No uses:

* `git reset --hard`.
* `git checkout --`.
* Borrados masivos.
* Fuerza de push.
* Reescritura de commits anteriores.
* Cambios sobre `supabase/.temp/`.

Preservá cualquier cambio local ajeno al alcance.

## 2. Checkpoint de P009

Antes de comenzar el desarrollo nuevo, verificá los cambios locales de P009.

Si corresponden al modo manual diario, al panel protegido y a su documentación, confirmalos en un commit separado:

`feat: implement audited manual daily prode mode`

No incluyas:

* `supabase/.temp/`.
* Secretos.
* Variables de entorno.
* Archivos ajenos.
* Cambios accidentales.

No hagas push todavía hasta terminar el desarrollo completo de este prompt.

## 3. Reglas funcionales vigentes

No modifiques estas reglas sin documentar una nueva decisión funcional:

### Participaciones y salas

* Una persona puede participar en varias salas durante la misma jornada.
* Tiene una sola entrada por persona, sala y jornada.
* No puede duplicar entradas dentro de la misma sala.
* Cada sala tiene sus propios participantes, pozo y clasificación.
* No se mezclan puntos, participantes ni pozos entre salas.
* El ganador es quien más puntos obtiene dentro de cada sala.
* No hay segundo ni tercer premio.
* Si hay empate en el primer puesto, el pozo se reparte en partes iguales entre los empatados.
* Los importes de $5.000, $10.000 y $20.000 son ejemplos demo configurables.
* No implementar todavía pagos, cobros, retiros ni liquidación real.

### Fútbol

* Resultado exacto a 90 minutos: 3 puntos.
* Resultado general local/empate/visitante a 90 minutos: 2 puntos.
* Resultado incorrecto: 0 puntos.
* El marcador exacto de fútbol no incluye goles de la tanda de penales.
* En eliminación, separar:

  * `scoreAt90`.
  * `extraTimeScore`.
  * `penaltyScore`.
  * `qualifier`.
* El clasificado se determina después del alargue o penales, pero su puntaje específico todavía está pendiente.
* No inventar puntaje para acertar el clasificado.

### Tenis

* Resultado exacto de sets: 3 puntos.
* Ganador correcto con sets incorrectos: 1 punto.
* Ganador incorrecto: 0 puntos.
* Diferenciar mejor de 3 y mejor de 5.
* No permitir resultados imposibles según el formato.

### Boxeo

Matriz provisional:

* Ganador + KO/TKO + round exacto: 3 puntos.
* Ganador + método correcto, round incorrecto: 2 puntos.
* Ganador + decisión/no KO: 2 puntos.
* Ganador correcto con método incorrecto: 1 punto.
* Ganador incorrecto: 0 puntos.
* Empate, no contest, anulación o resultado ambiguo: pendiente, sin puntaje definitivo.

## 4. Portada y navegación

La portada `/` debe ser el Prode diario.

Mantener `/diario` como alias funcional.

Mantener:

* `/historial`
* `/historial/mundial`
* `/admin/diario`

El Mundial debe continuar separado y conservado.

Revisá títulos, metadatos, navegación, breadcrumbs y enlaces para que:

* El producto visible se presente como Prode diario.
* El Mundial figure como historial.
* No aparezcan referencias del Mundial en la experiencia diaria salvo dentro del historial.
* No se rompan enlaces históricos.
* No se modifique la lógica histórica del Mundial.

No cambies todavía el dominio ni el nombre externo de Vercel.

## 5. Experiencia pública diaria

Desarrollá la experiencia pública de `/` y `/diario` para que funcione como una aplicación diaria completa sobre datos demo manuales.

### Agenda

Incluir:

* Fecha actual.
* Navegación al día anterior y siguiente.
* Selector de fecha.
* Indicador de jornada.
* Eventos ordenados por horario.
* Eventos próximos.
* Eventos en curso.
* Eventos finalizados.
* Eventos suspendidos.
* Eventos cancelados.
* Eventos reprogramados.
* Jornadas sin eventos.
* Estado de carga.
* Estado de error.
* Última actualización.
* Fuente del dato.

Mostrar siempre de manera visible:

`Datos de demostración — fuente manual`

No presentar ningún evento demo como información deportiva real.

### Filtros

Agregar filtros útiles, sin complicar el uso móvil:

* Todos los deportes.
* Fútbol.
* Tenis.
* Boxeo.
* Próximos.
* En curso.
* Finalizados.
* Mi participación.

Los filtros deben funcionar sin perder el contexto de la fecha.

### Tarjetas de eventos

Cada tarjeta debe mostrar según corresponda:

* Deporte.
* Competencia.
* Participantes.
* Hora.
* Estado.
* Resultado.
* Fuente.
* Última actualización.
* Tipo de evento.
* Si define clasificado.
* Si puede tener alargue o penales.
* Si es mejor de 3 o mejor de 5.
* Si es KO/TKO o decisión cuando sea boxeo.
* Acción para ver o editar el pronóstico demo.

No usar tablas anchas para presentar estos datos.

## 6. Formularios de pronóstico

Implementá la experiencia de pronóstico sobre estado demo local, claramente rotulada como no persistente.

No conectes todavía con Supabase ni con pagos.

### Fútbol normal

Permitir probar:

* Marcador exacto.
* Resultado general.
* Validación de local, empate o visitante.
* Estado bloqueado cuando el evento ya comenzó, si el fixture lo indica.
* Vista del puntaje estimado.

### Fútbol de eliminación

Mostrar campos separados para:

* Marcador a 90 minutos.
* Equipo que clasifica.
* Información sobre alargue.
* Información sobre penales.
* Resultado final de la serie.

No mezcles el clasificado con el marcador exacto.

Si el puntaje del clasificado todavía está pendiente, mostrar:

`Puntaje del clasificado: a definir`

No inventar una puntuación.

### Tenis

Según el formato:

* Ganador.
* Resultado exacto de sets.
* Opciones válidas para mejor de 3.
* Opciones válidas para mejor de 5.
* Sets detallados cuando el fixture los contenga.
* Tiebreak cuando corresponda.

### Boxeo

Mostrar:

* Ganador.
* KO/TKO o decisión/no KO.
* Round solamente cuando corresponda KO/TKO.
* Método crudo.
* Método normalizado.
* Puntaje estimado según la matriz provisional.

No permitir:

* Decisión con round ficticio.
* KO sin round.
* Método desconocido como resultado definitivo.
* Puntaje sobre empate o no contest.

## 7. Salas y participación

Mejorá la sección de salas para que se entienda claramente:

* Sala seleccionada.
* Importe demo.
* Cantidad de participantes.
* Pozo demo.
* Estado de participación.
* Si el usuario ya tiene una entrada.
* Si puede participar en otra sala.
* Clasificación de esa sala.
* Jornada relacionada.

Usá textos claros para diferenciar:

* “Participando”.
* “No participás”.
* “Entrada demo”.
* “Pozo estimado”.
* “Clasificación provisional”.
* “Jornada cerrada”.

No mostrar dinero real ni afirmar que existe un pozo real.

## 8. Mi participación

Debajo de la agenda, agregar o mejorar el resumen del usuario:

* Eventos pronosticados.
* Pronóstico propio.
* Resultado actual.
* Resultado confirmado.
* Puntos por evento.
* Total acumulado.
* Posición.
* Sala.
* Estado provisional o final.
* Motivo por el que todavía no suma puntos.

En móvil, reemplazar tablas anchas por:

* Tarjetas.
* Acordeones.
* Filas apiladas.
* Detalles expandibles.

No usar scroll horizontal como solución principal.

## 9. Clasificación

La clasificación debe:

* Ser independiente por sala.
* Destacar al usuario actual.
* Mostrar todas las posiciones si corresponde.
* Diferenciar clasificación provisional y final.
* Mostrar empates en primer lugar.
* Informar que el pozo se reparte entre los primeros empatados.
* No sugerir premios para segundo o tercer puesto.
* Mostrar estado de la jornada.
* No incluir datos del Mundial.

Si hay resultados pendientes, no presentar el ganador como definitivo.

## 10. Panel administrativo diario

Revisá y ampliá `/admin/diario` utilizando la autenticación y el perfil administrativo existente.

No debilites la protección.

Sin sesión:

* Redirigir a `/login`.

Con usuario no administrador:

* Denegar acceso.
* No mostrar controles administrativos.

El panel debe permitir, con datos demo:

* Crear evento.
* Editar participantes.
* Editar fecha y hora.
* Cambiar deporte.
* Cambiar competencia.
* Cambiar formato.
* Cambiar estado.
* Cargar resultado parcial.
* Cargar resultado final.
* Confirmar resultado.
* Cancelar.
* Reprogramar.
* Corregir.
* Bloquear resultado.
* Desbloquear con motivo.
* Simular una actualización automática.
* Ver el conflicto cuando existe bloqueo manual.
* Restablecer los datos demo.

Agregar validaciones para:

* Fútbol normal.
* Fútbol con alargue.
* Fútbol con penales.
* Fútbol con clasificado.
* Tenis mejor de 3.
* Tenis mejor de 5.
* Boxeo KO/TKO.
* Boxeo decisión.
* Empate.
* No contest.
* Resultado ambiguo.

No crear acciones que parezcan escribir en producción.

Mostrar en el panel:

`Modo manual de desarrollo — cambios no persistentes`

## 11. Auditoría visible

La auditoría debe mostrarse de forma entendible, no solamente en una estructura técnica.

Cada cambio debe conservar:

* Entidad.
* Operación.
* Valor anterior.
* Valor nuevo.
* Actor.
* Fecha y hora.
* Motivo.
* Fuente.
* Tipo:

  * Manual.
  * Automático.
  * Confirmación administrativa.
* Revisión.
* Bloqueo manual.
* Conflicto, si existió.

Mostrar una línea de tiempo.

Simular este flujo:

1. Resultado automático inicial.
2. Corrección manual.
3. Bloqueo manual.
4. Nueva actualización automática.
5. Rechazo de la sobrescritura.
6. Confirmación administrativa.
7. Consulta de auditoría.

No eliminar el historial anterior al corregir.

## 12. Estados, errores y accesibilidad

Revisá todos los estados visuales:

* Carga.
* Error.
* Vacío.
* Evento pendiente.
* Evento en vivo.
* Evento finalizado.
* Evento cancelado.
* Evento suspendido.
* Resultado ambiguo.
* Jornada cerrada.
* Usuario sin participación.
* Usuario con varias salas.
* Usuario administrador.
* Usuario no autenticado.

Verificá:

* Foco visible.
* Navegación por teclado.
* Etiquetas de formularios.
* Mensajes descriptivos.
* Contraste suficiente.
* No depender solamente del color.
* Botones con nombres claros.
* Modales cerrables con teclado.
* No perder datos demo por interacción accidental.

## 13. Responsive obligatorio

Probá como mínimo:

* 320 px.
* 390 px.
* 768 px.
* 1024 px.
* 1366 px.

Revisá:

* Portada.
* Agenda.
* Filtros.
* Salas.
* Mi participación.
* Clasificación.
* Formularios de pronóstico.
* Panel admin.
* Auditoría.
* Historial.
* Login.

No debe haber overflow horizontal en ninguna ruta diaria.

No ocultes información importante simplemente con `overflow: hidden`.

En móvil:

* Los eventos deben ser tarjetas o filas compactas.
* Los resultados deben ser legibles.
* Los formularios deben poder usarse con una mano.
* Las tablas deben transformarse en tarjetas o detalles.
* La navegación no debe romperse.

## 14. Modelo y arquitectura

Conservá la separación existente en `src/lib/daily-prode/`.

Revisá y mejorá, sin romper compatibilidad:

* `model.ts`
* `scoring.ts`
* `rooms.ts`
* `provider.ts`
* `manual.ts`
* `providers/contract.ts`
* `providers/fixtures/synthetic.ts`
* `providers/contract-tests/verify.ts`

Mantené separado:

* Modelo de dominio.
* Datos demo.
* Fuente manual.
* Contrato de proveedores.
* UI pública.
* Panel admin.
* Auditoría.
* Scoring.

No agregues datos reales.

No integres Goalserve.

No hagas que la UI dependa directamente de un proveedor externo.

No conviertas los fixtures sintéticos en muestras reales.

## 15. Tests y verificación

Mantené funcionando:

`npm run daily-prode:verify-contract`

También ejecutá:

`npm run daily-prode:verify-contract -- --json`

`npx tsc --noEmit --pretty false`

`npm run build`

`git diff --check`

Ejecutá ESLint dirigido sobre todos los archivos modificados.

Agregá pruebas o regresiones solamente utilizando las herramientas ya instaladas.

No agregues dependencias nuevas salvo que sea imprescindible y quede documentado.

Las pruebas nuevas deben cubrir:

* Agenda diaria.
* Salas independientes.
* Una entrada por persona/sala/jornada.
* Empate y reparto del pozo.
* Fútbol 3/2/0.
* Tenis 3/1/0.
* Boxeo provisional 3/2/1/0.
* Fútbol a 90 minutos.
* Alargue.
* Penales separados.
* Clasificado separado.
* Sets de tenis.
* Mejor de 3.
* Mejor de 5.
* KO/TKO.
* Decisión.
* Resultado ambiguo.
* Auditoría.
* Bloqueo manual.
* Corrección.
* Reprogramación.
* Cancelación.
* Ausencia de overflow.

No dediques el alcance completo a corregir la deuda previa de lint en archivos no tocados. Informá si sigue existiendo.

## 16. Supabase: inspección y preparación, sin escrituras

La conexión existente no implica que el proyecto conectado sea de desarrollo.

Podés inspeccionar de forma segura:

* Qué variables de Supabase espera el proyecto, sin mostrar valores.
* Si existe `.env.example`.
* Si existe configuración local.
* Si hay proyecto o rama ya configurada.
* Si hay migraciones existentes.
* Si hay separación documentada entre desarrollo y producción.
* Si el MCP de Supabase está conectado.
* Si el proyecto activo puede identificarse sin exponer secretos.

No muestres:

* `SUPABASE_SERVICE_ROLE_KEY`.
* Tokens.
* Passwords.
* URLs con secretos.
* Valores completos de variables sensibles.

No ejecutes:

* `INSERT`.
* `UPDATE`.
* `DELETE`.
* `ALTER`.
* Migraciones.
* RPC.
* Triggers.
* Cambios RLS.
* Creación de proyecto.
* Creación de branch de Supabase.
* Aplicación de SQL.
* Generación de datos.
* Cambios de variables de entorno.

No crees automáticamente una nueva base de datos ni una branch de Supabase. Si el proyecto o branch de desarrollo no está identificado de forma inequívoca, dejalo como decisión pendiente.

Creá un documento:

`docs/ai/infrastructure/dev-environment-plan.md`

Debe explicar:

* `main` como rama de publicación actual.
* `dev` como rama de integración futura.
* Cómo debería crearse una base de desarrollo aislada.
* Cómo deberían ejecutarse migraciones.
* Cómo se actualizaría semanalmente.
* Cómo separar credenciales.
* Cómo evitar tocar producción.
* Cómo revisar RLS.
* Cómo probar una migración.
* Cómo volver atrás.
* Qué información debe confirmar Juan antes de crear infraestructura.
* Qué costo o riesgo debe verificarse antes de crear una branch o proyecto.

Antes de cualquier futuro cambio de Supabase, consultar documentación oficial actualizada y revisar seguridad, RLS, roles y exposición del Data API.

## 17. Rama Git `dev`

Una vez terminadas las modificaciones en `main`, validadas y commiteadas:

1. Obtené el SHA completo de `HEAD`.
2. Verificá que `main` esté en el commit final.
3. Si no existe una rama remota `dev`, creala desde exactamente ese commit.
4. Subí `dev` al remoto.
5. No uses force push.
6. Si `dev` ya existe y tiene commits propios, no la sobrescribas.
7. Si ya existe, informá su estado y no la reinicies.
8. Volvé a `main`.
9. Confirmá que `main` continúe apuntando al commit final.

Mensaje sugerido para el commit final:

`feat: deliver audited daily prode v2 milestone`

La rama `dev` será para trabajo futuro y no debe pasar a ser la rama de producción automáticamente.

## 18. Commit, push y deploy

Cuando todo el desarrollo esté terminado:

1. Ejecutá todas las validaciones.
2. Revisá `git diff`.
3. Revisá `git diff --check`.
4. Confirmá que no haya secretos.
5. Confirmá que no esté incluido `supabase/.temp/`.
6. Creá el commit final de P010.
7. Ejecutá `git push origin main`.
8. Verificá que el remoto acepte el push.
9. Verificá el SHA completo publicado.
10. Creá o actualizá `dev` según las reglas anteriores.
11. Esperá la finalización del deployment asociado a `main`.

Usá la configuración de Vercel ya existente.

No hagas:

* Nuevo proyecto Vercel.
* Cambio de dominio.
* Cambio de variables.
* Cambio de entorno.
* Eliminación de deployments.
* Modificación de autenticación.
* Cambio de proveedor de hosting.

Si el proyecto está configurado para desplegar automáticamente desde GitHub, esperá y verificá ese deployment.

Si hace falta usar CLI, utilizá solamente el proyecto Vercel ya vinculado.

No informes “deploy exitoso” solamente porque el push terminó. Confirmá el estado real del deployment.

## 19. Verificación de producción

Verificá la URL:

`https://prode-mundial2026-kappa.vercel.app/`

Como mínimo revisá:

* `/`
* `/diario`
* `/historial`
* `/historial/mundial`
* `/admin/diario`
* `/login`

Resultados esperados:

* `/` carga el Prode diario.
* `/diario` carga la misma experiencia.
* `/historial` conserva el acceso histórico.
* `/historial/mundial` conserva la experiencia del Mundial.
* `/admin/diario` exige autenticación.
* `/login` carga correctamente.
* No hay overlays de error.
* No hay errores de runtime en las rutas diarias.
* No hay overflow horizontal.
* No aparecen secretos.
* No se presentan datos demo como datos reales.

Si `/historial/mundial` requiere una variable de producción que no está disponible, no expongas secretos ni modifiques la configuración automáticamente. Informá el problema separado de la validación diaria.

Si hay navegador automatizado disponible, probá visualmente los anchos indicados.

Si no hay navegador, hacé como mínimo smoke tests HTTP y documentá qué validación visual no pudo ejecutarse.

## 20. Documentación

Conservá P001 a P009 sin sobrescribirlos.

Registrá este prompt como:

`docs/ai/prompts/P010-hito-integral-v2-main-deploy.md`

Creá o actualizá:

* `docs/ai/README.md`
* `docs/ai/estado-actual.md`
* `docs/ai/vision-v2.md`
* `docs/ai/decisiones/P010-hito-integral-v2.md`
* `docs/ai/ejecuciones/P010-hito-integral-v2.md`
* `docs/ai/infrastructure/dev-environment-plan.md`
* `docs/ai/provider-evaluations/provider-go-no-go.md`
* `docs/ai/provider-evaluations/contract-test-runbook.md`

Documentá:

* Qué quedó implementado.
* Qué quedó como demo.
* Qué queda en memoria.
* Qué no persiste al recargar.
* Qué depende de Supabase futuro.
* Qué depende de un proveedor real.
* Qué reglas siguen pendientes.
* Qué diferencias hay entre `main` y `dev`.
* Commit final.
* Push realizado.
* URL publicada.
* Resultado del deployment.
* Limitaciones conocidas.

No guardes secretos en documentación.

## 21. Criterios de aceptación

La tarea solamente debe considerarse terminada si:

* P009 quedó commiteado.
* P010 quedó commiteado.
* `main` fue subido correctamente.
* `dev` fue creado y subido si no existía.
* La URL pública apunta a la versión nueva.
* `/` muestra Prode diario.
* `/diario` funciona como alias.
* El Mundial sigue accesible.
* El panel admin continúa protegido.
* El modo manual está claramente identificado.
* Los datos demo están aislados.
* La auditoría es visible.
* Las reglas de puntaje no fueron alteradas.
* El verificador ejecuta todos sus controles.
* TypeScript pasa.
* El build pasa.
* `git diff --check` pasa.
* No se tocó Supabase.
* No se agregaron credenciales.
* No se agregaron dependencias sin justificación.
* No hay overflow horizontal en la experiencia diaria.
* No hay errores de runtime en producción.
* La documentación está actualizada.

## 22. Entrega final

Al terminar, devolveme un informe concreto con:

1. Estado final de `main`.
2. Estado final de `dev`.
3. Commits creados.
4. SHA completo del commit publicado.
5. Archivos principales modificados.
6. Funcionalidades nuevas.
7. Qué puede testear Juan mañana.
8. URL pública verificada.
9. Estado real del deployment.
10. Resultado de cada validación.
11. Cantidad total de controles del contrato.
12. Qué quedó en memoria.
13. Qué quedó pendiente para Supabase.
14. Qué quedó pendiente para el proveedor deportivo.
15. Errores preexistentes que continúan.
16. Limitaciones del entorno.
17. Próximo hito recomendado.

No te detengas después de crear un plan. Ejecutá el trabajo completo dentro de los límites definidos, dejá `main` publicado y reportá con honestidad cualquier parte que no hayas podido verificar.

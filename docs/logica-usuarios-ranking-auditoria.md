# Logica de usuarios, ranking y auditoria

Este documento define la logica funcional que deben respetar el inicio publico, el ranking, la auditoria y el panel admin.

## Estados de usuarios

### Jugador activo / habilitado

- Existe en `public.authorized_emails` con `active = true`.
- Puede iniciar sesion.
- Aparece en el Ranking publico.
- Es auditable desde el Ranking.
- Cuenta en la metrica publica "Jugadores".

### Jugador deshabilitado

- Existe en `public.authorized_emails` con `active = false`.
- No puede iniciar sesion.
- No aparece en el Ranking publico.
- No cuenta en metricas publicas.
- En Admin debe verse separado de los activos, bajo "Deshabilitados".
- Deshabilitar no borra pronosticos, apuestas especiales, desempates ni datos historicos.

### Jugador eliminado

- No debe borrarse fisicamente de toda la base.
- Debe quedar en una seccion separada de "Eliminados" o con un estado equivalente.
- No puede iniciar sesion.
- No aparece en Ranking publico.
- No cuenta en metricas publicas.
- Debe poder restaurarse o reactivarse desde Admin.
- Eliminar no debe borrar pronosticos, apuestas especiales, desempates ni datos historicos de golpe.

### Admin

- Se define por `public.profiles.is_admin = true`.
- Puede entrar al panel Admin.
- Puede administrar whitelist, usuarios y mantenimiento.
- Si mantenimiento esta activo, el admin igual debe poder entrar.

## Acciones admin sobre usuarios

Desde Admin se debe poder:

- agregar jugador;
- editar nombre/email;
- habilitar;
- deshabilitar;
- eliminar o mover a eliminados;
- restaurar eliminado;
- marcar o quitar admin si esa opcion existe en la interfaz.

Reglas:

- Deshabilitar no borra datos.
- Eliminar tampoco borra datos historicos.
- Eliminar saca al usuario del Ranking y de las metricas publicas.
- Restaurar debe volver el registro a activo, salvo que se defina explicitamente restaurarlo como deshabilitado.

## Metricas publicas de Inicio

No mostrar "Inscriptos" y "Participantes" como metricas principales separadas.

Metricas principales:

- `Jugadores`: cantidad de usuarios activos/habilitados.
- `Prodes en proceso`: usuarios activos con al menos una prediccion persistida en `public.predictions`, `public.virtual_knockout_predictions`, `public.user_prediction_tiebreakers` o `public.special_bets`.
- `Puntos en juego`: puntos disponibles por partidos y apuestas vigentes.
- `Partidos jugados`: partidos oficiales finalizados sobre el total de partidos.
- `Selecciones`: selecciones disponibles sobre el total esperado.

Opcional a futuro:

- `Prodes completos`: usuarios que completaron todo lo obligatorio.

## Ranking

- El Ranking debe listar jugadores activos/habilitados.
- Todos los jugadores activos deben ser auditables.
- No usar `total_points > 0` para definir si alguien participa o si es auditable.
- No bloquear la auditoria porque todavia no empezo el Mundial.

Estados visibles:

- Activo sin prode: mostrar "Todavia no cargo su Prode".
- Activo con al menos una prediccion, desempate o apuesta especial: mostrar "Prode en proceso" o "Pronostico en proceso".
- Activo con todo lo obligatorio cargado: mostrar "Prode completo", si esa deteccion esta implementada.

Al abrir auditoria:

- Si no cargo nada: mostrar "Este jugador todavia no cargo pronosticos."
- Si cargo algo: mostrar lo cargado y los faltantes como "Sin cargar".

## Auditoria

Debe permitir ver:

- grupos;
- eliminatorias;
- llave;
- desempates;
- especiales;
- faltantes.

Reglas:

- Ocultar usuarios deshabilitados y eliminados del Ranking publico.
- La auditoria debe distinguir cruce predicho, cruce oficial real y cruce oficial pendiente.
- No comparar contra cruces oficiales inexistentes.
- No mostrar codigos internos de desempates al usuario final.

## Herramientas exclusivas admin

Las herramientas de testeo y administracion nunca deben estar disponibles para jugadores comunes.

Son exclusivas de usuarios con `public.profiles.is_admin = true`:

- helpers de testeo;
- autocompletar o generar pronosticos aleatorios;
- generar datos de prueba;
- mantenimiento;
- whitelist y gestion de usuarios;
- carga de resultados oficiales;
- reset o borrado masivo;
- cualquier accion que pueda sobrescribir datos existentes.

Reglas:

- La UI debe ocultar estas herramientas para usuarios no admin.
- El server-side debe validar siempre usuario autenticado y `profiles.is_admin = true`.
- Ocultar botones no alcanza: toda action, helper o endpoint admin debe negar ejecucion si el usuario no es admin.
- Si un usuario no admin intenta ejecutar una herramienta admin manualmente, debe recibir un error claro y no se debe modificar ningun dato.
- Toda herramienta admin que pueda reemplazar pronosticos existentes debe pedir confirmacion explicita antes de ejecutar.
- El texto de estas herramientas debe dejar claro que son admin, por ejemplo "Generar datos de prueba (Admin)" o "Autocompletar Prode (Admin)".

## Validaciones funcionales

- Usuario activo sin prode aparece en Ranking como "Todavia no cargo su Prode".
- Usuario activo con una prediccion aparece como "Prode en proceso".
- Usuario activo con todo completo aparece como "Prode completo", si se implementa esa deteccion.
- Usuario deshabilitado no aparece en Ranking ni metricas publicas.
- Usuario eliminado no aparece en Ranking ni metricas publicas.
- Admin puede ver deshabilitados/eliminados y restaurarlos.
- Usuario comun no ve herramientas admin ni puede ejecutar helpers de testeo.
- Admin ve herramientas admin y recibe confirmacion antes de sobrescribir datos.
- `npm run build` debe pasar.

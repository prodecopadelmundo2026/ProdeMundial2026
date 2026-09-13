# Plan de entorno de desarrollo aislado

Fecha: 2026-09-13

## Estado actual

`main` es la rama de publicacion actual. P010 propone `dev` como rama futura de integracion creada desde el mismo commit publicado, sin convertirla en produccion automatica. El repositorio contiene configuracion local de Supabase y migraciones historicas; no se leyeron valores de secretos, no se identifico un proyecto de desarrollo inequívoco y no se ejecuto SQL, RPC ni migraciones.

## Base aislada y credenciales

Antes de crear una base o branch de desarrollo, Juan debe confirmar organizacion/proyecto, region, plan/costo, responsables, retencion, acceso de servicio y que produccion no sera reutilizada. El entorno debe usar proyecto o branch aislado, credenciales distintas por entorno y archivos locales no versionados. Nunca se copian claves, passwords o URLs con secretos a documentacion, commits o capturas.

## Flujo propuesto

1. Crear `dev` desde el commit publicado de `main`; integrar cambios futuros alli y revisarlos antes de promoverlos.
2. Crear la base aislada solo tras confirmar costo, proyecto y responsable. Aplicar migraciones mediante CI o comando revisado, nunca contra un destino ambiguo.
3. Revisar diff de migracion, RLS, roles, Data API y exposicion de cada tabla. Probar con datos sinteticos y cuentas no privilegiadas.
4. Ejecutar smoke tests, verificar auditoria y rollback en desarrollo. El rollback debe ser una migracion compensatoria no destructiva probada previamente.
5. Actualizar semanalmente solo estructura o datos anonimizados aprobados; nunca secretos ni datos personales sin proceso documentado.

## Antes de tocar Supabase

Consultar documentacion oficial actualizada sobre seguridad, RLS, roles y Data API. Confirmar proyecto activo, separacion de credenciales, reversibilidad de migraciones y costo/riesgo de una branch o proyecto. Un proveedor real solo entra despues de P008 mediante adaptador read-only.

# Prode Mundial 2026

MVP Next.js + Supabase para jugar un prode simple: reglas, fixture, pronosticos, ranking publico y carga manual de resultados.

## Stack bloqueado

- Next.js App Router + TypeScript
- Tailwind CSS
- Supabase Postgres + Auth Google + RLS
- Server Actions para mutaciones
- Vercel para deploy automatico

## Ambientes

| Contexto | Rama | Vercel | Supabase |
| --- | --- | --- | --- |
| Produccion | `main` | Production | Supabase PROD |
| Preview/desarrollo | `juani-dev`, `juli-dev`, `nico-dev`, futuras ramas dev | Preview | Supabase DEV |
| Local | cualquier rama | `corepack pnpm dev` | `.env.local`, normalmente Supabase DEV |

No trabajar directo sobre `main`: los cambios se prueban primero en ramas de desarrollo. No usar datos reales de produccion en DEV salvo que esten filtrados o anonimizados.

El modo sin Supabase sirve solo para revisar UI publica/local. No sirve para auth ni datos reales.

Ver el esquema completo de Production/Preview/Local en `docs/environments.md`.

## Variables de entorno

Crear `.env.local` desde el template:

```bash
Copy-Item .env.example .env.local
```

Completar `.env.local` con Supabase DEV para desarrollo local.

## Supabase

1. Para una base nueva se puede ejecutar `supabase/schema.sql` en SQL Editor. Los cambios nuevos de base deben quedar versionados como migrations.
2. Crear codigos de acceso:

```sql
INSERT INTO public.access_codes (code, label, expires_at)
VALUES ('MUNDIAL-2026', 'Invitados iniciales', '2026-06-11 19:00:00+00');
```

3. Configurar Google OAuth en Supabase Auth.
4. Agregar Redirect URLs:

```text
http://localhost:3000/auth/callback
https://TU-PROYECTO.vercel.app/auth/callback
https://TU-PREVIEW.vercel.app/auth/callback
https://*.vercel.app/auth/callback
```

5. Luego del primer login, hacer admin a tu usuario:

```sql
UPDATE public.profiles
SET is_admin = true
WHERE email = 'tu@email.com';
```

## Seguridad

- `profiles`, `matches`, `predictions` y `access_codes` tienen RLS activo.
- Cada usuario solo selecciona sus propias predicciones.
- La escritura de predicciones pasa por `public.save_predictions(jsonb)`, que valida usuario, score y cierre del partido.
- El codigo de acceso se consume en `public.claim_access_code(...)` dentro de una transaccion Postgres.
- El ranking se expone como vista publica agregada, sin publicar filas de `predictions`.

## Desarrollo

```bash
npm run dev
npm run lint
npm run build
```

## Probar sin Supabase

Si todavia no tenes accesos a la base, podes levantar la app sin `.env.local`:

```bash
corepack pnpm dev
```

Funciona para revisar UI publica:

- `/login`
- `/reglas`
- `/ranking` muestra un estado vacio de modo local

Las rutas con datos reales (`/fixture`, `/mi-prode`, `/admin`) requieren Supabase.

## Flujo MVP

- `/login`: Google OAuth + codigo unico.
- `/reglas`: reglas y puntaje.
- `/fixture`: pronosticos con un unico boton Guardar por seccion.
- `/mi-prode`: predicciones propias.
- `/ranking`: ranking publico.
- `/admin`: carga manual de resultados para admins.

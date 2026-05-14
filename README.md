# Prode Mundial 2026

MVP Next.js + Supabase para jugar un prode simple: reglas, fixture, pronosticos, ranking publico y carga manual de resultados.

## Stack bloqueado

- Next.js App Router + TypeScript
- Tailwind CSS
- Supabase Postgres + Auth Google + RLS
- Server Actions para mutaciones
- Vercel para deploy automatico

## Variables de entorno

Crear `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
```

En Vercel, `NEXT_PUBLIC_SITE_URL` debe ser la URL final `.vercel.app`.

## Supabase

1. Ejecutar `supabase/schema.sql` en SQL Editor para una base nueva.
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

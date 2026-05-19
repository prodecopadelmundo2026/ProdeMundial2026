# Ambientes

Objetivo: `main` queda estable para produccion y las ramas de desarrollo prueban contra una base separada.

## Mapa de ambientes

| Contexto | Rama | Vercel | Supabase |
| --- | --- | --- | --- |
| Produccion | `main` | Production | `prode-prod` |
| Preview/desarrollo | `juani-dev`, `juli-dev`, `nico-dev`, futuras ramas | Preview | `prode-dev` |
| Local | cualquier rama | `corepack pnpm dev` | normalmente `prode-dev` |

`main` no debe usar la base DEV. Las ramas de desarrollo no deben usar la base PROD.

Preview nunca debe reutilizar variables de Production.

## Variables

Variables requeridas:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Variable opcional:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`NEXT_PUBLIC_SITE_URL` solo se usa como fallback. En el flujo OAuth normal, la app toma el `origin` del request para armar `/auth/callback`.

Las variables `NEXT_PUBLIC_*` se exponen al navegador. No son secretos, pero igual deben estar separadas por ambiente.

Nunca copiar `service_role` keys de PROD a Preview o local. Si alguna tarea futura necesita una key server-side, debe usar una variable sin prefijo `NEXT_PUBLIC_` y con alcance minimo.

## Vercel

Configurar en Project Settings -> Environment Variables:

| Variable | Production | Preview | Development |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL de Supabase PROD | URL de Supabase DEV | URL de Supabase DEV |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key PROD | anon key DEV | anon key DEV |
| `NEXT_PUBLIC_SITE_URL` | URL production `.vercel.app` o dominio final | opcional | `http://localhost:3000` opcional |

Si se usa branch override en Vercel, las ramas `juani-dev`, `juli-dev` y `nico-dev` deben apuntar siempre a Supabase DEV.

## Supabase

Crear dos proyectos:

- `prode-prod`: datos reales.
- `prode-dev`: datos de prueba.

En ambos correr el mismo schema/migrations del repo.

En Supabase -> Authentication -> URL Configuration configurar:

- Site URL: dominio oficial de cada ambiente.
- Redirect URLs permitidas para la app:

```text
http://localhost:3000/auth/callback
https://<production-domain>/auth/callback
https://<preview-domain>/auth/callback
https://*-<team-or-account-slug>.vercel.app/**
```

Supabase permite wildcards en la allow-list de Redirect URLs y recomienda el
patron de Vercel `https://*-<team-or-account-slug>.vercel.app/**` para previews.
En produccion conviene usar siempre la URL exacta.

En Google Cloud Console -> OAuth Client, el Authorized redirect URI no es
`/auth/callback` de la app. Debe ser el callback exacto de Supabase Auth:

```text
https://<project-ref>.supabase.co/auth/v1/callback
```

Si el proyecto usa custom domain de Supabase Auth, agregar tambien el callback
exacto de ese dominio. Google OAuth exige coincidencia exacta; no usar wildcards.

No asumir que una base existente es PROD o DEV hasta confirmarlo con el equipo.

### Google OAuth y whitelist

El login principal usa Supabase Auth con Google OAuth. En cada proyecto de Supabase
hay que habilitar `Authentication -> Providers -> Google` y cargar el Client ID y
Client Secret del proyecto Google correspondiente.

La app valida el email autenticado contra `public.authorized_emails`. Para permitir
un participante:

```sql
INSERT INTO public.authorized_emails (email, label, active)
VALUES ('participante@example.com', 'Nombre Apellido', true)
ON CONFLICT (email) DO UPDATE
SET active = true, label = excluded.label, updated_at = now();
```

Para bloquearlo sin borrar historial:

```sql
UPDATE public.authorized_emails
SET active = false, updated_at = now()
WHERE email = 'participante@example.com';
```

La migracion `20260518_google_auth_whitelist.sql` copia automaticamente los emails
existentes en `profiles` a `authorized_emails` para no cortar usuarios validos que
ya estaban creados.

Si un usuario entra con Google pero su email no esta activo en la whitelist, la app
cierra la sesion y vuelve a `/login?error=unauthorized_email`.

## Local

Para trabajar con base DEV:

```bash
Copy-Item .env.example .env.local
```

Completar `.env.local` con Supabase DEV.

Para revisar UI sin base:

```bash
Rename-Item .env.local .env.local.off
corepack pnpm dev
```

`.env.local`, `.env.*.local` y `.env.local.off` estan ignorados por git.

## Pendiente de Confirmacion

- Cual proyecto Supabase actual corresponde a PROD.
- Cual proyecto Supabase actual corresponde a DEV.
- Quien administra Google OAuth en Supabase.
- Dominio final de produccion en Vercel.
- Si se usara una rama `dev` compartida ademas de ramas personales.

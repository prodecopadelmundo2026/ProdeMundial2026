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

En Auth -> URL Configuration agregar callbacks segun corresponda:

```text
http://localhost:3000/auth/callback
https://<production-domain>/auth/callback
https://<preview-domain>/auth/callback
https://*.vercel.app/auth/callback
```

`https://*.vercel.app/auth/callback` puede usarse temporalmente mientras no este definido el dominio final o las URLs exactas de preview.

No asumir que una base existente es PROD o DEV hasta confirmarlo con el equipo.

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

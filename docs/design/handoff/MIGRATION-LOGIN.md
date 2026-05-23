# Migración del Login viejo → nuevo

Guía paso a paso para migrar la pantalla de login que ya tenés implementada a la nueva del Prode 26. El objetivo: **reemplazar el UI sin tocar la lógica de Supabase**.

---

## TL;DR

1. **Mantener** la función que valida el email contra Supabase
2. **Reemplazar** el JSX, los estilos y los textos
3. **Sumar** un campo `name` (nombre del usuario) si no estaba antes
4. **Agregar** un link a WhatsApp para usuarios no registrados

---

## Paso 1 — Identificá el archivo actual del login

En App Router suele ser uno de estos:

```
src/app/login/page.tsx
src/app/(auth)/login/page.tsx
src/app/auth/login/page.tsx
```

Si no lo encontrás, buscá:

```bash
grep -r "signInWithPassword\|signInWithOtp\|signInWithOAuth" src/
```

---

## Paso 2 — Preservá la función de validación

Cualquiera sea tu lógica actual de auth, **separala** del componente UI. Movela a `src/lib/auth.ts` (o donde te quede limpio):

```ts
// src/lib/auth.ts
import { createClient } from '@/lib/supabase/server';

export async function signInByEmail(email: string, name: string) {
  const supabase = createClient();

  // 1. Verificar que el email esté en la lista de inscriptos
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, name, email')
    .ilike('email', email)
    .single();

  if (error || !profile) {
    return { ok: false, error: 'Usuario no registrado' as const };
  }

  // 2. Crear sesión (ajustar al método que ya usabas)
  // Si era passwordless / OTP / magic link, mantené ese flujo.
  // Acá un ejemplo con sign-in directo:
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password: process.env.GUEST_PASSWORD!, // o tu mecanismo actual
  });

  if (signInError) {
    return { ok: false, error: 'No pudimos iniciar sesión' as const };
  }

  return { ok: true, profile };
}
```

> 💡 Si tu login viejo usaba **magic link** (OTP), no rompas eso — solo cambiá la UI. La validación contra `profiles` debería igualmente correr **antes** de mandar el link, así no le mandás mail a quien no está inscripto.

---

## Paso 3 — Reemplazá el page del login

Estructura mínima del nuevo `src/app/login/page.tsx`:

```tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { signInByEmail } from '@/lib/auth';
import { Navbar } from '@/components/Navbar';
import { WhatsAppLink } from '@/components/WhatsAppLink';

export default function LoginPage() {
  const router = useRouter();
  const [name, setName]   = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) { setError('Ingresá tu nombre'); return; }
    if (!email.includes('@')) { setError('Email inválido'); return; }

    startTransition(async () => {
      const res = await signInByEmail(email, name);
      if (!res.ok) {
        setError('Usuario no registrado');
        return;
      }
      router.push('/mi-prode');
    });
  }

  return (
    <>
      <Navbar variant="guest" />

      <main className="relative min-h-[calc(100vh-65px)] grid place-items-center px-5 py-15 overflow-hidden">
        {/* Blobs decorativos — ver mocks/Login.html sección .canvas */}
        <BlobBackground />

        <section className="relative z-10 w-full max-w-[460px] bg-panel border border-line rounded-[28px] p-10 px-8 shadow-[0_40px_100px_-30px_rgba(0,0,0,.6)]">
          <header className="mb-7">
            <h1 className="font-display text-[clamp(36px,8vw,52px)] leading-[0.92] -tracking-[0.03em] uppercase">
              Entrá<br/>al <em className="not-italic italic text-orange">Prode</em>
            </h1>
            <p className="mt-3 text-[15px] text-[#bdbdbd] font-medium leading-[1.5]">
              Cargá tu nombre y mail. Si estás en la lista de inscriptos, te dejamos pasar.
            </p>
          </header>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <Field label="Nombre">
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); setError(null); }}
                placeholder="Ej. Mateo Fernández"
                autoComplete="name"
                className="login-input"
              />
            </Field>

            <Field label="Email" error={error}>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                placeholder="vos@mail.com"
                autoComplete="email"
                className={`login-input ${error ? 'has-error' : ''}`}
              />
            </Field>

            <button
              type="submit"
              disabled={pending}
              className="submit-btn"
            >
              {pending ? 'Entrando…' : 'Entrar'}
              <ArrowRightIcon />
            </button>

            <Divider>o</Divider>

            <button type="button" disabled className="google-btn">
              <GoogleIcon />
              <span>Continuar con Google</span>
              <span className="pill-soon">PRÓXIMAMENTE</span>
            </button>
          </form>

          <footer className="mt-7 pt-6 border-t border-line text-center">
            <p className="text-muted text-[13px] leading-[1.5] mb-3.5">
              ¿No estás en la lista de inscriptos?<br/>
              Escribinos por WhatsApp y te damos el alta.
            </p>
            <WhatsAppLink message="Hola! Quiero participar del Prode 26">
              Contactar a los organizadores
            </WhatsAppLink>
          </footer>
        </section>
      </main>
    </>
  );
}
```

> Las clases `.login-input`, `.submit-btn`, `.google-btn`, `.pill-soon` están definidas en `globals.snippet.css` (o ponelas inline con Tailwind si preferís).

---

## Paso 4 — Checklist de migración

Compará esto con tu login viejo:

| | Login viejo | Login nuevo |
|---|---|---|
| ✅ Campos | (probablemente solo email) | **nombre + email** |
| ✅ Validación email | OK | Mismo método, mantenelo |
| ✅ Error UX | (probablemente toast / alert) | **Inline rojo bajo el input** con texto "Usuario no registrado" |
| ✅ Loading state | ? | Botón disabled + texto "Entrando…" |
| ✅ Google sign-in | ? | **Placeholder** (botón disabled con pill "PRÓXIMAMENTE") |
| ✅ Salida del éxito | ? | `router.push('/mi-prode')` |
| ✅ Fallback de no-registrado | (probablemente nada) | **Link WhatsApp** a organizadores |
| ✅ Branding | (probablemente Vercel default) | Hero card con bg blobs animados |

---

## Paso 5 — Casos borde

1. **El usuario ya tiene sesión activa y entra a `/login`**: redirigilo a `/mi-prode` desde un server-side check al principio del page (o middleware).

2. **Rate limiting**: si tu Supabase tiene rate limit en `signInWithPassword`, mostrá el error pero **no exposes** el motivo (no le digas "demasiados intentos" — eso da pistas). Solo "No pudimos iniciar sesión, probá en un momento."

3. **Email con whitespace o mayúsculas**: hacé `email.trim().toLowerCase()` antes de mandarlo. La query usa `ilike` (case-insensitive).

4. **CSRF / Server Action**: si preferís usar Server Actions de Next 14 en vez de un fetch desde cliente, está bien — el contrato es el mismo, solo cambiás `signInByEmail` a estar marcada con `'use server'`.

---

## Paso 6 — Eliminá lo viejo

Una vez que el nuevo login funcione end-to-end:

- Borrá el componente viejo (`OldLoginForm.tsx`, etc.)
- Borrá estilos huérfanos (`login.module.css`, etc.)
- Buscá imports rotos: `grep -r "OldLoginForm\|oldLogin" src/`

---

## Paso 7 — Probá los flujos

| Flujo | Esperado |
|---|---|
| Email en la DB → submit | Redirect a `/mi-prode` |
| Email NO en la DB → submit | Error rojo inline "Usuario no registrado", form sigue editable |
| Submit con nombre vacío | Error en campo nombre |
| Submit con email inválido | Error en campo email |
| Click en "Continuar con Google" | No hace nada (botón disabled) |
| Click en "Contactar organizadores" | Abre WhatsApp en nueva tab |
| Usuario logueado entra a `/login` | Redirect a `/mi-prode` |

---

## Si te trabás

Pegale a Claude Code: *"Probá el flujo del paso 7, fila por fila, y avisame qué falla."* Suele encontrar lo que rompió.

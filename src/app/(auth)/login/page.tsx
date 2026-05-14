import { Trophy } from 'lucide-react'
import { signInWithGoogle } from './actions'
import { SubmitButton } from './SubmitButton'

const ERROR_MESSAGES: Record<string, string> = {
  invalid_access_code: 'El codigo debe tener 4 a 32 caracteres.',
  missing_access_code: 'Necesitas un codigo de acceso para entrar.',
  access_code_invalid: 'El codigo no existe, vencio o ya fue usado por otra cuenta.',
  auth_callback_error: 'No pudimos completar el login con Google.',
  oauth_start_failed: 'No pudimos iniciar el login con Google.',
  local_no_db: 'Modo local sin base: podes revisar la UI, pero login y datos requieren Supabase.',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>
}) {
  const params = await searchParams
  const error = params?.error ? ERROR_MESSAGES[params.error] : null

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a3d1f] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-yellow-400/10">
            <Trophy size={44} className="text-yellow-400" aria-hidden="true" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white">
            Prode Mundial 2026
          </h1>
          <p className="mt-2 text-sm tracking-wide text-green-200">
            Login con Google y codigo unico
          </p>
        </div>

        <section className="rounded-xl bg-white p-6 shadow-2xl sm:p-8">
          <h2 className="text-xl font-semibold text-gray-900">
            Entrar al prode
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Usa el codigo que te paso el organizador. Se asocia a una sola cuenta.
          </p>

          <form action={signInWithGoogle} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="access_code"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Codigo de acceso
              </label>
              <input
                id="access_code"
                name="access_code"
                type="text"
                required
                autoComplete="one-time-code"
                inputMode="text"
                minLength={4}
                maxLength={32}
                placeholder="MUNDIAL-2026"
                className="min-h-12 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-base font-semibold uppercase tracking-wide text-gray-900 placeholder:text-gray-400 focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/20"
              />
            </div>

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <SubmitButton />
          </form>
        </section>
      </div>
    </main>
  )
}

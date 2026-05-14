'use client'

import { useState } from 'react'
import { Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        data: { name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: '#0a3d1f' }}
    >
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex flex-col items-center mb-10">
          <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-yellow-400/10">
            <Trophy size={44} className="text-yellow-400" />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">
            Prode Mundial 2026
          </h1>
          <p className="text-green-400 mt-2 text-sm tracking-wide">
            USA · Canadá · México
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white p-8 shadow-2xl">
          {sent ? (
            <div className="text-center py-4">
              <div className="mb-4 text-4xl">📬</div>
              <p className="text-gray-900 text-lg font-semibold">
                ¡Revisá tu email!
              </p>
              <p className="text-gray-500 mt-2 text-sm">
                Te mandamos un link de acceso a{' '}
                <span className="font-medium text-gray-700">{email}</span>
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-gray-900 font-semibold text-xl mb-6">
                Ingresá para jugar
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-gray-600 text-sm font-medium mb-1.5">
                    Tu nombre
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Lionel"
                    className="w-full px-4 py-3 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400 border border-gray-200 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition"
                  />
                </div>
                <div>
                  <label className="block text-gray-600 text-sm font-medium mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="tu@email.com"
                    className="w-full px-4 py-3 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400 border border-gray-200 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 transition"
                  />
                </div>

                {error && (
                  <p className="text-red-500 text-sm">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading || !name.trim() || !email.trim()}
                  className="w-full py-3 rounded-lg font-bold text-base transition mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#0a3d1f', color: 'white' }}
                >
                  {loading ? 'Enviando...' : 'Recibir link de acceso'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  )
}

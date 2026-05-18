'use client'

import { useMemo, useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { setAuthorizedEmailActive, upsertAuthorizedEmail } from '../actions'

export type AuthorizedEmailRow = {
  email: string
  label: string | null
  active: boolean
  created_at: string
  updated_at: string
}

type Props = {
  rows: AuthorizedEmailRow[]
  query: string
}

export function WhitelistForm({ rows, query }: Props) {
  const [editing, setEditing] = useState<AuthorizedEmailRow | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const title = useMemo(
    () => (editing ? `Editar ${editing.email}` : 'Agregar email autorizado'),
    [editing]
  )

  function clearMessages() {
    setError(null)
    setOk(null)
  }

  function handleSubmit(formData: FormData) {
    clearMessages()
    startTransition(async () => {
      try {
        await upsertAuthorizedEmail(formData)
        setEditing(null)
        setOk('Lista blanca actualizada.')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo guardar el email.')
      }
    })
  }

  function toggle(row: AuthorizedEmailRow) {
    clearMessages()
    startTransition(async () => {
      try {
        await setAuthorizedEmailActive(row.email, !row.active)
        setOk(row.active ? 'Email desactivado.' : 'Email activado.')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo actualizar el estado.')
      }
    })
  }

  return (
    <div className="space-y-6">
      <form action="/admin/whitelist" className="flex flex-col gap-2 sm:flex-row">
        <input
          name="q"
          defaultValue={query}
          placeholder="Buscar por email o nombre"
          className="min-h-11 flex-1 rounded-lg border border-gray-200 px-3 text-sm text-gray-900 outline-none focus:border-green-600"
        />
        <button
          type="submit"
          className="min-h-11 rounded-lg px-4 text-sm font-bold text-white"
          style={{ backgroundColor: '#0a3d1f' }}
        >
          Buscar
        </button>
      </form>

      <form action={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <input
            key={editing?.email ?? 'new-email'}
            name="email"
            type="email"
            required
            readOnly={Boolean(editing)}
            defaultValue={editing?.email ?? ''}
            placeholder="participante@email.com"
            className="min-h-11 rounded-lg border border-gray-200 px-3 text-sm text-gray-900 outline-none read-only:bg-gray-50 focus:border-green-600"
          />
          <input
            key={editing?.email ? `${editing.email}-label` : 'new-label'}
            name="label"
            defaultValue={editing?.label ?? ''}
            placeholder="Nombre o referencia"
            className="min-h-11 rounded-lg border border-gray-200 px-3 text-sm text-gray-900 outline-none focus:border-green-600"
          />
          <label className="flex min-h-11 items-center gap-2 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-700">
            <input
              key={editing?.email ? `${editing.email}-active` : 'new-active'}
              name="active"
              type="checkbox"
              defaultChecked={editing?.active ?? true}
              className="h-4 w-4"
            />
            Activo
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex min-h-10 items-center justify-center rounded-lg px-4 text-sm font-bold text-white disabled:opacity-50"
            style={{ backgroundColor: '#0a3d1f' }}
          >
            {isPending ? <Loader2 size={16} className="animate-spin" /> : 'Guardar'}
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => {
                setEditing(null)
                clearMessages()
              }}
              className="min-h-10 rounded-lg border border-gray-200 px-4 text-sm font-bold text-gray-700"
            >
              Cancelar
            </button>
          )}
          {ok && <span className="text-sm font-medium text-green-700">{ok}</span>}
          {error && <span className="text-sm font-medium text-red-600">{error}</span>}
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="font-bold text-gray-900">Emails autorizados</h2>
          <p className="text-sm text-gray-500">{rows.length} registros visibles</p>
        </div>
        {!rows.length ? (
          <p className="px-5 py-6 text-sm text-gray-500">No hay emails para mostrar.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {rows.map((row) => (
              <div key={row.email} className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-gray-900">{row.email}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        row.active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {row.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">{row.label || 'Sin nombre'}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(row)
                      clearMessages()
                    }}
                    className="min-h-9 rounded-lg border border-gray-200 px-3 text-sm font-bold text-gray-700"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => toggle(row)}
                    disabled={isPending}
                    className="min-h-9 rounded-lg px-3 text-sm font-bold text-white disabled:opacity-50"
                    style={{ backgroundColor: row.active ? '#6b7280' : '#0a3d1f' }}
                  >
                    {row.active ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { useMemo, useState, useTransition } from 'react'
import {
  restoreAuthorizedEmail,
  setAuthorizedEmailActive,
  setParticipantAdminRole,
  softDeleteAuthorizedEmail,
  updateAuthorizedEmail,
  upsertAuthorizedEmail,
} from '../actions'

export type AuthorizedEmailRow = {
  email: string
  label: string | null
  active: boolean
  deleted_at?: string | null
  created_at: string
  updated_at: string
  profile_id?: string | null
  profile_name?: string | null
  is_admin?: boolean | null
}

type Props = {
  rows: AuthorizedEmailRow[]
  query: string
}

export function WhitelistForm({ rows, query }: Props) {
  const safeRows = Array.isArray(rows) ? rows : []
  const activeRows = safeRows.filter((row) => row.active && !row.deleted_at)
  const inactiveRows = safeRows.filter((row) => !row.active && !row.deleted_at)
  const deletedRows = safeRows.filter((row) => row.deleted_at)

  const [editing, setEditing] = useState<AuthorizedEmailRow | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const title = useMemo(
    () => (editing ? `Editar ${editing.email}` : 'Agregar email'),
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
        if (editing) await updateAuthorizedEmail(formData)
        else await upsertAuthorizedEmail(formData)
        setEditing(null)
        setOk('Participantes habilitados actualizados.')
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

  function toggleAdmin(row: AuthorizedEmailRow) {
    clearMessages()
    startTransition(async () => {
      const result = await setParticipantAdminRole(row.email, !row.is_admin)
      if (result.ok) {
        setOk(result.message)
      } else {
        setError(result.message)
      }
    })
  }

  function softDelete(row: AuthorizedEmailRow) {
    clearMessages()
    startTransition(async () => {
      const result = await softDeleteAuthorizedEmail(row.email)
      if (result.ok) {
        setEditing(null)
        setOk(result.message)
      } else {
        setError(result.message)
      }
    })
  }

  function restore(row: AuthorizedEmailRow, active = true) {
    clearMessages()
    startTransition(async () => {
      const result = await restoreAuthorizedEmail(row.email, active)
      if (result.ok) {
        setEditing(null)
        setOk(result.message)
      } else {
        setError(result.message)
      }
    })
  }

  const inputStyle: React.CSSProperties = {
    background: '#0A0A0A',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    padding: '10px 14px',
    fontSize: '13px',
    color: '#ffffff',
    outline: 'none',
    width: '100%',
  }

  return (
    <div className="space-y-5">

      {/* Search bar */}
      <form action="/admin/whitelist" className="flex gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="Buscar por email o nombre..."
          style={{ ...inputStyle, flex: 1 }}
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-[10px] font-extrabold text-[12px] uppercase transition-all duration-150 shrink-0"
          style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.1)', color: '#cfcfcf' }}
        >
          Buscar
        </button>
      </form>

      {/* Add / Edit form */}
      <form
        action={handleSubmit}
        className="rounded-[16px] overflow-hidden"
        style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-[11px] font-extrabold tracking-[0.18em] uppercase" style={{ color: '#FF6B00' }}>
            {title}
          </p>
        </div>
        <div className="px-5 py-4 grid gap-3 min-[640px]:grid-cols-[1fr_1fr_auto]">
          {editing && <input type="hidden" name="original_email" value={editing.email} />}
          <input
            key={editing?.email ?? 'new-email'}
            name="email"
            type="email"
            required
            defaultValue={editing?.email ?? ''}
            placeholder="participante@email.com"
            style={inputStyle}
          />
          <input
            key={editing?.email ? `${editing.email}-label` : 'new-label'}
            name="label"
            defaultValue={editing?.label ?? ''}
            placeholder="Nombre o referencia"
            style={inputStyle}
          />
          <label
            className="inline-flex items-center gap-2 px-3 py-2 rounded-[10px] font-bold text-[12px] cursor-pointer"
            style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.1)', color: '#cfcfcf', whiteSpace: 'nowrap' }}
          >
            <input
              key={editing?.email ? `${editing.email}-active` : 'new-active'}
              name="active"
              type="checkbox"
              defaultChecked={editing?.active ?? true}
              className="h-4 w-4 accent-[#FF6B00]"
            />
            Activo
          </label>
        </div>
        <div
          className="px-5 py-4 flex flex-wrap items-center gap-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 rounded-full text-[12px] font-extrabold uppercase transition-all duration-150 disabled:opacity-40"
            style={{ background: '#FF6B00', color: '#0A0A0A' }}
          >
            {isPending ? 'Guardando…' : 'Guardar'}
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => { setEditing(null); clearMessages() }}
              className="px-4 py-2 rounded-full text-[12px] font-extrabold uppercase text-muted"
              style={{ background: '#181818', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              Cancelar
            </button>
          )}
          {ok && <span className="text-[12px] font-bold" style={{ color: '#A8F0D8' }}>{ok}</span>}
          {error && <span className="text-[12px] font-bold" style={{ color: '#FF6B6B' }}>{error}</span>}
        </div>
      </form>

      {/* List */}
      <div
        className="rounded-[16px] overflow-hidden"
        style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="font-extrabold text-[13px] text-white">Participantes habilitados</p>
          <p className="text-[11px] text-muted mt-0.5">{activeRows.length} activos</p>
        </div>

        {activeRows.length === 0 ? (
          <p className="px-5 py-6 text-[13px] text-muted">
            {query ? `Sin activos para "${query}".` : 'No hay emails activos.'}
          </p>
        ) : (
          <div>
            {activeRows.map((row) => {
              if (!row || typeof row.email !== 'string') return null
              return (
                <div
                  key={row.email}
                  className="grid gap-3 px-5 py-4 min-[640px]:grid-cols-[1fr_auto] min-[640px]:items-center"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-[13px] text-white">{row.email}</p>
                      <span
                        className="text-[10px] font-extrabold px-2 py-0.5 rounded-full tracking-[0.08em] uppercase"
                        style={
                          row.active
                            ? { background: 'rgba(168,240,216,0.1)', color: '#A8F0D8', border: '1px solid rgba(168,240,216,0.2)' }
                            : { background: '#1a1a1a', color: '#4a4a4a' }
                        }
                      >
                        {row.active ? 'Activo' : 'Inactivo'}
                      </span>
                      <span
                        className="text-[10px] font-extrabold px-2 py-0.5 rounded-full tracking-[0.08em] uppercase"
                        style={
                          row.is_admin
                            ? { background: 'rgba(255,107,0,0.12)', color: '#FF6B00', border: '1px solid rgba(255,107,0,0.22)' }
                            : { background: '#1a1a1a', color: '#4a4a4a' }
                        }
                      >
                        {row.profile_id ? (row.is_admin ? 'Admin' : 'Usuario') : 'Sin perfil'}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[12px] text-muted">
                      {row.label ?? row.profile_name ?? 'Sin nombre'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => { setEditing(row); clearMessages() }}
                      className="px-3 py-2 rounded-[10px] text-[12px] font-bold transition-all duration-150"
                      style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)', color: '#cfcfcf' }}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => toggle(row)}
                      disabled={isPending}
                      className="px-3 py-2 rounded-[10px] text-[12px] font-bold transition-all duration-150 disabled:opacity-40"
                      style={
                        row.active
                          ? { background: 'rgba(255,59,59,0.1)', color: '#FF6B6B', border: '1px solid rgba(255,59,59,0.2)' }
                          : { background: 'rgba(168,240,216,0.08)', color: '#A8F0D8', border: '1px solid rgba(168,240,216,0.15)' }
                      }
                    >
                      {row.active ? 'Desactivar' : 'Activar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleAdmin(row)}
                      disabled={isPending || !row.profile_id}
                      className="px-3 py-2 rounded-[10px] text-[12px] font-bold transition-all duration-150 disabled:opacity-40"
                      style={
                        row.is_admin
                          ? { background: 'rgba(255,59,59,0.1)', color: '#FF6B6B', border: '1px solid rgba(255,59,59,0.2)' }
                          : { background: 'rgba(255,107,0,0.1)', color: '#FF6B00', border: '1px solid rgba(255,107,0,0.2)' }
                      }
                    >
                      {row.is_admin ? 'Quitar admin' : 'Dar admin'}
                    </button>
                    <button
                      type="button"
                      onClick={() => softDelete(row)}
                      disabled={isPending}
                      className="px-3 py-2 rounded-[10px] text-[12px] font-bold transition-all duration-150 disabled:opacity-40"
                      style={{ background: 'rgba(255,59,59,0.1)', color: '#FF6B6B', border: '1px solid rgba(255,59,59,0.2)' }}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div
        className="rounded-[16px] overflow-hidden"
        style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="font-extrabold text-[13px] text-white">Deshabilitados</p>
          <p className="text-[11px] text-muted mt-0.5">{inactiveRows.length} registros</p>
        </div>

        {inactiveRows.length === 0 ? (
          <p className="px-5 py-6 text-[13px] text-muted">
            No hay usuarios deshabilitados.
          </p>
        ) : (
          <div>
            {inactiveRows.map((row) => {
              if (!row || typeof row.email !== 'string') return null
              return (
                <div
                  key={row.email}
                  className="grid gap-3 px-5 py-4 min-[640px]:grid-cols-[1fr_auto] min-[640px]:items-center"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                >
                  <div>
                    <p className="font-bold text-[13px] text-white">{row.email}</p>
                    <p className="mt-0.5 text-[12px] text-muted">{row.label ?? row.profile_name ?? 'Sin nombre'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => { setEditing(row); clearMessages() }}
                      className="px-3 py-2 rounded-[10px] text-[12px] font-bold transition-all duration-150"
                      style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)', color: '#cfcfcf' }}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => toggle(row)}
                      disabled={isPending}
                      className="px-3 py-2 rounded-[10px] text-[12px] font-bold transition-all duration-150 disabled:opacity-40"
                      style={{ background: 'rgba(168,240,216,0.08)', color: '#A8F0D8', border: '1px solid rgba(168,240,216,0.15)' }}
                    >
                      Activar
                    </button>
                    <button
                      type="button"
                      onClick={() => softDelete(row)}
                      disabled={isPending}
                      className="px-3 py-2 rounded-[10px] text-[12px] font-bold transition-all duration-150 disabled:opacity-40"
                      style={{ background: 'rgba(255,59,59,0.1)', color: '#FF6B6B', border: '1px solid rgba(255,59,59,0.2)' }}
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div
        className="rounded-[16px] overflow-hidden"
        style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="font-extrabold text-[13px] text-white">Eliminados</p>
          <p className="text-[11px] text-muted mt-0.5">{deletedRows.length} registros conservados</p>
        </div>

        {deletedRows.length === 0 ? (
          <p className="px-5 py-6 text-[13px] text-muted">
            No hay usuarios eliminados.
          </p>
        ) : (
          <div>
            {deletedRows.map((row) => {
              if (!row || typeof row.email !== 'string') return null
              return (
                <div
                  key={row.email}
                  className="grid gap-3 px-5 py-4 min-[640px]:grid-cols-[1fr_auto] min-[640px]:items-center"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-[13px] text-white">{row.email}</p>
                      <span
                        className="text-[10px] font-extrabold px-2 py-0.5 rounded-full tracking-[0.08em] uppercase"
                        style={{ background: 'rgba(255,59,59,0.1)', color: '#FF6B6B', border: '1px solid rgba(255,59,59,0.2)' }}
                      >
                        Eliminado
                      </span>
                    </div>
                    <p className="mt-0.5 text-[12px] text-muted">{row.label ?? row.profile_name ?? 'Sin nombre'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => restore(row, true)}
                      disabled={isPending}
                      className="px-3 py-2 rounded-[10px] text-[12px] font-bold transition-all duration-150 disabled:opacity-40"
                      style={{ background: 'rgba(168,240,216,0.08)', color: '#A8F0D8', border: '1px solid rgba(168,240,216,0.15)' }}
                    >
                      Restaurar activo
                    </button>
                    <button
                      type="button"
                      onClick={() => restore(row, false)}
                      disabled={isPending}
                      className="px-3 py-2 rounded-[10px] text-[12px] font-bold transition-all duration-150 disabled:opacity-40"
                      style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)', color: '#cfcfcf' }}
                    >
                      Restaurar deshabilitado
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { useMemo, useState, useTransition } from 'react'
import {
  restoreAuthorizedEmail,
  setAuthorizedEmailStatus,
  setParticipantAdminRole,
  softDeleteAuthorizedEmail,
  updateAuthorizedEmail,
  upsertAuthorizedEmail,
} from '../actions'

type ParticipantStatus = 'trial' | 'confirmed' | 'disabled'

export type AuthorizedEmailRow = {
  email: string
  label: string | null
  active: boolean
  status?: ParticipantStatus | null
  paid_at?: string | null
  trial_started_at?: string | null
  trial_expires_at?: string | null
  disabled_at?: string | null
  disabled_reason?: string | null
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

const STATUS_LABELS: Record<ParticipantStatus, string> = {
  confirmed: 'Pago',
  trial: 'En prueba',
  disabled: 'Deshabilitado',
}

function statusOf(row: AuthorizedEmailRow): ParticipantStatus {
  if (row.status === 'confirmed' || row.status === 'trial' || row.status === 'disabled') return row.status
  return row.active ? 'confirmed' : 'disabled'
}

function formatDate(value?: string | null) {
  if (!value) return null
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(new Date(value))
}

function statusBadge(row: AuthorizedEmailRow) {
  if (row.deleted_at) {
    return {
      label: 'Eliminado',
      style: { background: 'rgba(255,59,59,0.1)', color: '#FF6B6B', border: '1px solid rgba(255,59,59,0.2)' },
    }
  }
  const status = statusOf(row)
  if (status === 'confirmed') {
    return {
      label: row.paid_at ? `Pago ${formatDate(row.paid_at)}` : 'Pago',
      style: { background: 'rgba(168,240,216,0.1)', color: '#A8F0D8', border: '1px solid rgba(168,240,216,0.22)' },
    }
  }
  if (status === 'trial') {
    return {
      label: 'En prueba / no pago',
      style: { background: 'rgba(255,177,92,0.12)', color: '#FFB15C', border: '1px solid rgba(255,177,92,0.24)' },
    }
  }
  return {
    label: 'No pago / deshabilitado',
    style: { background: 'rgba(255,59,59,0.1)', color: '#FF6B6B', border: '1px solid rgba(255,59,59,0.2)' },
  }
}

function Badge({ row }: { row: AuthorizedEmailRow }) {
  const badge = statusBadge(row)
  return (
    <span
      className="text-[10px] font-extrabold px-2 py-0.5 rounded-full tracking-[0.08em] uppercase"
      style={badge.style}
    >
      {badge.label}
    </span>
  )
}

export function WhitelistForm({ rows, query }: Props) {
  const safeRows = Array.isArray(rows) ? rows : []
  const confirmedRows = safeRows.filter((row) => !row.deleted_at && statusOf(row) === 'confirmed')
  const trialRows = safeRows.filter((row) => !row.deleted_at && statusOf(row) === 'trial')
  const disabledRows = safeRows.filter((row) => !row.deleted_at && statusOf(row) === 'disabled')
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
        setOk('Participantes actualizados.')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo guardar el email.')
      }
    })
  }

  function toggleAdmin(row: AuthorizedEmailRow) {
    clearMessages()
    startTransition(async () => {
      const result = await setParticipantAdminRole(row.email, !row.is_admin)
      if (result.ok) setOk(result.message)
      else setError(result.message)
    })
  }

  function setStatus(row: AuthorizedEmailRow, status: ParticipantStatus) {
    clearMessages()
    startTransition(async () => {
      const result = await setAuthorizedEmailStatus(row.email, status, row.disabled_reason ?? '')
      if (result.ok) setOk(result.message)
      else setError(result.message)
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

  function renderRows(sectionRows: AuthorizedEmailRow[], empty: string) {
    if (sectionRows.length === 0) {
      return <p className="px-5 py-6 text-[13px] text-muted">{empty}</p>
    }

    return (
      <div>
        {sectionRows.map((row) => {
          if (!row || typeof row.email !== 'string') return null
          const status = statusOf(row)
          return (
            <div
              key={row.email}
              className="grid gap-3 px-5 py-4 min-[720px]:grid-cols-[1fr_auto] min-[720px]:items-center"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-[13px] text-white">{row.email}</p>
                  <Badge row={row} />
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
                {row.disabled_reason && (
                  <p className="mt-1 text-[12px] font-semibold" style={{ color: '#FFB15C' }}>
                    Motivo: {row.disabled_reason}
                  </p>
                )}
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
                {status !== 'confirmed' && !row.deleted_at && (
                  <button
                    type="button"
                    onClick={() => setStatus(row, 'confirmed')}
                    disabled={isPending}
                    className="px-3 py-2 rounded-[10px] text-[12px] font-bold transition-all duration-150 disabled:opacity-40"
                    style={{ background: 'rgba(168,240,216,0.08)', color: '#A8F0D8', border: '1px solid rgba(168,240,216,0.15)' }}
                  >
                    Marcar pago
                  </button>
                )}
                {status !== 'trial' && !row.deleted_at && (
                  <button
                    type="button"
                    onClick={() => setStatus(row, 'trial')}
                    disabled={isPending}
                    className="px-3 py-2 rounded-[10px] text-[12px] font-bold transition-all duration-150 disabled:opacity-40"
                    style={{ background: 'rgba(255,177,92,0.1)', color: '#FFB15C', border: '1px solid rgba(255,177,92,0.2)' }}
                  >
                    Pasar a prueba
                  </button>
                )}
                {status !== 'disabled' && !row.deleted_at && (
                  <button
                    type="button"
                    onClick={() => setStatus(row, 'disabled')}
                    disabled={isPending}
                    className="px-3 py-2 rounded-[10px] text-[12px] font-bold transition-all duration-150 disabled:opacity-40"
                    style={{ background: 'rgba(255,59,59,0.1)', color: '#FF6B6B', border: '1px solid rgba(255,59,59,0.2)' }}
                  >
                    Deshabilitar
                  </button>
                )}
                {!row.deleted_at && (
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
                )}
                {row.deleted_at ? (
                  <>
                    <button
                      type="button"
                      onClick={() => restore(row, true)}
                      disabled={isPending}
                      className="px-3 py-2 rounded-[10px] text-[12px] font-bold transition-all duration-150 disabled:opacity-40"
                      style={{ background: 'rgba(255,177,92,0.1)', color: '#FFB15C', border: '1px solid rgba(255,177,92,0.2)' }}
                    >
                      Restaurar prueba
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
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => softDelete(row)}
                    disabled={isPending}
                    className="px-3 py-2 rounded-[10px] text-[12px] font-bold transition-all duration-150 disabled:opacity-40"
                    style={{ background: 'rgba(255,59,59,0.1)', color: '#FF6B6B', border: '1px solid rgba(255,59,59,0.2)' }}
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
    return (
      <div
        className="rounded-[16px] overflow-hidden"
        style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="font-extrabold text-[13px] text-white">{title}</p>
          <p className="text-[11px] text-muted mt-0.5">{count} registros</p>
        </div>
        {children}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <form action="/admin/whitelist" className="flex gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="Buscar por email, nombre o motivo..."
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
        <div className="px-5 py-4 grid gap-3 min-[760px]:grid-cols-[1fr_1fr_190px]">
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
          <select
            key={editing?.email ? `${editing.email}-status` : 'new-status'}
            name="status"
            defaultValue={editing ? statusOf(editing) : 'trial'}
            style={inputStyle}
          >
            <option value="trial">{STATUS_LABELS.trial}</option>
            <option value="confirmed">{STATUS_LABELS.confirmed}</option>
            <option value="disabled">{STATUS_LABELS.disabled}</option>
          </select>
          <textarea
            key={editing?.email ? `${editing.email}-reason` : 'new-reason'}
            name="disabled_reason"
            defaultValue={editing?.disabled_reason ?? ''}
            placeholder="Motivo de deshabilitacion, si aplica"
            className="min-[760px]:col-span-3"
            rows={2}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
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
            {isPending ? 'Guardando...' : 'Guardar'}
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

      <Section title="Confirmados / pagaron" count={confirmedRows.length}>
        {renderRows(confirmedRows, query ? `Sin confirmados para "${query}".` : 'No hay participantes confirmados.')}
      </Section>

      <Section title="En prueba / no pagaron" count={trialRows.length}>
        {renderRows(trialRows, query ? `Sin pruebas para "${query}".` : 'No hay usuarios en prueba.')}
      </Section>

      <Section title="Deshabilitados / no continuan" count={disabledRows.length}>
        {renderRows(disabledRows, 'No hay usuarios deshabilitados.')}
      </Section>

      <Section title="Eliminados logicos" count={deletedRows.length}>
        {renderRows(deletedRows, 'No hay usuarios eliminados.')}
      </Section>
    </div>
  )
}

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
  prode_entries_count?: number | null
}

type Props = {
  rows: AuthorizedEmailRow[]
  query: string
}

const STATUS_LABELS: Record<ParticipantStatus, string> = {
  confirmed: 'Competidor',
  trial: 'Invitado',
  disabled: 'Deshabilitado',
}

type StatusFilter = 'all' | 'confirmed' | 'trial' | 'disabled' | 'deleted'
type RoleFilter = 'all' | 'admin' | 'user'
type AccountFilter = 'all' | 'with_profile' | 'without_profile'
type ProdeFilter = 'all' | 'empty' | 'in_progress'

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
      label: row.paid_at ? `Competidor ${formatDate(row.paid_at)}` : 'Competidor',
      style: { background: 'rgba(168,240,216,0.1)', color: '#A8F0D8', border: '1px solid rgba(168,240,216,0.22)' },
    }
  }
  if (status === 'trial') {
    return {
      label: 'Invitado',
      style: { background: 'rgba(255,177,92,0.12)', color: '#FFB15C', border: '1px solid rgba(255,177,92,0.24)' },
    }
  }
  return {
    label: 'Deshabilitado',
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

function MiniBadge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'ok' | 'warn' | 'danger' | 'admin' }) {
  const styles = {
    neutral: { background: '#1a1a1a', color: '#8A8A8A', border: '1px solid rgba(255,255,255,0.08)' },
    ok: { background: 'rgba(168,240,216,0.1)', color: '#A8F0D8', border: '1px solid rgba(168,240,216,0.2)' },
    warn: { background: 'rgba(255,177,92,0.1)', color: '#FFB15C', border: '1px solid rgba(255,177,92,0.2)' },
    danger: { background: 'rgba(255,59,59,0.1)', color: '#FF6B6B', border: '1px solid rgba(255,59,59,0.2)' },
    admin: { background: 'rgba(255,107,0,0.12)', color: '#FF6B00', border: '1px solid rgba(255,107,0,0.22)' },
  }[tone]

  return (
    <span
      className="text-[10px] font-extrabold px-2 py-0.5 rounded-full tracking-[0.08em] uppercase"
      style={styles}
    >
      {label}
    </span>
  )
}

function prodeStatus(row: AuthorizedEmailRow) {
  const count = row.prode_entries_count ?? 0
  if (!row.profile_id || count === 0) return 'Prode sin empezar'
  return 'Prode en proceso'
}

function matchesFilters(
  row: AuthorizedEmailRow,
  statusFilter: StatusFilter,
  roleFilter: RoleFilter,
  accountFilter: AccountFilter,
  prodeFilter: ProdeFilter
) {
  if (statusFilter === 'deleted' && !row.deleted_at) return false
  if (statusFilter !== 'all' && statusFilter !== 'deleted' && (row.deleted_at || statusOf(row) !== statusFilter)) return false
  if (roleFilter === 'admin' && !row.is_admin) return false
  if (roleFilter === 'user' && row.is_admin) return false
  if (accountFilter === 'with_profile' && !row.profile_id) return false
  if (accountFilter === 'without_profile' && row.profile_id) return false
  const hasProde = (row.prode_entries_count ?? 0) > 0
  if (prodeFilter === 'empty' && hasProde) return false
  if (prodeFilter === 'in_progress' && !hasProde) return false
  return true
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<{ value: string; label: string }>
}) {
  return (
    <label className="grid gap-1 text-[11px] font-extrabold uppercase tracking-[0.12em] text-muted">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-[10px] px-3 text-[12px] font-bold normal-case tracking-normal text-white"
        style={{ background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.1)', outline: 'none' }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  )
}

function SummaryItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[14px] px-4 py-3" style={{ background: '#101010', border: '1px solid rgba(255,255,255,0.07)' }}>
      <p className="font-display text-[26px] leading-none text-white">{value}</p>
      <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted">{label}</p>
    </div>
  )
}

export function WhitelistForm({ rows, query }: Props) {
  const safeRows = Array.isArray(rows) ? rows : []
  const [editing, setEditing] = useState<AuthorizedEmailRow | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all')
  const [accountFilter, setAccountFilter] = useState<AccountFilter>('all')
  const [prodeFilter, setProdeFilter] = useState<ProdeFilter>('all')
  const [isPending, startTransition] = useTransition()

  const filteredRows = safeRows.filter((row) => matchesFilters(row, statusFilter, roleFilter, accountFilter, prodeFilter))
  const confirmedRows = filteredRows.filter((row) => !row.deleted_at && statusOf(row) === 'confirmed')
  const trialRows = filteredRows.filter((row) => !row.deleted_at && statusOf(row) === 'trial')
  const disabledRows = filteredRows.filter((row) => !row.deleted_at && statusOf(row) === 'disabled')
  const deletedRows = filteredRows.filter((row) => row.deleted_at)
  const summary = {
    confirmed: safeRows.filter((row) => !row.deleted_at && statusOf(row) === 'confirmed').length,
    trial: safeRows.filter((row) => !row.deleted_at && statusOf(row) === 'trial').length,
    disabled: safeRows.filter((row) => !row.deleted_at && statusOf(row) === 'disabled').length,
    admins: safeRows.filter((row) => row.is_admin).length,
    withoutProfile: safeRows.filter((row) => !row.profile_id).length,
    prodeInProgress: safeRows.filter((row) => (row.prode_entries_count ?? 0) > 0).length,
  }

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
  const actionButtonClass = 'px-3 py-2 rounded-[10px] text-[12px] font-extrabold transition-all duration-150 disabled:opacity-40 shadow-[inset_0_-1px_0_rgba(0,0,0,0.35)]'
  const secondaryActionStyle: React.CSSProperties = { background: '#202020', border: '1px solid rgba(255,255,255,0.18)', color: '#f1f1f1' }

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
                  <MiniBadge label={row.active && !row.deleted_at ? 'Acceso activo' : 'Acceso deshabilitado'} tone={row.active && !row.deleted_at ? 'ok' : 'danger'} />
                  <MiniBadge label={row.profile_id ? 'Ya inicio sesion' : 'Sin inicio de sesion todavia'} tone={row.profile_id ? 'ok' : 'neutral'} />
                  <MiniBadge label={prodeStatus(row)} tone={(row.prode_entries_count ?? 0) > 0 ? 'warn' : 'neutral'} />
                  <MiniBadge label={row.is_admin ? 'Admin' : 'Usuario'} tone={row.is_admin ? 'admin' : 'neutral'} />
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
                  className={actionButtonClass}
                  style={secondaryActionStyle}
                >
                  Editar
                </button>
                {status !== 'confirmed' && !row.deleted_at && (
                  <button
                    type="button"
                    onClick={() => setStatus(row, 'confirmed')}
                    disabled={isPending}
                    className={actionButtonClass}
                    style={{ background: 'rgba(168,240,216,0.08)', color: '#A8F0D8', border: '1px solid rgba(168,240,216,0.15)' }}
                  >
                    Marcar competidor
                  </button>
                )}
                {status !== 'trial' && !row.deleted_at && (
                  <button
                    type="button"
                    onClick={() => setStatus(row, 'trial')}
                    disabled={isPending}
                    className={actionButtonClass}
                    style={{ background: 'rgba(255,177,92,0.1)', color: '#FFB15C', border: '1px solid rgba(255,177,92,0.2)' }}
                  >
                    Pasar a invitado
                  </button>
                )}
                {status !== 'disabled' && !row.deleted_at && (
                  <button
                    type="button"
                    onClick={() => setStatus(row, 'disabled')}
                    disabled={isPending}
                    className={actionButtonClass}
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
                    className={actionButtonClass}
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
                      className={actionButtonClass}
                      style={{ background: 'rgba(255,177,92,0.1)', color: '#FFB15C', border: '1px solid rgba(255,177,92,0.2)' }}
                    >
                      Restaurar invitado
                    </button>
                    <button
                      type="button"
                      onClick={() => restore(row, false)}
                      disabled={isPending}
                      className={actionButtonClass}
                      style={secondaryActionStyle}
                    >
                      Restaurar deshabilitado
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => softDelete(row)}
                    disabled={isPending}
                    className={actionButtonClass}
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <SummaryItem label="Competidores" value={summary.confirmed} />
        <SummaryItem label="Invitados" value={summary.trial} />
        <SummaryItem label="Deshabilitados" value={summary.disabled} />
        <SummaryItem label="Admins" value={summary.admins} />
        <SummaryItem label="Sin iniciar sesion" value={summary.withoutProfile} />
        <SummaryItem label="Prodes en proceso" value={summary.prodeInProgress} />
      </div>

      <div className="grid gap-3 rounded-[16px] p-4 sm:grid-cols-2 lg:grid-cols-4" style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.07)' }}>
        <FilterSelect
          label="Estado"
          value={statusFilter}
          onChange={(value) => setStatusFilter(value as StatusFilter)}
          options={[
            { value: 'all', label: 'Todos' },
            { value: 'confirmed', label: 'Competidores' },
            { value: 'trial', label: 'Invitados' },
            { value: 'disabled', label: 'Deshabilitados' },
            { value: 'deleted', label: 'Eliminados' },
          ]}
        />
        <FilterSelect
          label="Rol"
          value={roleFilter}
          onChange={(value) => setRoleFilter(value as RoleFilter)}
          options={[
            { value: 'all', label: 'Todos' },
            { value: 'admin', label: 'Admin' },
            { value: 'user', label: 'Usuario' },
          ]}
        />
        <FilterSelect
          label="Cuenta"
          value={accountFilter}
          onChange={(value) => setAccountFilter(value as AccountFilter)}
          options={[
            { value: 'all', label: 'Todas' },
            { value: 'with_profile', label: 'Ya inicio sesion' },
            { value: 'without_profile', label: 'Nunca inicio sesion' },
          ]}
        />
        <FilterSelect
          label="Prode"
          value={prodeFilter}
          onChange={(value) => setProdeFilter(value as ProdeFilter)}
          options={[
            { value: 'all', label: 'Todos' },
            { value: 'empty', label: 'Sin empezar' },
            { value: 'in_progress', label: 'En proceso' },
          ]}
        />
      </div>

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
            <option value="confirmed">{STATUS_LABELS.confirmed}</option>
            <option value="trial">{STATUS_LABELS.trial}</option>
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

      <Section title="Competidores" count={confirmedRows.length}>
        {renderRows(confirmedRows, query ? `Sin competidores para "${query}".` : 'No hay competidores.')}
      </Section>

      <Section title="Invitados" count={trialRows.length}>
        {renderRows(trialRows, query ? `Sin invitados para "${query}".` : 'No hay invitados.')}
      </Section>

      <Section title="Deshabilitados" count={disabledRows.length}>
        {renderRows(disabledRows, 'No hay usuarios deshabilitados.')}
      </Section>

      <Section title="Eliminados logicos" count={deletedRows.length}>
        {renderRows(deletedRows, 'No hay usuarios eliminados.')}
      </Section>
    </div>
  )
}

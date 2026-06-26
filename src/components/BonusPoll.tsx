'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { CheckCircle2, Clock3, Info, Vote, X } from 'lucide-react'
import { submitBonusPollVote } from '@/app/(app)/poll-actions'
import {
  BONUS_POLL_OPEN_EVENT,
  BONUS_POLL_UPDATED_EVENT,
  formatBonusPollDeadline,
  type BonusPollOption,
  type BonusPollOptionKey,
  type BonusPollState,
} from '@/lib/bonus-poll'

type Props = {
  poll: BonusPollState
}

const DISMISS_PREFIX = 'prode-2026-bonus-poll-dismissed'

const WHAT_IS_VOTED = [
  'Si querés que exista un bonus extra por trayectoria en eliminatorias.',
  'No estás votando partidos individuales.',
  'No se reabren pronósticos.',
  'No cambia nada automáticamente todavía.',
  'Solo estamos decidiendo si este bonus debería existir.',
]

const WHAT_CHANGES = [
  'Premiar aciertos de trayectoria en eliminatorias.',
  'Sumar puntos por equipos acertados en 16avos, 8avos, 4tos, semis, final y campeón.',
  'Reconocer esos aciertos aunque no coincida exactamente todo el cruce.',
]

const WHAT_DOES_NOT_CHANGE = [
  'No se reabren pronósticos.',
  'No se cambian tus cargas actuales.',
  'No se modifica nada automáticamente por ahora.',
  'No se toca scoring, ranking, resultados ni fixture en esta etapa.',
]

function voteColor(key: BonusPollOptionKey) {
  if (key === 'yes') return '#7DD35F'
  if (key === 'no') return '#FF8A12'
  return '#4E9BFF'
}

function getDismissKey(poll: BonusPollState) {
  return `${DISMISS_PREFIX}:${poll.poll.slug}`
}

function percent(value: number, total: number) {
  if (total <= 0) return 0
  return Math.round((value / total) * 100)
}

function formatRemaining(milliseconds: number) {
  if (milliseconds <= 0) return 'Votación cerrada'
  const totalMinutes = Math.ceil(milliseconds / 60000)
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  const parts = []
  if (days > 0) parts.push(`${days} ${days === 1 ? 'día' : 'días'}`)
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'hora' : 'horas'}`)
  if (days === 0 && minutes > 0) parts.push(`${minutes} min`)
  return parts.length ? `Cierra en ${parts.slice(0, 2).join(' ')}` : 'Cierra en menos de 1 minuto'
}

function PollCountdown({ closesAt }: { closesAt: string }) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60000)
    return () => window.clearInterval(id)
  }, [])

  const closesAtTime = new Date(closesAt).getTime()
  if (Number.isNaN(closesAtTime)) return null

  return <>{formatRemaining(closesAtTime - now)}</>
}

function dispatchPollUpdate(poll: BonusPollState) {
  window.dispatchEvent(new CustomEvent(BONUS_POLL_UPDATED_EVENT, { detail: poll }))
}

function useSyncedPoll(initialPoll: BonusPollState) {
  const [poll, setPoll] = useState(initialPoll)

  useEffect(() => {
    function handleUpdate(event: Event) {
      const nextPoll = (event as CustomEvent<BonusPollState>).detail
      if (nextPoll?.poll?.slug === initialPoll.poll.slug) setPoll(nextPoll)
    }

    window.addEventListener(BONUS_POLL_UPDATED_EVENT, handleUpdate)
    return () => window.removeEventListener(BONUS_POLL_UPDATED_EVENT, handleUpdate)
  }, [initialPoll.poll.slug])

  return [poll, setPoll] as const
}

function PollOptionButton({
  option,
  selected,
  disabled,
  onSelect,
}: {
  option: BonusPollOption
  selected: boolean
  disabled: boolean
  onSelect: (key: BonusPollOptionKey) => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect(option.key)}
      className="grid min-h-[82px] grid-cols-[24px_1fr] gap-3 rounded-[16px] bg-white/[0.045] p-4 text-left transition-colors hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-70"
      style={{
        border: selected ? '1px solid #FF6B00' : '1px solid rgba(255,255,255,0.1)',
        boxShadow: selected ? '0 0 0 1px rgba(255,107,0,.24)' : undefined,
      }}
    >
      <span
        className="mt-0.5 grid h-5 w-5 place-items-center rounded-full"
        style={{ border: selected ? '2px solid #FF6B00' : '2px solid rgba(255,255,255,.58)' }}
        aria-hidden="true"
      >
        {selected && <span className="h-2.5 w-2.5 rounded-full bg-orange" />}
      </span>
      <span>
        <span className="block text-[14px] font-extrabold leading-snug text-white">{option.label}</span>
        <span className="mt-1 block text-[12px] font-semibold leading-snug text-muted">{option.description}</span>
      </span>
    </button>
  )
}

function ProposalTable({ poll }: { poll: BonusPollState }) {
  const rows = poll.poll.metadata.proposal ?? []

  return (
    <div className="overflow-hidden rounded-[14px] bg-black/25" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
      <table className="w-full text-left text-[12px]">
        <thead>
          <tr className="text-white">
            <th className="px-3 py-2 font-extrabold">Instancia</th>
            <th className="px-3 py-2 text-right font-extrabold">Bonus propuesto</th>
          </tr>
        </thead>
        <tbody className="text-[#d8d8d8]">
          {rows.map((row) => (
            <tr key={row.stage} className="border-t border-white/10">
              <td className="px-3 py-2">{row.stage}</td>
              <td className="px-3 py-2 text-right font-bold">+{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MiniResults({ poll }: { poll: BonusPollState }) {
  return (
    <div className="grid gap-2 min-[620px]:grid-cols-3">
      {poll.options.map((option) => (
        <div
          key={option.key}
          className="rounded-[12px] bg-white/[0.045] p-3"
          style={{ border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: voteColor(option.key) }} />
            <span className="truncate text-[12px] font-extrabold text-white">{option.label}</span>
          </div>
          <p className="mt-2 font-display text-[30px] leading-none text-white">{option.votesCount}</p>
        </div>
      ))}
    </div>
  )
}

export function BonusPollModal({ poll: initialPoll }: Props) {
  const [poll, setPoll] = useSyncedPoll(initialPoll)
  const [selected, setSelected] = useState<BonusPollOptionKey | null>(initialPoll.vote?.optionKey ?? null)
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const deadline = formatBonusPollDeadline(poll.poll.closesAt)
  const changedSelection = Boolean(selected && selected !== poll.vote?.optionKey)
  const canSubmit = poll.canVote && poll.poll.isOpen && (!poll.vote || changedSelection)

  useEffect(() => {
    if (!poll.canVote || !poll.poll.isOpen || poll.vote) return
    const dismissed = sessionStorage.getItem(getDismissKey(poll)) === '1'
    if (dismissed) return
    let visibleId: number | undefined
    const mountId = window.setTimeout(() => {
      setMounted(true)
      visibleId = window.setTimeout(() => setVisible(true), 30)
    }, 0)
    return () => {
      window.clearTimeout(mountId)
      if (visibleId) window.clearTimeout(visibleId)
    }
  }, [poll])

  useEffect(() => {
    function handleOpen() {
      setSelected(poll.vote?.optionKey ?? null)
      setMounted(true)
      window.setTimeout(() => setVisible(true), 20)
    }

    window.addEventListener(BONUS_POLL_OPEN_EVENT, handleOpen)
    return () => window.removeEventListener(BONUS_POLL_OPEN_EVENT, handleOpen)
  }, [poll.vote?.optionKey])

  useEffect(() => {
    if (!mounted) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeModal(true)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted])

  function closeModal(dismiss = false) {
    if (dismiss) sessionStorage.setItem(getDismissKey(poll), '1')
    setVisible(false)
    window.setTimeout(() => setMounted(false), 160)
  }

  function submitVote() {
    if (!selected || !canSubmit) return
    setMessage(null)
    startTransition(async () => {
      const result = await submitBonusPollVote(selected)
      if (!result.ok || !result.poll) {
        setMessage(result.message || 'No pudimos registrar el voto.')
        return
      }
      setPoll(result.poll)
      dispatchPollUpdate(result.poll)
      setMessage(poll.vote ? 'Voto actualizado. Gracias por participar.' : 'Voto registrado. Gracias por participar.')
      window.setTimeout(() => closeModal(false), 650)
    })
  }

  if (!mounted) return null

  return (
    <div
      className="fixed inset-0 z-[220] grid place-items-center overflow-y-auto px-4 py-6 transition-opacity duration-200"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <button
        type="button"
        className="fixed inset-0 cursor-default bg-black/76"
        aria-label="Cerrar votación"
        onClick={() => closeModal(true)}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="bonus-poll-title"
        className="relative my-auto w-full max-w-[860px] overflow-hidden rounded-[22px] border border-white/10 bg-[#101010] p-5 shadow-2xl transition-all duration-200 sm:p-7"
        style={{ transform: visible ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.98)' }}
      >
        <button
          type="button"
          aria-label="Cerrar votación"
          onClick={() => closeModal(true)}
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-muted transition-colors hover:bg-white/5 hover:text-white"
        >
          <X size={18} aria-hidden="true" />
        </button>

        <div className="pr-8">
          <h2 id="bonus-poll-title" className="font-display text-[30px] uppercase leading-[0.95] tracking-[-0.02em] text-white sm:text-[42px]">
            ¿Sumamos bonus por trayectoria en eliminatorias?
          </h2>
          <p className="mt-3 max-w-[700px] text-[14px] font-semibold leading-relaxed text-[#d7d7d7]">
            Estamos evaluando agregar un bonus extra para premiar aciertos de trayectoria en la llave. La idea es sumar puntos cuando acertás que una selección llega a cierta instancia, aunque no coincida todo el cruce exacto.
          </p>
        </div>

        <div className="mt-5 flex gap-3 rounded-[14px] bg-orange/10 p-4 text-orange" style={{ border: '1px solid rgba(255,107,0,.45)' }}>
          <Clock3 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="text-[15px] font-extrabold">La votación cierra el sábado a las 12:00 hs.</p>
            <p className="mt-1 text-[12px] font-semibold leading-relaxed text-[#d8d8d8]">Hasta ese momento podés votar o cambiar tu voto.</p>
            <p className="mt-2 font-mono text-[11px] font-extrabold uppercase tracking-[0.14em] text-orange">
              <PollCountdown closesAt={poll.poll.closesAt} /> · Cierre: {deadline}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-[16px] bg-white/[0.035] p-4" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="mb-3 flex items-center gap-2 text-white">
            <Info size={18} className="text-orange" aria-hidden="true" />
            <p className="font-extrabold">Qué se está votando</p>
          </div>
          <ul className="grid gap-2 text-[12px] font-semibold leading-relaxed text-[#cfcfcf] min-[700px]:grid-cols-2">
            {WHAT_IS_VOTED.map((item) => (
              <li key={item} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-orange" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-[12px] bg-orange/10 p-3" style={{ border: '1px solid rgba(255,107,0,.28)' }}>
            <p className="text-[12px] font-extrabold text-orange">Importante</p>
            <p className="mt-1 text-[12px] font-semibold leading-relaxed text-[#d7d7d7]">
              El bonus de 16avos incluye a todos los clasificados a eliminatorias: primeros, segundos y mejores terceros.
            </p>
            <p className="mt-2 text-[12px] font-semibold leading-relaxed text-[#d7d7d7]">
              <strong className="text-white">Ejemplo con mejores terceros:</strong> si pronosticaste que una selección entraba a 16avos como mejor tercero y finalmente clasifica entre los mejores terceros, también contaría para el bonus de 16avos.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 min-[760px]:grid-cols-[1fr_320px]">
          <div className="grid gap-3 min-[520px]:grid-cols-2">
            <div className="rounded-[14px] bg-[#0A0A0A] p-4" style={{ border: '1px solid rgba(255,255,255,0.09)' }}>
              <p className="text-[13px] font-extrabold text-white">Ejemplo simple</p>
              <p className="mt-2 text-[12px] font-semibold leading-relaxed text-[#d7d7d7]">
                Si pronosticaste que Argentina llegaba a semifinales, y finalmente Argentina llega a semifinales, podrías sumar el bonus de <strong className="text-white">Semis</strong>, aunque no hayas acertado exactamente todo el recorrido.
              </p>
            </div>
            <div className="rounded-[14px] bg-[#0A0A0A] p-4" style={{ border: '1px solid rgba(255,255,255,0.09)' }}>
              <p className="text-[13px] font-extrabold text-white">Ejemplo 2</p>
              <p className="mt-2 text-[12px] font-semibold leading-relaxed text-[#d7d7d7]">
                Si pronosticaste campeón a Brasil y Brasil sale campeón, podrías sumar el bonus de <strong className="text-white">Campeón</strong>.
              </p>
            </div>
          </div>
          <div>
            <ProposalTable poll={poll} />
            <p className="mt-2 text-[11px] font-semibold text-muted">Estos valores son una propuesta inicial para debatir.</p>
          </div>
        </div>

        {poll.vote && (
          <div className="mt-5 rounded-[14px] bg-mint/10 p-4" style={{ border: '1px solid rgba(168,240,216,.22)' }}>
            <div className="flex items-center gap-2 text-mint">
              <CheckCircle2 size={18} aria-hidden="true" />
              <p className="font-extrabold">Ya registramos tu voto actual, pero podés cambiarlo hasta el cierre.</p>
            </div>
            <p className="mt-1 text-[13px] font-semibold text-[#d7d7d7]">{poll.vote.label}</p>
          </div>
        )}

        <div className="mt-5">
          <p className="mb-3 text-[13px] font-extrabold text-white">Tu voto</p>
          <div className="grid gap-3 min-[720px]:grid-cols-3">
            {poll.options.map((option) => (
              <PollOptionButton
                key={option.key}
                option={option}
                selected={selected === option.key}
                disabled={!poll.canVote || !poll.poll.isOpen || isPending}
                onSelect={setSelected}
              />
            ))}
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-[13px] font-extrabold text-white">Resumen parcial</p>
            <span className="rounded-full bg-white/8 px-3 py-1 text-[11px] font-extrabold text-orange">
              {poll.pendingCount} pendientes
            </span>
          </div>
          <MiniResults poll={poll} />
        </div>

        {message && <p className="mt-4 text-[13px] font-extrabold text-orange">{message}</p>}

        <div className="mt-6 flex flex-col-reverse gap-3 min-[560px]:flex-row min-[560px]:justify-end">
          <button
            type="button"
            onClick={() => closeModal(true)}
            className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/5 px-5 py-3 text-[13px] font-extrabold text-white transition-colors hover:bg-white/10"
          >
            Responder más tarde
          </button>
          {poll.canVote && poll.poll.isOpen && (
            <button
              type="button"
              disabled={!selected || !canSubmit || isPending}
              onClick={submitVote}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-orange px-5 py-3 text-[13px] font-extrabold text-bg transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
            >
              <Vote size={16} aria-hidden="true" />
              {isPending ? 'Enviando...' : poll.vote ? 'Actualizar voto' : 'Enviar voto'}
            </button>
          )}
        </div>
      </section>
    </div>
  )
}

function ResultList({
  title,
  people,
  color,
}: {
  title: string
  people: Array<{ name: string }>
  color: string
}) {
  return (
    <div className="rounded-[14px] bg-[#101010] p-4" style={{ border: '1px solid rgba(255,255,255,0.09)' }}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-extrabold text-white">{title}</p>
        <span className="rounded-full px-2.5 py-1 text-[11px] font-extrabold" style={{ color, background: `${color}18` }}>
          {people.length}
        </span>
      </div>
      {people.length > 0 ? (
        <ul className="mt-3 grid gap-2 text-[13px] font-semibold text-[#d7d7d7]">
          {people.map((person) => (
            <li key={person.name} className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ background: color }} aria-hidden="true" />
              <span>{person.name}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-[13px] font-semibold text-muted">Sin votos todavía.</p>
      )}
    </div>
  )
}

export function BonusPollHomeCard({ poll: initialPoll }: Props) {
  const [poll] = useSyncedPoll(initialPoll)
  const [showResults, setShowResults] = useState(true)
  const deadline = formatBonusPollDeadline(poll.poll.closesAt)
  const totalVotes = Math.max(0, poll.totalVotes)
  const participationPercentage = percent(totalVotes, poll.totalVoters)
  const optionGroups = useMemo(() => {
    return poll.options.map((option) => ({
      option,
      voters: poll.votersByOption.find((group) => group.key === option.key)?.voters ?? [],
      percentage: percent(option.votesCount, Math.max(1, poll.totalVotes)),
    }))
  }, [poll])

  function openModal() {
    window.dispatchEvent(new Event(BONUS_POLL_OPEN_EVENT))
  }

  return (
    <section className="bg-[#080808]" style={{ padding: 'clamp(24px, 5vw, 44px) 20px', borderTop: '1px solid rgba(255,255,255,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="mx-auto max-w-[1280px]">
        <article className="overflow-hidden rounded-[24px] bg-[#141414]" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="grid gap-6 p-5 min-[980px]:grid-cols-[0.95fr_1.05fr] min-[980px]:p-6">
            <div>
              <span
                className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.16em]"
                style={{
                  background: poll.poll.isOpen ? 'rgba(255,107,0,.12)' : 'rgba(255,255,255,.07)',
                  color: poll.poll.isOpen ? '#FF6B00' : '#cfcfcf',
                  border: poll.poll.isOpen ? '1px solid rgba(255,107,0,.28)' : '1px solid rgba(255,255,255,.1)',
                }}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: poll.poll.isOpen ? '#FF6B00' : '#8A8A8A' }} />
                {poll.poll.isOpen ? 'Votación activa' : 'Votación cerrada'}
              </span>
              <h2 className="mt-4 font-display text-[clamp(34px,7vw,62px)] uppercase leading-[0.9] tracking-[-0.03em] text-white">
                Votación activa: <em className="italic text-orange">bonus de trayectoria</em>
              </h2>
              <p className="mt-4 max-w-[580px] text-[15px] font-semibold leading-relaxed text-[#d7d7d7]">
                {poll.poll.isOpen
                  ? 'Estamos consultando a los participantes si quieren sumar un bonus extra por acertar equipos que avanzan de fase en la llave.'
                  : 'Resultado final de la consulta sobre bonus de trayectoria.'}
              </p>
              <div className="mt-5 rounded-[14px] bg-orange/10 p-4" style={{ border: '1px solid rgba(255,107,0,.28)' }}>
                <p className="text-[13px] font-extrabold text-orange">Importante</p>
                <p className="mt-1 text-[12px] font-semibold leading-relaxed text-[#d7d7d7]">
                  El bonus de 16avos incluye a todos los clasificados a eliminatorias: primeros, segundos y mejores terceros.
                </p>
                <p className="mt-2 text-[12px] font-semibold leading-relaxed text-[#d7d7d7]">
                  <strong className="text-white">Ejemplo con mejores terceros:</strong> si pronosticaste que una selección entraba a 16avos como mejor tercero y finalmente clasifica entre los mejores terceros, también contaría para el bonus de 16avos.
                </p>
              </div>

              <div className="mt-5 grid gap-3 min-[560px]:grid-cols-2">
                <div className="rounded-[14px] bg-[#0A0A0A] p-4" style={{ border: '1px solid rgba(255,107,0,.28)' }}>
                  <p className="font-mono text-[10px] font-extrabold uppercase tracking-[0.16em] text-orange">Tiempo restante</p>
                  <p className="mt-2 font-display text-[30px] leading-none text-white"><PollCountdown closesAt={poll.poll.closesAt} /></p>
                  <p className="mt-2 text-[12px] font-bold text-muted">Cierra el sábado a las 12:00 hs · {deadline}</p>
                </div>
                <div className="rounded-[14px] bg-[#0A0A0A] p-4" style={{ border: '1px solid rgba(255,255,255,0.09)' }}>
                  <p className="font-mono text-[10px] font-extrabold uppercase tracking-[0.16em] text-muted">Participación</p>
                  <p className="mt-2 font-display text-[30px] leading-none text-white">{totalVotes} / {poll.totalVoters}</p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-orange" style={{ width: `${participationPercentage}%` }} />
                  </div>
                  <p className="mt-2 text-[12px] font-bold text-muted">{poll.pendingCount} pendientes</p>
                </div>
              </div>

              {poll.vote ? (
                <div className="mt-5 rounded-[14px] bg-mint/10 p-4" style={{ border: '1px solid rgba(168,240,216,.22)' }}>
                  <p className="flex items-center gap-2 font-extrabold text-mint">
                    <CheckCircle2 size={18} aria-hidden="true" />
                    Tu voto actual: {poll.vote.label}
                  </p>
                  <p className="mt-1 text-[13px] font-semibold text-[#d7d7d7]">Podés cambiarlo hasta el sábado a las 12:00 hs.</p>
                </div>
              ) : poll.poll.isOpen ? (
                <div className="mt-5 rounded-[14px] bg-orange/10 p-4" style={{ border: '1px solid rgba(255,107,0,.28)' }}>
                  <p className="font-extrabold text-orange">Tu voto todavía está pendiente.</p>
                  <p className="mt-1 text-[13px] font-semibold text-[#d7d7d7]">Cerrar el modal no cuenta como voto; podés responder desde acá cuando quieras.</p>
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={openModal}
                  className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/5 px-5 py-3 text-[13px] font-extrabold text-white transition-colors hover:bg-white/10"
                >
                  Ver propuesta
                </button>
                {poll.canVote && (
                  <button
                    type="button"
                    onClick={openModal}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-orange px-5 py-3 text-[13px] font-extrabold text-bg transition-transform hover:-translate-y-0.5"
                  >
                    <Vote size={16} aria-hidden="true" />
                    {poll.vote ? 'Cambiar mi voto' : 'Votar'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowResults((value) => !value)}
                  className="inline-flex items-center justify-center rounded-full border border-white/12 bg-white/5 px-5 py-3 text-[13px] font-extrabold text-white transition-colors hover:bg-white/10"
                >
                  Ver resultados
                </button>
              </div>
            </div>

            <div className="grid content-start gap-4">
              <div className="grid gap-3 min-[700px]:grid-cols-3">
                <div className="rounded-[16px] bg-[#0A0A0A] p-4" style={{ border: '1px solid rgba(255,255,255,0.09)' }}>
                  <p className="mb-3 text-[13px] font-extrabold text-white">Qué propone esta votación</p>
                  <ul className="grid gap-2 text-[12px] font-semibold leading-relaxed text-[#d7d7d7]">
                    {WHAT_CHANGES.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-orange" aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-[16px] bg-[#0A0A0A] p-4" style={{ border: '1px solid rgba(255,255,255,0.09)' }}>
                  <p className="mb-3 text-[13px] font-extrabold text-white">Qué no cambia</p>
                  <ul className="grid gap-2 text-[12px] font-semibold leading-relaxed text-[#d7d7d7]">
                    {WHAT_DOES_NOT_CHANGE.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-mint" aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-[16px] bg-orange/10 p-4" style={{ border: '1px solid rgba(255,107,0,.28)' }}>
                  <p className="mb-3 text-[13px] font-extrabold text-orange">Ejemplo explicado</p>
                  <p className="text-[12px] font-semibold leading-relaxed text-[#d7d7d7]">
                    Pronosticaste que Argentina llegaba a semifinales. Aunque no hayas acertado cada cruce exacto de la llave, si Argentina efectivamente llega a semifinales, podrías sumar el bonus de <strong className="text-white">Semis</strong> si esta propuesta se aprueba.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 min-[620px]:grid-cols-[1fr_1fr]">
                <div className="rounded-[16px] bg-[#0A0A0A] p-4" style={{ border: '1px solid rgba(255,255,255,0.09)' }}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-[13px] font-extrabold text-white">Escala propuesta</p>
                    <span className="rounded-full bg-white/8 px-2.5 py-1 text-[10px] font-extrabold text-muted">Debate inicial</span>
                  </div>
                  <ProposalTable poll={poll} />
                  <p className="mt-2 text-[11px] font-semibold text-muted">Estos valores son una propuesta inicial para debatir.</p>
                </div>
                <div className="rounded-[16px] bg-[#0A0A0A] p-4" style={{ border: '1px solid rgba(255,255,255,0.09)' }}>
                  <p className="mb-3 text-[13px] font-extrabold text-white">Estado de la votación</p>
                  <div className="grid gap-3">
                    {optionGroups.map(({ option, percentage }) => (
                      <div key={option.key}>
                        <div className="mb-1 flex items-center justify-between gap-3">
                          <span className="text-[12px] font-extrabold text-white">{option.label}</span>
                          <span className="text-[12px] font-extrabold" style={{ color: voteColor(option.key) }}>{option.votesCount} votos · {percentage}%</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/10">
                          <div className="h-full rounded-full" style={{ width: `${percentage}%`, background: voteColor(option.key) }} />
                        </div>
                      </div>
                    ))}
                    <div className="mt-1 flex items-center justify-between rounded-[12px] bg-white/[0.04] px-3 py-2 text-[12px] font-extrabold text-muted">
                      <span>Faltan votar</span>
                      <span>{poll.pendingCount} participantes</span>
                    </div>
                  </div>
                </div>
              </div>

              {showResults && (
                <>
                  <div className="rounded-[16px] bg-[#0A0A0A] p-4" style={{ border: '1px solid rgba(255,255,255,0.09)' }}>
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <p className="text-[14px] font-extrabold text-white">Quién votó qué</p>
                      <span className="rounded-full bg-orange/10 px-3 py-1 text-[11px] font-extrabold text-orange">
                        Transparencia del grupo
                      </span>
                    </div>
                    <div className="grid gap-3 min-[720px]:grid-cols-3">
                      {optionGroups.map(({ option, voters }) => (
                        <ResultList
                          key={option.key}
                          title={option.label}
                          people={voters}
                          color={voteColor(option.key)}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[16px] bg-[#0A0A0A] p-4" style={{ border: '1px solid rgba(255,255,255,0.09)' }}>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-[14px] font-extrabold text-white">Faltan votar</p>
                      <span className="rounded-full bg-white/8 px-3 py-1 text-[11px] font-extrabold text-orange">
                        {poll.pendingCount} pendientes
                      </span>
                    </div>
                    {poll.pendingVoters.length > 0 ? (
                      <ul className="grid gap-2 text-[13px] font-semibold text-[#d7d7d7] min-[620px]:grid-cols-2 min-[980px]:grid-cols-3">
                        {poll.pendingVoters.map((person) => (
                          <li key={person.userId ?? person.email ?? person.name} className="flex items-center gap-2">
                            <span className="grid h-5 w-5 place-items-center rounded-full bg-white/10 text-[10px] font-extrabold text-muted" aria-hidden="true">
                              {person.name[0]?.toUpperCase() ?? '?'}
                            </span>
                            <span>{person.name}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[13px] font-semibold text-muted">Ya votaron todos los competidores confirmados.</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </article>
      </div>
    </section>
  )
}

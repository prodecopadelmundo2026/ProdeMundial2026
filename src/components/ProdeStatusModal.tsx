'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, CircleDollarSign, Trophy, Users, X } from 'lucide-react'
import { formatPrizePool, prodeStatusLabel, type ProdeCompletionStatus } from '@/lib/prode-progress'

const STORAGE_PREFIX = 'prode-2026-status-modal'

type Props = {
  userId: string
  participantStatus: 'confirmed' | 'trial'
  progress: {
    percentage: number
    loadedCount: number
    expectedCount: number
    status: ProdeCompletionStatus
    missingSections: string[]
  }
  metrics: {
    confirmedPlayers: number
    prizePoolArs: number
    completedProdes: number
    pendingProdes: number
  }
}

function modalCopy(participantStatus: Props['participantStatus'], progress: Props['progress']) {
  if (participantStatus !== 'confirmed') {
    return {
      tone: 'warning' as const,
      eyebrow: 'Activacion',
      title: 'Recordatorio importante',
      body: [
        'Si todavia no activaste tu cuenta, tenes tiempo hasta el jueves a las 16:00.',
        'Despues de ese horario, las cuentas pendientes podran ser deshabilitadas.',
        'Contactate con quien te vendio el Prode para confirmar tu inscripcion. Si ya pagaste, avisa asi revisamos tu estado.',
      ],
      cta: 'Ir a Mi Prode',
    }
  }

  if (progress.status === 'completed') {
    return {
      tone: 'success' as const,
      eyebrow: 'Prode completo',
      title: 'Ya completaste todo tu Prode',
      body: [
        'No te falta cargar nada. Ahora solo queda esperar que arranque esta tremenda Copa del Mundo.',
        'Mientras tanto, podes revisar tus elecciones, compartir el Prode con tus amigos y comparar como vienen los demas participantes.',
      ],
      cta: 'Revisar mis elecciones',
    }
  }

  if (progress.status === 'almost_done') {
    const missing = progress.missingSections.length
      ? `Te falta completar ${progress.missingSections.join(', ')}.`
      : 'Te falta completar algunas predicciones para dejarlo listo antes del cierre.'
    return {
      tone: 'near' as const,
      eyebrow: 'Casi listo',
      title: 'Estas muy cerca de terminar tu Prode',
      body: [
        `Ya cargaste aproximadamente el ${progress.percentage}%.`,
        missing,
        'Revisa las fases pendientes y terminalo cuanto antes.',
      ],
      cta: 'Terminar mi Prode',
    }
  }

  if (progress.status === 'in_progress') {
    return {
      tone: 'warning' as const,
      eyebrow: 'En proceso',
      title: 'Todavia te falta bastante para terminar tu Prode',
      body: [
        `Llevas cargado aproximadamente el ${progress.percentage}%.`,
        'Acordate de completar todas las fases y las apuestas especiales antes del cierre.',
        'No lo dejes para ultimo momento.',
      ],
      cta: 'Continuar carga',
    }
  }

  return {
    tone: 'danger' as const,
    eyebrow: 'Sin cargar',
    title: 'Todavia no cargaste tu Prode',
    body: [
      'Tu cuenta esta activa, pero no tenes casi ninguna prediccion cargada.',
      'Entra a Mi Prode y completalo cuanto antes para participar correctamente.',
    ],
    cta: 'Cargar Mi Prode',
  }
}

function toneStyles(tone: ReturnType<typeof modalCopy>['tone']) {
  if (tone === 'success') return { accent: '#A8F0D8', bg: 'rgba(168,240,216,0.1)', border: 'rgba(168,240,216,0.22)' }
  if (tone === 'near') return { accent: '#FFE040', bg: 'rgba(255,224,64,0.1)', border: 'rgba(255,224,64,0.22)' }
  if (tone === 'danger') return { accent: '#FF6B6B', bg: 'rgba(255,107,107,0.1)', border: 'rgba(255,107,107,0.24)' }
  return { accent: '#FFB15C', bg: 'rgba(255,177,92,0.1)', border: 'rgba(255,177,92,0.24)' }
}

export function ProdeStatusModal({ userId, participantStatus, progress, metrics }: Props) {
  const copy = modalCopy(participantStatus, progress)
  const styles = toneStyles(copy.tone)
  const signature = `${STORAGE_PREFIX}:${userId}:${participantStatus}:${progress.status}`
  const [open, setOpen] = useStateFromStorage(signature)
  const percentage = Math.max(0, Math.min(100, progress.percentage))
  const pool = metrics.prizePoolArs > 0 ? formatPrizePool(metrics.confirmedPlayers) : '$0'

  function closeModal() {
    window.localStorage.setItem(signature, '1')
    setOpen(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[210] grid place-items-center px-4 py-6">
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-black/72"
        aria-label="Cerrar aviso de Prode"
        onClick={closeModal}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="prode-status-title"
        className="relative w-full max-w-[640px] overflow-hidden rounded-[22px] border border-white/10 bg-[#101010] p-5 shadow-2xl sm:p-7"
      >
        <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: styles.accent }} aria-hidden="true" />
        <button
          type="button"
          aria-label="Cerrar aviso de Prode"
          onClick={closeModal}
          className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-muted transition-colors hover:bg-white/5 hover:text-white"
        >
          <X size={18} aria-hidden="true" />
        </button>

        <p
          className="mb-3 inline-flex rounded-full px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.18em]"
          style={{ background: styles.bg, color: styles.accent, border: `1px solid ${styles.border}` }}
        >
          {copy.eyebrow}
        </p>
        <h2 id="prode-status-title" className="max-w-[520px] font-display text-[32px] uppercase leading-[0.92] tracking-[-0.02em] sm:text-[44px]">
          {copy.title}
        </h2>
        <div className="mt-4 grid gap-2 text-[14px] font-medium leading-relaxed text-[#d7d7d7]">
          {copy.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>

        <div className="mt-6 rounded-[16px] bg-[#151515] p-4" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-muted">Tu avance</span>
            <span className="font-mono text-[12px] font-extrabold" style={{ color: styles.accent }}>
              {prodeStatusLabel(progress.status)}
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-black/40">
            <div className="h-full rounded-full transition-[width]" style={{ width: `${percentage}%`, background: styles.accent }} />
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 text-[12px] font-bold text-muted">
            <span>{progress.loadedCount} de {progress.expectedCount} cargas</span>
            <span>{percentage}%</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { icon: Users, label: 'Confirmados', value: metrics.confirmedPlayers },
            { icon: CircleDollarSign, label: 'Pozo actual', value: pool },
            { icon: CheckCircle2, label: 'Terminados', value: metrics.completedProdes },
            { icon: AlertTriangle, label: 'Pendientes', value: metrics.pendingProdes },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-[14px] bg-[#151515] p-3" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              <Icon size={16} aria-hidden="true" style={{ color: styles.accent }} />
              <p className="mt-2 truncate font-display text-[22px] leading-none text-white">{value}</p>
              <p className="mt-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted">{label}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/mi-prode"
            onClick={closeModal}
            className="inline-flex items-center gap-2 rounded-full bg-orange px-5 py-3 text-[13px] font-extrabold text-bg transition-transform hover:-translate-y-0.5"
          >
            <Trophy size={16} aria-hidden="true" />
            {copy.cta}
          </Link>
          <Link
            href="/ranking"
            onClick={closeModal}
            className="inline-flex items-center rounded-full border border-white/12 bg-white/5 px-5 py-3 text-[13px] font-extrabold text-white transition-colors hover:bg-white/10"
          >
            Ver participantes
          </Link>
        </div>
      </section>
    </div>
  )
}

function useStateFromStorage(signature: string) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const id = window.setTimeout(() => {
      setOpen(window.localStorage.getItem(signature) !== '1')
    }, 0)
    return () => window.clearTimeout(id)
  }, [signature])

  return [open, setOpen] as const
}

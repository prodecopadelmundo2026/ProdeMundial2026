'use client'

import { useRef, useState, useTransition, useEffect } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { StatusBadge } from './StatusBadge'
import { getTeam, flagUrl } from '@/lib/teams'
import { upsertPrediction } from '@/app/(app)/fixture/actions'
import { normalizeScoreInput, parseScoreInput } from '@/lib/score-input'
import type { Match } from '@/types'

type Prediction = { home_score: number; away_score: number }
type PtsType = 'exact' | 'partial' | 'miss'

function calcPoints(pred: Prediction, result: Prediction): { pts: 0 | 1 | 3; type: PtsType } {
  if (pred.home_score === result.home_score && pred.away_score === result.away_score)
    return { pts: 3, type: 'exact' }

  const predSign = Math.sign(pred.home_score - pred.away_score)
  const realSign = Math.sign(result.home_score - result.away_score)

  if (predSign === realSign) {
    return { pts: 1, type: 'partial' }
  }

  return { pts: 0, type: 'miss' }
}

function PtsBadge({ pts, type }: { pts: 0 | 1 | 3; type: PtsType }) {
  const styles: Record<PtsType, { bg: string; color: string; label: string }> = {
    exact: { bg: '#FFE040', color: '#0A0A0A', label: 'exacto' },
    partial: { bg: '#A8F0D8', color: '#0A0A0A', label: 'parcial' },
    miss: { bg: '#2a2a2a', color: '#9a9a9a', label: 'incorrecto' },
  }

  const { bg, color, label } = styles[type]

  return (
    <span
      className="inline-flex items-center gap-1.5 px-[10px] py-[5px] rounded-full text-[11px] font-extrabold shrink-0"
      style={{ background: bg, color }}
    >
      <span className="font-display text-[13px]">
        {type === 'miss' ? '0' : `+${pts}`}
      </span>
      {label}
    </span>
  )
}

function formatMs(ms: number) {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function formatClientError(error: unknown) {
  if (error instanceof Error) return error.message

  if (typeof error === 'object' && error && 'message' in error) {
    return String((error as { message: unknown }).message)
  }

  return String(error)
}

type Props = {
  match: Match
  prediction?: Prediction | null
  noAutosave?: boolean
  initialHome?: string
  initialAway?: string
  onValuesChange?: (home: string, away: string) => void
  onSaveStateChange?: (state: 'idle' | 'dirty' | 'saving' | 'saved' | 'error') => void
  readOnly?: boolean
}

export function MatchCard({
  match,
  prediction,
  noAutosave,
  initialHome,
  initialAway,
  onValuesChange,
  onSaveStateChange,
  readOnly,
}: Props) {
  const now = new Date()
  const lockedAt = new Date(match.locked_at)

  const isOpen = match.status === 'upcoming' && now < lockedAt

  const hasRealScore =
    (match.status === 'finished' || match.status === 'live') &&
    match.home_score != null &&
    match.away_score != null

  const isInputLocked = !isOpen

  const [home, setHome] = useState(initialHome ?? prediction?.home_score?.toString() ?? '')
  const [away, setAway] = useState(initialAway ?? prediction?.away_score?.toString() ?? '')

  const [saveState, setSaveState] = useState<
    'idle' | 'dirty' | 'saving' | 'saved' | 'error'
  >(!noAutosave && prediction ? 'saved' : 'idle')

  const [saveError, setSaveError] = useState<string | null>(null)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const latestValuesRef = useRef({
    home: initialHome ?? prediction?.home_score?.toString() ?? '',
    away: initialAway ?? prediction?.away_score?.toString() ?? '',
  })

  const [, startTransition] = useTransition()

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  useEffect(() => {
    const nextHome = initialHome ?? prediction?.home_score?.toString() ?? ''
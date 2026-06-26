import type { SupabaseClient } from '@supabase/supabase-js'

export const BONUS_POLL_SLUG = 'knockout-trajectory-bonus'
export const BONUS_POLL_OPEN_EVENT = 'bonus-poll:open'
export const BONUS_POLL_UPDATED_EVENT = 'bonus-poll:updated'

export type BonusPollOptionKey = 'yes' | 'no' | 'neutral'

export type BonusPollOption = {
  key: BonusPollOptionKey
  label: string
  description: string
  sortOrder: number
  votesCount: number
}

export type BonusPollPerson = {
  userId: string | null
  email?: string | null
  name: string
}

export type BonusPollProposalRow = {
  stage: string
  points: number
}

export type BonusPollState = {
  poll: {
    id: string
    slug: string
    title: string
    description: string
    status: 'active' | 'closed'
    closesAt: string
    isOpen: boolean
    metadata: {
      proposal?: BonusPollProposalRow[]
      deadlineLabel?: string
      noticeTitle?: string
      noticeText?: string
    }
  }
  options: BonusPollOption[]
  vote: {
    optionKey: BonusPollOptionKey
    label: string
    description: string
  } | null
  canVote: boolean
  totalVoters: number
  totalVotes: number
  pendingCount: number
  votersByOption: Array<{
    key: BonusPollOptionKey
    label: string
    voters: BonusPollPerson[]
  }>
  pendingVoters: BonusPollPerson[]
}

const OPTION_KEYS = new Set(['yes', 'no', 'neutral'])

function optionKey(value: unknown): BonusPollOptionKey {
  return OPTION_KEYS.has(String(value)) ? (String(value) as BonusPollOptionKey) : 'neutral'
}

function text(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function int(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function normalizePerson(value: unknown): BonusPollPerson {
  const row = (value ?? {}) as Record<string, unknown>
  return {
    userId: text(row.userId) || null,
    email: text(row.email) || null,
    name: text(row.name, 'Participante'),
  }
}

export function normalizeBonusPollState(value: unknown): BonusPollState | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  const rawPoll = (raw.poll ?? {}) as Record<string, unknown>
  const metadata = (rawPoll.metadata ?? {}) as Record<string, unknown>
  const proposal = Array.isArray(metadata.proposal)
    ? metadata.proposal.map((row) => {
        const item = (row ?? {}) as Record<string, unknown>
        return {
          stage: text(item.stage),
          points: int(item.points),
        }
      }).filter((row) => row.stage)
    : []

  const options = Array.isArray(raw.options)
    ? raw.options.map((item) => {
        const option = (item ?? {}) as Record<string, unknown>
        return {
          key: optionKey(option.key),
          label: text(option.label),
          description: text(option.description),
          sortOrder: int(option.sortOrder),
          votesCount: int(option.votesCount),
        }
      })
    : []

  const rawVote = raw.vote && typeof raw.vote === 'object' ? raw.vote as Record<string, unknown> : null

  return {
    poll: {
      id: text(rawPoll.id),
      slug: text(rawPoll.slug, BONUS_POLL_SLUG),
      title: text(rawPoll.title, 'Bonus de trayectoria en eliminatorias'),
      description: text(rawPoll.description),
      status: rawPoll.status === 'closed' ? 'closed' : 'active',
      closesAt: text(rawPoll.closesAt),
      isOpen: Boolean(rawPoll.isOpen),
      metadata: {
        proposal,
        deadlineLabel: text(metadata.deadlineLabel, 'sábado 12:00 hs'),
        noticeTitle: text(metadata.noticeTitle, 'La votación cierra el sábado a las 12:00 hs'),
        noticeText: text(metadata.noticeText, 'Hasta ese momento podés votar o cambiar tu voto.'),
      },
    },
    options,
    vote: rawVote
      ? {
          optionKey: optionKey(rawVote.optionKey),
          label: text(rawVote.label),
          description: text(rawVote.description),
        }
      : null,
    canVote: Boolean(raw.canVote),
    totalVoters: int(raw.totalVoters),
    totalVotes: int(raw.totalVotes),
    pendingCount: int(raw.pendingCount),
    votersByOption: Array.isArray(raw.votersByOption)
      ? raw.votersByOption.map((item) => {
          const group = (item ?? {}) as Record<string, unknown>
          return {
            key: optionKey(group.key),
            label: text(group.label),
            voters: Array.isArray(group.voters) ? group.voters.map(normalizePerson) : [],
          }
        })
      : [],
    pendingVoters: Array.isArray(raw.pendingVoters) ? raw.pendingVoters.map(normalizePerson) : [],
  }
}

export async function getBonusPollState(supabase: SupabaseClient) {
  const { data, error } = await supabase.rpc('get_poll_state', {
    p_poll_slug: BONUS_POLL_SLUG,
  })

  if (error) {
    console.warn('[bonus-poll] No se pudo cargar la votacion', error.message)
    return null
  }

  return normalizeBonusPollState(data)
}

export function formatBonusPollDeadline(closesAt: string) {
  if (!closesAt) return 'sábado 12:00 hs'
  const date = new Date(closesAt)
  if (Number.isNaN(date.getTime())) return 'sábado 12:00 hs'

  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(date)
}

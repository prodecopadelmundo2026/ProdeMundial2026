'use client'

import { useState, useMemo, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Shuffle } from 'lucide-react'
import type { Match } from '@/types'
import { GroupBatchEditor } from './GroupBatchEditor'
import { BracketView } from './BracketView'
import { SpecialsTab } from './SpecialsTab'
import { SpecialsBanner } from './SpecialsBanner'
import { deletePredictionsByStages, generateRandomGroupPredictions } from '@/app/(app)/fixture/actions'
import { parseScoreInput } from '@/lib/score-input'

type PredMap = Record<string, { home_score: number; away_score: number }>
type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

type TabId = 'grupos' | 'eliminatoria' | 'especiales'
type DeleteOption = 'groups' | 'knockout' | 'round_of_32' | 'round_of_16' | 'quarter' | 'semi' | 'final' | 'third_place' | 'specials' | 'all'
type DeleteState = 'idle' | 'confirm' | 'deleting' | 'success' | 'error'

const LOCAL_STORAGE_KEY = 'prode_group_preds'
const TIEBREAKERS_STORAGE_KEY = 'prode_group_tiebreakers'
const SPECIALS_STORAGE_KEY = 'prode_specials'

function randomSpecials() {
  const balon = ['Lionel Messi', 'Kylian Mbappe', 'Vinicius Junior', 'Jamal Musiala']
  const bota = ['Kylian Mbappe', 'Harry Kane', 'Erling Haaland', 'Julian Alvarez']
  const guante = ['Emiliano Martinez', 'Thibaut Courtois', 'Alisson Becker', 'Mike Maignan']
  const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)] ?? arr[0] ?? ''
  return { balon: pick(balon), bota: pick(bota), guante: pick(guante) }
}

const KNOCKOUT_STAGES = ['round_of_32', 'round_of_16', 'quarter', 'semi', 'final', 'third_place']

const DELETE_STAGE_LABELS: Record<string, string> = {
  group: 'Grupos',
  round_of_32: 'Dieciseisavos',
  round_of_16: 'Octavos',
  quarter: 'Cuartos',
  semi: 'Semis',
  final: 'Final',
  third_place: '3er puesto',
}

const DELETE_OPTIONS: Array<{ key: DeleteOption; label: string; stages?: string[]; localOnly?: boolean }> = [
  { key: 'groups', label: 'Fase de grupos completa', stages: ['group', ...KNOCKOUT_STAGES] },
  { key: 'knockout', label: 'Eliminatorias completas', stages: KNOCKOUT_STAGES },
  { key: 'round_of_32', label: 'Dieciseisavos', stages: KNOCKOUT_STAGES },
  { key: 'round_of_16', label: 'Octavos', stages: ['round_of_16', 'quarter', 'semi', 'final', 'third_place'] },
  { key: 'quarter', label: 'Cuartos', stages: ['quarter', 'semi', 'final', 'third_place'] },
  { key: 'semi', label: 'Semis', stages: ['semi', 'final', 'third_place'] },
  { key: 'final', label: 'Final', stages: ['final'] },
  { key: 'third_place', label: '3er puesto', stages: ['third_place'] },
  { key: 'specials', label: 'Apuestas especiales', localOnly: true },
  { key: 'all', label: 'Todo' },
]

function formatClientError(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return String(error)
}

function formatDeleteStages(stages: string[]) {
  return stages.map((stage) => DELETE_STAGE_LABELS[stage] ?? stage).join(', ')
}

interface Props {
  groupMatches: Match[]
  knockoutMatches: Match[]
  predMap: PredMap
  tiebreakerMap: Record<string, string>
  isAdmin: boolean
}

export function MiProdeTabs({
  groupMatches,
  knockoutMatches,
  predMap,
  tiebreakerMap,
  isAdmin,
}: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabId>('grupos')
  const [bracketClearSignal, setBracketClearSignal] = useState<{ version: number; stages: string[] }>({
    version: 0,
    stages: [],
  })
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteState, setDeleteState] = useState<DeleteState>('idle')
  const [deleteSelections, setDeleteSelections] = useState<Set<DeleteOption>>(() => new Set())
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null)
  const [fakeState, setFakeState] = useState<'idle' | 'confirm' | 'saving' | 'saved' | 'error'>('idle')
  const [fakeError, setFakeError] = useState<string | null>(null)
  const [bracketModalSignal, setBracketModalSignal] = useState(0)
  const [tiebreakers, setTiebreakers] = useState<Record<string, string>>({})
  const [groupSaveStates, setGroupSaveStates] = useState<Record<string, SaveState>>(() => {
    const init: Record<string, SaveState> = {}
    for (const m of groupMatches) {
      if (predMap[m.id]) init[m.id] = 'saved'
    }
    return init
  })
  const [, startTransition] = useTransition()

  const groupedByGroup: Record<string, Match[]> = {}
  for (const m of groupMatches) {
    if (!m.group) continue
    const key = `Grupo ${m.group}`
    if (!groupedByGroup[key]) groupedByGroup[key] = []
    groupedByGroup[key].push(m)
  }

  // Flat local predictions for group matches (matchId → {home, away})
  const [localGroupPreds, setLocalGroupPreds] = useState<Record<string, { home: string; away: string }>>(() => {
    const init: Record<string, { home: string; away: string }> = {}
    for (const m of groupMatches) {
      const pred = predMap[m.id]
      if (pred) {
        init[m.id] = {
          home: pred.home_score.toString(),
          away: pred.away_score.toString(),
        }
      }
    }
    return init
  })

  // Restore unsaved inputs from localStorage on mount (client only)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (!stored) return
      const parsed = JSON.parse(stored) as Record<string, { home: string; away: string }>
      const validMatchIds = new Set(groupMatches.map((m) => m.id))
      setLocalGroupPreds((prev) => {
        const next = { ...prev }
        for (const [matchId, val] of Object.entries(parsed)) {
          if (validMatchIds.has(matchId) && !predMap[matchId]) next[matchId] = val
        }
        return next
      })
      setGroupSaveStates((prev) => {
        const next = { ...prev }
        for (const [matchId] of Object.entries(parsed)) {
          if (!validMatchIds.has(matchId)) continue
          if (!predMap[matchId]) next[matchId] = 'dirty'
        }
        return next
      })
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(TIEBREAKERS_STORAGE_KEY)
      if (stored) setTiebreakers(JSON.parse(stored))
    } catch {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(TIEBREAKERS_STORAGE_KEY, JSON.stringify(tiebreakers))
    } catch {}
  }, [tiebreakers])

  // Persist to localStorage whenever group preds change
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localGroupPreds))
    } catch {}
  }, [localGroupPreds])

  function handleTiebreaker(key: string, team: string | null) {
    setTiebreakers((prev) => {
      if (!team) {
        const { [key]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [key]: team }
    })
  }

  function handleGroupPredChange(matchId: string, home: string, away: string) {
    setLocalGroupPreds((prev) => ({ ...prev, [matchId]: { home, away } }))
  }

  function handleGroupSaveStateChange(matchId: string, state: SaveState) {
    setGroupSaveStates((prev) => ({ ...prev, [matchId]: state }))
  }

  function hasCompleteGroupInput(matchId: string) {
    const input = localGroupPreds[matchId]
    if (!input) return false
    return parseScoreInput(input.home) != null && parseScoreInput(input.away) != null
  }

  // Merge server preds with locally entered group preds for BracketView standings
  const effectivePredMap = useMemo(() => {
    const merged = { ...predMap }
    const clearedStages = new Set(bracketClearSignal.stages)
    if (clearedStages.has('group')) {
      for (const match of groupMatches) delete merged[match.id]
    }
    for (const match of knockoutMatches) {
      if (clearedStages.has(match.stage)) delete merged[match.id]
    }
    for (const [matchId, { home, away }] of Object.entries(localGroupPreds)) {
      const h = parseScoreInput(home)
      const a = parseScoreInput(away)
      if (h != null && a != null) {
        merged[matchId] = { home_score: h, away_score: a }
      }
    }
    return merged
  }, [predMap, localGroupPreds, bracketClearSignal, groupMatches, knockoutMatches])

  // All group matches have a valid prediction (server or local)
  const allGroupsFilled =
    groupMatches.length > 0 &&
    groupMatches.every((m) => hasCompleteGroupInput(m.id))

  const groupStatus = useMemo(() => {
    const filledCount = groupMatches.filter((m) => hasCompleteGroupInput(m.id)).length
    const hasSaving = groupMatches.some((m) => groupSaveStates[m.id] === 'saving')
    const hasDirty = groupMatches.some((m) => groupSaveStates[m.id] === 'dirty')
    const hasError = groupMatches.some((m) => groupSaveStates[m.id] === 'error')
    const allReady =
      allGroupsFilled &&
      groupMatches.every((m) => groupSaveStates[m.id] === 'saved')

    return { filledCount, hasSaving, hasDirty, hasError, allReady }
  }, [allGroupsFilled, groupMatches, groupSaveStates, localGroupPreds])

  const groupStatusLabel = groupStatus.hasError
    ? 'Error al guardar'
    : groupStatus.hasSaving
    ? 'Guardando...'
    : groupStatus.hasDirty
    ? 'Cambios sin guardar'
    : groupStatus.allReady
    ? 'Guardado'
    : `${groupStatus.filledCount}/${groupMatches.length} partidos cargados`

  const groupStatusColor = groupStatus.hasError
    ? '#FF6B6B'
    : groupStatus.hasDirty
    ? '#FFB15C'
    : groupStatus.allReady
    ? '#A8F0D8'
    : '#8A8A8A'

  function toggleDeleteSelection(option: DeleteOption) {
    setDeleteSelections((prev) => {
      const next = new Set(prev)
      if (option === 'all') {
        return next.has('all') ? new Set() : new Set(['all'])
      }
      next.delete('all')
      if (next.has(option)) next.delete(option)
      else next.add(option)
      return next
    })
    setDeleteState('idle')
    setDeleteMessage(null)
  }

  function resolveDeleteScopes() {
    const selected = deleteSelections.has('all')
      ? DELETE_OPTIONS.filter((option) => option.key !== 'all').map((option) => option.key)
      : [...deleteSelections]
    const selectedSet = new Set(selected)
    const stages = new Set<string>()

    for (const option of DELETE_OPTIONS) {
      if (!selectedSet.has(option.key)) continue
      for (const stage of option.stages ?? []) stages.add(stage)
    }

    return {
      stages: [...stages],
      deleteGroupsLocally: selectedSet.has('groups'),
      deleteKnockoutLocally:
        selectedSet.has('groups') ||
        selectedSet.has('knockout') ||
        selected.some((key) => ['round_of_32', 'round_of_16', 'quarter', 'semi', 'final', 'third_place'].includes(key)),
      deleteSpecials: selectedSet.has('specials'),
      hasAnySelection: selectedSet.size > 0,
    }
  }

  function closeDeleteModal() {
    if (deleteState === 'deleting') return
    setDeleteModalOpen(false)
    setDeleteState('idle')
    setDeleteMessage(null)
  }

  function handleDeleteSelectedPredictions() {
    const scopes = resolveDeleteScopes()
    if (!scopes.hasAnySelection) {
      setDeleteState('error')
      setDeleteMessage('Elegí al menos una opción para borrar.')
      return
    }
    if (deleteState !== 'confirm') {
      const stageMessage = scopes.stages.length
        ? ` Fases afectadas: ${formatDeleteStages(scopes.stages)}.`
        : ''
      const specialsMessage = scopes.deleteSpecials ? ' Tambien se borraran apuestas especiales.' : ''
      setDeleteState('confirm')
      setDeleteMessage(
        `Confirma el borrado.${stageMessage}${specialsMessage} Solo se afectara tu usuario y partidos abiertos.`
      )
      return
    }

    setDeleteState('deleting')
    setDeleteMessage(null)
    startTransition(async () => {
      try {
        const deletedCount = scopes.stages.length ? await deletePredictionsByStages(scopes.stages) : 0
        if (scopes.deleteGroupsLocally) {
          try {
            localStorage.removeItem(LOCAL_STORAGE_KEY)
            localStorage.removeItem(TIEBREAKERS_STORAGE_KEY)
          } catch {}
          setLocalGroupPreds({})
          setTiebreakers({})
          setGroupSaveStates({})
        }
        if (scopes.deleteKnockoutLocally) {
          setBracketClearSignal((prev) => ({ version: prev.version + 1, stages: scopes.stages }))
        }
        if (scopes.deleteSpecials) {
          try {
            localStorage.removeItem(SPECIALS_STORAGE_KEY)
            window.dispatchEvent(new Event('prode-specials-cleared'))
          } catch {}
        }
        setDeleteState('success')
        setDeleteMessage(
          scopes.deleteSpecials && !scopes.stages.length
            ? 'Apuestas especiales borradas correctamente.'
            : `Borrado correcto. Predicciones eliminadas: ${deletedCount}.`
        )
        setDeleteSelections(new Set())
        router.refresh()
      } catch (error) {
        const message = formatClientError(error)
        console.error('Error al borrar pronósticos', error)
        setDeleteState('error')
        setDeleteMessage(message)
      }
    })
  }

  async function handleRandomGroupPredictions() {
    setFakeState('saving')
    setFakeError(null)
    try {
      const generated = await generateRandomGroupPredictions()
      if (!generated.length) {
        setFakeState('idle')
        return
      }
      setLocalGroupPreds((prev) => {
        const next = { ...prev }
        for (const pred of generated) {
          next[pred.matchId] = {
            home: String(pred.homeScore),
            away: String(pred.awayScore),
          }
        }
        return next
      })
      setGroupSaveStates((prev) => {
        const next = { ...prev }
        for (const pred of generated) next[pred.matchId] = 'saved'
        return next
      })
      try { localStorage.removeItem(LOCAL_STORAGE_KEY) } catch {}
      setFakeState('saved')
      setTimeout(() => setFakeState('idle'), 1800)
    } catch (error) {
      const message = formatClientError(error)
      console.error('Error al cargar pronóstico aleatorio de grupos', error)
      setFakeError(message)
      setFakeState('error')
    }
  }

  return (
    <div>
      {/* Toolbar: phase tabs (left) + admin actions (right) */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div
          className="inline-flex items-center gap-[3px] p-[4px] rounded-full"
          style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {(['grupos', 'eliminatoria', 'especiales'] as TabId[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-[14px] py-[7px] rounded-full font-extrabold text-[12px] transition-all duration-150 whitespace-nowrap"
              style={
                activeTab === tab
                  ? { background: '#FF6B00', color: '#0A0A0A' }
                  : { color: '#8A8A8A' }
              }
              onMouseEnter={(e) => {
                if (activeTab !== tab) e.currentTarget.style.color = '#fff'
              }}
              onMouseLeave={(e) => {
                if (activeTab !== tab) e.currentTarget.style.color = '#8A8A8A'
              }}
            >
              {tab === 'grupos' ? 'Grupos' : tab === 'eliminatoria' ? 'Eliminatorias' : 'Especiales'}
            </button>
          ))}
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            {/* Aleatorio — tab-aware */}
            <button
              onClick={() => {
                if (activeTab === 'grupos') {
                  setFakeState('confirm')
                } else if (activeTab === 'eliminatoria') {
                  setBracketModalSignal((v) => v + 1)
                } else if (activeTab === 'especiales') {
                  try {
                    const next = randomSpecials()
                    localStorage.setItem(SPECIALS_STORAGE_KEY, JSON.stringify(next))
                    window.dispatchEvent(new Event('prode-specials-randomized'))
                  } catch {}
                }
              }}
              disabled={fakeState === 'saving'}
              className="inline-flex items-center gap-[6px] px-3 py-[7px] rounded-[10px] font-bold text-[12px] transition-all duration-150 disabled:opacity-40"
              style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)', color: '#cfcfcf' }}
              title="Cargá pronósticos aleatorios para la fase activa"
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#1c1c1c'
                e.currentTarget.style.color = '#fff'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#141414'
                e.currentTarget.style.color = '#cfcfcf'
              }}
            >
              <Shuffle size={13} strokeWidth={2.4} style={{ color: '#A8F0D8' }} />
              Aleatorio
            </button>

            {/* Borrar */}
            <button
              onClick={() => {
                setDeleteModalOpen(true)
                setDeleteState('idle')
                setDeleteMessage(null)
              }}
              className="grid h-[34px] w-[34px] place-items-center rounded-[10px] transition-all duration-150"
              style={{ background: '#141414', color: '#cfcfcf', border: '1px solid rgba(255,255,255,0.08)' }}
              title="Borrar pronósticos"
              aria-label="Borrar pronósticos"
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#FF8585'
                e.currentTarget.style.borderColor = 'rgba(255,90,90,0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#cfcfcf'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
              }}
            >
              <Trash2 size={14} strokeWidth={2.4} />
            </button>
          </div>
        )}
      </div>

      {/* Inline confirm bar — grupos random */}
      {isAdmin && fakeState !== 'idle' && activeTab === 'grupos' && (
        <div
          className="mb-5 flex flex-wrap items-center justify-between gap-3 px-5 py-4 rounded-[16px] text-[13px]"
          style={{ background: '#101010', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <p className="text-muted">
            {fakeState === 'confirm'
              ? '¿Cargás pronósticos aleatorios para todos los partidos de grupos?'
              : fakeState === 'saving'
              ? 'Cargando...'
              : fakeState === 'saved'
              ? 'Guardado. Ya podés ir a Eliminatorias.'
              : fakeError
              ? `Error: ${fakeError}`
              : ''}
          </p>
          {fakeState === 'confirm' && (
            <div className="flex gap-2">
              <button
                onClick={handleRandomGroupPredictions}
                className="px-4 py-2 rounded-full text-[12px] font-extrabold uppercase"
                style={{ background: '#FF6B00', color: '#0A0A0A' }}
              >
                Confirmar
              </button>
              <button
                onClick={() => setFakeState('idle')}
                className="px-4 py-2 rounded-full text-[12px] font-extrabold uppercase text-muted"
                style={{ background: '#181818', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                Cancelar
              </button>
            </div>
          )}
          {(fakeState === 'saved' || fakeState === 'error') && (
            <button
              onClick={() => setFakeState('idle')}
              className="text-[11px] font-bold text-muted"
            >
              Cerrar ×
            </button>
          )}
        </div>
      )}

      {deleteModalOpen && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto"
          style={{ background: 'rgba(0,0,0,0.72)' }}
          role="dialog"
          aria-modal="true"
          aria-label="Borrar pronósticos"
        >
          <div className="flex min-h-full items-start min-[540px]:items-center justify-center px-4 py-8">
          <div
            className="w-full max-w-[560px] overflow-hidden"
            style={{ background: '#101010', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, boxShadow: '0 24px 80px rgba(0,0,0,0.45)' }}
          >
            <div className="flex items-start justify-between gap-4 px-6 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div>
                <p className="text-[11px] font-extrabold tracking-[0.18em] uppercase" style={{ color: '#FF6B6B' }}>
                  Herramienta admin
                </p>
                <h2 className="mt-1 text-[22px] font-extrabold text-white">Borrar pronósticos</h2>
                <p className="mt-1 text-[13px] text-muted">
                  Solo se borran tus pronósticos en partidos abiertos. No toca resultados, ranking ni otros usuarios.
                </p>
                <p className="mt-2 text-[12px] font-bold" style={{ color: '#FFB15C' }}>
                  Las fases se borran en cascada: al borrar una ronda tambien se borran las rondas que dependen de ella.
                </p>
              </div>
              <button
                onClick={closeDeleteModal}
                disabled={deleteState === 'deleting'}
                className="grid h-9 w-9 place-items-center rounded-full text-[18px] font-bold disabled:opacity-40"
                style={{ background: '#181818', color: '#8A8A8A', border: '1px solid rgba(255,255,255,0.08)' }}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <div className="grid gap-2 px-6 py-5 sm:grid-cols-2">
              {DELETE_OPTIONS.map((option) => {
                const checked = deleteSelections.has('all') || deleteSelections.has(option.key)
                return (
                  <label
                    key={option.key}
                    className="flex cursor-pointer items-center gap-3 rounded-[12px] px-3 py-3 text-[13px] font-bold transition-all duration-150"
                    style={{
                      background: checked ? 'rgba(255,107,0,0.14)' : '#151515',
                      color: checked ? '#fff' : '#cfcfcf',
                      border: checked ? '1px solid rgba(255,107,0,0.45)' : '1px solid rgba(255,255,255,0.07)',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleDeleteSelection(option.key)}
                      className="h-4 w-4 accent-[#FF6B00]"
                    />
                    <span>{option.label}</span>
                  </label>
                )
              })}
            </div>

            {deleteMessage && (
              <div className="mx-6 mb-4 rounded-[12px] px-4 py-3 text-[13px] font-bold"
                style={{
                  background: deleteState === 'error' ? 'rgba(255,59,59,0.12)' : deleteState === 'success' ? 'rgba(168,240,216,0.1)' : 'rgba(255,177,92,0.1)',
                  color: deleteState === 'error' ? '#FF6B6B' : deleteState === 'success' ? '#A8F0D8' : '#FFB15C',
                  border: deleteState === 'error' ? '1px solid rgba(255,59,59,0.25)' : '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {deleteMessage}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2 px-6 py-5" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <button
                onClick={closeDeleteModal}
                disabled={deleteState === 'deleting'}
                className="px-4 py-2 rounded-full text-[12px] font-extrabold uppercase text-muted disabled:opacity-40"
                style={{ background: '#181818', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                Cerrar
              </button>
              <button
                onClick={handleDeleteSelectedPredictions}
                disabled={deleteState === 'deleting'}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-extrabold uppercase disabled:opacity-40"
                style={{ background: deleteState === 'confirm' ? '#FF3B3B' : 'rgba(255,59,59,0.16)', color: deleteState === 'confirm' ? '#fff' : '#FF6B6B', border: '1px solid rgba(255,59,59,0.25)' }}
              >
                <Trash2 size={15} strokeWidth={2.5} />
                {deleteState === 'deleting'
                  ? 'Borrando...'
                  : deleteState === 'confirm'
                  ? 'Confirmar borrado'
                  : 'Borrar selección'}
              </button>
            </div>
          </div>
          </div>
        </div>
      )}

      {/* SpecialsBanner — hidden when already on especiales tab */}
      {activeTab !== 'especiales' && (
        <SpecialsBanner onClickCargar={() => setActiveTab('especiales')} />
      )}

      {/* All tabs kept mounted to preserve state; only one visible at a time */}
      <div style={{ display: activeTab === 'grupos' ? undefined : 'none' }}>
        <GroupBatchEditor
          grouped={groupedByGroup}
          predMap={predMap}
          localGroupPreds={localGroupPreds}
          onGroupPredChange={handleGroupPredChange}
          onMatchSaveStateChange={handleGroupSaveStateChange}
          tiebreakers={tiebreakers}
          onTiebreaker={handleTiebreaker}
        />

      </div>
      <div style={{ display: activeTab === 'eliminatoria' ? undefined : 'none' }}>
        <BracketView
          groupMatches={groupMatches}
          knockoutMatches={knockoutMatches}
          predMap={effectivePredMap}
          initialTiebreakerMap={tiebreakerMap}
          isAdmin={isAdmin}
          groupTiebreakerMap={tiebreakers}
          readOnly={false}
          clearSignal={bracketClearSignal}
          openRandomModal={bracketModalSignal}
        />
      </div>
      <div style={{ display: activeTab === 'especiales' ? undefined : 'none' }}>
        <SpecialsTab />
      </div>
    </div>
  )
}

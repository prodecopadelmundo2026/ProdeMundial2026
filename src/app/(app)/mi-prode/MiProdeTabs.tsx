'use client'

import { useState, useMemo, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Trash2, Shuffle } from 'lucide-react'
import type { Match } from '@/types'
import { GroupBatchEditor } from './GroupBatchEditor'
import { BracketView } from './BracketView'
import { SpecialsTab } from './SpecialsTab'
import { TournamentBracket } from '@/components/TournamentBracket'
import { SpecialsBanner } from './SpecialsBanner'
import { deletePredictionsByStages, generateRandomGroupPredictions } from '@/app/(app)/fixture/actions'
import { parseScoreInput } from '@/lib/score-input'
import { deleteSpecialBets, deleteVirtualKnockoutPredictionsByStages, savePredictionTiebreakers, saveFullProdeSafe, type SpecialBetsValues } from './actions'
import { buildProjectedKnockoutMatches, computeBestThirdsTable, isVirtualKnockoutMatch } from '@/lib/bracket'
import { computeFifaBestThirds } from '@/lib/fifa-standings'
import { getOfficialRoundOf32State, buildFinishedGroupScoreMap } from '@/lib/tournament-state'
import { buildRoundOf32BonusLedger, buildRoundOf32CrossingAudit, summarizeKnockoutBonus } from '@/lib/knockout-bonus'
import { BestThirdsComparison, type BestThirdRow } from '@/components/BestThirdsComparison'

type PredMap = Record<string, { home_score: number; away_score: number }>
type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

type TabId = 'grupos' | 'eliminatoria' | 'llave' | 'especiales'
type DeleteOption = 'groups' | 'knockout' | 'round_of_32' | 'round_of_16' | 'quarter' | 'semi' | 'final' | 'third_place' | 'specials' | 'all'
type DeleteState = 'idle' | 'confirm' | 'deleting' | 'success' | 'error'

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

function onlyGroupTiebreakers(map: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(map).filter(([key]) => key.startsWith('Grupo ') || key.startsWith('3rd-'))
  )
}

interface Props {
  groupMatches: Match[]
  knockoutMatches: Match[]
  predMap: PredMap
  tiebreakerMap: Record<string, string>
  isAdmin: boolean
  prodeLocked: boolean
  initialSpecialBets: SpecialBetsValues
  initialSpecialBetsExists: boolean
}

export function MiProdeTabs({
  groupMatches,
  knockoutMatches,
  predMap,
  tiebreakerMap,
  isAdmin,
  prodeLocked,
  initialSpecialBets,
  initialSpecialBetsExists,
}: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabId>(() =>
    getOfficialRoundOf32State([...groupMatches, ...knockoutMatches]).officialBracketReady ? 'llave' : 'grupos'
  )
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
  const [globalSaveState, setGlobalSaveState] = useState<SaveState>('idle')
  const [globalSaveError, setGlobalSaveError] = useState<string | null>(null)
  const [globalSaveNotice, setGlobalSaveNotice] = useState<string | null>(null)
  const [knockoutHasUnsavedChanges, setKnockoutHasUnsavedChanges] = useState(false)
  const [bracketModalSignal, setBracketModalSignal] = useState(0)
  const [tiebreakers, setTiebreakers] = useState<Record<string, string>>(() => onlyGroupTiebreakers(tiebreakerMap))
  const [localKnockoutPreds, setLocalKnockoutPreds] = useState<Record<string, { home: string; away: string }>>({})
  const [localKnockoutTiebreakers, setLocalKnockoutTiebreakers] = useState<Record<string, string>>({})
  const [dirtyKnockoutMatchIds, setDirtyKnockoutMatchIds] = useState<Set<string>>(() => new Set())
  const [groupSaveStates, setGroupSaveStates] = useState<Record<string, SaveState>>(() => {
    const init: Record<string, SaveState> = {}
    for (const m of groupMatches) {
      if (predMap[m.id]) init[m.id] = 'saved'
    }
    return init
  })
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (!knockoutHasUnsavedChanges) return
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [knockoutHasUnsavedChanges])

  const groupedByGroup: Record<string, Match[]> = {}
  for (const m of groupMatches) {
    const key = m.group ? `Grupo ${m.group}` : 'Grupo sin asignar'
    if (!groupedByGroup[key]) groupedByGroup[key] = []
    groupedByGroup[key].push(m)
  }

  const projectedKnockoutMatches = useMemo(
    () => buildProjectedKnockoutMatches(knockoutMatches),
    [knockoutMatches],
  )

  useEffect(() => {
    console.info('[mi-prode-tabs] props', {
      groupMatchesCount: groupMatches.length,
      knockoutMatchesCount: knockoutMatches.length,
      groupedKeys: Object.keys(groupedByGroup),
      firstGroupMatch: groupMatches[0]
        ? {
            id: groupMatches[0].id,
            home_team: groupMatches[0].home_team,
            away_team: groupMatches[0].away_team,
            scheduled_at: groupMatches[0].scheduled_at,
            stage: groupMatches[0].stage,
            group: groupMatches[0].group,
            status: groupMatches[0].status,
          }
        : null,
      isAdmin,
    })
  }, [groupMatches, knockoutMatches, isAdmin])

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

  useEffect(() => {
    setTiebreakers((prev) => ({ ...prev, ...onlyGroupTiebreakers(tiebreakerMap) }))
    setLocalKnockoutPreds((prev) => {
      const next = { ...prev }
      for (const match of projectedKnockoutMatches) {
        if (dirtyKnockoutMatchIds.has(match.id)) continue
        if (match.id in next) continue
        const pred = predMap[match.id]
        if (pred) next[match.id] = { home: String(pred.home_score), away: String(pred.away_score) }
        else delete next[match.id]
      }
      return next
    })
    setLocalKnockoutTiebreakers((prev) => {
      const next = { ...prev }
      for (const match of projectedKnockoutMatches) {
        if (dirtyKnockoutMatchIds.has(match.id)) continue
        if (predMap[match.id] && tiebreakerMap[match.id]) next[match.id] = tiebreakerMap[match.id]
        else delete next[match.id]
      }
      return next
    })
  }, [projectedKnockoutMatches, predMap, tiebreakerMap, dirtyKnockoutMatchIds])

  useEffect(() => {
    setLocalGroupPreds((prev) => {
      const next = { ...prev }
      for (const match of groupMatches) {
        if (match.id in next) continue
        const pred = predMap[match.id]
        if (pred) next[match.id] = { home: String(pred.home_score), away: String(pred.away_score) }
      }
      return next
    })
    setGroupSaveStates((prev) => {
      const next = { ...prev }
      for (const match of groupMatches) {
        if (predMap[match.id]) next[match.id] = 'saved'
      }
      return next
    })
  }, [groupMatches, predMap])

  useEffect(() => {
    try {
      localStorage.removeItem('prode_group_preds')
      localStorage.removeItem('prode_group_tiebreakers')
      localStorage.removeItem('prode_knockout_preds')
      localStorage.removeItem('prode_knockout_tiebreakers')
    } catch {}
  }, [])

  function handleTiebreaker(key: string, team: string | null) {
    if (prodeLocked) return
    setTiebreakers((prev) => {
      if (!team) {
        const { [key]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [key]: team }
    })
    startTransition(async () => {
      try {
        await savePredictionTiebreakers([{ key, team }])
      } catch (error) {
        console.error('Error al guardar desempate', error)
      }
    })
  }

  function handleGroupPredChange(matchId: string, home: string, away: string) {
    if (prodeLocked && predMap[matchId]) return
    setLocalGroupPreds((prev) => ({ ...prev, [matchId]: { home, away } }))
    setGlobalSaveState('dirty')
    setGlobalSaveError(null)
    setGlobalSaveNotice(null)
  }

  function handleGroupSaveStateChange(matchId: string, state: SaveState) {
    setGroupSaveStates((prev) => ({ ...prev, [matchId]: state }))
  }

  function handleSaveFullProde() {
    const partialLabels: string[] = []
    const realPredictions: Array<{ matchId: string; homeScore: number; awayScore: number; tiebreakerTeam?: string | null }> = []
    const virtualPredictions: Array<{ matchId: string; homeScore: number; awayScore: number; tiebreakerTeam?: string | null }> = []
    const deleteRealMatchIds: string[] = []
    const deleteVirtualMatchIds: string[] = []

    function collectMatch(match: Match, input: { home: string; away: string } | undefined, label: string) {
      const rawHome = input?.home ?? ''
      const rawAway = input?.away ?? ''
      const homeBlank = rawHome === ''
      const awayBlank = rawAway === ''
      const hadSavedPrediction = Boolean(predMap[match.id])
      const isVirtual = isVirtualKnockoutMatch(match)
      const isOpenForPrediction = match.status === 'upcoming' && new Date() < new Date(match.scheduled_at)

      if (!isOpenForPrediction) return

      if (homeBlank && awayBlank) {
        if (hadSavedPrediction) {
          if (isVirtual) deleteVirtualMatchIds.push(match.id)
          else deleteRealMatchIds.push(match.id)
        }
        return
      }

      const homeScore = parseScoreInput(rawHome)
      const awayScore = parseScoreInput(rawAway)
      if (homeScore == null || awayScore == null) {
        partialLabels.push(label)
        return
      }

      const tiebreakerTeam = isVirtual && !hadSavedPrediction
        ? (localKnockoutTiebreakers[match.id] ?? null)
        : (localKnockoutTiebreakers[match.id] ?? tiebreakerMap[match.id] ?? null)
      const prediction = {
        matchId: match.id,
        homeScore,
        awayScore,
        tiebreakerTeam,
      }
      if (isVirtual && homeScore === awayScore && !prediction.tiebreakerTeam) {
        partialLabels.push(`${label} (desempate)`)
        return
      }
      if (isVirtual) virtualPredictions.push(prediction)
      else realPredictions.push(prediction)
    }

    for (const match of groupMatches) {
      collectMatch(match, localGroupPreds[match.id], `${match.home_team} vs ${match.away_team}`)
    }
    for (const match of projectedKnockoutMatches) {
      collectMatch(match, localKnockoutPreds[match.id], `${match.home_team} vs ${match.away_team}`)
    }

    if (partialLabels.length) {
      setGlobalSaveState('error')
      setGlobalSaveError(`Hay ${partialLabels.length} marcador(es) parcial(es). Completá ambos goles o borrá ambos antes de guardar.`)
      return
    }

    if (!realPredictions.length && !virtualPredictions.length && !deleteRealMatchIds.length && !deleteVirtualMatchIds.length && !Object.keys(tiebreakers).length && !Object.keys(localKnockoutTiebreakers).length) {
      setGlobalSaveState('error')
      setGlobalSaveError('No hay cambios completos para guardar.')
      return
    }

    if (virtualPredictions.length) {
      console.info('[mi-prode.submit.virtual-payload]', virtualPredictions.map((prediction) => ({
        virtual_match_id: prediction.matchId,
        home_score: prediction.homeScore,
        away_score: prediction.awayScore,
        tiebreaker_team: prediction.tiebreakerTeam ?? null,
      })))
    }

    setGlobalSaveState('saving')
    setGlobalSaveError(null)
    startTransition(async () => {
      try {
        const result = await saveFullProdeSafe({
          realPredictions,
          virtualPredictions,
          tiebreakers: Object.entries({ ...tiebreakers, ...localKnockoutTiebreakers }).map(([key, team]) => ({ key, team })),
          deleteRealMatchIds,
          deleteVirtualMatchIds,
        })
        if (!result.ok) throw new Error(result.message)
        setGroupSaveStates((prev) => {
          const next = { ...prev }
          for (const prediction of realPredictions) next[prediction.matchId] = 'saved'
          return next
        })
        setGlobalSaveState('saved')
        setDirtyKnockoutMatchIds(new Set())
        setGlobalSaveNotice(
          result.result.deletedVirtual > 0
            ? 'Completaste una llave que puede modificar cruces posteriores. Revisá las siguientes rondas y completá los partidos pendientes.'
            : null
        )
        setKnockoutHasUnsavedChanges(false)
        router.refresh()
      } catch (error) {
        setGlobalSaveState('error')
        setGlobalSaveError(formatClientError(error) || 'No se pudo guardar')
      }
    })
  }

  function handleKnockoutPredChange(matchId: string, home: string, away: string) {
    if (prodeLocked && predMap[matchId]) return
    setLocalKnockoutPreds((prev) => ({ ...prev, [matchId]: { home, away } }))
    setDirtyKnockoutMatchIds((prev) => new Set(prev).add(matchId))
    setGlobalSaveState('dirty')
    setKnockoutHasUnsavedChanges(true)
    setGlobalSaveError(null)
    setGlobalSaveNotice(null)
  }

  function handleKnockoutTiebreakerChange(matchId: string, team: string | null) {
    if (prodeLocked) {
      const hasSavedPrediction = Boolean(predMap[matchId])
      const hasSavedTiebreaker = hasSavedPrediction && Boolean(tiebreakerMap[matchId])
      if (hasSavedTiebreaker || (hasSavedPrediction && !team)) return
    }
    setLocalKnockoutTiebreakers((prev) => {
      if (!team) {
        const { [matchId]: _, ...rest } = prev
        return rest
      }
      return { ...prev, [matchId]: team }
    })
    setDirtyKnockoutMatchIds((prev) => new Set(prev).add(matchId))
    setGlobalSaveState('dirty')
    setKnockoutHasUnsavedChanges(true)
    setGlobalSaveError(null)
    setGlobalSaveNotice(null)
  }

  function handleTabChange(tab: TabId) {
    if (tab === activeTab) return
    if (knockoutHasUnsavedChanges) {
      const shouldLeave = window.confirm('Tenes cambios de eliminatorias sin guardar. Si cambias de seccion, seguis en la pagina pero acordate de guardar antes de salir o refrescar. ¿Continuar?')
      if (!shouldLeave) return
    }
    setActiveTab(tab)
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
    for (const match of projectedKnockoutMatches) {
      if (clearedStages.has(match.stage)) delete merged[match.id]
    }
    for (const [matchId, { home, away }] of Object.entries(localGroupPreds)) {
      if (home === '' || away === '') {
        delete merged[matchId]
        continue
      }
      const h = parseScoreInput(home)
      const a = parseScoreInput(away)
      if (h != null && a != null) {
        merged[matchId] = { home_score: h, away_score: a }
      }
    }
    for (const [matchId, { home, away }] of Object.entries(localKnockoutPreds)) {
      const match = projectedKnockoutMatches.find((m) => m.id === matchId)
      if (match && clearedStages.has(match.stage)) continue
      if (home === '' || away === '') {
        delete merged[matchId]
        continue
      }
      const h = parseScoreInput(home)
      const a = parseScoreInput(away)
      if (h != null && a != null) {
        merged[matchId] = { home_score: h, away_score: a }
      }
    }
    return merged
  }, [predMap, localGroupPreds, localKnockoutPreds, bracketClearSignal, groupMatches, projectedKnockoutMatches])

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

  const saveOverview = (() => {
    if (globalSaveState === 'error' || groupStatus.hasError) {
      return {
        label: 'Error al guardar',
        detail: globalSaveError ?? 'Revisá los datos o la conexión y volvé a intentar.',
        color: '#FF6B6B',
        bg: 'rgba(255,59,59,0.1)',
        border: 'rgba(255,59,59,0.24)',
      }
    }
    if (globalSaveState === 'saving' || groupStatus.hasSaving) {
      return {
        label: 'Guardando...',
        detail: 'Estamos registrando tus cambios.',
        color: '#FFB15C',
        bg: 'rgba(255,177,92,0.1)',
        border: 'rgba(255,177,92,0.22)',
      }
    }
    if (globalSaveState === 'dirty' || groupStatus.hasDirty) {
      return {
        label: 'Cambios pendientes',
        detail: 'Los grupos se guardan automaticamente. Usá Guardar Mi Prode para confirmar eliminatorias, desempates y cambios generales.',
        color: '#FFB15C',
        bg: 'rgba(255,177,92,0.1)',
        border: 'rgba(255,177,92,0.22)',
      }
    }
    if (globalSaveState === 'saved' || groupStatus.allReady) {
      return {
        label: 'Guardado',
        detail: globalSaveNotice ?? 'Tus pronosticos cargados quedaron registrados.',
        color: '#A8F0D8',
        bg: 'rgba(168,240,216,0.09)',
        border: 'rgba(168,240,216,0.2)',
      }
    }
    return {
      label: groupStatusLabel,
      detail: 'Completá tus pronosticos y guardá los cambios hasta 24 horas antes del primer partido del Mundial.',
      color: groupStatusColor,
      bg: 'rgba(255,255,255,0.04)',
      border: 'rgba(255,255,255,0.08)',
    }
  })()

  const effectiveKnockoutTiebreakers = useMemo(
    () => ({
      ...Object.fromEntries(
        Object.entries(tiebreakerMap).filter(([matchId]) => Boolean(predMap[matchId]))
      ),
      ...localKnockoutTiebreakers,
    }),
    [tiebreakerMap, localKnockoutTiebreakers, predMap],
  )
  const roundOf32State = useMemo(
    () => getOfficialRoundOf32State([...groupMatches, ...knockoutMatches]),
    [groupMatches, knockoutMatches]
  )
  const trajectoryLedger = useMemo(
    () => buildRoundOf32BonusLedger({
      userId: '',
      matches: [...groupMatches, ...knockoutMatches],
      predictionMap: effectivePredMap,
      historicalTiebreakers: tiebreakers,
    }),
    [effectivePredMap, groupMatches, knockoutMatches, tiebreakers]
  )
  const roundOf32Bonus = useMemo(
    () => summarizeKnockoutBonus(trajectoryLedger.filter((item) => item.round === 'round_of_32')),
    [trajectoryLedger]
  )
  const roundOf32ExactCrossings = useMemo(
    () => new Set(buildRoundOf32CrossingAudit({
      matches: [...groupMatches, ...knockoutMatches],
      predictionMap: effectivePredMap,
      historicalTiebreakers: tiebreakers,
    }).filter((crossing) => crossing.correct).map((crossing) => crossing.pNum)),
    [effectivePredMap, groupMatches, knockoutMatches, tiebreakers]
  )
  const predictedBestThirds = useMemo<BestThirdRow[]>(
    () =>
      computeBestThirdsTable(groupMatches, effectivePredMap, tiebreakers).map((team) => ({
        name: team.name,
        group: team.group,
        pts: team.pts,
        gd: team.gd,
        gf: team.gf,
        qualified: team.qualified,
      })),
    [groupMatches, effectivePredMap, tiebreakers]
  )
  const officialBestThirds = useMemo<BestThirdRow[] | null>(() => {
    if (!roundOf32State.officialBracketReady) return null
    const scoreMap = buildFinishedGroupScoreMap(groupMatches)
    return computeFifaBestThirds(groupMatches, scoreMap).standings.map((team) => ({
      name: team.name,
      group: team.group,
      pts: team.pts,
      gd: team.gd,
      gf: team.gf,
      qualified: team.qualified,
      officialOrderOverride: team.officialOrderOverride,
    }))
  }, [groupMatches, roundOf32State.officialBracketReady])

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
    if (prodeLocked) {
      setDeleteState('error')
      setDeleteMessage('La carga del Prode ya cerro. Podes consultar tus pronosticos, pero ya no editarlos.')
      return
    }
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
        const deletedVirtualCount = scopes.deleteKnockoutLocally
          ? await deleteVirtualKnockoutPredictionsByStages(scopes.stages)
          : 0
        if (scopes.deleteGroupsLocally) {
          try {
            localStorage.removeItem('prode_group_preds')
            localStorage.removeItem('prode_group_tiebreakers')
          } catch {}
          await savePredictionTiebreakers(Object.keys(tiebreakers).map((key) => ({ key, team: null })))
          setLocalGroupPreds({})
          setTiebreakers({})
          setGroupSaveStates({})
        }
        if (scopes.deleteKnockoutLocally) {
          setLocalKnockoutPreds((prev) => {
            const next = { ...prev }
            for (const match of projectedKnockoutMatches) {
              if (scopes.stages.includes(match.stage)) delete next[match.id]
            }
            return next
          })
          setLocalKnockoutTiebreakers((prev) => {
            const next = { ...prev }
            for (const match of projectedKnockoutMatches) {
              if (scopes.stages.includes(match.stage)) delete next[match.id]
            }
            return next
          })
          setBracketClearSignal((prev) => ({ version: prev.version + 1, stages: scopes.stages }))
        }
        if (scopes.deleteSpecials) {
          try {
            await deleteSpecialBets()
            localStorage.removeItem(SPECIALS_STORAGE_KEY)
            window.dispatchEvent(new Event('prode-specials-cleared'))
          } catch {}
        }
        setDeleteState('success')
        setDeleteMessage(
          scopes.deleteSpecials && !scopes.stages.length
            ? 'Apuestas especiales borradas correctamente.'
            : `Borrado correcto. Predicciones eliminadas: ${deletedCount + deletedVirtualCount}.`
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
    if (prodeLocked) return
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
      try { localStorage.removeItem('prode_group_preds') } catch {}
      setGlobalSaveState('saved')
      setFakeState('saved')
      router.refresh()
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
          {(['grupos', 'eliminatoria', 'llave', 'especiales'] as TabId[]).map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className="px-[14px] py-[7px] rounded-full font-extrabold text-[12px] transition-all duration-150 whitespace-nowrap active:scale-[0.98]"
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
              {tab === 'grupos' ? 'Grupos' : tab === 'eliminatoria' ? 'Eliminatorias' : tab === 'llave' ? 'Llave' : 'Especiales'}
            </button>
          ))}
        </div>

        {isAdmin && !prodeLocked && (
          <div className="flex items-center gap-2">
            {/* Admin-only test data generator — tab-aware */}
            <button
              onClick={() => {
                if (prodeLocked) return
                if (activeTab === 'grupos') {
                  setFakeState('confirm')
                } else if (activeTab === 'eliminatoria') {
                  setBracketModalSignal((v) => v + 1)
                } else if (activeTab === 'especiales') {
                  const ok = window.confirm('Esto puede reemplazar apuestas especiales existentes. ¿Continuar?')
                  if (!ok) return
                  try {
                    const next = randomSpecials()
                    window.dispatchEvent(new CustomEvent<SpecialBetsValues>('prode-specials-randomized', { detail: next }))
                  } catch {}
                }
              }}
              disabled={fakeState === 'saving' || prodeLocked}
              className="inline-flex items-center gap-[6px] px-3 py-[7px] rounded-[10px] font-bold text-[12px] transition-all duration-150 disabled:opacity-40"
              style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)', color: '#cfcfcf' }}
              title="Generar datos de prueba para la fase activa"
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
              Generar datos de prueba (Admin)
            </button>

            {/* Borrar */}
            <button
              onClick={() => {
                if (prodeLocked) return
                setDeleteModalOpen(true)
                setDeleteState('idle')
                setDeleteMessage(null)
              }}
              disabled={prodeLocked}
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
      {isAdmin && !prodeLocked && fakeState !== 'idle' && activeTab === 'grupos' && (
        <div
          className="mb-5 flex flex-wrap items-center justify-between gap-3 px-5 py-4 rounded-[16px] text-[13px]"
          style={{ background: '#101010', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <p className="text-muted">
            {fakeState === 'confirm'
              ? 'Esto puede reemplazar pronosticos existentes de grupos. ¿Continuar?'
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

      {!prodeLocked && deleteModalOpen && (
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
      {!prodeLocked && activeTab !== 'especiales' && (
        <SpecialsBanner
          onClickCargar={() => handleTabChange('especiales')}
          loaded={Boolean(initialSpecialBets.balon && initialSpecialBets.bota && initialSpecialBets.guante)}
        />
      )}

      {(!prodeLocked || globalSaveState !== 'idle' || knockoutHasUnsavedChanges) && (
        <div
          className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[16px] px-5 py-4"
          style={{ background: '#101010', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
            <p className="font-extrabold text-white text-[13px] leading-snug">{prodeLocked ? 'Completar pendientes' : 'Guardar Mi Prode'}</p>
              <span
                className="rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.12em]"
                style={{ background: saveOverview.bg, color: saveOverview.color, border: `1px solid ${saveOverview.border}` }}
              >
                {saveOverview.label}
              </span>
            </div>
            <p className="text-[12px] mt-0.5 text-muted">
              {prodeLocked ? 'El Prode esta cerrado: solo se guardan datos faltantes permitidos.' : saveOverview.detail}
            </p>
          </div>
          <button
            type="button"
            onClick={handleSaveFullProde}
            disabled={globalSaveState === 'saving'}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-extrabold uppercase active:scale-[0.98] disabled:opacity-40"
            style={{ background: '#FF6B00', color: '#0A0A0A' }}
          >
            {globalSaveState === 'saving' && <span className="action-spinner" aria-hidden="true" />}
            {globalSaveState === 'saving' ? 'Guardando...' : prodeLocked ? 'Guardar pendiente' : 'Guardar Mi Prode'}
          </button>
        </div>
      )}

      {/* All tabs kept mounted to preserve state; only one visible at a time */}
      <div className={activeTab === 'grupos' ? 'page-fade' : undefined} style={{ display: activeTab === 'grupos' ? undefined : 'none' }}>
        <GroupBatchEditor
          grouped={groupedByGroup}
          predMap={predMap}
          localGroupPreds={localGroupPreds}
          onGroupPredChange={handleGroupPredChange}
          onMatchSaveStateChange={handleGroupSaveStateChange}
          tiebreakers={tiebreakers}
          onTiebreaker={handleTiebreaker}
          readOnly={prodeLocked}
          allowLockedMissingPredictionCompletion={prodeLocked}
        />

      </div>
      <div className={activeTab === 'eliminatoria' ? 'page-fade' : undefined} style={{ display: activeTab === 'eliminatoria' ? undefined : 'none' }}>
        <BracketView
          groupMatches={groupMatches}
          knockoutMatches={projectedKnockoutMatches}
          predMap={effectivePredMap}
          savedPredMap={predMap}
          initialTiebreakerMap={effectiveKnockoutTiebreakers}
          isAdmin={isAdmin}
          groupTiebreakerMap={tiebreakers}
          readOnly={prodeLocked}
          allowLockedTiebreakerCompletion={prodeLocked}
          allowLockedMissingPredictionCompletion={prodeLocked}
          clearSignal={bracketClearSignal}
          openRandomModal={bracketModalSignal}
          onKnockoutPredChange={handleKnockoutPredChange}
          onKnockoutTiebreakerChange={handleKnockoutTiebreakerChange}
        />
      </div>
      <div className={activeTab === 'llave' ? 'page-fade' : undefined} style={{ display: activeTab === 'llave' ? undefined : 'none' }}>
        {!roundOf32State.officialBracketReady && (
          <div className="mb-6 rounded-[18px] bg-[#101010] p-4" style={{ border: '1px solid rgba(255,177,92,0.24)' }}>
            <p className="text-[14px] font-extrabold text-white">La llave oficial todavia no esta definida</p>
            <p className="mt-1 text-[13px] font-semibold leading-relaxed text-muted">
              {roundOf32State.pendingReason === 'GROUP_STAGE_INCOMPLETE'
                ? 'Faltan cargar resultados de la fase de grupos.'
                : roundOf32State.pendingReason === 'GROUP_TIE_PENDING'
                ? 'Hay grupos empatados que requieren resolucion manual.'
                : roundOf32State.pendingReason === 'BEST_THIRDS_PENDING'
                ? 'Falta resolver el orden de los mejores terceros.'
                : roundOf32State.pendingReason === 'ANNEX_C_PENDING'
                ? 'Falta asignar los mejores terceros a las llaves (Anexo C).'
                : 'Esta pendiente de resolucion.'}{' '}
              Cuando termine la fase de grupos y se resuelvan los desempates vas a ver aca tu llave oficial, los equipos que acertaste y los puntos de trayectoria sumados.
            </p>
          </div>
        )}
        {roundOf32State.officialBracketReady && roundOf32Bonus.awardedTeams.length > 0 && (
          <details className="mb-6 rounded-[18px] bg-[#101010] p-4" style={{ border: '1px solid rgba(168,240,216,0.24)' }}>
            <summary className="cursor-pointer list-none">
              <p className="text-[14px] font-extrabold text-white">Aciertos de trayectoria a 16avos</p>
              <p className="mt-1 text-[13px] font-semibold text-mint">
                Acertaste {roundOf32Bonus.awardedTeams.length} de 32 equipos · +{roundOf32Bonus.points} pts
              </p>
            </summary>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {roundOf32Bonus.awardedTeams.map((team) => (
                <span key={team} className="rounded-[10px] bg-mint/10 px-3 py-2 text-[12px] font-bold text-mint">✓ {team} +1</span>
              ))}
              {roundOf32Bonus.missedTeams.map((team) => (
                <span key={team} className="rounded-[10px] bg-white/5 px-3 py-2 text-[12px] font-bold text-muted">× {team} 0</span>
              ))}
            </div>
          </details>
        )}
        <p className="text-[11px] font-medium mb-4 px-1" style={{ color: '#3e3a35' }}>
          Tu bracket según tus pronósticos de grupos y eliminatorias. Vista de solo lectura.
        </p>
        <TournamentBracket
          mode="prode"
          groupMatches={groupMatches}
          knockoutMatches={projectedKnockoutMatches}
          predMap={effectivePredMap}
          tiebreakerMap={{ ...tiebreakers, ...effectiveKnockoutTiebreakers }}
          roundOf32AwardedTeams={new Set(roundOf32Bonus.awardedTeams)}
          trajectoryAwards={trajectoryLedger}
          roundOf32ExactCrossings={roundOf32ExactCrossings}
        />
        {roundOf32State.officialBracketReady && (
          <div className="mt-8 border-t border-white/10 pt-7">
            <div className="mb-4 px-1">
              <p className="text-[14px] font-extrabold text-white">Llave oficial</p>
              <p className="mt-1 text-[12px] font-semibold text-muted">
                Comparala visualmente con la llave pronosticada que dejaste cargada.
              </p>
            </div>
            <TournamentBracket
              mode="official"
              groupMatches={groupMatches}
              knockoutMatches={projectedKnockoutMatches}
              officialGroupResolution="complete"
            />
          </div>
        )}
        <div className="mt-8">
          <BestThirdsComparison predicted={predictedBestThirds} official={officialBestThirds} />
        </div>
      </div>
      <div className={activeTab === 'especiales' ? 'page-fade' : undefined} style={{ display: activeTab === 'especiales' ? undefined : 'none' }}>
        <SpecialsTab initialValues={initialSpecialBets} initialRowExists={initialSpecialBetsExists} readOnly={prodeLocked} />
      </div>

      {knockoutHasUnsavedChanges && (activeTab === 'eliminatoria' || activeTab === 'llave') && (
        <div
          className="fixed inset-x-0 z-[80] flex justify-center px-4 min-[720px]:hidden"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)', pointerEvents: 'none' }}
        >
          <button
            type="button"
            onClick={handleSaveFullProde}
            disabled={globalSaveState === 'saving'}
            className="inline-flex min-h-[48px] w-full max-w-[420px] items-center justify-center gap-2 rounded-full px-5 text-[13px] font-extrabold uppercase shadow-2xl transition-transform active:scale-[0.98] disabled:opacity-60"
            style={{
              background: '#FF6B00',
              color: '#0A0A0A',
              border: '1px solid rgba(255,255,255,0.16)',
              boxShadow: '0 18px 55px rgba(0,0,0,0.45)',
              pointerEvents: 'auto',
            }}
          >
            {globalSaveState === 'saving' ? (
              <span
                className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
                aria-hidden="true"
              />
            ) : (
              <Save size={16} strokeWidth={2.6} aria-hidden="true" />
            )}
            {globalSaveState === 'saving' ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      )}
    </div>
  )
}

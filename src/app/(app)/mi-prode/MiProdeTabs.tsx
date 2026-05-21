'use client'

import { useState, useMemo, useEffect, useTransition } from 'react'
import type { Match } from '@/types'
import { GroupBatchEditor } from './GroupBatchEditor'
import { BracketView } from './BracketView'
import { deleteGroupPredictions, generateRandomGroupPredictions } from '@/app/(app)/fixture/actions'
import { parseScoreInput } from '@/lib/score-input'

type PredMap = Record<string, { home_score: number; away_score: number }>
type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

type TabId = 'grupos' | 'eliminatoria'

const LOCAL_STORAGE_KEY = 'prode_group_preds'
const TIEBREAKERS_STORAGE_KEY = 'prode_group_tiebreakers'

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
  const [activeTab, setActiveTab] = useState<TabId>('grupos')
  const [bracketKey, setBracketKey] = useState(0)
  const [deleteState, setDeleteState] = useState<'idle' | 'confirm' | 'deleting'>('idle')
  const [fakeState, setFakeState] = useState<'idle' | 'confirm' | 'saving' | 'saved' | 'error'>('idle')
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
    for (const [matchId, { home, away }] of Object.entries(localGroupPreds)) {
      const h = parseScoreInput(home)
      const a = parseScoreInput(away)
      if (h != null && a != null) {
        merged[matchId] = { home_score: h, away_score: a }
      }
    }
    return merged
  }, [predMap, localGroupPreds])

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

  function handleDeleteGroups() {
    if (deleteState === 'idle') {
      setDeleteState('confirm')
      return
    }
    setDeleteState('deleting')
    startTransition(async () => {
      try {
        await deleteGroupPredictions()
        // Clear localStorage
        try { localStorage.removeItem(LOCAL_STORAGE_KEY) } catch {}
        // Reset local state
        setLocalGroupPreds({})
        // Force BracketView remount so localInputs starts fresh
        setBracketKey((k) => k + 1)
      } finally {
        setDeleteState('idle')
      }
    })
  }

  async function handleRandomGroupPredictions() {
    setFakeState('saving')
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
      console.error('Error al cargar pronóstico aleatorio de grupos', error)
      setFakeState('error')
    }
  }

  return (
    <div>
      {/* Header: h1 + phase tabs inline */}
      <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
        <h1
          className="font-display uppercase leading-[0.94] tracking-[-0.03em]"
          style={{ fontSize: 'clamp(28px, 4.5vw, 40px)' }}
        >
          Mi <em className="italic text-orange">Prode</em>
        </h1>

        {/* Pill tabs */}
        <div className="flex flex-col items-end gap-[5px]">
          <span className="font-mono text-[10px] font-bold tracking-[0.22em] uppercase" style={{ color: '#8A8A8A' }}>
            Fase
          </span>
          <div
            className="inline-flex items-center gap-1 p-[5px] rounded-full"
            style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.08)' }}
          >
          {(['grupos', 'eliminatoria'] as TabId[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-[18px] py-[10px] rounded-full font-extrabold text-[13px] transition-all duration-150"
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
              {tab === 'grupos' ? 'Grupos' : 'Eliminatorias'}
            </button>
          ))}
          </div>
        </div>
      </div>

      {/* Both tabs kept mounted to preserve state; only one visible at a time */}
      <div style={{ display: activeTab === 'grupos' ? undefined : 'none' }}>
        {isAdmin && (
          <div
            className="mb-5 flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm"
            style={{ background: '#101010', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px' }}
          >
            <div>
              <p className="font-extrabold text-white">Herramienta admin</p>
              <p className="text-muted">
                {fakeState === 'confirm'
                  ? 'Esto cargará pronósticos aleatorios para probar el flujo. ¿Querés continuar?'
                  : fakeState === 'saved'
                  ? 'Guardado correctamente. Ya podés probar el flujo de eliminatorias.'
                  : 'Carga pronósticos aleatorios para todos los partidos de grupos.'}
              </p>
            </div>
            {fakeState === 'confirm' ? (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleRandomGroupPredictions}
                  className="px-4 py-2 rounded-full text-[12px] font-extrabold uppercase disabled:opacity-40"
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
            ) : (
              <button
                onClick={() => setFakeState('confirm')}
                disabled={fakeState === 'saving'}
                className="px-4 py-2 rounded-full text-[12px] font-extrabold uppercase disabled:opacity-40"
                style={{ background: '#181818', color: fakeState === 'error' ? '#FF6B6B' : '#A8F0D8', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {fakeState === 'saving'
                  ? 'Cargando...'
                  : fakeState === 'saved'
                  ? 'Guardado correctamente'
                  : fakeState === 'error'
                  ? 'Error al cargar. Reintentá.'
                  : 'Cargar pronóstico aleatorio'}
              </button>
            )}
          </div>
        )}

        <GroupBatchEditor
          grouped={groupedByGroup}
          predMap={predMap}
          localGroupPreds={localGroupPreds}
          onGroupPredChange={handleGroupPredChange}
          onMatchSaveStateChange={handleGroupSaveStateChange}
          tiebreakers={tiebreakers}
          onTiebreaker={handleTiebreaker}
        />

        {/* Delete button — only once all groups are complete */}
        {allGroupsFilled && (
          <div className="flex items-center justify-end gap-3 mt-8 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            {deleteState === 'confirm' && (
              <span className="text-[13px] font-semibold" style={{ color: '#FF6B6B' }}>
                ¿Seguro? Se borran todos los pronósticos de grupos.
              </span>
            )}
            <button
              onClick={handleDeleteGroups}
              disabled={deleteState === 'deleting'}
              className="px-5 py-2.5 rounded-full text-[12px] font-extrabold tracking-[0.06em] uppercase transition-all duration-150 disabled:opacity-40"
              style={
                deleteState === 'confirm'
                  ? { background: '#FF3B3B', color: '#fff' }
                  : { background: 'rgba(255,59,59,0.12)', color: '#FF6B6B', border: '1px solid rgba(255,59,59,0.25)' }
              }
              onMouseLeave={() => {
                if (deleteState === 'confirm') setDeleteState('idle')
              }}
            >
              {deleteState === 'deleting'
                ? 'Borrando...'
                : deleteState === 'confirm'
                ? 'Confirmar borrado'
                : 'Borrar predicciones'}
            </button>
          </div>
        )}
      </div>
      <div style={{ display: activeTab === 'eliminatoria' ? undefined : 'none' }}>
        <BracketView
          key={bracketKey}
          groupMatches={groupMatches}
          knockoutMatches={knockoutMatches}
          predMap={effectivePredMap}
          initialTiebreakerMap={tiebreakerMap}
          isAdmin={isAdmin}
          groupTiebreakerMap={tiebreakers}
          readOnly={!allGroupsFilled}
        />
      </div>
    </div>
  )
}

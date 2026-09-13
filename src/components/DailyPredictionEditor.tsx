'use client'

import { useState } from 'react'
import { Save } from 'lucide-react'
import type { DailyEvent, Pick, Side } from '@/lib/daily-prode/model'
import { defaultPick } from '@/lib/daily-prode-demo'
import { SCORING, validPick } from '@/lib/daily-prode/scoring'
import styles from './DailyProdePreview.module.css'

export function DailyPredictionEditor({ event, initial, onSave }: { event: DailyEvent; initial?: Pick; onSave: (pick: Pick) => void }) {
  const [pick, setPick] = useState<Pick>(initial ?? defaultPick(event))
  const [message, setMessage] = useState('')
  return (
    <form className={styles.editor} onSubmit={e => {
      e.preventDefault()
      try { onSave(pick); setMessage('Pronostico guardado en esta sesion demo.') }
      catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo guardar.') }
    }}>
      {event.sport === 'football' && pick.sport === 'football' && <>
        <p className={styles.muted}>{event.format.knockout ? SCORING.knockout.label + '. Puntaje pendiente de definicion.' : 'Marcador a 90 minutos'}</p>
        <div className={styles.fields}>
          <label>Goles local<input type="number" min="0" max="99" required value={Number.isNaN(pick.scoreAt90.home) ? '' : pick.scoreAt90.home} onChange={e => setPick({ ...pick, scoreAt90: { ...pick.scoreAt90, home: e.target.valueAsNumber } })} /></label>
          <label>Goles visitante<input type="number" min="0" max="99" required value={Number.isNaN(pick.scoreAt90.away) ? '' : pick.scoreAt90.away} onChange={e => setPick({ ...pick, scoreAt90: { ...pick.scoreAt90, away: e.target.valueAsNumber } })} /></label>
        </div>
        {event.format.knockout && <label>Quien gana o clasifica<select value={pick.qualifier ?? ''} required onChange={e => setPick({ ...pick, qualifier: e.target.value as Side })}>
          <option value="" disabled>Elegir equipo</option>
          <option value="home">{event.participants.home.name}</option><option value="away">{event.participants.away.name}</option>
        </select></label>}
        {event.format.knockout && event.format.requiresResolution && <label>Definicion<select value={pick.resolution ?? ''} required onChange={e => setPick({ ...pick, resolution: e.target.value as 'regular' | 'extra-time' | 'penalties' })}>
          <option value="" disabled>Elegir definicion</option><option value="regular">Tiempo reglamentario</option><option value="extra-time">Alargue</option><option value="penalties">Penales</option>
        </select></label>}
      </>}
      {(pick.sport === 'tennis' || pick.sport === 'boxing') && <label>Ganador<select value={pick.winner} onChange={e => setPick({ ...pick, winner: e.target.value as Side })}>
        <option value="home">{event.participants.home.name}</option><option value="away">{event.participants.away.name}</option>
      </select></label>}
      {event.sport === 'tennis' && pick.sport === 'tennis' && <label>Resultado en sets (mejor de {event.format.bestOf})<select value={pick.loserSets} onChange={e => setPick({ ...pick, loserSets: Number(e.target.value) })}>
        {Array.from({ length: Math.ceil(event.format.bestOf / 2) }, (_, n) => <option key={n} value={n}>{Math.ceil(event.format.bestOf / 2)}-{n}</option>)}
      </select></label>}
      {event.sport === 'boxing' && pick.sport === 'boxing' && <>
        <label>Metodo<select value={pick.method} onChange={e => setPick(e.target.value === 'ko' ? { ...pick, method: 'ko', round: 1 } : { sport: 'boxing', winner: pick.winner, method: 'decision' })}>
          <option value="ko">KO/TKO</option><option value="decision">Decision / no KO</option>
        </select></label>
        {pick.method === 'ko' && <label>Round exacto<select value={pick.round} onChange={e => setPick({ ...pick, round: Number(e.target.value) })}>
          {Array.from({ length: event.format.rounds }, (_, n) => <option key={n} value={n + 1}>{n + 1}</option>)}
        </select></label>}
        <p className={styles.muted}>Puntaje de boxeo: propuesta inicial.</p>
      </>}
      <button type="submit" className={styles.primary} disabled={!validPick(event, pick)}><Save size={16} /> Guardar pronostico demo</button>
      <p role="status" className={styles.muted}>{message}</p>
    </form>
  )
}

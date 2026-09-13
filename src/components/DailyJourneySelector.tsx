'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { DAILY_TIMEZONE, addJourneyDays, eventJourneyDate, journeyDate, journeyIsLocked } from '@/lib/daily-prode/journey'
import type { DailyEvent } from '@/lib/daily-prode/model'

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

function dateAtNoon(value: string) { return new Date(`${value}T12:00:00.000Z`) }
function startOfMonth(value: Date) { return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1, 12)) }
function addMonths(value: Date, amount: number) { return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + amount, 1, 12)) }
function dateKey(value: Date) { return value.toISOString().slice(0, 10) }
function daysForMonth(month: Date) {
  const first = startOfMonth(month)
  const offset = (first.getUTCDay() + 6) % 7
  const firstVisible = new Date(first)
  firstVisible.setUTCDate(firstVisible.getUTCDate() - offset)
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(firstVisible)
    day.setUTCDate(day.getUTCDate() + index)
    return day
  })
}
function fullDate(value: string) { return new Intl.DateTimeFormat('es-AR', { timeZone: DAILY_TIMEZONE, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(dateAtNoon(value)) }
function monthLabel(value: Date) { return new Intl.DateTimeFormat('es-AR', { timeZone: DAILY_TIMEZONE, month: 'long', year: 'numeric' }).format(value) }

export function DailyJourneySelector({ value, onChange, events = [] }: { value: string; onChange: (value: string) => void; events?: DailyEvent[] }) {
  const root = useRef<HTMLElement>(null)
  const [open, setOpen] = useState(false)
  const [monthPickerOpen, setMonthPickerOpen] = useState(false)
  const [month, setMonth] = useState(() => startOfMonth(dateAtNoon(value)))
  const today = journeyDate()
  const eventDates = useMemo(() => new Set(events.map(eventJourneyDate)), [events])
  const lockedDates = useMemo(() => new Set(events.filter((event) => journeyIsLocked(events, eventJourneyDate(event))).map(eventJourneyDate)), [events])
  const visibleDays = useMemo(() => daysForMonth(month), [month])
  const months = useMemo(() => Array.from({ length: 25 }, (_, index) => addMonths(startOfMonth(dateAtNoon(today)), index - 12)), [today])
  const selectedHasEvents = eventDates.has(value)
  const selectedLocked = lockedDates.has(value)

  useEffect(() => {
    const closeFromOutside = (event: PointerEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) {
        setOpen(false)
        setMonthPickerOpen(false)
      }
    }
    const closeFromEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        setMonthPickerOpen(false)
      }
    }
    document.addEventListener('pointerdown', closeFromOutside)
    document.addEventListener('keydown', closeFromEscape)
    return () => {
      document.removeEventListener('pointerdown', closeFromOutside)
      document.removeEventListener('keydown', closeFromEscape)
    }
  }, [])

  const selectDate = (next: string, close = false) => {
    onChange(next)
    setMonth(startOfMonth(dateAtNoon(next)))
    if (close) {
      setOpen(false)
      setMonthPickerOpen(false)
    }
  }
  const onDayKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, current: string) => {
    const weekday = (dateAtNoon(current).getUTCDay() + 6) % 7
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -weekday, End: 6 - weekday }
    if (event.key in moves) {
      event.preventDefault()
      selectDate(addJourneyDays(current, moves[event.key]))
    }
    if (event.key === 'PageUp' || event.key === 'PageDown') {
      event.preventDefault()
      setMonth((currentMonth) => addMonths(currentMonth, event.key === 'PageUp' ? -1 : 1))
    }
  }

  return <section ref={root} className="relative grid min-w-0 gap-2" aria-label="Selector de jornada">
    <p className="font-mono text-[10px] font-extrabold uppercase tracking-[.1em] text-muted">Jornada</p>
    <div className="grid grid-cols-[40px_minmax(0,1fr)_40px] gap-2">
      <button type="button" onClick={() => selectDate(addJourneyDays(value, -1))} className="grid h-10 place-items-center rounded-md border border-white/15 bg-black/70 transition-colors hover:border-mint/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mint motion-reduce:transition-none" aria-label="Día anterior"><ChevronLeft size={17} /></button>
      <button type="button" onClick={() => setOpen((current) => !current)} aria-haspopup="dialog" aria-expanded={open} className="grid h-10 min-w-0 grid-cols-[18px_minmax(0,1fr)_16px] items-center gap-2 rounded-md border border-white/15 bg-black/70 px-3 text-left text-sm font-extrabold transition-colors hover:border-orange focus-visible:outline focus-visible:outline-2 focus-visible:outline-mint motion-reduce:transition-none" aria-label={`Elegir jornada, ${fullDate(value)}`}><CalendarDays className="text-orange" size={16} /><span className="min-w-0 truncate text-center">{fullDate(value)}</span><ChevronDown className={`transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} size={16} /></button>
      <button type="button" onClick={() => selectDate(addJourneyDays(value, 1))} className="grid h-10 place-items-center rounded-md border border-white/15 bg-black/70 transition-colors hover:border-mint/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mint motion-reduce:transition-none" aria-label="Día siguiente"><ChevronRight size={17} /></button>
    </div>
    <p className="text-[10px] font-bold text-muted">{value === today ? 'Hoy' : selectedLocked ? 'Jornada cerrada' : selectedHasEvents ? 'Eventos verificados' : 'Sin eventos verificados'}</p>
    {open && <div role="dialog" aria-modal="false" aria-label="Calendario de jornadas" className="absolute left-0 top-[76px] z-40 w-[min(100%,360px)] rounded-lg border border-white/15 bg-[#090909] p-3 shadow-2xl shadow-black/80 animate-in fade-in zoom-in-95 duration-150 motion-reduce:animate-none">
      <div className="relative mb-3 grid grid-cols-[34px_minmax(0,1fr)_34px] items-center gap-2">
        <button type="button" onClick={() => setMonth((current) => addMonths(current, -1))} className="grid h-8 place-items-center rounded-md border border-white/10 text-muted hover:border-mint hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-mint" aria-label="Mes anterior"><ChevronLeft size={16} /></button>
        <button type="button" onClick={() => setMonthPickerOpen((current) => !current)} aria-haspopup="listbox" aria-expanded={monthPickerOpen} className="inline-flex h-8 min-w-0 items-center justify-center gap-1 rounded-md px-2 font-mono text-[11px] font-extrabold uppercase tracking-[.08em] text-mint hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mint"><span className="truncate">{monthLabel(month)}</span><ChevronDown size={14} /></button>
        <button type="button" onClick={() => setMonth((current) => addMonths(current, 1))} className="grid h-8 place-items-center rounded-md border border-white/10 text-muted hover:border-mint hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-mint" aria-label="Mes siguiente"><ChevronRight size={16} /></button>
        {monthPickerOpen && <div role="listbox" aria-label="Elegir mes" className="absolute left-9 right-9 top-9 z-10 max-h-52 overflow-y-auto rounded-md border border-white/15 bg-[#141414] p-1 shadow-xl">{months.map((option) => <button key={option.toISOString()} type="button" role="option" aria-selected={option.getUTCFullYear() === month.getUTCFullYear() && option.getUTCMonth() === month.getUTCMonth()} onClick={() => { setMonth(option); setMonthPickerOpen(false) }} className="block w-full rounded px-2 py-2 text-left text-xs font-bold capitalize text-white hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none">{monthLabel(option)}</button>)}</div>}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center font-mono text-[10px] font-extrabold text-muted">{WEEKDAYS.map((day) => <span key={day} aria-hidden="true" className="grid h-8 place-items-center">{day}</span>)}</div>
      <div role="grid" aria-label={monthLabel(month)} className="grid grid-cols-7 gap-1">{visibleDays.map((day) => {
        const key = dateKey(day)
        const inMonth = day.getUTCMonth() === month.getUTCMonth()
        const selected = key === value
        const isToday = key === today
        const isFuture = key > today
        const hasEvents = eventDates.has(key)
        const isLocked = lockedDates.has(key)
        const status = isLocked ? 'jornada cerrada' : isFuture ? hasEvents ? 'jornada futura con eventos verificados' : 'fecha futura sin eventos verificados' : hasEvents ? 'con eventos verificados' : 'sin eventos verificados'
        return <button key={key} type="button" role="gridcell" aria-selected={selected} onKeyDown={(event) => onDayKeyDown(event, key)} onClick={() => selectDate(key, true)} className={`relative grid h-9 place-items-center rounded-md border text-xs font-extrabold transition-colors focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mint motion-reduce:transition-none ${selected ? 'border-orange bg-orange text-[#0a0a0a]' : isToday ? 'border-mint text-mint hover:bg-mint/10' : isFuture && inMonth ? 'border-transparent text-mint/80 hover:border-mint/40 hover:bg-mint/10' : inMonth ? 'border-transparent text-white hover:border-white/20 hover:bg-white/5' : 'border-transparent text-white/30 hover:text-white/70'}`} aria-label={`${fullDate(key)}, ${status}`}>{day.getUTCDate()}{hasEvents && <span aria-hidden="true" className={`absolute bottom-1 h-1 w-1 rounded-full ${selected ? 'bg-[#0a0a0a]' : isLocked ? 'bg-orange' : 'bg-mint'}`} />}</button>
      })}</div>
      <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3"><p className="text-[10px] font-semibold text-muted"><span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-mint" />Eventos <span className="ml-2 mr-1 inline-block h-1.5 w-1.5 rounded-full bg-orange" />Cerrada</p><button type="button" onClick={() => selectDate(today, true)} className="h-8 rounded-md border border-orange/60 px-3 text-xs font-extrabold text-orange transition-colors hover:bg-orange hover:text-[#0a0a0a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-mint">Hoy</button></div>
    </div>}
  </section>
}

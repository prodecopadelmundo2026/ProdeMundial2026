import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const temp = mkdtempSync(path.join(tmpdir(), 'daily-journey-'))
try {
  const compile = spawnSync(process.execPath, [path.join(root, 'node_modules/typescript/bin/tsc'), '--target', 'ES2020', '--module', 'commonjs', '--moduleResolution', 'node', '--skipLibCheck', '--outDir', temp, '--rootDir', path.join(root, 'src/lib/daily-prode'), path.join(root, 'src/lib/daily-prode/journey.ts')], { encoding: 'utf8' })
  if (compile.status !== 0) throw new Error(compile.stderr || compile.stdout)
  const { countdownText, countdownState, journeyDate, lockAtForJourney } = await import(pathToFileURL(path.join(temp, 'journey.js')).href)
  const now = new Date('2026-09-13T15:00:00.000Z')
  const event = { scheduledStart: '2026-09-13T15:05:00.000Z', status: 'upcoming' }
  const checks = [countdownText(event, now) === '00:05:00', countdownState(event, now) === 'future', countdownText({ ...event, scheduledStart: now.toISOString() }, now) === 'Comienza ahora', countdownText({ ...event, status: 'live' }, now) === 'En curso', countdownText(undefined, now) === 'Horario pendiente', countdownText({ ...event, status: 'rescheduled' }, now) === 'Reprogramado', journeyDate(new Date('2026-09-13T02:00:00.000Z')) === '2026-09-12', lockAtForJourney([{ ...event, journeyId: 'x', sport: 'football', status: 'upcoming' }], '2026-09-13') === '2026-09-13T15:00:00.000Z']
  if (checks.some((check) => !check)) throw new Error('Falló una regresión de jornada o contador.')
  console.log(`Daily journey: PASS (${checks.length}/8)`)
} finally { rmSync(temp, { recursive: true, force: true }) }

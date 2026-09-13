import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const json = process.argv.includes('--json')
const forcedFailure = process.argv.includes('--fail-synthetic')
const startedAt = Date.now()
let temporaryDirectory

function output(result) {
  if (json) {
    process.stdout.write(JSON.stringify(result) + '\n')
    return
  }
  if (result.status === 'passed') {
    console.log('Daily Prode provider contract: PASS')
    for (const group of result.groups) console.log('- ' + group.group + ': ' + group.passed + '/' + group.total + ' aprobados, ' + group.failed + ' fallidos')
    console.log('Total: ' + result.total + ' controles aprobados en ' + result.durationMs + ' ms.')
    return
  }
  console.error('Daily Prode provider contract: FAIL')
  console.error(result.error)
  console.error('Duracion: ' + result.durationMs + ' ms.')
}

try {
  temporaryDirectory = mkdtempSync(path.join(tmpdir(), 'daily-prode-contract-'))
  const compile = spawnSync(process.execPath, [
    path.join(root, 'node_modules/typescript/bin/tsc'), '--target', 'ES2020', '--module', 'commonjs', '--moduleResolution', 'node', '--esModuleInterop', '--skipLibCheck',
    '--pretty', 'false', '--outDir', temporaryDirectory, '--rootDir', path.join(root, 'src/lib/daily-prode'), '--noEmit', 'false',
    path.join(root, 'src/lib/daily-prode/providers/contract-tests/verify.ts'),
  ], { cwd: root, encoding: 'utf8' })
  if (compile.status !== 0) throw new Error((compile.stdout || '') + (compile.stderr || 'TypeScript no pudo compilar el verificador.'))
  const verifierModule = await import(pathToFileURL(path.join(temporaryDirectory, 'providers/contract-tests/verify.js')).href)
  const runContractVerifier = verifierModule.runContractVerifier ?? verifierModule.default?.runContractVerifier
  if (typeof runContractVerifier !== 'function') throw new Error('No se encontro runContractVerifier en el verificador compilado.')
  const summary = runContractVerifier()
  if (forcedFailure) throw new Error('Fallo sintetico solicitado: valida codigo de salida no cero.')
  output({ status: 'passed', durationMs: Date.now() - startedAt, ...summary })
} catch (error) {
  output({ status: 'failed', durationMs: Date.now() - startedAt, error: error instanceof Error ? error.message : String(error) })
  process.exitCode = 1
} finally {
  if (temporaryDirectory && path.basename(temporaryDirectory).startsWith('daily-prode-contract-')) rmSync(temporaryDirectory, { recursive: true, force: true })
}

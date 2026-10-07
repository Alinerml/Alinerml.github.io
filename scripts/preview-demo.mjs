import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const astro = fileURLToPath(new URL('../node_modules/astro/bin/astro.mjs', import.meta.url))
const env = { ...process.env, PUBLIC_WALINE_SERVER_URL: 'http://127.0.0.1:8360' }

// Keep the full local demo separate from the dist used for GitHub Pages.
function run(args) {
  const child = spawn(process.execPath, [astro, ...args], { cwd: root, env, stdio: 'inherit' })
  const interrupt = () => child.kill('SIGINT')
  process.on('SIGINT', interrupt)
  process.on('SIGTERM', interrupt)
  return new Promise((resolve, reject) => {
    child.on('error', reject)
    child.on('exit', code => {
      process.off('SIGINT', interrupt)
      process.off('SIGTERM', interrupt)
      code === 0 ? resolve() : reject(new Error(`Astro exited with code ${code}`))
    })
  })
}

try {
  await run(['build', '--outDir', '.local-preview'])
  await run(['preview', '--outDir', '.local-preview', '--host', '127.0.0.1', '--port', '4173'])
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}

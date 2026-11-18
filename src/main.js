import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import { registerWebMCP } from './lib/webmcp.js'
import { logError } from './lib/data.svelte.js'

window.addEventListener('error', (e) => logError(e.error || e.message))
window.addEventListener('unhandledrejection', (e) => logError(e.reason))

const target = document.getElementById('app')
target.querySelector('.boot')?.remove()
mount(App, { target })
registerWebMCP()

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL }).catch(() => {})
}

// Al volver a la app (estaba en segundo plano), si se ha publicado una versión nueva, se carga sola.
// Se compara el script principal de index.html con el que está en marcha. No se recarga si hay algo escrito o una hoja abierta.
if (import.meta.env.PROD) {
  const current = [...document.scripts].map((s) => s.src).find((s) => /\/assets\/index-[^/]+\.js$/.test(s))
  let checking = false
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible' || checking || !current || !navigator.onLine) return
    checking = true
    try {
      const html = await (await fetch(`${import.meta.env.BASE_URL}index.html`, { cache: 'no-store' })).text()
      const name = html.match(/assets\/index-[^"']+\.js/)?.[0]
      const busy = document.querySelector('dialog[open]') || (document.activeElement?.value ?? '').length
      if (name && !current.endsWith(name) && !busy) location.reload()
    } catch {
      /* sin red: se queda como está */
    }
    checking = false
  })
}

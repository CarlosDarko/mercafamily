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

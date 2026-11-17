<script>
  // Estado de la app: conexión, datos, actualización automática, avisos y errores
  import { RefreshCw } from '@lucide/svelte'
  import { app, syncNow, catalogInfo, recentErrors, pushStatus } from '../lib/data.svelte.js'
  import { fmtLong } from '../lib/format.js'

  const REPO = 'CarlosDarko/mercafamily'
  const built = typeof __BUILD__ !== 'undefined' ? new Date(__BUILD__) : null
  const rel = (t) => {
    if (!t) return 'nunca'
    const m = Math.round((Date.now() - t) / 60000)
    if (m < 1) return 'ahora mismo'
    if (m < 60) return `hace ${m} min`
    const h = Math.round(m / 60)
    return h < 48 ? `hace ${h} h` : `hace ${Math.round(h / 24)} días`
  }

  let action = $state(null)
  fetch(`https://api.github.com/repos/${REPO}/actions/runs?per_page=1&event=schedule`)
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => (action = d?.workflow_runs?.[0] || 'ninguna'))
    .catch(() => (action = 'sin-datos'))

  let push = $state('…')
  pushStatus()
    .then(({ sub, row }) => (push = app.kind !== 'supabase' ? 'Solo con Supabase' : sub && row ? 'Activados en este móvil' : 'Desactivados en este móvil'))
    .catch(() => (push = 'No se pudo comprobar'))

  let sw = $state('…')
  navigator.serviceWorker?.getRegistration?.(import.meta.env.BASE_URL).then((r) => (sw = r?.active ? 'Listo para abrir sin conexión' : 'Aún no instalado')).catch(() => (sw = 'No disponible'))

  let errors = $state(recentErrors())
  let syncing = $state(false)
  async function sync() {
    syncing = true
    await syncNow().catch(() => {})
    syncing = false
  }
  const cat = $derived(catalogInfo())
  // Re-evaluar 'hace X min' cada minuto
  let tick = $state(0)
  setInterval(() => tick++, 60000)
</script>

<section class="section" aria-labelledby="h-status">
  <h2 id="h-status">Estado de la app</h2>
  <div class="panel pad">
    <dl>
      <dt>Conexión</dt>
      <dd>
        {#if app.kind === 'local'}Solo en este móvil
        {:else if !app.online}<strong class="warn">Sin conexión</strong>
        {:else if app.live}En directo
        {:else}Conectada{/if}
        {#key tick}· sincronizado {rel(app.lastSync)}{/key}
      </dd>

      <dt>Cambios pendientes</dt>
      <dd>
        {app.pending ? `${app.pending} por enviar` : 'Ninguno'}
        <button class="btn mini" onclick={sync} disabled={syncing}><RefreshCw size={16} aria-hidden="true" /> {syncing ? 'Sincronizando…' : 'Sincronizar ahora'}</button>
      </dd>

      <dt>Catálogo de Mercadona</dt>
      <dd>{cat ? `${cat.count.toLocaleString('es-ES')} productos, almacén ${cat.wh}, del ${fmtLong(cat.updated)}` : 'Cargando…'}</dd>

      <dt>Actualización automática</dt>
      <dd>
        {#if action === null}Comprobando…
        {:else if action === 'ninguna'}Aún no se ha ejecutado la semanal (los lunes)
        {:else if action === 'sin-datos'}No se pudo comprobar
        {:else}
          {action.conclusion === 'success' ? 'Correcta' : action.conclusion ? 'Con fallos' : 'En marcha'} · {fmtLong(action.run_started_at.slice(0, 10))}
          {#if action.conclusion && action.conclusion !== 'success'}<a href={action.html_url} target="_blank" rel="noopener">ver qué pasó</a>{/if}
        {/if}
      </dd>

      <dt>Avisos</dt>
      <dd>{push}</dd>

      <dt>Sin cobertura</dt>
      <dd>{sw}</dd>

      <dt>Versión</dt>
      <dd class="num">{built ? built.toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' }) : 'desarrollo'}</dd>
    </dl>

    {#if errors.length}
      <details>
        <summary>Últimos errores ({errors.length})</summary>
        <ul>
          {#each [...errors].reverse() as e, i (i)}
            <li><span class="num">{new Date(e.at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</span> {e.msg}</li>
          {/each}
        </ul>
        <button class="btn mini" onclick={() => (localStorage.removeItem('mf:errors'), (errors = []))}>Borrar la lista</button>
      </details>
    {:else}
      <p class="hint">Sin errores recientes.</p>
    {/if}
  </div>
</section>

<style>
  .pad {
    padding: 16px;
    display: grid;
    gap: 12px;
  }
  dl {
    margin: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 2px;
  }
  dt {
    font-weight: 700;
    font-size: 0.9rem;
    color: var(--ink-2);
    margin-top: 10px;
  }
  dt:first-child {
    margin-top: 0;
  }
  dd {
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 10px;
  }
  .warn {
    color: var(--tomato);
  }
  .mini {
    min-height: 44px;
    padding: 0 14px;
    font-size: 0.9rem;
  }
  summary {
    min-height: 44px;
    display: flex;
    align-items: center;
    font-weight: 650;
    cursor: pointer;
  }
  ul {
    margin: 0 0 10px;
    padding-left: 18px;
    font-size: 0.9rem;
    display: grid;
    gap: 4px;
  }
</style>

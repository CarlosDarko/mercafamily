<script>
  import { Copy, Share2, X, Plus, Download, Upload } from '@lucide/svelte'
  import { app, setMe, updateHousehold, supabaseConfig, saveSupabaseConfig, signOut, exportBackup, importBackup, toast } from '../lib/data.svelte.js'
  import { eur, parseNum, fmtLong } from '../lib/format.js'

  const REPO = 'https://github.com/CarlosDarko/mercafamily'
  const cfg = supabaseConfig()

  let name = $state(app.me)
  let budget = $state(app.household?.weekly_budget != null ? String(app.household.weekly_budget).replace('.', ',') : '')
  let newPref = $state('')
  let sbUrl = $state('')
  let sbKey = $state('')
  let importError = $state('')
  let installEvt = $state(null)

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    installEvt = e
  })
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)

  function saveName() {
    if (name.trim()) setMe(name)
  }
  function saveBudget() {
    const v = budget.trim() ? parseNum(budget) : null
    if (budget.trim() && (v == null || v <= 0)) {
      toast('Escribe el presupuesto con números, por ejemplo 120')
      return
    }
    updateHousehold({ weekly_budget: v })
  }
  function addPref(e) {
    e.preventDefault()
    const v = newPref.trim()
    if (!v) return
    updateHousehold({ preferences: [...(app.household.preferences || []), v] })
    newPref = ''
  }
  function removePref(i) {
    const list = [...app.household.preferences]
    list.splice(i, 1)
    updateHousehold({ preferences: list })
  }
  async function copyCode() {
    await navigator.clipboard?.writeText(app.household.invite_code)
    toast('Código copiado')
  }
  function shareCode() {
    navigator.share?.({
      title: 'MercaFamily',
      text: `Únete a nuestra lista de la compra en MercaFamily con el código ${app.household.invite_code}`,
      url: location.origin + location.pathname
    })
  }
  function connect(e) {
    e.preventDefault()
    if (!/^https:\/\/.+\.supabase\.co\/?$/.test(sbUrl.trim())) {
      toast('La dirección tiene que ser como https://xxxx.supabase.co')
      return
    }
    if (sbKey.trim().length < 30) {
      toast('La clave pública parece incompleta')
      return
    }
    saveSupabaseConfig(sbUrl.replace(/\/$/, ''), sbKey)
  }
  async function onImport(e) {
    importError = ''
    const input = e.currentTarget
    const f = input.files?.[0]
    if (!f) return
    try {
      await importBackup(f)
      toast('Copia importada')
    } catch (err) {
      importError = err.message || 'No se ha podido leer el archivo'
    }
    input.value = ''
  }
</script>

<div class="page">
  <div class="page-head">
    <h1>Ajustes</h1>
  </div>

  <section class="section" aria-labelledby="h-fam">
    <h2 id="h-fam">Familia</h2>
    <div class="panel pad stack">
      <label class="field">
        <span>Tu nombre</span>
        <input class="input" bind:value={name} onblur={saveName} autocomplete="given-name" maxlength="30" />
        <span class="hint">Sale junto a lo que apuntas, para que los demás sepan quién lo ha pedido.</span>
      </label>
      {#if app.kind === 'supabase'}
        {#if app.members.length}
          <p><strong>En esta lista:</strong> {app.members.map((m) => m.display_name || 'Sin nombre').join(', ')}.</p>
        {/if}
        <div class="field">
          <span class="label">Código para unirse</span>
          <div class="row wrap">
            <span class="code num">{app.household.invite_code}</span>
            <button class="btn" onclick={copyCode}><Copy size={18} aria-hidden="true" /> Copiar</button>
            {#if navigator.share}<button class="btn" onclick={shareCode}><Share2 size={18} aria-hidden="true" /> Compartir</button>{/if}
          </div>
          <span class="hint">Quien abra la app en su móvil entra con su email y, después, este código.</span>
        </div>
      {/if}
    </div>
  </section>

  <section class="section" aria-labelledby="h-prefs">
    <h2 id="h-prefs">Preferencias</h2>
    <div class="panel pad stack">
      <p class="muted">Lo que escribáis aquí decide qué producto se elige al apuntar algo. Por ejemplo: 'leche semidesnatada sin lactosa', 'pan integral', 'evitar aceite de palma'.</p>
      {#if app.household.preferences?.length}
        <ul class="prefs" role="list">
          {#each app.household.preferences as p, i (p + i)}
            <li>
              <span>{p}</span>
              <button class="icon-btn" onclick={() => removePref(i)} aria-label={`Quitar la preferencia ${p}`}><X size={20} aria-hidden="true" /></button>
            </li>
          {/each}
        </ul>
      {/if}
      <form class="row" onsubmit={addPref}>
        <label class="visually-hidden" for="new-pref">Nueva preferencia</label>
        <input id="new-pref" class="input" bind:value={newPref} placeholder="Leche semidesnatada sin lactosa" maxlength="80" />
        <button class="btn btn-primary" type="submit" disabled={!newPref.trim()}><Plus size={18} aria-hidden="true" /> Añadir</button>
      </form>
    </div>
  </section>

  <section class="section" aria-labelledby="h-budget">
    <h2 id="h-budget">Presupuesto semanal</h2>
    <div class="panel pad stack">
      <label class="field">
        <span>Cuánto queréis gastar como mucho a la semana</span>
        <input class="input num" bind:value={budget} onblur={saveBudget} inputmode="decimal" placeholder="Sin presupuesto" />
        <span class="hint">La lista avisa si lo previsto más lo ya gastado esta semana lo supera. {app.household.weekly_budget ? `Ahora: ${eur(Number(app.household.weekly_budget))}.` : ''}</span>
      </label>
    </div>
  </section>

  <section class="section" aria-labelledby="h-sync">
    <h2 id="h-sync">Sincronizar los móviles</h2>
    <div class="panel pad stack">
      {#if app.kind === 'supabase'}
        <p>Conectado como <strong>{app.email}</strong>. Lo que cambia uno lo ven los demás al momento.</p>
        <div class="row wrap">
          <button class="btn" onclick={signOut}>Cerrar sesión</button>
          {#if !cfg?.fromBuild}<button class="btn btn-ghost" onclick={() => saveSupabaseConfig(null, null)}>Desconectar la base de datos</button>{/if}
        </div>
      {:else}
        <p>Ahora la lista se guarda solo en este móvil. Para compartirla en tiempo real hace falta una base de datos gratuita en Supabase. La guía está en <a href={`${REPO}/blob/main/docs/supabase.md`} target="_blank" rel="noopener">docs/supabase.md</a>.</p>
        <details>
          <summary>Conectar a mano en este móvil</summary>
          <form class="stack top" onsubmit={connect}>
            <label class="field">
              <span>Dirección del proyecto</span>
              <input class="input" bind:value={sbUrl} type="url" placeholder="https://xxxx.supabase.co" autocomplete="off" />
            </label>
            <label class="field">
              <span>Clave pública (anon)</span>
              <input class="input" bind:value={sbKey} autocomplete="off" />
            </label>
            <p class="hint">Antes de conectar, exporta una copia abajo: después podrás importarla para no perder lo que ya tienes.</p>
            <button class="btn btn-primary" type="submit">Conectar</button>
          </form>
        </details>
      {/if}
    </div>
  </section>

  <section class="section" aria-labelledby="h-prices">
    <h2 id="h-prices">Precios de Mercadona</h2>
    <div class="panel pad stack">
      {#if app.catalog}
        <p>Catálogo actualizado el {fmtLong(app.catalog.updated)}: <span class="num">{app.catalog.products.length.toLocaleString('es-ES')}</span> productos con los precios de vuestra zona. Se actualiza solo cada lunes.</p>
      {:else}
        <p class="muted">Cargando el catálogo…</p>
      {/if}
      <details>
        <summary>Si os mudáis</summary>
        <p class="top">Los precios dependen del código postal. Para cambiarlo, en GitHub abre <a href={`${REPO}/settings/variables/actions`} target="_blank" rel="noopener">Settings, Secrets and variables, Actions, Variables</a>, edita <code>MERCADONA_CP</code> con el nuevo código postal y lanza la tarea 'Actualizar y publicar' desde la pestaña Actions.</p>
      </details>
    </div>
  </section>

  <section class="section" aria-labelledby="h-backup">
    <h2 id="h-backup">Copia de seguridad</h2>
    <div class="panel pad stack">
      <p class="muted">Un archivo con la lista, las compras y las preferencias.</p>
      <div class="row wrap">
        <button class="btn" onclick={exportBackup}><Download size={18} aria-hidden="true" /> Exportar copia</button>
        <label class="btn">
          <Upload size={18} aria-hidden="true" /> Importar copia
          <input class="visually-hidden" type="file" accept="application/json,.json" onchange={onImport} />
        </label>
      </div>
      {#if importError}<p class="error-text" role="alert">{importError}</p>{/if}
    </div>
  </section>

  {#if !standalone}
    <section class="section" aria-labelledby="h-install">
      <h2 id="h-install">Instalar en el móvil</h2>
      <div class="panel pad stack">
        {#if installEvt}
          <button class="btn btn-primary" onclick={() => installEvt.prompt()}>Instalar MercaFamily</button>
        {:else if ios}
          <p>En Safari, pulsa el botón Compartir y elige 'Añadir a pantalla de inicio'. Así se abre como una app y puede mandar avisos.</p>
        {:else}
          <p>En Chrome, abre el menú de los tres puntos y elige 'Instalar aplicación' o 'Añadir a pantalla de inicio'.</p>
        {/if}
      </div>
    </section>
  {/if}

  <section class="section" aria-labelledby="h-about">
    <h2 id="h-about">Sobre MercaFamily</h2>
    <p class="muted">App familiar sin anuncios ni seguimiento. Precios del catálogo público de Mercadona (consulta semanal, uso doméstico) y nutrición de <a href="https://world.openfoodfacts.org/" target="_blank" rel="noopener">Open Food Facts</a>. Código en <a href={REPO} target="_blank" rel="noopener">GitHub</a>.</p>
  </section>
</div>

<style>
  .pad {
    padding: 16px;
  }
  .wrap {
    flex-wrap: wrap;
  }
  .row .input {
    flex: 1;
    min-width: 0;
  }
  .code {
    font-size: 1.5rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    padding: 4px 12px;
    border-radius: 10px;
    background: var(--lemon-soft);
    color: var(--lemon-ink);
  }
  .prefs {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }
  .prefs li {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-left: 14px;
    border-radius: 12px;
    background: var(--market-soft);
    font-weight: 600;
  }
  .prefs li span {
    flex: 1;
  }
  details summary {
    cursor: pointer;
    min-height: 44px;
    display: flex;
    align-items: center;
    font-weight: 650;
  }
  .top {
    margin-top: 8px;
  }
  code {
    font-size: 0.9em;
    padding: 1px 6px;
    border-radius: 6px;
    background: var(--surface-2);
  }
  label.btn {
    position: relative;
  }
  label.btn:focus-within {
    outline: 3px solid var(--focus);
    outline-offset: 2px;
  }
</style>

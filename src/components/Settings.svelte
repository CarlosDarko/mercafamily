<script>
  import { Copy, Share2, X, Plus, Download, Upload } from '@lucide/svelte'
  import { app, setMe, updateHousehold, supabaseConfig, saveSupabaseConfig, signOut, exportBackup, importBackup, toast, setPrefs, setMyColor, colorOf, PERSON_COLORS, people, setPeople } from '../lib/data.svelte.js'
  import { DIETS } from '../lib/home.js'
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

  // ---- Dietas y alergias por persona ----
  const names = $derived([...new Set([app.me, ...app.members.map((m) => m.display_name), ...people().map((p) => p.name)].filter(Boolean))])
  let newPerson = $state('')
  const avoidOf = (n) => people().find((p) => p.name === n)?.avoid || []
  function toggleDiet(n, d) {
    const list = people().filter((p) => p.name !== n)
    const cur = avoidOf(n)
    const avoid = cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]
    setPeople(avoid.length ? [...list, { name: n, avoid }] : list)
  }
  function addPerson(e) {
    e.preventDefault()
    const n = newPerson.trim()
    if (!n || names.includes(n)) return
    setPeople([...people(), { name: n, avoid: [] }])
    newPerson = ''
  }

  // ---- Móvil de un peque ----
  let challenge = $state(null)
  let answer = $state('')
  function exitKid() {
    const a = 6 + Math.floor(Math.random() * 4)
    const b = 6 + Math.floor(Math.random() * 4)
    challenge = { a, b }
    answer = ''
  }
  function checkKid(e) {
    e.preventDefault()
    if (Number(answer) === challenge.a * challenge.b) {
      setPrefs({ kid: false })
      challenge = null
      toast('Modo peque desactivado')
    } else toast('Esa no es. Pide ayuda a un adulto.')
  }

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
    if (sbKey.trim().length < 30 && !sbKey.trim().startsWith('sb_publishable_')) {
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
      <fieldset class="pick">
        <legend class="label">Tu color</legend>
        <div class="swatches">
          {#each PERSON_COLORS as c, i}
            <label class="sw" style={`--c:${c}`}>
              <input type="radio" name="mycolor" value={c} checked={colorOf(app.me) === c} onchange={() => setMyColor(c)} />
              <span class="visually-hidden">Color {i + 1}</span>
            </label>
          {/each}
        </div>
        <span class="hint">Así se ve de un vistazo quién ha apuntado o cogido cada cosa.</span>
      </fieldset>
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

  {#if app.prefs.kid}
    <section class="section" aria-labelledby="h-kid">
      <h2 id="h-kid">Modo peque</h2>
      <div class="panel pad stack">
        <p>Lo que apuntes llega como petición a los adultos de casa.</p>
        {#if challenge}
          <form class="stack" onsubmit={checkKid}>
            <label class="field">
              <span>Para salir: ¿cuánto es {challenge.a} × {challenge.b}?</span>
              <input class="input num" bind:value={answer} inputmode="numeric" autocomplete="off" />
            </label>
            <button class="btn btn-primary" type="submit">Salir del modo peque</button>
          </form>
        {:else}
          <button class="btn" onclick={exitKid}>Salir del modo peque</button>
        {/if}
      </div>
    </section>
  {:else}
  <section class="section" aria-labelledby="h-screen">
    <h2 id="h-screen">Pantalla</h2>
    <div class="panel pad stack">
      <fieldset class="pick">
        <legend class="label">Tema</legend>
        <div class="seg3">
          {#each [['auto', 'Como el móvil'], ['light', 'Claro'], ['dark', 'Oscuro']] as [v, l]}
            <label><input type="radio" name="theme" value={v} checked={app.prefs.theme === v} onchange={() => setPrefs({ theme: v })} /> {l}</label>
          {/each}
        </div>
      </fieldset>
      <fieldset class="pick">
        <legend class="label">Tamaño de letra</legend>
        <div class="seg3">
          {#each [[1, 'Normal'], [1.15, 'Grande'], [1.3, 'Muy grande']] as [v, l]}
            <label><input type="radio" name="scale" value={v} checked={app.prefs.scale === v} onchange={() => setPrefs({ scale: v })} /> {l}</label>
          {/each}
        </div>
        <span class="hint">Solo en este móvil.</span>
      </fieldset>
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
              <span>Clave pública (publishable o anon)</span>
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
        <p class="top">Los precios dependen del código postal. Para cambiarlo, en GitHub abre <a href={`${REPO}/settings/variables/actions`} target="_blank" rel="noopener">Settings, Secrets and variables, Actions, Variables</a>, crea o edita <code>MERCADONA_CP</code> con el nuevo código postal y lanza la tarea 'Actualizar y publicar' desde la pestaña Actions.</p>
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

  <section class="section" aria-labelledby="h-diets">
    <h2 id="h-diets">Dietas y alergias</h2>
    <div class="panel pad stack">
      <p class="muted">Si alguien de casa no puede tomar algo, la app avisa al apuntar un producto que lo lleve (mira los ingredientes y alérgenos de Mercadona).</p>
      {#each names as n (n)}
        <fieldset class="pick">
          <legend class="label">{n}</legend>
          <div class="chips">
            {#each Object.entries(DIETS) as [k, d]}
              <label class="chip-check"><input type="checkbox" checked={avoidOf(n).includes(k)} onchange={() => toggleDiet(n, k)} /> {d.label}</label>
            {/each}
          </div>
        </fieldset>
      {/each}
      <form class="row" onsubmit={addPerson}>
        <label class="visually-hidden" for="new-person">Añadir persona</label>
        <input id="new-person" class="input" bind:value={newPerson} placeholder="Otra persona de casa" maxlength="30" />
        <button class="btn" type="submit" disabled={!newPerson.trim()}>Añadir</button>
      </form>
    </div>
  </section>

  <section class="section" aria-labelledby="h-kid">
    <h2 id="h-kid">Móvil de un peque</h2>
    <div class="panel pad stack">
      <p class="muted">Lo que apunte desde este móvil llega como petición y un adulto la acepta o no. Se ocultan Gastos y casi todos los ajustes.</p>
      <button class="btn" onclick={() => (setPrefs({ kid: true }), toast('Modo peque activado en este móvil'))}>Activar en este móvil</button>
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
    padding: 4px 0 4px 14px;
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
  .pick {
    border: 0;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 8px;
  }
  .swatches {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .sw {
    position: relative;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: var(--c);
    cursor: pointer;
  }
  .sw input {
    position: absolute;
    inset: 0;
    margin: 0;
    opacity: 0;
    cursor: pointer;
  }
  .sw:has(input:checked) {
    box-shadow: 0 0 0 3px var(--surface), 0 0 0 6px var(--c);
  }
  .sw:has(input:focus-visible) {
    outline: 3px solid var(--focus);
    outline-offset: 4px;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .chip-check {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 44px;
    padding: 0 12px;
    border: 1.5px solid var(--line);
    border-radius: 999px;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
  }
  .chip-check:has(input:checked) {
    border-color: var(--tomato);
    background: var(--tomato-soft);
    color: var(--tomato);
  }
  .chip-check input {
    accent-color: var(--tomato);
  }
  .seg3 {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 4px;
    padding: 4px;
    border-radius: 14px;
    background: var(--surface-2);
  }
  .seg3 label {
    display: grid;
    place-items: center;
    min-height: 44px;
    padding: 0 6px;
    border-radius: 10px;
    font-weight: 650;
    font-size: 0.95rem;
    text-align: center;
    cursor: pointer;
  }
  .seg3 input {
    position: absolute;
    opacity: 0;
    width: 1px;
    height: 1px;
  }
  .seg3 label:has(input:checked) {
    background: var(--surface);
    box-shadow: var(--shadow);
  }
  .seg3 label:has(input:focus-visible) {
    outline: 3px solid var(--focus);
  }
  label.btn:focus-within {
    outline: 3px solid var(--focus);
    outline-offset: 2px;
  }
</style>

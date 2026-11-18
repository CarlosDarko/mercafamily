<script>
  // Menú de la semana, despensa estimada y recetas de la familia
  import { ChefHat, Plus, ShoppingBasket, Check, X, Trash2, Pencil, Wand2, Sun, Moon, ChevronLeft, ChevronRight } from '@lucide/svelte'
  import { app, setMeal, removeMeal, saveRecipe, deleteRecipe, resolveIngredient, mealNeeds, addMany, pantrySet, settings, toast, searchCatalog, adoptKbRecipe } from '../lib/data.svelte.js'
  import RecipeBook from './RecipeBook.svelte'
  import RecipeSheet from './RecipeSheet.svelte'
  import { norm } from '../lib/format.js'
  import { pantry, STARTER_RECIPES } from '../lib/home.js'
  import ProposalSheet from './ProposalSheet.svelte'
  import SeasonAndBalance from './SeasonAndBalance.svelte'
  import { imgUrl } from '../lib/catalog.js'
  import { isoDate, weekStart } from '../lib/format.js'
  import Sheet from './Sheet.svelte'

  const DAY = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric' })
  // '#menu-proponer' (desde 'Hoy coméis' el fin de semana) abre la propuesta de la semana siguiente
  const fromToday = location.hash === '#menu-proponer'
  const wd = new Date().getDay()
  let offset = $state(fromToday && (wd === 0 || wd >= 5) ? 1 : 0) // semanas desde la actual
  const days = $derived.by(() => {
    const start = weekStart(new Date())
    start.setDate(start.getDate() + offset * 7)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      return { iso: isoDate(d), label: DAY.format(d), today: isoDate(d) === isoDate() }
    })
  })
  const mealOf = (day, slot = 'cena') => app.meals.find((m) => m.day === day && m.slot === slot)
  const SLOTS = [
    ['comida', 'Comida'],
    ['cena', 'Cena']
  ]
  let proposing = $state(fromToday)

  const stock = $derived(pantry(app.tripItems, settings().pantry || {}))
  const low = $derived(stock.filter((p) => p.state !== 'ok'))
  let showAllStock = $state(false)
  const needs = $derived(mealNeeds(days[0].iso, days[6].iso, stock))

  // ---- Elegir cena de un día ----
  let picking = $state(null)
  let freeName = $state('')
  function pick(day, slot) {
    picking = { ...day, slot }
    freeName = mealOf(day.iso, slot)?.name || ''
  }
  async function chooseRecipe(r) {
    await setMeal({ day: picking.iso, slot: picking.slot, name: r.name, recipe_id: r.id })
    picking = null
  }
  async function chooseFree(e) {
    e.preventDefault()
    if (!freeName.trim()) return
    const r = app.recipes.find((x) => x.name.toLowerCase() === freeName.trim().toLowerCase())
    await setMeal({ day: picking.iso, slot: picking.slot, name: freeName, recipe_id: r?.id || null })
    picking = null
  }
  async function useStarter(s) {
    const r = await adoptKbRecipe(s)
    if (picking) await chooseRecipe(r)
  }
  // Buscar en el recetario al elegir el plato de un día
  let pickQ = $state('')
  const pickList = $derived.by(() => {
    if (!picking) return []
    const w = norm(pickQ).split(' ').filter(Boolean)
    return STARTER_RECIPES.filter((x) => (x.slot === 'ambas' || x.slot === picking.slot) && !app.recipes.some((r) => r.kb_id === x.id || r.name === x.name))
      .filter((x) => !w.length || w.every((t) => norm(x.name + ' ' + x.ingredients.map((i) => i.q).join(' ')).includes(t)))
      .slice(0, pickQ ? 12 : 8)
  })

  // ---- Editar receta ----
  let editing = $state(null)
  let viewing = $state(null)
  let ingQ = $state('')
  const ingResults = $derived(ingQ.trim().length >= 2 ? searchCatalog(ingQ, 6) : [])
  function newRecipe() {
    editing = { name: '', ingredients: [] }
  }
  function addIng(p) {
    editing.ingredients = [...editing.ingredients, { merc_id: p.id, name: p.n, qty: 1 }]
    ingQ = ''
  }
  function addIngText() {
    if (!ingQ.trim()) return
    editing.ingredients = [...editing.ingredients, resolveIngredient(ingQ)]
    ingQ = ''
  }
  async function saveEditing(e) {
    e.preventDefault()
    if (!editing.name.trim()) return
    await saveRecipe(editing)
    editing = null
  }

  async function addNeeds() {
    const n = await addMany(needs)
    toast(`${n} ingredientes apuntados en la lista`)
  }
  const starters = $derived(STARTER_RECIPES.filter((s) => !app.recipes.some((r) => r.name === s.name)))
</script>

<div class="page">
  <div class="page-head">
    <h1>Menú y despensa</h1>
    <p class="muted">Comidas y cenas de la semana, recetas y lo que hay en casa.</p>
  </div>

  <section class="section" aria-labelledby="h-week">
    <button class="hero" onclick={() => (proposing = true)}>
      <span class="h-ic" aria-hidden="true"><Wand2 size={26} /></span>
      <span class="h-tx">
        <strong>Propón el menú {offset === 0 ? 'de la semana' : 'de la semana que viene'}</strong>
        <small>Sin repetir, de temporada, con lo que os gusta y lo que hay en casa</small>
      </span>
    </button>
    <div class="row weeknav">
      <h2 id="h-week" class="spacer">{offset === 0 ? 'Esta semana' : 'La semana que viene'}</h2>
      <button class="icon-btn nav" onclick={() => (offset = 0)} disabled={offset === 0} aria-label="Esta semana"><ChevronLeft size={22} aria-hidden="true" /></button>
      <button class="icon-btn nav" onclick={() => (offset = 1)} disabled={offset === 1} aria-label="La semana que viene"><ChevronRight size={22} aria-hidden="true" /></button>
    </div>
    <ul class="week panel" role="list">
      {#each days as d (d.iso)}
        <li class:today={d.today}>
          <p class="dname">{d.label}</p>
          {#each SLOTS as [slot, label] (slot)}
            {@const m = mealOf(d.iso, slot)}
            <button class="day" onclick={() => pick(d, slot)} aria-label={`${label} del ${d.label}: ${m ? m.name : 'sin elegir'}`}>
              <span class="slot" class:cena={slot === 'cena'}>{#if slot === 'comida'}<Sun size={16} aria-hidden="true" />{:else}<Moon size={16} aria-hidden="true" />{/if}{label}</span>
              <span class="meal" class:empty={!m}>{m ? m.name : 'Elegir'}</span>
              {#if m}<Pencil size={18} aria-hidden="true" />{:else}<Plus size={18} aria-hidden="true" />{/if}
            </button>
          {/each}
        </li>
      {/each}
    </ul>
    {#if needs.length}
      <div class="needs">
        <p><strong>Faltan {needs.length} ingredientes</strong> para el menú: {needs.slice(0, 5).map((n) => n.name.replace(/ Hacendado$/, '')).join(', ')}{needs.length > 5 ? '…' : ''}</p>
        <button class="btn btn-primary" onclick={addNeeds}><ShoppingBasket size={18} aria-hidden="true" /> Apuntarlos en la lista</button>
      </div>
    {:else if app.meals.some((m) => m.day >= days[0].iso && m.day <= days[6].iso && m.recipe_id)}
      <p class="hint">Tenéis todo lo del menú en la lista o en casa.</p>
    {/if}
  </section>

  <section class="section" aria-labelledby="h-pantry">
    <h2 id="h-pantry">Despensa</h2>
    {#if !stock.length}
      <p class="muted">Aparece cuando terminéis alguna compra: la app calcula qué tenéis y cuánto le queda a cada cosa según cada cuánto lo compráis.</p>
    {:else}
      <p class="hint">Estimado por lo que compráis. Si no cuadra, corregidlo con 'Se acabó' o 'Aún queda'.</p>
      <ul class="stock panel" role="list">
        {#each showAllStock ? stock : low.length ? low : stock.slice(0, 6) as s (s.key)}
          {@const p = s.merc_id ? app.catalog?.byId.get(s.merc_id) : null}
          <li>
            {#if p && imgUrl(p)}<img src={imgUrl(p, 96)} alt="" width="40" height="40" loading="lazy" />{/if}
            <span class="s-text">
              <span class="s-name">{s.name}</span>
              <span class="meter" role="meter" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(s.left * 100)} aria-label={`Queda aproximadamente un ${Math.round(s.left * 100)} %`}>
                <span class={s.state} style={`width:${Math.max(4, s.left * 100)}%`}></span>
              </span>
              <span class="s-meta">{s.state === 'out' ? 'Se ha acabado' : s.state === 'low' ? 'Se acaba pronto' : 'Queda'} · {s.told ? (s.since ? `lo dijisteis hace ${s.since} ${s.since === 1 ? 'día' : 'días'}` : 'lo dijisteis hoy') : `comprado hace ${s.since} ${s.since === 1 ? 'día' : 'días'}`}</span>
            </span>
            {#if s.state === 'ok'}
              <button class="btn mini" onclick={() => pantrySet(s, 'out')}>Se acabó</button>
            {:else}
              <button class="btn mini" onclick={() => pantrySet(s, 'ok')}>Aún queda</button>
            {/if}
          </li>
        {/each}
      </ul>
      {#if stock.length > (low.length || 6)}
        <button class="btn btn-ghost" onclick={() => (showAllStock = !showAllStock)} aria-expanded={showAllStock}>{showAllStock ? 'Ver solo lo que se acaba' : `Ver toda la despensa (${stock.length})`}</button>
      {/if}
    {/if}
  </section>

  <RecipeBook />

  <SeasonAndBalance />

  <section class="section" aria-labelledby="h-recipes">
    <div class="row">
      <h2 id="h-recipes" class="spacer">Recetas guardadas</h2>
      <button class="btn mini" onclick={newRecipe}><Plus size={18} aria-hidden="true" /> Nueva</button>
    </div>
    {#if app.recipes.length}
      <ul class="recipes" role="list">
        {#each app.recipes as r (r.id)}
          <li class="panel">
            <ChefHat size={20} aria-hidden="true" />
            <button class="r-text r-open" onclick={() => (viewing = r)}><strong>{r.name}</strong><small>{r.ingredients.length} ingredientes{r.steps?.length ? ' · con pasos' : ''}</small></button>
            <button class="icon-btn" onclick={() => (editing = JSON.parse(JSON.stringify(r)))} aria-label={`Editar ${r.name}`}><Pencil size={18} aria-hidden="true" /></button>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</div>

{#if picking}
  <Sheet onclose={() => (picking = null)} labelledby="pick-title">
    <div class="sheet-head">
      <h2 id="pick-title">{picking.slot === 'comida' ? 'Comida' : 'Cena'} del {picking.label}</h2>
      <button class="icon-btn" onclick={() => (picking = null)} aria-label="Cerrar"><X size={24} aria-hidden="true" /></button>
    </div>
    {#if app.recipes.length}
      <ul class="choose" role="list">
        {#each app.recipes as r (r.id)}
          <li><button class="choice" onclick={() => chooseRecipe(r)}><ChefHat size={18} aria-hidden="true" /> {r.name}</button></li>
        {/each}
      </ul>
    {/if}
    <form class="row" onsubmit={chooseFree}>
      <label class="visually-hidden" for="free-meal">Otra cena</label>
      <input id="free-meal" class="input" bind:value={freeName} placeholder="Otra cosa: cenar fuera, sobras…" maxlength="60" />
      <button class="btn btn-primary" type="submit" disabled={!freeName.trim()}>Poner</button>
    </form>
    <div class="field">
      <label class="label" for="pick-q">Del recetario</label>
      <input id="pick-q" class="input" bind:value={pickQ} placeholder="Buscar: lentejas, merluza, tortilla…" autocomplete="off" />
    </div>
    <ul class="choose" role="list">
      {#each pickList as x (x.id)}
        <li><button class="choice" onclick={() => useStarter(x)}><ChefHat size={18} aria-hidden="true" /> {x.name}<small class="mins">{x.time} min</small></button></li>
      {/each}
    </ul>
    {#if mealOf(picking.iso, picking.slot)}
      <button class="btn btn-danger" onclick={() => (removeMeal(mealOf(picking.iso, picking.slot).id), (picking = null))}><Trash2 size={18} aria-hidden="true" /> Quitar este plato</button>
    {/if}
  </Sheet>
{/if}

{#if viewing}
  <RecipeSheet recipe={viewing} onclose={() => (viewing = null)} />
{/if}

{#if proposing}
  <ProposalSheet {days} onclose={() => (proposing = false)} />
{/if}

{#if editing}
  <Sheet onclose={() => (editing = null)} labelledby="rec-title">
    <form class="stack" onsubmit={saveEditing}>
      <div class="sheet-head">
        <h2 id="rec-title">{editing.id ? 'Editar receta' : 'Nueva receta'}</h2>
        <button type="button" class="icon-btn" onclick={() => (editing = null)} aria-label="Cerrar"><X size={24} aria-hidden="true" /></button>
      </div>
      <label class="field">
        <span>Nombre</span>
        <input class="input" bind:value={editing.name} maxlength="60" required placeholder="Lentejas de la abuela" />
      </label>
      <div class="field">
        <span class="label">Ingredientes</span>
        {#if editing.ingredients.length}
          <ul class="ings" role="list">
            {#each editing.ingredients as ing, i (i)}
              <li>
                <Check size={16} aria-hidden="true" />
                <span>{ing.name}</span>
                <button type="button" class="icon-btn" onclick={() => (editing.ingredients = editing.ingredients.filter((_, j) => j !== i))} aria-label={`Quitar ${ing.name}`}><X size={18} aria-hidden="true" /></button>
              </li>
            {/each}
          </ul>
        {/if}
        <div class="row">
          <label class="visually-hidden" for="ing-q">Añadir ingrediente</label>
          <input id="ing-q" class="input" bind:value={ingQ} placeholder="Añadir ingrediente" autocomplete="off" onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), addIngText())} />
        </div>
        {#if ingResults.length}
          <ul class="choose" role="list">
            {#each ingResults as r (r.p.id)}
              <li><button type="button" class="choice" onclick={() => addIng(r.p)}>{#if imgUrl(r.p)}<img src={imgUrl(r.p, 64)} alt="" width="32" height="32" />{/if} {r.p.n}</button></li>
            {/each}
          </ul>
        {/if}
      </div>
      <button class="btn btn-primary btn-block" type="submit" disabled={!editing.name.trim()}>Guardar receta</button>
      {#if editing.id}
        <button type="button" class="btn btn-danger btn-block" onclick={() => (deleteRecipe(editing.id), (editing = null))}><Trash2 size={18} aria-hidden="true" /> Borrar receta</button>
      {/if}
    </form>
  </Sheet>
{/if}

<style>
  .mini {
    min-height: 44px;
    padding: 0 14px;
    font-size: 0.95rem;
  }
  .week {
    list-style: none;
    margin: 0;
    padding: 0;
    overflow: hidden;
  }
  .week li + li {
    border-top: 1px solid var(--line);
  }
  .week li.today {
    background: var(--lemon-soft);
  }
  .week li {
    padding: 8px 0 4px;
  }
  .week .dname {
    padding: 0 16px;
  }
  .slot {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 0.85rem;
    font-weight: 650;
    color: var(--ink-2);
  }
  .slot :global(svg) {
    color: var(--c-horno);
  }
  .slot.cena :global(svg) {
    color: var(--c-uva);
  }
  .hero {
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    gap: 14px;
    width: 100%;
    padding: 16px 18px;
    border: 0;
    border-radius: 22px;
    background: linear-gradient(135deg, #c23d22, #9c560b);
    color: #fff;
    font: inherit;
    text-align: left;
    cursor: pointer;
    box-shadow: 0 10px 24px -12px #c23d22;
    transition: transform 0.25s var(--ease-spring);
  }
  .hero:active {
    transform: scale(0.98);
  }
  /* brillo que cruza el botón al entrar en la pantalla */
  .hero::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(110deg, transparent 35%, rgb(255 255 255 / 0.35) 50%, transparent 65%);
    transform: translateX(-100%);
    animation: shine 1.6s 0.4s var(--ease-out) both;
  }
  @keyframes shine {
    to {
      transform: translateX(100%);
    }
  }
  .h-ic {
    flex: none;
    display: grid;
    place-items: center;
    width: 52px;
    height: 52px;
    border-radius: 16px;
    background: rgb(255 255 255 / 0.2);
  }
  .h-tx {
    display: grid;
    gap: 2px;
    line-height: 1.25;
  }
  .h-tx strong {
    font-size: 1.1rem;
  }
  .h-tx small {
    font-size: 0.88rem;
    opacity: 0.92;
  }
  .weeknav {
    gap: 4px;
  }
  .nav:disabled {
    opacity: 0.35;
    cursor: default;
  }
  .day {
    width: 100%;
    display: grid;
    grid-template-columns: 4.5rem minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    min-height: 56px;
    padding: 8px 16px;
    border: 0;
    background: transparent;
    color: var(--ink);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .dname {
    font-weight: 700;
    font-size: 0.95rem;
  }
  .dname::first-letter {
    text-transform: uppercase;
  }
  .meal {
    font-weight: 600;
  }
  .meal.empty {
    color: var(--ink-2);
    font-weight: 500;
  }
  .needs {
    display: grid;
    gap: 10px;
    padding: 14px 16px;
    border-radius: var(--r);
    background: var(--market-soft);
  }
  .stock {
    list-style: none;
    margin: 0;
    padding: 4px 0;
  }
  .stock li {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
  }
  .stock li + li {
    border-top: 1px solid var(--line);
  }
  .stock img {
    border-radius: 8px;
    background: var(--surface-2);
    object-fit: contain;
    flex: none;
  }
  .s-text {
    flex: 1;
    min-width: 0;
    display: grid;
    gap: 4px;
  }
  .s-name {
    font-weight: 600;
    line-height: 1.3;
  }
  .s-meta {
    font-size: 0.85rem;
    color: var(--ink-2);
  }
  .meter {
    height: 8px;
    border-radius: 4px;
    background: var(--surface-2);
    overflow: hidden;
  }
  .meter span {
    display: block;
    height: 100%;
    border-radius: 4px;
    background: var(--market-2);
  }
  .meter .low {
    background: #a77f00;
  }
  .meter .out {
    background: var(--tomato);
  }
  .recipes {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }
  .recipes li {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 6px 6px 6px 16px;
  }
  .r-text {
    flex: 1;
    display: grid;
    line-height: 1.3;
  }
  .r-text small {
    color: var(--ink-2);
  }
  .r-open {
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
    min-height: 44px;
    padding: 0;
  }
  .mins {
    margin-left: auto;
    color: var(--ink-2);
    font-weight: 500;
  }
  .ideas {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .choose {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }
  .choice {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 48px;
    padding: 6px 14px;
    border: 0;
    border-radius: 12px;
    background: var(--surface-2);
    color: var(--ink);
    font: inherit;
    font-weight: 600;
    text-align: left;
    cursor: pointer;
  }
  .choice img {
    border-radius: 6px;
    background: #fff;
  }
  .ings {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 2px;
  }
  .ings li {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .ings li span {
    flex: 1;
  }
  .row .input {
    flex: 1;
    min-width: 0;
  }
</style>

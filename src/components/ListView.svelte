<script>
  import { CalendarClock, Plus, Store, Star, Sparkles, Check, X } from '@lucide/svelte'
  import { app, lineTotal, addProduct, addText, itemsOfList, aisleRank, settings, approveRequest, rejectRequest, colorOf } from '../lib/data.svelte.js'
  import { imgUrl } from '../lib/catalog.js'
  import { dueSuggestions, weekTotal } from '../lib/insights.js'
  import { eur } from '../lib/format.js'
  import AddBar from './AddBar.svelte'
  import ItemRow from './ItemRow.svelte'
  import ItemSheet from './ItemSheet.svelte'
  import CloseSheet from './CloseSheet.svelte'
  import ListSwitcher from './ListSwitcher.svelte'
  import StoreMode from './StoreMode.svelte'
  import PrepareSheet from './PrepareSheet.svelte'
  import HealthySwaps from './HealthySwaps.svelte'

  let editing = $state(null)
  let closing = $state(false)
  let showUsual = $state(false)
  let store = $state(false)
  let preparing = $state(false)

  const current = $derived(app.listId ? itemsOfList(app.listId) : app.items)
  const requests = $derived(current.filter((i) => i.requested && !i.checked))
  const pending = $derived(current.filter((i) => !i.checked && !i.missing && !i.requested))
  const inCart = $derived(current.filter((i) => i.checked))
  const missing = $derived(current.filter((i) => i.missing))
  const favorites = $derived(
    (settings().favorites || [])
      .map((id) => app.catalog?.byId.get(id))
      .filter((p) => p && !current.some((i) => i.merc_id === p.id))
  )

  const groups = $derived.by(() => {
    const map = new Map()
    for (const it of pending) {
      const key = app.catalog?.cats.has(it.category) ? it.category : 'otros'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(it)
    }
    return [...map.entries()]
      .map(([key, items]) => ({
        key,
        name: key === 'otros' ? 'Otros' : app.catalog.cats.get(key).n,
        items: items.sort((a, b) => a.name.localeCompare(b.name, 'es'))
      }))
      .sort((a, b) => (a.key === 'otros' ? 9 : aisleRank(a.key)) - (b.key === 'otros' ? 9 : aisleRank(b.key)))
  })

  const sum = (list) => list.reduce((s, i) => s + (lineTotal(i) || 0), 0)
  const estimate = $derived(sum(current))
  const cartTotal = $derived(sum(inCart))
  const noPrice = $derived(current.filter((i) => lineTotal(i) == null).length)
  const spentWeek = $derived(weekTotal(app.trips))
  const budget = $derived(app.household?.weekly_budget ? Number(app.household.weekly_budget) : null)
  const left = $derived(budget == null ? null : budget - spentWeek - estimate)

  const sugg = $derived(dueSuggestions(app.tripItems, app.items, app.catalog))

  async function addSuggestion(s) {
    const p = s.merc_id ? app.catalog?.byId.get(s.merc_id) : null
    if (p) await addProduct(p, s.qtyAvg)
    else await addText(`${s.qtyAvg} ${s.name}`)
  }
  async function addAllDue() {
    for (const s of sugg.due) await addSuggestion(s)
  }
</script>

<div class="page">
  <div class="page-head">
    <h1>Lista de la compra</h1>
    <ListSwitcher />
    <div class="row status">
      <p class="muted spacer">
      {#if current.length}
        {pending.length} por coger{inCart.length ? `, ${inCart.length} en el carro` : ''}{missing.length ? `, ${missing.length} no había` : ''}.
      {:else}
        Escribe lo que hace falta y elige el producto de Mercadona.
      {/if}
      </p>
      {#if pending.length && !app.prefs.kid}
        <button class="btn store-btn" onclick={() => (store = true)}><Store size={20} aria-hidden="true" /> Modo tienda</button>
      {/if}
    </div>
    {#if !app.prefs.kid}
      <button class="btn prep" onclick={() => (preparing = true)}><Sparkles size={18} aria-hidden="true" /> Prepárame la lista</button>
    {/if}
  </div>

  <AddBar />

  {#if requests.length}
    <section class="section reqs" aria-labelledby="h-reqs">
      <h2 id="h-reqs" class="cat">{app.prefs.kid ? 'Tus peticiones' : 'Peticiones'}</h2>
      <ul class="items panel" role="list">
        {#each requests as it (it.id)}
          <li class="req">
            <span class="dot" style={`background:${colorOf(it.added_by)}`} aria-hidden="true"></span>
            <span class="req-text"><strong>{it.name}</strong><small>{app.prefs.kid ? 'Esperando a que un adulto diga que sí' : `Lo pide ${it.added_by || 'alguien'}`}</small></span>
            {#if !app.prefs.kid}
              <button class="icon-btn ok" onclick={() => approveRequest(it)} aria-label={`Aceptar ${it.name}`}><Check size={22} aria-hidden="true" /></button>
              <button class="icon-btn no" onclick={() => rejectRequest(it)} aria-label={`Rechazar ${it.name}`}><X size={22} aria-hidden="true" /></button>
            {/if}
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if favorites.length}
    <section class="favs" aria-labelledby="h-favs">
      <h2 id="h-favs" class="cat"><Star size={16} aria-hidden="true" /> Favoritos</h2>
      <ul class="fav-row" role="list">
        {#each favorites as p (p.id)}
          <li>
            <button class="fav" onclick={() => addProduct(p)} aria-label={`Añadir ${p.n}`}>
              {#if imgUrl(p)}<img src={imgUrl(p, 96)} alt="" width="48" height="48" loading="lazy" />{/if}
              <span>{p.n.replace(/ Hacendado$/, '')}</span>
            </button>
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if !app.prefs.kid}
    <HealthySwaps items={current} />
  {/if}

  {#if sugg.due.length && !app.prefs.kid}
    <section class="section due" aria-labelledby="h-due">
      <div class="row">
        <h2 id="h-due" class="spacer">Toca comprar</h2>
        <button class="btn" onclick={addAllDue}>Añadir {sugg.due.length === 1 ? 'a la lista' : `las ${sugg.due.length}`}</button>
      </div>
      <ul class="chips" role="list">
        {#each sugg.due.slice(0, 8) as s (s.key)}
          <li>
            <button class="chip" onclick={() => addSuggestion(s)} aria-label={`Añadir ${s.name}. Lo compráis cada ${Math.round(s.every)} días y hace ${s.since}.`}>
              <Plus size={18} aria-hidden="true" />
              <span class="chip-text">
                <strong>{s.name}</strong>
                <small>cada {Math.round(s.every)} días · hace {s.since}</small>
              </span>
            </button>
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if groups.length}
    {#each groups as g (g.key)}
      <section class="section" aria-labelledby={`h-${g.key}`}>
        <h2 id={`h-${g.key}`} class="cat">{g.name}</h2>
        <ul class="items panel" role="list">
          {#each g.items as it (it.id)}
            <ItemRow item={it} onedit={() => (editing = it.id)} />
          {/each}
        </ul>
      </section>
    {/each}
  {:else if !inCart.length}
    <section class="section empty" aria-labelledby="h-empty">
      <CalendarClock size={32} aria-hidden="true" />
      <h2 id="h-empty">La lista está vacía</h2>
      <p class="muted">Prueba a escribir 'leche' o '2 tomates'. Si guardáis vuestras preferencias en Ajustes, la app elige sola el producto que soléis comprar.</p>
      {#if sugg.usual.length}
        <button class="btn" onclick={() => (showUsual = !showUsual)} aria-expanded={showUsual}>Ver lo que soléis comprar</button>
        {#if showUsual}
          <ul class="chips" role="list">
            {#each sugg.usual.slice(0, 12) as s (s.key)}
              <li><button class="chip" onclick={() => addSuggestion(s)}><Plus size={18} aria-hidden="true" /><span class="chip-text"><strong>{s.name}</strong></span></button></li>
            {/each}
          </ul>
        {/if}
      {/if}
    </section>
  {:else}
    <p class="section muted">Todo cogido. Cuando paguéis, pulsa 'Terminar compra' para guardarla en Gastos.</p>
  {/if}

  {#if missing.length}
    <section class="section" aria-labelledby="h-missing">
      <h2 id="h-missing" class="cat">No había</h2>
      <ul class="items panel cart" role="list">
        {#each missing as it (it.id)}
          <ItemRow item={it} onedit={() => (editing = it.id)} />
        {/each}
      </ul>
      <p class="hint">Se quedan en la lista para la próxima compra.</p>
    </section>
  {/if}

  {#if inCart.length}
    <section class="section" aria-labelledby="h-cart">
      <h2 id="h-cart" class="cat">En el carro</h2>
      <ul class="items panel cart" role="list">
        {#each inCart as it (it.id)}
          <ItemRow item={it} onedit={() => (editing = it.id)} />
        {/each}
      </ul>
    </section>
  {/if}
</div>

{#if current.length || budget}
  <aside class="ticket" aria-label="Total previsto">
    <div class="ticket-inner">
      <div class="ticket-sum">
        <p class="t-label">Previsto</p>
        <p class="t-total num" aria-live="polite">{eur(estimate)}</p>
        <p class="t-meta">
          {#if inCart.length}En el carro <span class="num">{eur(cartTotal)}</span>{/if}
          {#if noPrice}{inCart.length ? ' · ' : ''}{noPrice} sin precio{/if}
          {#if left != null}
            <span class:over={left < 0}>
              {inCart.length || noPrice ? ' · ' : ''}{left < 0 ? `Os pasáis ${eur(-left)} del presupuesto` : `Quedan ${eur(left)} de presupuesto`}
            </span>
          {/if}
        </p>
      </div>
      <button class="btn btn-primary" disabled={!inCart.length} onclick={() => (closing = true)}>
        Terminar compra
      </button>
    </div>
  </aside>
{/if}

{#if editing}
  <ItemSheet id={editing} onclose={() => (editing = null)} />
{/if}
{#if preparing}
  <PrepareSheet onclose={() => (preparing = false)} />
{/if}
{#if store}
  <StoreMode onclose={() => (store = false)} />
{/if}
{#if closing}
  <CloseSheet total={cartTotal} count={inCart.length} onclose={() => (closing = false)} />
{/if}

<style>
  .prep {
    justify-self: start;
    min-height: 44px;
    padding: 0 16px;
    background: var(--market-soft);
    color: var(--ink);
  }
  .req {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 8px 8px 16px;
    border-bottom: 1px solid var(--line);
  }
  .req:last-child {
    border-bottom: 0;
  }
  .req .dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    flex: none;
  }
  .req-text {
    flex: 1;
    display: grid;
    line-height: 1.3;
  }
  .req-text small {
    color: var(--ink-2);
  }
  .ok {
    color: var(--accent-text);
    background: var(--market-soft);
  }
  .no {
    color: var(--tomato);
  }
  .status {
    align-items: center;
  }
  .store-btn {
    flex: none;
    min-height: 44px;
    padding: 0 14px;
    background: var(--lemon);
    color: #2b2300;
  }
  .favs {
    margin-top: 10px;
    display: grid;
    gap: 6px;
  }
  .favs .cat {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .fav-row {
    list-style: none;
    margin: 0 calc(var(--gutter) * -1);
    padding: 2px var(--gutter) 6px;
    display: flex;
    gap: 8px;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .fav {
    width: 92px;
    min-height: 112px;
    display: grid;
    justify-items: center;
    align-content: start;
    gap: 6px;
    padding: 8px 6px;
    border: 0;
    border-radius: 14px;
    background: var(--surface);
    box-shadow: var(--shadow);
    color: var(--ink);
    font: inherit;
    font-size: 0.8rem;
    font-weight: 600;
    line-height: 1.3;
    text-align: center;
    cursor: pointer;
  }
  .fav img {
    border-radius: 8px;
    background: var(--surface-2);
    object-fit: contain;
  }
  .fav span {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .cat {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--ink-2);
    padding: 0 4px;
  }
  .section:has(.cat) {
    gap: 8px;
    margin-top: 22px;
  }
  .items {
    list-style: none;
    margin: 0;
    padding: 0;
    overflow: hidden;
  }
  .cart {
    background: transparent;
    box-shadow: none;
    border: 1px dashed var(--line);
  }
  .due {
    background: var(--lemon-soft);
    color: var(--lemon-ink);
    border-radius: var(--r);
    padding: 16px;
    margin-top: 20px;
  }
  .due .btn {
    background: var(--lemon);
    color: #2b2300;
  }
  .chips {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: var(--tap);
    padding: 6px 14px 6px 10px;
    border-radius: 14px;
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--ink);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .due .chip {
    border-color: transparent;
  }
  .chip-text {
    display: grid;
    line-height: 1.3;
  }
  .chip-text small {
    color: var(--ink-2);
    font-size: 0.85rem;
  }
  .empty {
    justify-items: start;
    padding: 20px;
    border: 1.5px dashed var(--line);
    border-radius: var(--r);
  }

  .ticket {
    position: fixed;
    left: 0;
    right: 0;
    bottom: calc(60px + env(safe-area-inset-bottom));
    z-index: 15;
    padding: 0 8px;
    pointer-events: none;
  }
  .ticket-inner {
    pointer-events: auto;
    max-width: calc(var(--maxw) - 16px);
    margin: 0 auto;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 12px 14px 18px;
    background: var(--surface);
    border-radius: 16px 16px 4px 4px;
    box-shadow: 0 -2px 4px rgb(0 0 0 / 0.04), 0 -10px 24px -12px rgb(0 0 0 / 0.3);
    /* borde troquelado de ticket */
    -webkit-mask: radial-gradient(circle 5px at 50% calc(100% + 1px), transparent 98%, #000) 0 0 / 14px 100% repeat-x;
    mask: radial-gradient(circle 5px at 50% calc(100% + 1px), transparent 98%, #000) 0 0 / 14px 100% repeat-x;
  }
  .ticket-sum {
    flex: 1;
    min-width: 0;
  }
  .t-label {
    font-size: 0.85rem;
    font-weight: 650;
    color: var(--ink-2);
  }
  .t-total {
    font-size: 1.6rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1.1;
  }
  .t-meta {
    font-size: 0.85rem;
    color: var(--ink-2);
  }
  .over {
    color: var(--tomato);
    font-weight: 700;
  }
  @media (min-width: 700px) {
    .ticket {
      bottom: 96px;
    }
  }
</style>

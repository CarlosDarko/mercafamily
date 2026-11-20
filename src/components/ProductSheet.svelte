<script>
  // Ficha de un producto del catálogo antes de apuntarlo: foto, precio, cuántos, precio en otras tiendas,
  // alternativas y qué lleva. Se apunta con 'Añadir a la lista'.
  import { X, Minus, Plus, Star, ShoppingBasket, Tag, Check } from '@lucide/svelte'
  import { app, addProduct, isFavorite, toggleFavorite, toast } from '../lib/data.svelte.js'
  import { imgUrl, unitLabel } from '../lib/catalog.js'
  import { eur } from '../lib/format.js'
  import { cheaperFormat } from '../lib/home.js'
  import Sheet from './Sheet.svelte'
  import Alternatives from './Alternatives.svelte'
  import ProductHistory from './ProductHistory.svelte'
  import CompareStores from './CompareStores.svelte'
  import ProductInfo from './ProductInfo.svelte'

  let { product, qty: startQty = 1, onadded, onclose } = $props()
  let p = $state(product)
  let qty = $state(startQty)
  let grade = $state(null)
  let adding = $state(false)

  const listName = $derived(app.lists.find((l) => l.id === app.listId)?.name || 'la lista')
  const already = $derived(app.items.find((i) => !i.checked && i.merc_id === p.id && (i.list_id ?? app.household?.id ?? null) === (app.listId ?? app.household?.id ?? null)))
  const fmt = $derived(app.catalog ? cheaperFormat(p, app.catalog.products) : null)

  async function add() {
    adding = true
    const before = !!already
    await addProduct(p, qty)
    adding = false
    if (!before) toast(`Apuntado en ${listName}: ${p.n}`)
    onadded?.(p)
    onclose()
  }
  // Una alternativa abre su ficha aquí mismo, sin apuntar nada todavía
  function show(np) {
    p = np
    document.querySelector('dialog[open]')?.scrollTo({ top: 0, behavior: 'smooth' })
  }
</script>

<Sheet {onclose} labelledby="ps-title">
  <div class="top-bar">
    <button class="icon-btn fav" class:on={isFavorite(p.id)} onclick={() => toggleFavorite(p.id)} aria-pressed={isFavorite(p.id)} aria-label="Favorito">
      <Star size={24} aria-hidden="true" fill={isFavorite(p.id) ? 'currentColor' : 'none'} />
    </button>
    <button class="icon-btn" onclick={onclose} aria-label="Cerrar sin apuntar"><X size={24} aria-hidden="true" /></button>
  </div>
  <div class="prod">
    {#if imgUrl(p)}<img class="hero" src={imgUrl(p, 240)} alt={p.n} width="112" height="112" />{/if}
    <div class="head-text">
      <h2 id="ps-title">{p.n}</h2>
      <p class="muted unit">{unitLabel(p)}</p>
      <p class="price num">{eur(p.p)}{#if p.pp}<s class="was">{eur(p.pp)}</s><span class="visually-hidden"> (antes {eur(p.pp)})</span>{/if}</p>
    </div>
  </div>

  <section class="blk add-blk" aria-labelledby="h-add">
    <h3 id="h-add" class="visually-hidden">Apuntar</h3>
    {#if already}<p class="already"><Check size={16} aria-hidden="true" /> Ya está en {listName} ({already.qty}). Si lo añadís, se suma.</p>{/if}
    <div class="qrow">
      <div class="stepper" role="group" aria-label="Cantidad">
        <button class="icon-btn" onclick={() => (qty = Math.max(1, qty - 1))} disabled={qty <= 1} aria-label="Una menos"><Minus size={22} aria-hidden="true" /></button>
        <output class="num" aria-live="polite">{qty}</output>
        <button class="icon-btn" onclick={() => (qty = Math.min(99, qty + 1))} aria-label="Una más"><Plus size={22} aria-hidden="true" /></button>
      </div>
      <span class="line-total num">{eur(p.p * qty)}</span>
    </div>
    <button class="btn btn-primary btn-block" onclick={add} disabled={adding}><ShoppingBasket size={20} aria-hidden="true" /> Añadir a {listName}</button>
  </section>

  {#if fmt}
    <div class="fmt">
      <p><strong>Otro formato sale más barato:</strong> {fmt.p.z} a {eur(fmt.p.r)}/{fmt.p.rf}, un {Math.round(fmt.saving * 100)} % menos.</p>
      <button class="btn mini" onclick={() => show(fmt.p)}>Ver ese formato</button>
    </div>
  {/if}

  <section class="blk" aria-labelledby="h-price">
    <h3 id="h-price" class="bh"><Tag size={18} aria-hidden="true" /> Precio</h3>
    {#key p.id}
      <ProductHistory {p} />
      <CompareStores products={[p]} compact />
    {/key}
  </section>

  <div class="blk-alt">
    {#key p.id}<Alternatives {p} {grade} onuse={show} />{/key}
  </div>

  <ProductInfo {p} bind:grade />
</Sheet>

<style>
  .fav.on {
    color: #a77f00;
  }
  .top-bar {
    display: flex;
    justify-content: flex-end;
    gap: 4px;
    margin: -8px -6px -14px 0;
  }
  .prod {
    display: flex;
    align-items: center;
    gap: 16px;
  }
  .hero {
    width: 112px;
    height: 112px;
    border-radius: 18px;
    background: #fff;
    object-fit: contain;
    flex: none;
    box-shadow: inset 0 0 0 1px var(--line);
  }
  .head-text {
    flex: 1;
    min-width: 0;
    display: grid;
    gap: 2px;
  }
  .head-text h2 {
    font-size: 1.25rem;
    line-height: 1.2;
  }
  .unit {
    font-size: 0.9rem;
  }
  .price {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 2px 10px;
    margin-top: 4px;
    font-weight: 800;
    font-size: 1.5rem;
    letter-spacing: -0.02em;
  }
  .was {
    font-weight: 500;
    font-size: 1rem;
    color: var(--ink-2);
  }
  .blk {
    display: grid;
    gap: 12px;
    padding: 14px;
    border-radius: 18px;
    background: var(--paper);
  }
  .add-blk {
    background: color-mix(in srgb, var(--c-huerta) 10%, var(--surface));
  }
  .already {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--accent-text);
  }
  .bh {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 1rem;
  }
  .bh :global(svg) {
    color: var(--c-huerta);
  }
  .blk :global(.hist),
  .blk :global(.cmp) {
    border-top: 0;
    padding-top: 0;
  }
  .blk :global(.hist h3),
  .blk :global(.cmp h3) {
    font-size: 0.85rem;
    color: var(--ink-2);
  }
  .blk-alt {
    display: grid;
    gap: 18px;
  }
  .blk-alt :global(.block) {
    padding: 14px;
    border-radius: 18px;
    background: var(--paper);
  }
  .qrow {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .stepper {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px;
    border-radius: 999px;
    background: var(--surface);
  }
  .stepper .icon-btn {
    background: var(--surface-2);
  }
  .stepper .icon-btn:disabled {
    opacity: 0.4;
  }
  .stepper output {
    min-width: 2ch;
    text-align: center;
    font-size: 1.2rem;
    font-weight: 800;
  }
  .line-total {
    font-size: 1.25rem;
    font-weight: 800;
  }
  .fmt {
    display: grid;
    gap: 8px;
    padding: 12px 14px;
    border-radius: 12px;
    background: var(--lemon-soft);
    color: var(--lemon-ink);
  }
  .fmt .mini {
    justify-self: start;
    min-height: 44px;
  }
</style>

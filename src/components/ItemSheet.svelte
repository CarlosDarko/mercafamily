<script>
  import { X, Minus, Plus, Trash2, Replace, Star, PackageX, ShoppingBasket, Tag } from '@lucide/svelte'
  import { app, product, unitPrice, updateItem, removeItem, searchCatalog, rememberAlias, listOf, moveItem, toast, isFavorite, toggleFavorite, toggleMissing, recordSaving } from '../lib/data.svelte.js'
  import { imgUrl, unitLabel } from '../lib/catalog.js'
  import ProductInfo from './ProductInfo.svelte'
  import { eur, parseNum } from '../lib/format.js'
  import Sheet from './Sheet.svelte'
  import Alternatives from './Alternatives.svelte'
  import ProductHistory from './ProductHistory.svelte'
  import { cheaperFormat } from '../lib/home.js'
  import CompareStores from './CompareStores.svelte'

  let { id, onclose } = $props()
  const item = $derived(app.items.find((i) => i.id === id))
  const p = $derived(item ? product(item) : null)

  let note = $state(app.items.find((i) => i.id === id)?.note ?? '')
  let manualPrice = $state(app.items.find((i) => i.id === id)?.price ?? '')
  let changing = $state(false)
  let q = $state('')
  // Otros productos: sin el que ya está puesto
  const alternatives = $derived(changing && q.trim().length >= 2 ? searchCatalog(q, 13).filter((r) => r.p.id !== p?.id).slice(0, 12) : [])

  let grade = $state(null)

  $effect(() => {
    if (!item) onclose()
  })

  const setQty = (n) => updateItem(id, { qty: Math.max(1, Math.min(99, n)) })

  function saveNote() {
    const v = note.trim() || null
    if (v !== (item.note ?? null)) updateItem(id, { note: v })
  }
  function savePrice() {
    const v = parseNum(manualPrice)
    updateItem(id, { price: v })
  }
  function useProduct(np) {
    // Si era texto libre ('dinosaurus'), la próxima vez esa palabra lleva a este producto
    if (!item.merc_id) rememberAlias(item.name, np.id)
    else if (changing && q.trim()) rememberAlias(q, np.id)
    // Si el cambio es más barato, cuenta como ahorro
    const before = unitPrice(item)
    if (before != null && np.p < before) {
      recordSaving((before - np.p) * (item.qty || 1), `${np.n} en lugar de ${item.name}`)
      toast(`Ahorráis ${eur((before - np.p) * (item.qty || 1))} con el cambio`)
    }
    updateItem(id, { merc_id: np.id, name: np.n, category: np.c, price: np.p })
    changing = false
    q = ''
  }
  function startChange() {
    changing = true
    // Se busca por lo que es, sin la marca, para que salgan otros formatos y marcas
    q = item.name.replace(/\s+(Hacendado|Deliplus|Bosque Verde|Compy)\b/gi, '').trim()
  }

  const fmt = $derived(p && app.catalog ? cheaperFormat(p, app.catalog.products) : null)
</script>

{#if item}
  <Sheet {onclose} labelledby="sheet-title">
    <div class="top-bar">
      {#if p}
        <button class="icon-btn fav" class:on={isFavorite(p.id)} onclick={() => toggleFavorite(p.id)} aria-pressed={isFavorite(p.id)} aria-label="Favorito">
          <Star size={24} aria-hidden="true" fill={isFavorite(p.id) ? 'currentColor' : 'none'} />
        </button>
      {/if}
      <button class="icon-btn" onclick={onclose} aria-label="Cerrar"><X size={24} aria-hidden="true" /></button>
    </div>
    <div class="prod">
      {#if p && imgUrl(p)}
        <img class="hero" src={imgUrl(p, 240)} alt={p.n} width="112" height="112" />
      {/if}
      <div class="head-text">
        <h2 id="sheet-title">{item.name}</h2>
        {#if p}
          <p class="muted unit">{unitLabel(p)}</p>
          <p class="price num">{eur(p.p)}{#if p.pp}<s class="was">{eur(p.pp)}</s><span class="visually-hidden"> (antes {eur(p.pp)})</span>{/if}</p>
        {/if}
      </div>
    </div>

    {#if fmt}
      <div class="fmt">
        <p><strong>Otro formato sale más barato:</strong> {fmt.p.z} a {eur(fmt.p.r)}/{fmt.p.rf}, un {Math.round(fmt.saving * 100)} % menos que {eur(p.r)}/{p.rf}.</p>
        <button class="btn mini btn-primary" onclick={() => useProduct(fmt.p)}>Cambiar a {fmt.p.z.split(' · ')[0].toLowerCase()}</button>
      </div>
    {/if}

    <section class="blk" aria-labelledby="h-onlist">
      <h3 id="h-onlist" class="bh"><ShoppingBasket size={18} aria-hidden="true" /> En la lista</h3>
      <div class="qrow">
        <div class="stepper" role="group" aria-label="Cantidad">
          <button class="icon-btn" onclick={() => setQty(item.qty - 1)} disabled={item.qty <= 1} aria-label="Una menos"><Minus size={22} aria-hidden="true" /></button>
          <output class="num" aria-live="polite">{item.qty}</output>
          <button class="icon-btn" onclick={() => setQty(item.qty + 1)} aria-label="Una más"><Plus size={22} aria-hidden="true" /></button>
        </div>
        {#if unitPrice(item) != null}<span class="line-total num">{eur(unitPrice(item) * item.qty)}</span>{/if}
      </div>
      <label class="field">
        <span class="visually-hidden">Nota</span>
        <input class="input" bind:value={note} onblur={saveNote} placeholder="Añadir una nota: que estén maduros…" maxlength="120" />
      </label>
      {#if !p}
        <label class="field">
          <span>Precio aproximado</span>
          <input class="input num" bind:value={manualPrice} onblur={savePrice} inputmode="decimal" placeholder="0,00 €" />
          <span class="hint">No está en el catálogo, así que el precio lo pones tú. Mejor aún: elige el producto de Mercadona.</span>
        </label>
      {/if}
      {#if changing}
        <div class="field change">
          <label for="alt-q" class="label">Buscar otro producto</label>
          <input id="alt-q" class="input" bind:value={q} autocomplete="off" />
          <ul class="alts" role="list">
            {#each alternatives as r (r.p.id)}
              <li>
                <button class="alt" onclick={() => useProduct(r.p)}>
                  {#if imgUrl(r.p)}<img src={imgUrl(r.p, 96)} alt="" width="40" height="40" loading="lazy" />{/if}
                  <span class="alt-text"><strong>{r.p.n}</strong><small>{unitLabel(r.p)}</small></span>
                  <span class="num">{eur(r.p.p)}</span>
                </button>
              </li>
            {/each}
          </ul>
          <button class="btn btn-ghost" onclick={() => ((changing = false), (q = ''))}>Cancelar</button>
        </div>
      {/if}
      <div class="acts">
        {#if !changing}
          <button class="act" style="--ac: var(--c-mar)" onclick={startChange}><Replace size={20} aria-hidden="true" />{p ? 'Cambiar' : 'Elegir producto'}</button>
        {/if}
        <button class="act" style="--ac: var(--c-limon)" onclick={() => (toggleMissing(item), onclose())}><PackageX size={20} aria-hidden="true" />{item.missing ? 'Sí había' : 'No había'}</button>
        <button class="act" style="--ac: var(--c-tomate)" onclick={() => removeItem(id)}><Trash2 size={20} aria-hidden="true" />Quitar</button>
      </div>
      {#if app.lists.length > 1}
        <label class="field move">
          <span class="label">Está en la lista</span>
          <select class="input" value={listOf(item)} onchange={(e) => (moveItem(id, e.currentTarget.value), toast(`Movido a ${app.lists.find((l) => l.id === e.currentTarget.value)?.name}`), onclose())}>
            {#each app.lists as l (l.id)}<option value={l.id}>{l.name}</option>{/each}
          </select>
        </label>
      {/if}
    </section>

    {#if p}
      <section class="blk" aria-labelledby="h-price">
        <h3 id="h-price" class="bh"><Tag size={18} aria-hidden="true" /> Precio</h3>
        <ProductHistory {p} />
        {#key p.id}<CompareStores products={[p]} compact />{/key}
      </section>

      <div class="blk-alt">
        <Alternatives {p} {grade} onuse={useProduct} />
      </div>

      <ProductInfo {p} bind:grade />
    {/if}
  </Sheet>
{/if}

<style>
  .fav.on {
    color: #a77f00;
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
  .unit {
    font-size: 0.9rem;
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
  .stepper {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .stepper .icon-btn {
    background: var(--surface-2);
  }
  .stepper .icon-btn:disabled {
    opacity: 0.4;
  }
  output {
    min-width: 2ch;
    text-align: center;
    font-size: 1.3rem;
    font-weight: 800;
  }
  .alts {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 4px;
  }
  .alt {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px;
    min-height: 56px;
    border: 0;
    border-radius: 10px;
    background: var(--surface-2);
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .alt img {
    border-radius: 6px;
    background: #fff;
  }
  .alt-text {
    flex: 1;
    display: grid;
    line-height: 1.3;
  }
  .alt-text small {
    color: var(--ink-2);
  }
  .blk {
    display: grid;
    gap: 12px;
    padding: 14px;
    border-radius: 18px;
    background: var(--paper);
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
  .blk-alt :global(.block) {
    padding: 14px;
    border-radius: 18px;
    background: var(--paper);
  }
  .blk-alt {
    display: grid;
    gap: 18px;
  }
  .blk-alt:empty {
    display: none;
  }
  .qrow {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .stepper {
    padding: 4px;
    border-radius: 999px;
    background: var(--surface);
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
  .acts {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }
  .act {
    display: grid;
    justify-items: center;
    gap: 4px;
    min-height: 64px;
    padding: 10px 6px;
    border: 0;
    border-radius: 14px;
    background: var(--surface);
    color: var(--ink);
    font: inherit;
    font-size: 0.88rem;
    font-weight: 650;
    cursor: pointer;
  }
  .act :global(svg) {
    color: var(--ac);
  }
  .act:active {
    transform: scale(0.96);
  }
  .move select {
    background: var(--surface);
  }
</style>

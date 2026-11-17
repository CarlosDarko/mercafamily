<script>
  import { X, Minus, Plus, Trash2, Replace } from '@lucide/svelte'
  import { app, product, unitPrice, updateItem, removeItem, searchCatalog } from '../lib/data.svelte.js'
  import { imgUrl, unitLabel } from '../lib/catalog.js'
  import { productDetails, nutrition } from '../lib/nutrition.js'
  import { eur, parseNum } from '../lib/format.js'
  import Sheet from './Sheet.svelte'
  import Alternatives from './Alternatives.svelte'

  let { id, onclose } = $props()
  const item = $derived(app.items.find((i) => i.id === id))
  const p = $derived(item ? product(item) : null)

  let note = $state(app.items.find((i) => i.id === id)?.note ?? '')
  let manualPrice = $state(app.items.find((i) => i.id === id)?.price ?? '')
  let changing = $state(false)
  let q = $state('')
  const alternatives = $derived(changing && q.trim().length >= 2 ? searchCatalog(q, 8) : [])

  let info = $state(null)
  let nutri = $state(null)
  let loadingInfo = $state(false)

  $effect(() => {
    const pid = p?.id
    info = null
    nutri = null
    if (!pid) return
    loadingInfo = true
    productDetails(pid).then(async (d) => {
      info = d
      nutri = d?.e ? await nutrition(d.e) : null
      loadingInfo = false
    })
  })

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
    updateItem(id, { merc_id: np.id, name: np.n, category: np.c, price: np.p })
    changing = false
    q = ''
  }
  function startChange() {
    changing = true
    q = item.name
  }

  const NUTRI_COLORS = { a: '#1e7a3c', b: '#5aa636', c: '#c99a06', d: '#d8661c', e: '#c2361f' }
  const n1 = (v) => (v == null ? '—' : String(Math.round(v * 10) / 10).replace('.', ','))
</script>

{#if item}
  <Sheet {onclose} labelledby="sheet-title">
    <div class="sheet-head">
      {#if p && imgUrl(p)}
        <img class="hero" src={imgUrl(p, 240)} alt={p.n} width="88" height="88" />
      {/if}
      <div class="head-text">
        <h2 id="sheet-title">{item.name}</h2>
        {#if p}
          <p class="muted">{unitLabel(p)}</p>
          <p class="price num">{eur(p.p)}{#if p.pp}<span class="was"> antes {eur(p.pp)}</span>{/if}</p>
        {/if}
      </div>
      <button class="icon-btn" onclick={onclose} aria-label="Cerrar"><X size={24} aria-hidden="true" /></button>
    </div>

    <div class="field">
      <span id="qty-label" class="label">Cantidad</span>
      <div class="stepper" role="group" aria-labelledby="qty-label">
        <button class="icon-btn" onclick={() => setQty(item.qty - 1)} disabled={item.qty <= 1} aria-label="Una menos"><Minus size={22} aria-hidden="true" /></button>
        <output class="num" aria-live="polite">{item.qty}</output>
        <button class="icon-btn" onclick={() => setQty(item.qty + 1)} aria-label="Una más"><Plus size={22} aria-hidden="true" /></button>
        {#if unitPrice(item) != null}<span class="muted num">= {eur(unitPrice(item) * item.qty)}</span>{/if}
      </div>
    </div>

    <label class="field">
      <span>Nota</span>
      <input class="input" bind:value={note} onblur={saveNote} placeholder="Por ejemplo: que estén maduros" maxlength="120" />
    </label>

    {#if !p}
      <label class="field">
        <span>Precio aproximado</span>
        <input class="input num" bind:value={manualPrice} onblur={savePrice} inputmode="decimal" placeholder="0,00 €" />
        <span class="hint">No está en el catálogo, así que el precio lo pones tú. Mejor aún: elige el producto de Mercadona.</span>
      </label>
    {/if}

    {#if changing}
      <div class="field">
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
      </div>
    {:else}
      <button class="btn" onclick={startChange}>
        <Replace size={20} aria-hidden="true" />
        {p ? 'Cambiar por otro producto' : 'Elegir producto de Mercadona'}
      </button>
    {/if}

    {#if p}
      <section class="info" aria-labelledby="h-info">
        <h3 id="h-info">Qué lleva</h3>
        {#if loadingInfo}
          <p class="muted">Cargando la ficha…</p>
        {:else}
          {#if nutri && (nutri.grade || nutri.kcal != null)}
            <div class="nutri">
              {#if nutri.grade}
                <p class="grade" style={`--g:${NUTRI_COLORS[nutri.grade]}`}>
                  <span class="grade-letter" aria-hidden="true">{nutri.grade.toUpperCase()}</span>
                  <span>Nutri-Score {nutri.grade.toUpperCase()}</span>
                </p>
              {/if}
              <table>
                <caption class="visually-hidden">Información nutricional por 100 g o 100 ml</caption>
                <thead><tr><th scope="col">Por 100 g</th><th scope="col" class="num">Valor</th></tr></thead>
                <tbody>
                  <tr><th scope="row">Energía</th><td class="num">{n1(nutri.kcal)} kcal</td></tr>
                  <tr><th scope="row">Grasas</th><td class="num">{n1(nutri.fat)} g</td></tr>
                  <tr><th scope="row">De las cuales saturadas</th><td class="num">{n1(nutri.sat)} g</td></tr>
                  <tr><th scope="row">Azúcares</th><td class="num">{n1(nutri.sugars)} g</td></tr>
                  <tr><th scope="row">Proteínas</th><td class="num">{n1(nutri.protein)} g</td></tr>
                  <tr><th scope="row">Sal</th><td class="num">{n1(nutri.salt)} g</td></tr>
                </tbody>
              </table>
              <p class="source">Datos nutricionales de Open Food Facts.</p>
            </div>
          {/if}
          {#if info?.a}
            <p><strong>Alérgenos:</strong> {info.a}</p>
          {/if}
          {#if info?.g}
            <p class="ingredients"><strong>Ingredientes:</strong> {info.g}</p>
          {/if}
          {#if !info?.g && !info?.a && !nutri}
            <p class="muted">Todavía no hay ficha de este producto. Se completa sola en las próximas actualizaciones semanales.</p>
          {/if}
        {/if}
      </section>
    {/if}

    {#if p}
      <Alternatives {p} grade={nutri?.grade ?? null} onuse={useProduct} />
    {/if}

    <button class="btn btn-danger" onclick={() => removeItem(id)}>
      <Trash2 size={20} aria-hidden="true" /> Quitar de la lista
    </button>
  </Sheet>
{/if}

<style>
  .hero {
    width: 88px;
    height: 88px;
    border-radius: 12px;
    background: #fff;
    object-fit: contain;
    flex: none;
  }
  .head-text {
    flex: 1;
    min-width: 0;
    display: grid;
    gap: 2px;
  }
  .head-text h2 {
    padding-top: 4px;
  }
  .price {
    font-weight: 800;
    font-size: 1.15rem;
  }
  .was {
    font-weight: 500;
    font-size: 0.9rem;
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
  .info {
    display: grid;
    gap: 10px;
    padding-top: 6px;
    border-top: 1px solid var(--line);
  }
  .ingredients {
    font-size: 0.95rem;
  }
  .nutri {
    display: grid;
    gap: 8px;
  }
  .grade {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    font-weight: 700;
  }
  .grade-letter {
    display: inline-grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: var(--g);
    color: #fff;
    font-size: 1.2rem;
    font-weight: 800;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    font-size: 0.95rem;
  }
  th,
  td {
    text-align: left;
    padding: 6px 0;
    border-bottom: 1px solid var(--line);
    font-weight: 500;
  }
  thead th {
    font-weight: 700;
    color: var(--ink-2);
  }
  td {
    text-align: right;
  }
  .source {
    font-size: 0.85rem;
    color: var(--ink-2);
  }
</style>

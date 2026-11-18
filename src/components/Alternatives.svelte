<script>
  // Alternativas para un producto: más baratas por kilo o litro, más sanas por Nutri-Score y lo que soléis comprar junto
  import { Plus, Replace } from '@lucide/svelte'
  import { app, addProduct } from '../lib/data.svelte.js'
  import { imgUrl, unitLabel } from '../lib/catalog.js'
  import { productDetails, nutrition } from '../lib/nutrition.js'
  import { eur } from '../lib/format.js'

  let { p, grade, onuse } = $props()

  const family = $derived(app.catalog ? app.catalog.products.filter((x) => x.s === p.s && x.id !== p.id) : [])

  const cheaper = $derived(
    p.r && p.rf
      ? family
          .filter((x) => x.rf === p.rf && x.r && x.r < p.r * 0.97)
          .sort((a, b) => a.r - b.r)
          .slice(0, 3)
      : []
  )

  const together = $derived.by(() => {
    const trips = new Set(app.tripItems.filter((t) => t.merc_id === p.id).map((t) => t.trip_id))
    if (!trips.size) return []
    const onList = new Set(app.items.map((i) => i.merc_id))
    const count = new Map()
    for (const t of app.tripItems) {
      if (!trips.has(t.trip_id) || !t.merc_id || t.merc_id === p.id || onList.has(t.merc_id)) continue
      count.set(t.merc_id, (count.get(t.merc_id) || 0) + 1)
    }
    return [...count.entries()]
      .filter(([, c]) => c >= 2 || trips.size === 1)
      .sort((a, b) => b[1] - a[1])
      .map(([id]) => app.catalog?.byId.get(id))
      .filter(Boolean)
      .slice(0, 4)
  })

  const ORDER = { a: 1, b: 2, c: 3, d: 4, e: 5 }
  let healthier = $state([])
  let checking = $state(false)

  $effect(() => {
    const current = grade
    const candidates = family.slice(0, 14)
    healthier = []
    if (!candidates.length) return
    checking = true
    let alive = true
    Promise.all(
      candidates.map(async (x) => {
        const d = await productDetails(x.id)
        const n = d?.e ? await nutrition(d.e) : null
        return n?.grade ? { x, grade: n.grade } : null
      })
    ).then((list) => {
      if (!alive) return
      checking = false
      healthier = list
        .filter(Boolean)
        .filter((r) => (current ? ORDER[r.grade] < ORDER[current] : ORDER[r.grade] <= 2))
        .sort((a, b) => ORDER[a.grade] - ORDER[b.grade] || a.x.p - b.x.p)
        .slice(0, 3)
    })
    return () => (alive = false)
  })

  const refTxt = (x) => (x.r && x.rf ? `${eur(x.r)}/${x.rf}` : eur(x.p))
</script>

{#snippet card(x, extra, canSwap = true)}
  <li class="alt">
    {#if imgUrl(x)}<img src={imgUrl(x, 96)} alt="" width="44" height="44" loading="lazy" />{/if}
    <span class="alt-text">
      <strong>{x.n}</strong>
      <small>{unitLabel(x)} · <b class="num">{eur(x.p)}</b></small>
      {#if extra}<small class="why">{extra}</small>{/if}
    </span>
    {#if onuse && canSwap}
      <button class="swap" onclick={() => onuse(x)} aria-label={`Cambiar por ${x.n}`}><Replace size={20} aria-hidden="true" /></button>
    {:else}
      <button class="swap" onclick={() => addProduct(x)} aria-label={`Añadir ${x.n}`}><Plus size={20} aria-hidden="true" /></button>
    {/if}
  </li>
{/snippet}

{#if cheaper.length}
  <section class="block" aria-labelledby="h-cheap">
    <h3 id="h-cheap">Más baratas por {p.rf === 'kg' ? 'kilo' : p.rf === 'L' ? 'litro' : p.rf}</h3>
    <ul role="list">
      {#each cheaper as x (x.id)}
        {@render card(x, `${refTxt(x)} frente a ${refTxt(p)}: ahorras un ${Math.round((1 - x.r / p.r) * 100)} %`)}
      {/each}
    </ul>
  </section>
{/if}

{#if healthier.length}
  <section class="block" aria-labelledby="h-health">
    <h3 id="h-health">Más sanas</h3>
    <ul role="list">
      {#each healthier as r (r.x.id)}
        {@render card(r.x, `Nutri-Score ${r.grade.toUpperCase()}${grade ? ` frente a ${grade.toUpperCase()}` : ''}`)}
      {/each}
    </ul>
  </section>
{:else if checking}
  <p class="muted small">Buscando alternativas más sanas…</p>
{/if}

{#if together.length}
  <section class="block" aria-labelledby="h-together">
    <h3 id="h-together">Lo soléis comprar junto</h3>
    <ul role="list">
      {#each together as x (x.id)}
        {@render card(x, null, false)}
      {/each}
    </ul>
  </section>
{/if}

<style>
  .block {
    display: grid;
    gap: 8px;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }
  .alt {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 8px 8px 10px;
    border-radius: 14px;
    background: var(--surface);
  }
  .alt-text strong {
    font-size: 0.95rem;
    line-height: 1.25;
  }
  .alt-text b {
    color: var(--ink);
  }
  .swap {
    flex: none;
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border: 0;
    border-radius: 999px;
    background: color-mix(in srgb, var(--c-mar) 14%, var(--surface));
    color: var(--c-mar);
    cursor: pointer;
  }
  img {
    border-radius: 8px;
    background: #fff;
    object-fit: contain;
    flex: none;
  }
  .alt-text {
    flex: 1;
    min-width: 0;
    display: grid;
    line-height: 1.3;
  }
  .alt-text small {
    color: var(--ink-2);
    font-size: 0.85rem;
  }
  .alt-text .why {
    color: var(--ink);
    font-weight: 600;
  }
  .small {
    font-size: 0.9rem;
  }
</style>

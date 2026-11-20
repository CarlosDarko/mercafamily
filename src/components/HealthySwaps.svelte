<script>
  // Cambios más sanos: productos de la lista con Nutri-Score D o E que tienen en su familia uno A o B a precio parecido
  import { HeartPulse } from '@lucide/svelte'
  import { app, updateItem, toast, recordSaving } from '../lib/data.svelte.js'
  import { productDetails, nutritionFor } from '../lib/nutrition.js'
  import { imgUrl } from '../lib/catalog.js'
  import { eur } from '../lib/format.js'

  let { items } = $props()
  const ORDER = { a: 1, b: 2, c: 3, d: 4, e: 5 }
  let swaps = $state([])
  let dismissed = $state(new Set())

  const gradeOf = async (id) => {
    return (await nutritionFor(app.catalog?.byId.get(id)))?.grade || null
  }

  // Solo se recalcula cuando cambian los productos, no con cada marca o cantidad
  // Lo último que se ha apuntado primero, como mucho 12 productos
  const recent = $derived([...items].filter((i) => i.merc_id && !i.checked).sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).slice(0, 12))
  const key = $derived(recent.map((i) => i.id + ':' + i.merc_id).join('|'))

  $effect(() => {
    key
    const list = recent
    const cat = app.catalog
    if (!cat || !list.length) return
    let alive = true
    swaps = []
    // Cada producto en paralelo y cada sugerencia se enseña en cuanto aparece
    const check = async (it) => {
      const p = cat.byId.get(it.merc_id)
      if (!p) return
      const g = await gradeOf(p.id)
      if (!g || ORDER[g] < 4) return
      // Misma familia primero, y luego familias parecidas de la misma categoría que comparten la primera palabra
      const first = p.tk?.[0]
      const fair = (x) => x.id !== p.id && (!p.r || !x.r || x.rf !== p.rf || x.r <= p.r * 1.3)
      const family = [
        ...cat.products.filter((x) => x.s === p.s && fair(x)).slice(0, 6),
        ...cat.products.filter((x) => x.s !== p.s && x.c === p.c && x.tk?.[0] === first && fair(x)).slice(0, 10)
      ]
      const graded = await Promise.all(family.map(async (x) => ({ x, g: await gradeOf(x.id) })))
      // Vale si mejora al menos dos letras (E -> C) o llega a A o B
      const ok = graded.filter((r) => r.g && (ORDER[r.g] <= 2 || ORDER[r.g] <= ORDER[g] - 2)).sort((a, b) => ORDER[a.g] - ORDER[b.g] || a.x.p - b.x.p)
      if (ok[0] && alive) swaps = [...swaps, { item: it, from: p, fromG: g, to: ok[0].x, toG: ok[0].g }]
    }
    Promise.all(list.map(check)).catch(() => {})
    return () => (alive = false)
  })

  const visible = $derived(swaps.filter((s) => !dismissed.has(s.item.id) && items.some((i) => i.id === s.item.id && i.merc_id === s.from.id)))

  function apply(s) {
    if (s.to.p < s.from.p) recordSaving((s.from.p - s.to.p) * (s.item.qty || 1), `${s.to.n} en lugar de ${s.from.n}`)
    updateItem(s.item.id, { merc_id: s.to.id, name: s.to.n, category: s.to.c, price: s.to.p })
    toast(`Cambiado por ${s.to.n}`)
  }
</script>

{#if visible.length}
  <section class="section swaps" aria-labelledby="h-swaps">
    <h2 id="h-swaps"><HeartPulse size={20} aria-hidden="true" /> Cambios más sanos</h2>
    <ul role="list">
      {#each visible.slice(0, 3) as s (s.item.id)}
        <li>
          {#if imgUrl(s.to)}<img src={imgUrl(s.to, 96)} alt="" width="48" height="48" loading="lazy" />{/if}
          <span class="txt">
            <strong>{s.to.n}</strong>
            <small>En lugar de {s.from.n} · Nutri-Score <b class="g {s.toG}">{s.toG.toUpperCase()}</b> frente a <b class="g {s.fromG}">{s.fromG.toUpperCase()}</b> · {eur(s.to.p)}</small>
          </span>
          <span class="acts">
            <button class="btn mini btn-primary" onclick={() => apply(s)}>Cambiar</button>
            <button class="btn mini btn-ghost" onclick={() => (dismissed = new Set([...dismissed, s.item.id]))}>No</button>
          </span>
        </li>
      {/each}
    </ul>
  </section>
{/if}

<style>
  .swaps {
    padding: 14px 16px;
    border-radius: var(--r);
    background: var(--market-soft);
  }
  h2 {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 1.05rem;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 8px;
  }
  li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px;
    border-radius: 12px;
    background: var(--surface);
  }
  img {
    border-radius: 8px;
    background: var(--surface-2);
    object-fit: contain;
    flex: none;
  }
  .txt {
    flex: 1;
    min-width: 0;
    display: grid;
    line-height: 1.3;
  }
  small {
    color: var(--ink-2);
  }
  .g {
    display: inline-block;
    min-width: 1.4em;
    border-radius: 4px;
    color: #fff;
    text-align: center;
  }
  .g.a {
    background: #1e7a3c;
  }
  .g.b {
    background: #4a8a2a;
  }
  .g.c {
    background: #8a6d00;
  }
  .g.d {
    background: #b85414;
  }
  .g.e {
    background: #c2361f;
  }
  .acts {
    display: grid;
    gap: 4px;
  }
  .mini {
    min-height: 44px;
    padding: 0 14px;
    font-size: 0.9rem;
  }
</style>

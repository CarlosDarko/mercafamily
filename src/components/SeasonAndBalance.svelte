<script>
  // De temporada este mes y equilibrio de lo que compráis (últimos 30 días)
  import { Leaf, Scale } from '@lucide/svelte'
  import { app, searchCatalog, addProduct, toast } from '../lib/data.svelte.js'
  import { seasonWords, balance } from '../lib/home.js'
  import { eur } from '../lib/format.js'

  const MONTH = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(new Date())
  const words = seasonWords()
  // Cada palabra de temporada con su producto fresco de Mercadona (si lo hay)
  const fresh = $derived.by(() => {
    if (!app.catalog) return []
    const fv = app.catalog.categories.find((c) => /fruta y verdura/i.test(c.n))?.id
    return words
      .map((w) => {
        const r = searchCatalog(w, 6).find((x) => x.p.c === fv)
        return r ? { w, p: r.p } : null
      })
      .filter(Boolean)
      .filter((x, i, all) => all.findIndex((y) => y.p.id === x.p.id) === i)
  })
  async function add(x) {
    await addProduct(x.p)
    toast(`Apuntado: ${x.p.n}`)
  }

  const b = $derived(balance(app.tripItems, app.catalog))
  const max = $derived(Math.max(0.01, ...b.groups.map((g) => g.share)))
  const tips = $derived(b.groups.filter((g) => g.tip))
  // Color de cada grupo, el mismo que su familia en la lista
  const GC = { fruta: '--c-huerta', verdura: '--c-huerta', legumbre: '--c-aceite', pescado: '--c-mar', carne: '--c-carne', procesado: '--c-tomate', dulce: '--c-dulce', lacteo: '--c-leche', huevo: '--c-limon', cereal: '--c-horno', otros: '--c-otros' }
</script>

{#if fresh.length}
  <section class="section" aria-labelledby="h-season">
    <h2 id="h-season"><Leaf size={20} aria-hidden="true" /> De temporada en {MONTH}</h2>
    <p class="hint">Suele estar mejor y más barato. Toca para apuntarlo.</p>
    <ul class="chips" role="list">
      {#each fresh as x (x.p.id)}
        <li><button class="chip" onclick={() => add(x)}>{x.p.n.replace(/ Hacendado$/, '')}</button></li>
      {/each}
    </ul>
  </section>
{/if}

{#if b.total > 0}
  <section class="section" aria-labelledby="h-balance">
    <h2 id="h-balance"><Scale size={20} aria-hidden="true" /> Equilibrio de la compra</h2>
    <p class="hint">Reparto del gasto en comida de los últimos 30 días ({eur(b.total)}). Es orientativo: mide lo que gastáis, no las raciones.</p>
    {#if tips.length}
      <ul class="tips" role="list">
        {#each tips as g (g.key)}<li class:high={g.status === 'high'}>{g.tip}</li>{/each}
      </ul>
    {:else}
      <p class="ok">La compra está bastante equilibrada.</p>
    {/if}
    <ul class="bars panel" role="list">
      {#each b.groups as g (g.key)}
        <li>
          <span class="top"><span>{g.label}</span><span class="num">{Math.round(g.share * 100)} %{#if g.target}<small>&nbsp;·&nbsp;recomendado {g.target}</small>{/if}</span></span>
          <span class="track"><span class="fill {g.status}" style={`width:${(g.share / max) * 100}%;--fc:var(${GC[g.key] || '--c-otros'})`}></span></span>
        </li>
      {/each}
    </ul>
  </section>
{/if}

<style>
  h2 :global(svg) {
    vertical-align: -3px;
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
    min-height: 44px;
    padding: 0 14px;
    border-radius: 999px;
    border: 1.5px solid var(--market-2);
    background: var(--surface);
    color: var(--ink);
    font: inherit;
    font-weight: 600;
    font-size: 0.92rem;
    cursor: pointer;
  }
  .tips {
    margin: 0;
    padding: 12px 14px 12px 32px;
    border-radius: 12px;
    background: var(--lemon-soft);
    color: var(--lemon-ink);
    display: grid;
    gap: 4px;
    font-weight: 600;
  }
  .ok {
    padding: 10px 14px;
    border-radius: 12px;
    background: var(--market-soft);
    font-weight: 600;
  }
  .bars {
    list-style: none;
    margin: 0;
    padding: 12px 16px;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 10px;
  }
  .top {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 10px;
    font-size: 0.92rem;
    font-weight: 600;
  }
  .top small {
    font-weight: 500;
    color: var(--ink-2);
  }
  .track {
    display: block;
    height: 10px;
    margin-top: 4px;
    border-radius: 5px;
    background: var(--surface-2);
  }
  .fill {
    display: block;
    height: 100%;
    border-radius: 5px;
    background: var(--fc);
    transform-origin: left;
    animation: grow 0.8s var(--ease-out) both;
  }
  @keyframes grow {
    from {
      transform: scaleX(0);
    }
  }
</style>

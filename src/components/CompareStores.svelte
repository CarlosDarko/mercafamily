<script>
  // Comparar con Dia y Consum por kilo o litro. Uno o varios productos.
  import { Scale } from '@lucide/svelte'
  import { app, compareProducts, compareUrl } from '../lib/data.svelte.js'
  import { eur } from '../lib/format.js'

  let { products, compact = false } = $props()
  let results = $state(null)
  let loading = $state(false)
  let error = $state('')

  async function run() {
    loading = true
    error = ''
    try {
      results = await compareProducts(products)
    } catch {
      error = 'No se ha podido comparar ahora. Inténtalo más tarde.'
    }
    loading = false
  }
  if (compact) run()

  const comparable = (p, x) => x && x.unit && (p.rf === 'L' || p.rf === 'kg') && x.rf === p.rf
  const diff = (p, x) => (comparable(p, x) && p.r ? (x.unit - p.r) / p.r : null)
  const rows = $derived(
    results
      ? products.map((p) => {
          const r = results[p.id] || {}
          return { p, dia: r.dia, consum: r.consum, dDia: diff(p, r.dia), dConsum: diff(p, r.consum) }
        })
      : []
  )
  const cheaperElsewhere = $derived(rows.filter((r) => (r.dDia != null && r.dDia < -0.05) || (r.dConsum != null && r.dConsum < -0.05)))
  const fmtUnit = (v, rf) => (v != null ? `${eur(v)}/${rf}` : '')
</script>

{#if compareUrl()}
  {#if compact}
    <section class="cmp" aria-labelledby="h-cmp">
      <h3 id="h-cmp">En otras tiendas</h3>
      {#if loading}
        <p class="muted">Mirando en Dia y Consum…</p>
      {:else if rows[0]}
        {@const r = rows[0]}
        <ul role="list">
          {#each [['Dia', r.dia, r.dDia], ['Consum', r.consum, r.dConsum]] as [store, x, d]}
            <li>
              <strong>{store}</strong>
              {#if x}
                <span class="nm"><a href={x.url} target="_blank" rel="noopener">{x.name}</a></span>
                <span class="num pr">{eur(x.price)}{#if comparable(r.p, x)} · {fmtUnit(x.unit, x.rf)}{/if}</span>
                {#if d != null}<span class="d num" class:cheap={d < -0.03} class:dear={d > 0.03}>{d < -0.03 ? `${Math.round(-d * 100)} % más barato` : d > 0.03 ? `${Math.round(d * 100)} % más caro` : 'Igual'}</span>{/if}
              {:else}
                <span class="muted nm">No encuentro uno equivalente</span>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
      {#if error}<p class="error-text">{error}</p>{/if}
    </section>
  {:else}
    <section class="section" aria-labelledby="h-cmp-all">
      <h2 id="h-cmp-all"><Scale size={20} aria-hidden="true" /> Comparar con Dia y Consum</h2>
      {#if !results}
        <p class="muted">Mira si lo que más compráis sale más barato por kilo o litro en Dia o en Consum. Carrefour, Eroski, Caprabo y Alcampo no permiten consultar sus precios.</p>
        <button class="btn" onclick={run} disabled={loading || !products.length}>{loading ? 'Comparando…' : `Comparar ${products.length} productos`}</button>
      {:else}
        <p>
          {#if cheaperElsewhere.length}{cheaperElsewhere.length} de {rows.length} salen más baratos fuera de Mercadona.{:else}Mercadona os sale igual o más barato en todo lo comparado.{/if}
        </p>
        <div class="table panel">
          <table>
            <thead><tr><th scope="col">Producto</th><th scope="col" class="num">Mercadona</th><th scope="col" class="num">Dia</th><th scope="col" class="num">Consum</th></tr></thead>
            <tbody>
              {#each rows as r (r.p.id)}
                <tr>
                  <th scope="row">{r.p.n.replace(/ Hacendado$/, '')}</th>
                  <td class="num">{fmtUnit(r.p.r, r.p.rf) || eur(r.p.p)}</td>
                  {#each [[r.dia, r.dDia], [r.consum, r.dConsum]] as [x, d]}
                    <td class="num" class:cheap={d != null && d < -0.05} class:dear={d != null && d > 0.05}>
                      {#if x}{comparable(r.p, x) ? fmtUnit(x.unit, x.rf) : eur(x.price)}{#if d != null && Math.abs(d) >= 0.05}<small>{d < 0 ? '−' : '+'}{Math.round(Math.abs(d) * 100)} %</small>{/if}{:else}—{/if}
                    </td>
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
        <p class="hint">Precios de las webs de Dia y Consum, consultados como mucho una vez por semana. El producto equivalente es el más parecido por nombre, puede no ser idéntico.</p>
      {/if}
      {#if error}<p class="error-text">{error}</p>{/if}
    </section>
  {/if}
{/if}

<style>
  h2 :global(svg) {
    vertical-align: -3px;
  }
  .cmp {
    display: grid;
    gap: 8px;
    padding-top: 6px;
    border-top: 1px solid var(--line);
  }
  .cmp ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 8px;
  }
  .cmp li {
    display: grid;
    gap: 2px;
    padding: 8px 12px;
    border-radius: 10px;
    background: var(--surface-2);
  }
  .nm {
    font-size: 0.92rem;
  }
  .pr {
    font-weight: 700;
  }
  .d {
    font-size: 0.85rem;
    font-weight: 700;
  }
  .cheap {
    color: var(--accent-text);
  }
  .dear {
    color: var(--ink-2);
  }
  .table {
    overflow-x: auto;
    padding: 4px 0;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
  }
  th,
  td {
    padding: 8px 10px;
    border-bottom: 1px solid var(--line);
    text-align: left;
    vertical-align: top;
  }
  thead th {
    color: var(--ink-2);
    font-size: 0.85rem;
  }
  tbody th {
    font-weight: 600;
    min-width: 8rem;
  }
  td.num {
    text-align: right;
    white-space: nowrap;
  }
  td small {
    display: block;
    font-weight: 700;
  }
</style>

<script>
  // Comparar con Dia y Consum por kilo o litro. Uno o varios productos.
  import { Scale } from '@lucide/svelte'
  import { app, compareProducts, compareUrl } from '../lib/data.svelte.js'
  import { eur } from '../lib/format.js'
  import StoreBadge from './StoreBadge.svelte'

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
        <ul role="list" class="stores">
          <li class="here">
            <StoreBadge store="mercadona" />
            <span class="nm">Este producto</span>
            <span class="pr num">{eur(r.p.p)}{#if r.p.rf === 'L' || r.p.rf === 'kg'}<small>{fmtUnit(r.p.r, r.p.rf)}</small>{/if}</span>
          </li>
          {#each [['dia', r.dia, r.dDia], ['consum', r.consum, r.dConsum]] as [store, x, d] (store)}
            <li>
              <StoreBadge {store} />
              {#if x}
                <a class="nm" href={x.url} target="_blank" rel="noopener">{x.name}</a>
                <span class="pr num">
                  {eur(x.price)}{#if comparable(r.p, x)}<small>{fmtUnit(x.unit, x.rf)}</small>{/if}
                  {#if d != null}<span class="d" class:cheap={d < -0.03} class:dear={d > 0.03}>{d < -0.03 ? `${Math.round(-d * 100)} % menos` : d > 0.03 ? `${Math.round(d * 100)} % más` : 'Igual'}</span>{/if}
                </span>
              {:else}
                <span class="muted nm">No hay uno equivalente</span>
              {/if}
            </li>
          {/each}
        </ul>
        <p class="hint">Comparado por {r.p.rf === 'L' ? 'litro' : r.p.rf === 'kg' ? 'kilo' : 'unidad'}.</p>
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
            <thead><tr><th scope="col">Producto</th><th scope="col" class="num"><StoreBadge store="mercadona" size="sm" /></th><th scope="col" class="num"><StoreBadge store="dia" size="sm" /></th><th scope="col" class="num"><StoreBadge store="consum" size="sm" /></th></tr></thead>
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
  }
  .stores {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
  }
  .stores li {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 0;
  }
  .stores li + li {
    border-top: 1px solid var(--line);
  }
  .nm {
    flex: 1;
    min-width: 0;
    font-size: 0.88rem;
    line-height: 1.3;
    color: var(--ink-2);
    text-decoration: none;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  a.nm {
    color: var(--ink);
    text-decoration: underline;
    text-decoration-color: var(--line);
    text-underline-offset: 3px;
  }
  .pr {
    flex: none;
    display: grid;
    justify-items: end;
    font-weight: 750;
    line-height: 1.2;
  }
  .pr small {
    font-size: 0.78rem;
    font-weight: 500;
    color: var(--ink-2);
  }
  .d {
    margin-top: 2px;
    padding: 1px 8px;
    border-radius: 999px;
    background: var(--surface-2);
    font-size: 0.75rem;
    font-weight: 700;
  }
  .cheap {
    background: color-mix(in srgb, var(--c-huerta) 16%, var(--surface));
    color: var(--accent-text);
  }
  .dear {
    background: color-mix(in srgb, var(--c-tomate) 12%, var(--surface));
    color: var(--ink);
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

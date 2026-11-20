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
      // window.__mfCompare: respuesta simulada para las pruebas de pantalla (sin Supabase)
      results = globalThis.__mfCompare ? globalThis.__mfCompare(products) : await compareProducts(products)
    } catch {
      error = 'No se ha podido comparar ahora. Inténtalo más tarde.'
    }
    loading = false
  }
  if (compact) run()

  const comparable = (p, x) => x && x.unit && (p.rf === 'L' || p.rf === 'kg') && x.rf === p.rf
  const diff = (p, x) => (comparable(p, x) && p.r ? (x.unit - p.r) / p.r : null)
  // Unidades de un envase: '24 ud', '12 unidades', 'pack-6', 'x6', '6 x latas'
  const countOf = (t) => {
    const m = String(t || '').toLowerCase().match(/(\d+)\s*(?:ud|uds|unidades|u\b)|pack-?\s*(\d+)|\bx\s*(\d+)\b|(\d+)\s*x\s/)
    const n = m ? Number(m[1] || m[2] || m[3] || m[4]) : null
    return n && n > 1 && n < 500 ? n : null
  }
  // Para la ficha: por kilo o litro si se puede, si no por unidad si se sabe cuántas trae cada envase,
  // y si no por envase (en gris, solo orientativo: pueden ser tamaños distintos)
  const diffAny = (p, x) => {
    if (!x) return null
    if (comparable(p, x) && p.r) return { d: (x.unit - p.r) / p.r, by: 'kg' }
    const a = countOf(p.z) || countOf(p.n)
    const b = countOf(x.name)
    if (a && b && p.p && x.price) return { d: x.price / b / (p.p / a) - 1, by: 'unit', a, b }
    return p.p && x.price ? { d: (x.price - p.p) / p.p, by: 'pack' } : null
  }
  const pct = (o) => {
    const t = o.d < -0.005 ? `${Math.round(-o.d * 100)} % más barato` : o.d > 0.005 ? `${Math.round(o.d * 100)} % más caro` : 'Igual'
    return o.by === 'unit' ? `${t} por unidad` : o.by === 'pack' && t !== 'Igual' ? `${t} el envase` : t
  }
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

{#if compareUrl() || globalThis.__mfCompare}
  {#if compact}
    <section class="cmp" aria-labelledby="h-cmp">
      <h3 id="h-cmp">En otras tiendas</h3>
      {#if loading}
        <p class="muted">Mirando en Dia y Consum…</p>
      {:else if rows[0]}
        {@const r = rows[0]}
        {@const anyPack = [r.dia, r.consum].some((x) => diffAny(r.p, x)?.by === 'pack')}
        <ul role="list" class="stores">
          <li class="here">
            <StoreBadge store="mercadona" size="sm" />
            <div class="info">
              <span class="nm">Este producto</span>
              <span class="pline num"><strong>{eur(r.p.p)}</strong>{#if r.p.rf === 'L' || r.p.rf === 'kg'}<small>{fmtUnit(r.p.r, r.p.rf)}</small>{/if}</span>
            </div>
          </li>
          {#each [['dia', r.dia], ['consum', r.consum]] as [store, x] (store)}
            <li>
              <StoreBadge {store} size="sm" />
              <div class="info">
                {#if x}
                  {@const o = diffAny(r.p, x)}
                  <a class="nm" href={x.url} target="_blank" rel="noopener">{x.name}</a>
                  <span class="pline num">
                    <strong>{eur(x.price)}</strong>
                    {#if comparable(r.p, x)}<small>{fmtUnit(x.unit, x.rf)}</small>{/if}
                    {#if o}<span class="d" class:cheap={o.by !== 'pack' && o.d < -0.005} class:dear={o.by !== 'pack' && o.d > 0.005}>{pct(o)}</span>{/if}
                  </span>
                {:else}
                  <span class="muted nm">No hay uno equivalente</span>
                {/if}
              </div>
            </li>
          {/each}
        </ul>
        <p class="hint">Comparado por {r.p.rf === 'L' ? 'litro' : r.p.rf === 'kg' ? 'kilo' : 'unidad'}.{anyPack ? ' En gris, por envase: pueden ser tamaños distintos.' : ''} Toca el nombre para verlo en su web.</p>
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
                  {#each [r.dia, r.consum] as x}
                    {@const o = diffAny(r.p, x)}
                    <td class="num" class:cheap={o && o.d < -0.005} class:dear={o && o.d > 0.005}>
                      {#if x}{comparable(r.p, x) ? fmtUnit(x.unit, x.rf) : eur(x.price)}{#if o}<small>{Math.abs(o.d) < 0.005 ? 'igual' : `${o.d < 0 ? '−' : '+'}${Math.round(Math.abs(o.d) * 100)} %`}</small>{/if}{:else}—{/if}
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
    align-items: flex-start;
    gap: 12px;
    padding: 10px 0;
  }
  .stores li + li {
    border-top: 1px solid var(--line);
  }
  .stores li > :global(.badge) {
    margin-top: 2px;
    min-width: 5.6rem;
  }
  .info {
    flex: 1;
    min-width: 0;
    display: grid;
    gap: 3px;
  }
  .nm {
    font-size: 0.88rem;
    line-height: 1.3;
    color: var(--ink-2);
    overflow-wrap: anywhere;
  }
  a.nm {
    color: var(--ink);
    text-decoration: underline;
    text-decoration-color: var(--line);
    text-underline-offset: 3px;
  }
  .pline {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 2px 8px;
  }
  .pline strong {
    font-size: 1.05rem;
    font-weight: 800;
  }
  .pline small {
    font-size: 0.78rem;
    color: var(--ink-2);
  }
  .d {
    padding: 1px 8px;
    border-radius: 999px;
    background: var(--surface-2);
    font-size: 0.78rem;
    font-weight: 700;
    white-space: nowrap;
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

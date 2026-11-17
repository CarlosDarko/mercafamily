<script>
  import { TrendingUp, TrendingDown, Trash2, ReceiptText } from '@lucide/svelte'
  import { app, deleteTrip, updateTrip } from '../lib/data.svelte.js'
  import { spendByWeek, monthTotal, byCategory, priceChanges } from '../lib/insights.js'
  import { loadHistory, imgUrl } from '../lib/catalog.js'
  import { eur, fmtDay, fmtLong, fmtMonth, pct, isoDate, parseNum } from '../lib/format.js'

  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const prevY = m === 0 ? y - 1 : y
  const prevM = m === 0 ? 11 : m - 1

  const thisMonth = $derived(monthTotal(app.trips, y, m))
  const lastMonth = $derived(monthTotal(app.trips, prevY, prevM))
  const tripsMonth = $derived(app.trips.filter((t) => t.date.startsWith(`${y}-${String(m + 1).padStart(2, '0')}`)).length)
  const weeks = $derived(spendByWeek(app.trips, 12))
  const budget = $derived(app.household?.weekly_budget ? Number(app.household.weekly_budget) : null)
  const maxWeek = $derived(Math.max(budget || 0, ...weeks.map((w) => w.total), 1))
  const avgWeek = $derived.by(() => {
    const used = weeks.slice(-8).filter((w) => w.total > 0)
    return used.length ? used.reduce((s, w) => s + w.total, 0) / used.length : null
  })

  const since30 = isoDate(new Date(Date.now() - 30 * 86400000))
  const cats = $derived(byCategory(app.tripItems, app.catalog, since30).slice(0, 8))
  const maxCat = $derived(Math.max(...cats.map((c) => c.total), 1))
  const stores = $derived.by(() => {
    const map = new Map()
    for (const t of app.trips.filter((t) => t.date >= since30)) map.set(t.store, (map.get(t.store) || 0) + Number(t.total || 0))
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  })

  let history = $state(null)
  loadHistory().then((h) => (history = h))
  const changes = $derived.by(() => {
    if (!history || !app.catalog) return []
    const ids = new Set([...app.tripItems.map((t) => t.merc_id), ...app.items.map((i) => i.merc_id)].filter(Boolean))
    return priceChanges(history, ids, app.catalog).slice(0, 8)
  })

  let editing = $state(null)
  let editValue = $state('')
  function startEdit(t) {
    editing = t.id
    editValue = String(t.total).replace('.', ',')
  }
  function saveEdit(t) {
    const v = parseNum(editValue)
    if (v != null && v > 0) updateTrip(t.id, { total: v, total_is_estimate: false })
    editing = null
  }
  function remove(t) {
    if (confirm(`¿Borrar la compra del ${fmtLong(t.date)} (${eur(t.total)})? No se puede deshacer.`)) deleteTrip(t.id)
  }
  const linesOf = (t) => app.tripItems.filter((x) => x.trip_id === t.id)

  const diff = $derived(lastMonth > 0 ? (thisMonth - lastMonth) / lastMonth : null)
</script>

<div class="page">
  <div class="page-head">
    <h1>Gastos</h1>
    {#if app.trips.length}
      <p class="lead">
        En {fmtMonth(now)} lleváis <strong class="num">{eur(thisMonth)}</strong> en {tripsMonth}
        {tripsMonth === 1 ? 'compra' : 'compras'}{#if diff != null}, {diff <= 0 ? 'por debajo' : 'por encima'} de todo el mes pasado ({eur(lastMonth)}){/if}.
        {#if avgWeek}De media gastáis <span class="num">{eur(avgWeek)}</span> a la semana.{/if}
      </p>
    {:else}
      <p class="lead muted">Aquí verás cuánto gastáis por semana, mes, tienda y categoría. Aparece en cuanto terminéis la primera compra desde la lista.</p>
    {/if}
  </div>

  {#if app.trips.length}
    <section class="section panel pad" aria-labelledby="h-weeks">
      <div class="row">
        <h2 id="h-weeks" class="spacer">Últimas 12 semanas</h2>
        {#if budget}<span class="legend"><span class="dash" aria-hidden="true"></span>Presupuesto {eur(budget)}</span>{/if}
      </div>
      <figure class="chart" aria-labelledby="chart-cap">
        <div class="bars" style={`--max:${maxWeek}`}>
          {#if budget}<div class="budget-line" style={`bottom:${(budget / maxWeek) * 100}%`} aria-hidden="true"></div>{/if}
          {#each weeks as w, i (w.key)}
            <div class="bar-col" title={`Semana del ${fmtDay(w.start)}: ${eur(w.total)}`}>
              <div class="bar" class:current={i === weeks.length - 1} class:over={budget && w.total > budget} style={`height:${(w.total / maxWeek) * 100}%`}></div>
            </div>
          {/each}
        </div>
        <div class="axis" aria-hidden="true">
          <span>{fmtDay(weeks[0].start)}</span><span>Esta semana</span>
        </div>
        <figcaption id="chart-cap" class="visually-hidden">Gasto por semana en las últimas 12 semanas. Los datos están en la tabla siguiente.</figcaption>
      </figure>
      <details>
        <summary>Ver los datos por semana</summary>
        <table class="data">
          <thead><tr><th scope="col">Semana del</th><th scope="col">Compras</th><th scope="col">Gasto</th></tr></thead>
          <tbody>
            {#each [...weeks].reverse() as w (w.key)}
              <tr><td>{fmtDay(w.start)}</td><td class="num">{w.trips}</td><td class="num">{eur(w.total)}</td></tr>
            {/each}
          </tbody>
        </table>
      </details>
    </section>

    {#if cats.length}
      <section class="section" aria-labelledby="h-cats">
        <h2 id="h-cats">En qué se va, últimos 30 días</h2>
        <ul class="hbars panel pad" role="list">
          {#each cats as c (c.name)}
            <li>
              <span class="hb-label">{c.name}</span>
              <span class="hb-track"><span class="hb-fill" style={`width:${(c.total / maxCat) * 100}%`}></span></span>
              <span class="num hb-val">{eur(c.total)}</span>
            </li>
          {/each}
        </ul>
        {#if stores.length > 1}
          <p class="muted">Por tienda: {stores.map(([s, v]) => `${s} ${eur(v)}`).join(', ')}.</p>
        {/if}
      </section>
    {/if}
  {/if}

  {#if changes.length}
    <section class="section" aria-labelledby="h-prices">
      <h2 id="h-prices">Cambios de precio en lo que compráis</h2>
      <ul class="changes panel" role="list">
        {#each changes as c (c.p.id)}
          <li>
            {#if imgUrl(c.p)}<img src={imgUrl(c.p, 96)} alt="" width="40" height="40" loading="lazy" />{/if}
            <span class="ch-text"><strong>{c.p.n}</strong><small class="num">{eur(c.prev)} → {eur(c.now)}{c.when ? ` · ${fmtDay(c.when)}` : ''}</small></span>
            <span class="ch-diff num" class:up={c.diff > 0}>
              {#if c.diff > 0}<TrendingUp size={18} aria-hidden="true" />{:else}<TrendingDown size={18} aria-hidden="true" />{/if}
              <span class="visually-hidden">{c.diff > 0 ? 'Sube' : 'Baja'}</span>{pct(c.diff)}
            </span>
          </li>
        {/each}
      </ul>
      <p class="hint">Los precios de Mercadona se actualizan solos cada semana.</p>
    </section>
  {/if}

  {#if app.trips.length}
    <section class="section" aria-labelledby="h-trips">
      <h2 id="h-trips">Compras</h2>
      <ul class="trips" role="list">
        {#each app.trips as t (t.id)}
          <li class="panel">
            <details>
              <summary>
                <ReceiptText size={20} aria-hidden="true" />
                <span class="t-main"><strong>{fmtLong(t.date)}</strong><small>{t.store} · {t.items_count} {t.items_count === 1 ? 'producto' : 'productos'}{t.created_by ? ` · ${t.created_by}` : ''}</small></span>
                <span class="num t-total">{eur(Number(t.total))}{#if t.total_is_estimate}<small>previsto</small>{/if}</span>
              </summary>
              <div class="t-body">
                <ul class="lines" role="list">
                  {#each linesOf(t) as l (l.id)}
                    <li><span>{l.qty > 1 ? `${l.qty} × ` : ''}{l.name}</span><span class="num">{l.price != null ? eur(l.price * (l.qty || 1)) : '—'}</span></li>
                  {/each}
                </ul>
                {#if editing === t.id}
                  <form class="row" onsubmit={(e) => (e.preventDefault(), saveEdit(t))}>
                    <label class="visually-hidden" for={`tot-${t.id}`}>Total del ticket</label>
                    <input id={`tot-${t.id}`} class="input num" bind:value={editValue} inputmode="decimal" />
                    <button class="btn btn-primary" type="submit">Guardar</button>
                  </form>
                {:else}
                  <div class="row">
                    <button class="btn" onclick={() => startEdit(t)}>Poner el total del ticket</button>
                    <span class="spacer"></span>
                    <button class="icon-btn danger" onclick={() => remove(t)} aria-label="Borrar esta compra"><Trash2 size={20} aria-hidden="true" /></button>
                  </div>
                {/if}
              </div>
            </details>
          </li>
        {/each}
      </ul>
    </section>
  {/if}
</div>

<style>
  .lead {
    font-size: 1.1rem;
    max-width: 60ch;
  }
  .pad {
    padding: 16px;
  }
  .legend {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.85rem;
    color: var(--ink-2);
  }
  .dash {
    width: 18px;
    border-top: 2px dashed var(--tomato);
  }
  .chart {
    margin: 0;
  }
  .bars {
    position: relative;
    height: 160px;
    display: grid;
    grid-template-columns: repeat(12, minmax(0, 1fr));
    align-items: end;
    gap: 6px;
    border-bottom: 1px solid var(--line);
  }
  .bar-col {
    height: 100%;
    display: flex;
    align-items: end;
  }
  .bar {
    width: 100%;
    min-height: 2px;
    border-radius: 6px 6px 2px 2px;
    background: var(--market-soft);
    transition: height 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .bar.current {
    background: var(--market-2);
  }
  .bar.over {
    background: var(--tomato);
  }
  .budget-line {
    position: absolute;
    left: 0;
    right: 0;
    border-top: 2px dashed var(--tomato);
    pointer-events: none;
  }
  .axis {
    display: flex;
    justify-content: space-between;
    font-size: 0.85rem;
    color: var(--ink-2);
    margin-top: 6px;
  }
  details summary {
    cursor: pointer;
    min-height: 44px;
    display: flex;
    align-items: center;
    font-weight: 600;
  }
  .data {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.95rem;
  }
  .data th,
  .data td {
    padding: 6px 4px;
    border-bottom: 1px solid var(--line);
    text-align: left;
  }
  .data td.num,
  .data th:not(:first-child) {
    text-align: right;
  }
  .hbars {
    list-style: none;
    margin: 0;
    display: grid;
    gap: 10px;
  }
  .hbars li {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas: 'label val' 'track track';
    align-items: center;
    gap: 4px 10px;
    font-size: 0.95rem;
  }
  .hb-label {
    grid-area: label;
  }
  .hb-val {
    grid-area: val;
  }
  .hb-track {
    grid-area: track;
  }
  @media (min-width: 560px) {
    .hbars li {
      grid-template-columns: minmax(0, 13rem) minmax(0, 1fr) auto;
      grid-template-areas: 'label track val';
    }
  }
  .hb-track {
    height: 12px;
    border-radius: 6px;
    background: var(--surface-2);
    overflow: hidden;
  }
  .hb-fill {
    display: block;
    height: 100%;
    border-radius: 6px;
    background: var(--market-2);
  }
  .hb-val {
    font-weight: 700;
  }
  .changes {
    list-style: none;
    margin: 0;
    padding: 4px 0;
  }
  .changes li {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    border-bottom: 1px solid var(--line);
  }
  .changes li:last-child {
    border-bottom: 0;
  }
  .changes img {
    border-radius: 8px;
    background: #fff;
    object-fit: contain;
  }
  .ch-text {
    flex: 1;
    min-width: 0;
    display: grid;
    line-height: 1.25;
  }
  .ch-text small {
    color: var(--ink-2);
  }
  .ch-diff {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-weight: 800;
    color: var(--market-2);
  }
  @media (prefers-color-scheme: light) {
    .ch-diff {
      color: var(--market);
    }
  }
  .ch-diff.up {
    color: var(--tomato);
  }
  .trips {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 8px;
  }
  .trips summary {
    list-style: none;
    gap: 12px;
    padding: 12px 16px;
    min-height: 64px;
  }
  .trips summary::-webkit-details-marker {
    display: none;
  }
  .t-main {
    flex: 1;
    display: grid;
    line-height: 1.25;
  }
  .t-main strong::first-letter {
    text-transform: uppercase;
  }
  .t-main small {
    color: var(--ink-2);
    font-weight: 500;
  }
  .t-total {
    display: grid;
    justify-items: end;
    font-weight: 800;
  }
  .t-total small {
    font-weight: 500;
    font-size: 0.8rem;
    color: var(--ink-2);
  }
  .t-body {
    padding: 0 16px 16px;
    display: grid;
    gap: 12px;
  }
  .lines {
    list-style: none;
    margin: 0;
    padding: 0;
    font-size: 0.95rem;
  }
  .lines li {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 6px 0;
    border-bottom: 1px dashed var(--line);
  }
  .danger {
    color: var(--tomato);
  }
</style>

<script>
  import TicketImport from './TicketImport.svelte'
  import { Camera, TrendingUp, TrendingDown, Trash2, ReceiptText, FileText, PiggyBank, ChartPie, Store } from '@lucide/svelte'
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
  let report = $state(location.hash.includes('informe'))
  let ticket = $state(location.hash.includes('ticket'))
  let opened = $state(new Set())
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
  // La alternativa más barata por kilo o litro dentro de la misma familia
  function cheaperThan(p) {
    if (!p.r || !p.rf || !app.catalog) return null
    return app.catalog.products.filter((x) => x.s === p.s && x.rf === p.rf && x.r && x.r < p.r * 0.9 && x.id !== p.id).sort((a, b) => a.r - b.r)[0] || null
  }
  // Lo que más compráis (para comparar con otras tiendas)
  const topBought = $derived.by(() => {
    const c = new Map()
    for (const t of app.tripItems) if (t.merc_id) c.set(t.merc_id, (c.get(t.merc_id) || 0) + 1)
    return [...c.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => app.catalog?.byId.get(id)).filter(Boolean).slice(0, 15)
  })
  const linesOf = (t) => app.tripItems.filter((x) => x.trip_id === t.id)

  const diff = $derived(lastMonth > 0 ? (thisMonth - lastMonth) / lastMonth : null)
  import BasketHealth from './BasketHealth.svelte'
  import MonthBreakdown from './MonthBreakdown.svelte'
  import CompareStores from './CompareStores.svelte'
  import TripElsewhere from './TripElsewhere.svelte'
  import BasketVsIpc from './BasketVsIpc.svelte'
  import MonthReport from './MonthReport.svelte'
</script>

<div class="page">
  <div class="page-head">
    <div class="row">
      <h1 class="spacer">Gastos</h1>
      {#if app.trips.length}<button class="btn" onclick={() => (report = true)}><FileText size={18} aria-hidden="true" /> Informe</button>{/if}
    </div>
    <button class="upload" onclick={() => (ticket = true)}>
      <span class="u-ic" aria-hidden="true"><Camera size={22} /></span>
      <span class="u-tx"><strong>Subir un ticket</strong><small>Foto del ticket de papel, aunque sea largo o en catalán</small></span>
    </button>
    {#if app.trips.length}
      <p class="lead">
        En {fmtMonth(now)} lleváis <strong class="num">{eur(thisMonth)}</strong> en {tripsMonth}
        {tripsMonth === 1 ? 'compra' : 'compras'}{#if diff != null}, {diff <= 0 ? 'por debajo' : 'por encima'} de todo el mes pasado ({eur(lastMonth)}){/if}.
        {#if avgWeek}De media gastáis <span class="num">{eur(avgWeek)}</span> a la semana.{/if}
      </p>
    {:else}
      <div class="empty-g rise">
        <ul class="feats" role="list">
          <li style="--fc: var(--c-mar)"><span class="f-ic"><ChartPie size={22} aria-hidden="true" /></span>En qué se va el dinero, por familia de producto</li>
          <li style="--fc: var(--c-huerta)"><span class="f-ic"><PiggyBank size={22} aria-hidden="true" /></span>Presupuesto, objetivos y lo que ahorráis</li>
          <li style="--fc: var(--c-tomate)"><span class="f-ic"><TrendingUp size={22} aria-hidden="true" /></span>Lo que sube de precio y vuestra cesta frente al IPC</li>
          <li style="--fc: var(--c-uva)"><span class="f-ic"><Store size={22} aria-hidden="true" /></span>Cuánto os habría costado en Dia o Consum</li>
        </ul>
        <p class="muted">Todo aparece solo en cuanto terminéis la primera compra desde la lista.</p>
      </div>
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

    <MonthBreakdown />
  {/if}

  <BasketVsIpc />

  <BasketHealth />

  {#if topBought.length}
    <CompareStores products={topBought} />
  {/if}

  {#if changes.length}
    <section class="section" aria-labelledby="h-prices">
      <h2 id="h-prices">Cambios de precio en lo que compráis</h2>
      <ul class="changes panel" role="list">
        {#each changes as c (c.p.id)}
          <li>
            {#if imgUrl(c.p)}<img src={imgUrl(c.p, 96)} alt="" width="40" height="40" loading="lazy" />{/if}
            <span class="ch-text">
              <strong>{c.p.n}</strong>
              <small class="num">{eur(c.prev)} → {eur(c.now)}{c.when ? ` · ${fmtDay(c.when)}` : ''}</small>
              {#if c.diff > 0 && cheaperThan(c.p)}<small class="alt">Más barato: {cheaperThan(c.p).n} ({eur(cheaperThan(c.p).r)}/{cheaperThan(c.p).rf})</small>{/if}
            </span>
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
            <details ontoggle={(e) => e.currentTarget.open && (opened = new Set([...opened, t.id]))}>
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
                {#if opened.has(t.id)}<TripElsewhere lines={linesOf(t)} />{/if}
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

{#if report}
  <MonthReport onclose={() => (report = false)} />
{/if}

{#if ticket}
  <TicketImport onclose={() => (ticket = false)} />
{/if}

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
    background: color-mix(in srgb, var(--c-mar) 30%, var(--surface));
    transition: height 0.5s var(--ease-out);
    transform-origin: bottom;
    animation: rise-bar 0.7s var(--ease-out) both;
  }
  @keyframes rise-bar {
    from {
      transform: scaleY(0);
    }
  }
  .bar.current {
    background: var(--c-mar);
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
  @media (min-width: 560px) {
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
    line-height: 1.3;
  }
  .ch-text small {
    color: var(--ink-2);
  }
  .alt {
    color: var(--accent-text) !important;
    font-weight: 600;
  }
  .ch-diff {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-weight: 800;
    color: var(--accent-text);
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
    line-height: 1.3;
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
  .empty-g {
    display: grid;
    gap: 14px;
    margin-top: 12px;
    padding: 18px;
    border-radius: 22px;
    background: var(--surface);
    box-shadow: var(--shadow);
  }
  .feats {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 12px;
  }
  .feats li {
    display: flex;
    align-items: center;
    gap: 12px;
    font-weight: 600;
    line-height: 1.3;
  }
  .f-ic {
    flex: none;
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 14px;
    background: color-mix(in srgb, var(--fc) 15%, var(--surface));
    color: var(--fc);
  }
  .upload {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    margin-top: 10px;
    padding: 12px 14px;
    border: 0;
    border-radius: 18px;
    background: var(--surface);
    box-shadow: var(--shadow);
    color: var(--ink);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .u-ic {
    flex: none;
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 14px;
    background: color-mix(in srgb, var(--c-mar) 15%, var(--surface));
    color: var(--c-mar);
  }
  .u-tx {
    display: grid;
    line-height: 1.25;
  }
  .u-tx small {
    color: var(--ink-2);
  }
</style>

<script>
  // Informe mensual: se puede guardar en PDF (imprimir) o compartir como texto
  import { X, Printer, Share2 } from '@lucide/svelte'
  import { app, settings, loadIpc, toast } from '../lib/data.svelte.js'
  import { monthTotal, basketInflation, priceChanges } from '../lib/insights.js'
  import { balance } from '../lib/home.js'
  import { eur } from '../lib/format.js'

  let { onclose, month: initial } = $props()
  let dlg
  const months = [...new Set(app.trips.map((t) => t.date.slice(0, 7)))].sort().reverse()
  let month = $state(initial || months[0] || new Date().toISOString().slice(0, 7))
  let ipc = $state(null)
  loadIpc().then((x) => (ipc = x))

  const NAME = (m) => new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(new Date(m + '-15'))
  const prevOf = (m) => {
    const [y, mm] = m.split('-').map(Number)
    const d = new Date(y, mm - 2, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }
  const pct = (v) => `${v > 0 ? '+' : ''}${Math.round(v * 100)} %`

  const r = $derived.by(() => {
    const [y, mm] = month.split('-').map(Number)
    const trips = app.trips.filter((t) => t.date.startsWith(month))
    const lines = app.tripItems.filter((t) => t.bought_on.startsWith(month))
    const total = monthTotal(app.trips, y, mm - 1)
    const [py, pm] = prevOf(month).split('-').map(Number)
    const prev = monthTotal(app.trips, py, pm - 1)
    const cats = new Map()
    const prods = new Map()
    for (const l of lines) {
      const c = app.catalog?.cats.get(l.category)?.n || 'Otros'
      cats.set(c, (cats.get(c) || 0) + (l.price || 0) * (l.qty || 1))
      const k = l.merc_id || l.name
      const e = prods.get(k) || { name: l.name.replace(/ Hacendado$/, ''), n: 0, spend: 0 }
      e.n += l.qty || 1
      e.spend += (l.price || 0) * (l.qty || 1)
      prods.set(k, e)
    }
    const people = new Map()
    for (const t of trips) people.set(t.created_by || 'Sin nombre', (people.get(t.created_by || 'Sin nombre') || 0) + Number(t.total || 0))
    const saved = (settings().savings || []).filter((s) => s.at.startsWith(month)).reduce((s, x) => s + x.amount, 0)
    const ids = new Set(lines.map((l) => l.merc_id).filter(Boolean))
    const rises = app.history ? priceChanges(app.history, ids, app.catalog).filter((c) => c.when?.startsWith(month)) : []
    const endOfMonth = new Date(y, mm, 0)
    const bal = balance(lines, app.catalog, 40, endOfMonth)
    return {
      trips: trips.length,
      total,
      prev,
      avg: trips.length ? total / trips.length : 0,
      cats: [...cats.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8),
      top: [...prods.values()].sort((a, b) => b.spend - a.spend).slice(0, 8),
      people: [...people.entries()].sort((a, b) => b[1] - a[1]),
      saved,
      rises: rises.slice(0, 6),
      tips: bal.groups.filter((g) => g.tip).map((g) => g.tip)
    }
  })
  const infl = $derived(ipc && app.catalog ? basketInflation(app.tripItems, app.catalog, ipc) : null)
  const maxCat = $derived(Math.max(1, ...r.cats.map((c) => c[1])))

  function summary() {
    const lines = [
      `MercaFamily · ${NAME(month)}`,
      `Gasto: ${eur(r.total)} en ${r.trips} compras${r.prev ? ` (${pct((r.total - r.prev) / r.prev)} frente a ${NAME(prevOf(month))})` : ''}`,
      ...r.cats.slice(0, 4).map(([c, v]) => `· ${c}: ${eur(v)}`),
      r.saved ? `Ahorro con alternativas: ${eur(r.saved)}` : null,
      infl ? `Vuestra cesta: ${pct(infl.change)}${infl.ipc != null ? ` (IPC alimentos ${pct(infl.ipc)})` : ''}` : null
    ]
    return lines.filter(Boolean).join('\n')
  }
  async function share() {
    const text = summary()
    try {
      if (navigator.share) await navigator.share({ title: `Informe de ${NAME(month)}`, text })
      else {
        await navigator.clipboard.writeText(text)
        toast('Resumen copiado')
      }
    } catch {}
  }
  $effect(() => {
    dlg.showModal()
  })
</script>

<dialog bind:this={dlg} class="report" aria-labelledby="rep-title" oncancel={(e) => (e.preventDefault(), onclose())}>
  <div class="sheet">
    <div class="sheet-head no-print">
      <label class="visually-hidden" for="rep-month">Mes</label>
      <select id="rep-month" class="input" bind:value={month}>
        {#each months.length ? months : [month] as m (m)}<option value={m}>{NAME(m)}</option>{/each}
      </select>
      <button class="icon-btn" onclick={onclose} aria-label="Cerrar"><X size={24} aria-hidden="true" /></button>
    </div>

    <h2 id="rep-title">Informe de {NAME(month)}</h2>
    <p class="brand">MercaFamily · {app.household?.name || 'Casa'}</p>

    <div class="kpis">
      <div><span class="lbl">Gasto</span><span class="big num">{eur(r.total)}</span></div>
      <div><span class="lbl">Compras</span><span class="big num">{r.trips}</span></div>
      <div><span class="lbl">Media por compra</span><span class="big num">{eur(r.avg)}</span></div>
    </div>
    {#if r.prev}
      <p>Frente a {NAME(prevOf(month))} ({eur(r.prev)}): <strong>{pct((r.total - r.prev) / r.prev)}</strong>, {r.total > r.prev ? `${eur(r.total - r.prev)} más` : `${eur(r.prev - r.total)} menos`}.</p>
    {/if}

    {#if r.cats.length}
      <h3>En qué se fue</h3>
      <ul class="bars" role="list">
        {#each r.cats as [c, v] (c)}
          <li><span class="t"><span>{c}</span><span class="num">{eur(v)}</span></span><span class="track"><span style={`width:${(v / maxCat) * 100}%`}></span></span></li>
        {/each}
      </ul>
    {/if}

    {#if r.top.length}
      <h3>Lo que más compráis</h3>
      <ol class="top">
        {#each r.top as p (p.name)}<li><span>{p.name}</span><span class="num">{p.n} · {eur(p.spend)}</span></li>{/each}
      </ol>
    {/if}

    {#if r.people.length > 1}
      <h3>Quién hizo la compra</h3>
      <p>{r.people.map(([n, v]) => `${n} ${eur(v)}`).join(' · ')}</p>
    {/if}

    {#if r.rises.length}
      <h3>Cambios de precio este mes</h3>
      <ul class="plain" role="list">
        {#each r.rises as c (c.p.id)}<li>{c.p.n.replace(/ Hacendado$/, '')}: {eur(c.prev)} → {eur(c.now)} ({pct(c.diff)})</li>{/each}
      </ul>
    {/if}

    {#if r.saved || infl}
      <h3>Ahorro e inflación</h3>
      {#if r.saved}<p>Ahorro con alternativas más baratas: <strong>{eur(r.saved)}</strong>.</p>{/if}
      {#if infl}<p>Lo que compráis ha cambiado un <strong>{pct(infl.change)}</strong> desde vuestras primeras compras{#if infl.ipc != null}, frente al {pct(infl.ipc)} del IPC de alimentos (INE){/if}.</p>{/if}
    {/if}

    {#if r.tips.length}
      <h3>Para comer mejor</h3>
      <ul class="plain" role="list">{#each r.tips as t (t)}<li>{t}</li>{/each}</ul>
    {/if}

    <div class="row no-print">
      <button class="btn" onclick={share}><Share2 size={18} aria-hidden="true" /> Compartir</button>
      <span class="spacer"></span>
      <button class="btn btn-primary" onclick={() => window.print()}><Printer size={18} aria-hidden="true" /> Guardar en PDF</button>
    </div>
  </div>
</dialog>

<style>
  .report {
    width: min(100% - 16px, 720px);
  }
  .report .sheet {
    gap: 12px;
  }
  .sheet-head select {
    flex: 1;
  }
  h2 {
    font-size: 1.6rem;
  }
  h2::first-letter {
    text-transform: uppercase;
  }
  h3 {
    margin-top: 10px;
  }
  .brand {
    color: var(--ink-2);
    font-weight: 600;
  }
  .kpis {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }
  .kpis div {
    display: grid;
    gap: 2px;
    padding: 10px;
    border-radius: 12px;
    background: var(--surface-2);
  }
  .lbl {
    font-size: 0.8rem;
    font-weight: 650;
    color: var(--ink-2);
  }
  .big {
    font-size: 1.25rem;
    font-weight: 800;
  }
  .bars {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 8px;
  }
  .t {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    font-size: 0.92rem;
  }
  .track {
    display: block;
    height: 8px;
    border-radius: 4px;
    background: var(--surface-2);
  }
  .track span {
    display: block;
    height: 100%;
    border-radius: 4px;
    background: var(--market-2);
  }
  .top {
    margin: 0;
    padding-left: 22px;
    display: grid;
    gap: 4px;
  }
  .top li span:last-child,
  .t span:last-child {
    white-space: nowrap;
  }
  .top li {
    padding-left: 4px;
  }
  .top li span:first-child::after {
    content: ' · ';
    color: var(--ink-2);
  }
  .plain {
    margin: 0;
    padding-left: 20px;
    display: grid;
    gap: 4px;
  }
  @media print {
    :global(body) {
      background: #fff !important;
    }
    :global(body *) {
      visibility: hidden;
    }
    .report,
    .report :global(*) {
      visibility: visible;
    }
    .report {
      position: absolute;
      inset: 0;
      width: 100%;
      max-height: none;
      box-shadow: none;
      border-radius: 0;
      background: #fff;
      color: #111;
    }
    .report::backdrop {
      display: none;
    }
    .no-print {
      display: none !important;
    }
  }
</style>

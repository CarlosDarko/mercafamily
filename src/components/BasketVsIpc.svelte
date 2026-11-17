<script>
  // Cuánto ha subido lo que compráis frente al IPC de alimentos del INE
  import { TrendingUp } from '@lucide/svelte'
  import { app, loadIpc } from '../lib/data.svelte.js'
  import { basketInflation } from '../lib/insights.js'
  import { eur, fmtLong } from '../lib/format.js'

  let ipc = $state(null)
  loadIpc().then((x) => (ipc = x))
  const r = $derived(ipc && app.catalog ? basketInflation(app.tripItems, app.catalog, ipc) : null)
  const pct = (v) => `${v > 0 ? '+' : ''}${(Math.round(v * 1000) / 10).toLocaleString('es-ES')} %`
  const MONTH = (m) => new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(new Date(m + '-15'))
  const lastAnnual = $derived(ipc?.annual?.[ipc.annual.length - 1])
</script>

{#if r}
  <section class="section" aria-labelledby="h-ipc">
    <h2 id="h-ipc"><TrendingUp size={20} aria-hidden="true" /> Vuestra cesta frente al IPC</h2>
    <div class="panel pad">
      <div class="cmp">
        <div><span class="lbl">Lo que compráis</span><span class="big num" class:up={r.change > 0.001}>{pct(r.change)}</span></div>
        {#if r.ipc != null}<div><span class="lbl">IPC de alimentos</span><span class="big num muted-big">{pct(r.ipc)}</span></div>{/if}
      </div>
      <p>
        Desde el {fmtLong(r.since)}, el precio de los {r.products} productos que compráis ha cambiado un <strong>{pct(r.change)}</strong>{#if r.ipc != null}, frente al <strong>{pct(r.ipc)}</strong> de los alimentos en España (INE, hasta {MONTH(r.ipcUntil)}){/if}.
        {#if r.ipc != null}{r.change > r.ipc + 0.005 ? 'Vuestra cesta sube más que la media.' : r.change < r.ipc - 0.005 ? 'Vuestra cesta sube menos que la media.' : 'Vuestra cesta va como la media.'}{/if}
      </p>
      {#if r.movers.length}
        <ul role="list">
          {#each r.movers as m (m.p.id)}
            <li><span>{m.p.n.replace(/ Hacendado$/, '')}</span><span class="num" class:up={m.change > 0}>{eur(m.from)} → {eur(m.to)} ({pct(m.change)})</span></li>
          {/each}
        </ul>
      {/if}
      {#if lastAnnual}<p class="hint">En el último año, los alimentos han subido un {String(lastAnnual[1]).replace('.', ',')} % en España ({MONTH(lastAnnual[0])}). Fuente: INE.</p>{/if}
    </div>
  </section>
{/if}

<style>
  h2 :global(svg) {
    vertical-align: -3px;
  }
  .pad {
    padding: 16px;
    display: grid;
    gap: 12px;
  }
  .cmp {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
  .cmp div {
    display: grid;
    gap: 2px;
    padding: 12px;
    border-radius: 12px;
    background: var(--surface-2);
  }
  .lbl {
    font-size: 0.85rem;
    font-weight: 650;
    color: var(--ink-2);
  }
  .big {
    font-size: 1.6rem;
    font-weight: 800;
  }
  .up {
    color: var(--tomato);
  }
  .muted-big {
    color: var(--ink);
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 4px;
    font-size: 0.92rem;
  }
  li {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    border-bottom: 1px dashed var(--line);
    padding: 4px 0;
  }
  li span:last-child {
    white-space: nowrap;
  }
</style>

<script>
  // Al terminar la compra, el ticket se 'imprime' con el total. Sello si la semana queda por debajo del presupuesto.
  import { app } from '../lib/data.svelte.js'
  import { weekTotal } from '../lib/insights.js'
  import { eur, fmtLong } from '../lib/format.js'
  import TripElsewhere from './TripElsewhere.svelte'

  let dlg
  const t = $derived(app.lastTrip?.trip)
  const lines = $derived(app.lastTrip?.lines || [])
  const budget = $derived(app.household?.weekly_budget ? Number(app.household.weekly_budget) : null)
  const week = $derived(weekTotal(app.trips))
  const under = $derived(budget != null && week <= budget)

  $effect(() => {
    dlg.showModal()
  })
  // Al cerrar, el foco vuelve al contenido (no al enlace 'Saltar al contenido')
  const close = () => ((app.lastTrip = null), requestAnimationFrame(() => document.getElementById('main')?.focus({ preventScroll: true })))
</script>

<dialog bind:this={dlg} class="tk" aria-labelledby="tk-title" oncancel={(e) => (e.preventDefault(), close())} onclick={(e) => e.target === dlg && close()}>
  <div class="paper">
    <h2 id="tk-title">Compra guardada</h2>
    <p class="meta">{t.store} · {fmtLong(t.date)}</p>
    <ul role="list">
      {#each lines.slice(0, 12) as l (l.id)}
        <li><span>{l.qty > 1 ? `${l.qty} × ` : ''}{l.name}</span><span class="num">{l.price != null ? eur(l.price * (l.qty || 1)) : '—'}</span></li>
      {/each}
      {#if lines.length > 12}<li class="more"><span>y {lines.length - 12} más</span><span></span></li>{/if}
    </ul>
    <p class="total"><span>Total{t.total_is_estimate ? ' previsto' : ''}</span><span class="num">{eur(Number(t.total))}</span></p>
    <TripElsewhere {lines} />
    {#if budget != null}
      <p class="week">Esta semana lleváis {eur(week)} de {eur(budget)}.</p>
      {#if under}<p class="stamp" aria-label="Por debajo del presupuesto">Por debajo del presupuesto</p>{/if}
    {/if}
    <button class="btn btn-primary btn-block" onclick={close}>Hecho</button>
  </div>
</dialog>

<style>
  .tk {
    background: transparent;
    box-shadow: none;
    width: min(100% - 32px, 380px);
    overflow: visible;
  }
  .tk[open] {
    animation: none;
  }
  .paper {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 10px;
    padding: 22px 20px 26px;
    background: var(--surface);
    color: var(--ink);
    border-radius: 12px 12px 4px 4px;
    box-shadow: 0 24px 60px -20px rgb(0 0 0 / 0.5);
    -webkit-mask: radial-gradient(circle 6px at 50% calc(100% + 2px), transparent 98%, #000) 0 0 / 16px 100% repeat-x;
    mask: radial-gradient(circle 6px at 50% calc(100% + 2px), transparent 98%, #000) 0 0 / 16px 100% repeat-x;
    animation: print 1.1s cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  @keyframes print {
    from {
      clip-path: inset(0 0 100% 0);
      transform: translateY(-24px);
    }
    to {
      clip-path: inset(0 0 0 0);
      transform: none;
    }
  }
  h2 {
    text-align: center;
  }
  .meta,
  .week {
    text-align: center;
    color: var(--ink-2);
    font-size: 0.9rem;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 10px 0;
    border-top: 2px dashed var(--line);
    border-bottom: 2px dashed var(--line);
    display: grid;
    gap: 4px;
    font-size: 0.92rem;
  }
  li {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    min-width: 0;
  }
  li span:last-child {
    flex: none;
  }
  li span:first-child {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .more {
    color: var(--ink-2);
  }
  .total {
    display: flex;
    justify-content: space-between;
    font-size: 1.4rem;
    font-weight: 800;
  }
  .stamp {
    justify-self: center;
    margin: 6px 0 12px;
    padding: 6px 14px;
    border: 3px solid #1e7a3c;
    border-radius: 10px;
    color: #1e7a3c;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-size: 0.85rem;
    transform: rotate(-6deg);
    animation: stamp 0.45s 1s cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  @keyframes stamp {
    from {
      opacity: 0;
      transform: rotate(-6deg) scale(1.8);
    }
  }
</style>

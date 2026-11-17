<script>
  // Historial de un producto: vuestras compras y la evolución de su precio en Mercadona
  import { productHistory } from '../lib/data.svelte.js'
  import { eur, fmtDay } from '../lib/format.js'

  let { p } = $props()
  const h = $derived(productHistory(p.id))
  const points = $derived.by(() => {
    const pts = h.prices.map(([d, v]) => ({ d, v }))
    if (!pts.length || pts[pts.length - 1].v !== p.p) pts.push({ d: null, v: p.p })
    return pts
  })
  const minV = $derived(Math.min(...points.map((x) => x.v)))
  const maxV = $derived(Math.max(...points.map((x) => x.v)))
  const W = 300
  const H = 72
  const path = $derived(
    points
      .map((pt, i) => {
        const x = points.length === 1 ? W / 2 : (i / (points.length - 1)) * (W - 12) + 6
        const y = maxV === minV ? H / 2 : H - 8 - ((pt.v - minV) / (maxV - minV)) * (H - 16)
        return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(' ')
  )
  const first = $derived(points[0])
  const change = $derived(first && first.v !== p.p ? (p.p - first.v) / first.v : 0)
</script>

<section class="hist" aria-labelledby="h-hist">
  <h3 id="h-hist">Vuestro historial</h3>
  {#if h.bought.length}
    <p>Lo habéis comprado <strong>{h.bought.length} {h.bought.length === 1 ? 'vez' : 'veces'}</strong>, la última el {fmtDay(h.bought[h.bought.length - 1].bought_on)}.</p>
  {:else}
    <p class="muted">Todavía no lo habéis comprado con la app.</p>
  {/if}
  {#if points.length > 1}
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={`Precio: de ${eur(first.v)} a ${eur(p.p)}`}>
        <path d={path} fill="none" stroke="var(--accent-text)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
      </svg>
      <figcaption class="num">
        {first.d ? `Desde ${fmtDay(first.d)}: ` : 'Antes: '}{eur(first.v)} → {eur(p.p)}
        {#if change}<strong class:up={change > 0}>{change > 0 ? '+' : ''}{Math.round(change * 100)} %</strong>{/if}
      </figcaption>
    </figure>
  {:else}
    <p class="hint">Sin cambios de precio desde que la app lo sigue.</p>
  {/if}
</section>

<style>
  .hist {
    display: grid;
    gap: 8px;
    padding-top: 6px;
    border-top: 1px solid var(--line);
  }
  figure {
    margin: 0;
    display: grid;
    gap: 4px;
  }
  figcaption {
    font-size: 0.9rem;
    color: var(--ink-2);
  }
  figcaption strong {
    color: var(--accent-text);
    margin-left: 6px;
  }
  figcaption strong.up {
    color: var(--tomato);
  }
</style>

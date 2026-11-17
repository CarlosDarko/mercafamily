<script>
  // Lo que habría costado esta compra en Dia y en Consum
  import { tripElsewhere, compareUrl } from '../lib/data.svelte.js'
  import { eur } from '../lib/format.js'

  let { lines } = $props()
  let r = $state(null)
  let loading = $state(!!compareUrl())
  if (compareUrl()) tripElsewhere(lines).then((x) => ((r = x), (loading = false))).catch(() => (loading = false))

  const rows = $derived(
    r
      ? [
          ['Mercadona', r.merc],
          ['Dia', r.dia],
          ['Consum', r.consum]
        ].sort((a, b) => a[1] - b[1])
      : []
  )
</script>

{#if loading}
  <p class="cmp muted">Comparando con Dia y Consum…</p>
{:else if r}
  <div class="cmp">
    <p class="head">Lo mismo en otras tiendas <small>({r.compared} de {r.total} productos comparables)</small></p>
    <ul role="list">
      {#each rows as [store, v], i (store)}
        <li class:best={i === 0}>
          <span>{store}</span>
          <span class="num">{eur(v)}{#if store !== 'Mercadona'}<small> {v < r.merc ? `${eur(r.merc - v)} menos` : `${eur(v - r.merc)} más`}</small>{/if}</span>
        </li>
      {/each}
    </ul>
  </div>
{/if}

<style>
  .cmp {
    display: grid;
    gap: 6px;
    font-size: 0.92rem;
  }
  .head {
    font-weight: 700;
  }
  .head small {
    font-weight: 500;
    color: var(--ink-2);
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 2px;
  }
  li {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    padding: 4px 8px;
    border-radius: 8px;
  }
  li.best {
    background: var(--market-soft);
    font-weight: 700;
  }
  small {
    color: var(--ink-2);
    font-weight: 500;
    margin-left: 4px;
  }
</style>

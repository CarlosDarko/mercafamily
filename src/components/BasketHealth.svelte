<script>
  // Nota de salud de la cesta: Nutri-Score de lo comprado en los últimos 30 días (Open Food Facts)
  import { app } from '../lib/data.svelte.js'
  import { productDetails, nutrition } from '../lib/nutrition.js'
  import { isoDate } from '../lib/format.js'

  const LETTERS = ['a', 'b', 'c', 'd', 'e']
  const COLORS = { a: '#1e7a3c', b: '#4a8a2a', c: '#8a6d00', d: '#b85414', e: '#c2361f' }
  let counts = $state(null)
  let loading = $state(false)

  const since = isoDate(new Date(Date.now() - 30 * 86400000))
  const ids = $derived([...new Set(app.tripItems.filter((t) => t.merc_id && t.bought_on >= since).map((t) => t.merc_id))].slice(0, 40))
  const key = $derived(ids.join('|'))

  $effect(() => {
    key
    if (!ids.length) return
    let alive = true
    loading = true
    Promise.all(
      ids.map(async (id) => {
        const d = await productDetails(id)
        return d?.e ? (await nutrition(d.e))?.grade : null
      })
    ).then((grades) => {
      if (!alive) return
      const c = { a: 0, b: 0, c: 0, d: 0, e: 0 }
      for (const g of grades) if (g) c[g]++
      counts = c
      loading = false
    })
    return () => (alive = false)
  })

  const total = $derived(counts ? LETTERS.reduce((s, l) => s + counts[l], 0) : 0)
  const avg = $derived(total ? LETTERS[Math.round(LETTERS.reduce((s, l, i) => s + counts[l] * i, 0) / total)] : null)
  const healthy = $derived(total ? Math.round(((counts.a + counts.b) / total) * 100) : 0)
</script>

{#if ids.length}
  <section class="section" aria-labelledby="h-health">
    <h2 id="h-health">Salud de la compra</h2>
    <div class="panel pad">
      {#if loading && !counts}
        <p class="muted">Calculando con Open Food Facts…</p>
      {:else if total}
        <div class="head">
          <span class="big" style={`background:${COLORS[avg]}`} aria-hidden="true">{avg.toUpperCase()}</span>
          <p>Nota media <strong>{avg.toUpperCase()}</strong> en los últimos 30 días. El {healthy} % de lo que compráis es A o B.</p>
        </div>
        <div class="dist" role="img" aria-label={LETTERS.map((l) => `${counts[l]} con ${l.toUpperCase()}`).join(', ')}>
          {#each LETTERS as l}
            {#if counts[l]}<span style={`flex:${counts[l]};background:${COLORS[l]}`}>{l.toUpperCase()}</span>{/if}
          {/each}
        </div>
        <p class="hint">{total} productos con Nutri-Score conocido. En la lista os propondremos cambios más sanos cuando los haya a precio parecido.</p>
      {:else}
        <p class="muted">Open Food Facts aún no tiene la nota de lo que habéis comprado.</p>
      {/if}
    </div>
  </section>
{/if}

<style>
  .pad {
    padding: 16px;
    display: grid;
    gap: 12px;
  }
  .head {
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .big {
    display: grid;
    place-items: center;
    width: 52px;
    height: 52px;
    border-radius: 14px;
    color: #fff;
    font-size: 1.6rem;
    font-weight: 800;
    flex: none;
  }
  .dist {
    display: flex;
    height: 28px;
    border-radius: 8px;
    overflow: hidden;
    gap: 2px;
  }
  .dist span {
    display: grid;
    place-items: center;
    min-width: 24px;
    color: #fff;
    font-size: 0.8rem;
    font-weight: 800;
  }
</style>

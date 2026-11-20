<script>
  // 'Qué lleva' de un producto: Nutri-Score, nutrientes, alérgenos e ingredientes (Mercadona y Open Food Facts)
  import { Leaf } from '@lucide/svelte'
  import { productDetails, nutritionFor } from '../lib/nutrition.js'

  let { p, grade = $bindable(null) } = $props()
  let info = $state(null)
  let nutri = $state(null)
  let loadingInfo = $state(false)

  $effect(() => {
    const pid = p?.id
    info = null
    nutri = null
    grade = null
    if (!pid) return
    loadingInfo = true
    productDetails(pid).then(async (d) => {
      if (p?.id !== pid) return
      info = d
      nutri = await nutritionFor(p)
      grade = nutri?.grade ?? null
      loadingInfo = false
    })
  })
  const NUTRI_COLORS = { a: '#1e7a3c', b: '#5aa636', c: '#c99a06', d: '#d8661c', e: '#c2361f' }
  const n1 = (v) => (v == null ? '—' : String(Math.round(v * 10) / 10).replace('.', ','))
</script>

<section class="blk" aria-labelledby="h-info">
  <h3 id="h-info" class="bh"><Leaf size={18} aria-hidden="true" /> Qué lleva</h3>
  {#if loadingInfo}
    <p class="muted">Cargando la ficha…</p>
  {:else}
    {#if nutri && (nutri.grade || nutri.kcal != null)}
      {#if nutri.grade}
        <div class="ns" aria-label={`Nutri-Score ${nutri.grade.toUpperCase()}`}>
          {#each ['a', 'b', 'c', 'd', 'e'] as g (g)}
            <span class="ns-l" class:on={g === nutri.grade} style={`--g:${NUTRI_COLORS[g]}`} aria-hidden="true">{g.toUpperCase()}</span>
          {/each}
          <span class="ns-t">Nutri-Score{#if nutri.est || nutri.typical}&nbsp;<small>aprox.</small>{/if}</span>
        </div>
      {/if}
      {#if nutri.kcal != null}
        <ul class="nut" role="list" aria-label="Por 100 g o 100 ml">
          {#each [['Energía', nutri.kcal, 'kcal'], ['Grasas', nutri.fat, 'g'], ['Saturadas', nutri.sat, 'g'], ['Azúcares', nutri.sugars, 'g'], ['Proteínas', nutri.protein, 'g'], ['Sal', nutri.salt, 'g']] as [label, v, u] (label)}
            <li><strong class="num">{n1(v)}<small>&nbsp;{u}</small></strong><span>{label}</span></li>
          {/each}
        </ul>
        <p class="source">
          {#if nutri.typical}Por 100 g. Valores típicos de este alimento (tablas de composición), no de este envase en concreto. Nutri-Score calculado por la app.
          {:else if nutri.est}Por 100 g o 100 ml. Datos de Open Food Facts. Nutri-Score calculado por la app con esos datos.
          {:else}Por 100 g o 100 ml. Datos de Open Food Facts.{/if}
        </p>
      {/if}
    {/if}
    {#if info?.a}
      <p class="alg"><strong>Alérgenos:</strong> {info.a}</p>
    {/if}
    {#if info?.g}
      <details class="ingr">
        <summary>Ingredientes</summary>
        <p>{info.g}</p>
      </details>
    {/if}
    {#if !info?.g && !info?.a && !nutri}
      <p class="muted">Todavía no hay ficha de este producto. Se completa sola en las próximas actualizaciones semanales.</p>
    {/if}
  {/if}
</section>

<style>
  .blk {
    display: grid;
    gap: 12px;
    padding: 14px;
    border-radius: 18px;
    background: var(--paper);
  }
  .bh {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 1rem;
  }
  .bh :global(svg) {
    color: var(--c-huerta);
  }
  .source {
    font-size: 0.85rem;
    color: var(--ink-2);
  }
  .ns {
    display: flex;
    align-items: center;
    gap: 3px;
  }
  .ns-l {
    display: grid;
    place-items: center;
    width: 28px;
    height: 30px;
    border-radius: 6px;
    background: var(--g);
    color: #fff;
    font-weight: 800;
    font-size: 0.85rem;
    opacity: 0.35;
  }
  .ns-l.on {
    width: 38px;
    height: 42px;
    font-size: 1.15rem;
    opacity: 1;
    box-shadow: 0 0 0 3px var(--surface), 0 0 0 5px var(--g);
    margin: 0 4px;
  }
  .ns-t small {
    font-weight: 600;
    color: var(--ink-2);
  }
  .ns-t {
    margin-left: 8px;
    font-weight: 700;
    font-size: 0.9rem;
  }
  .nut {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 6.5rem), 1fr));
    gap: 6px;
  }
  .nut li {
    display: grid;
    gap: 2px;
    padding: 10px 8px;
    border-radius: 12px;
    background: var(--surface);
    text-align: center;
  }
  .nut strong {
    font-size: 1.1rem;
    font-weight: 800;
  }
  .nut small {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--ink-2);
  }
  .nut span {
    font-size: 0.78rem;
    color: var(--ink-2);
    font-weight: 600;
  }
  .alg {
    padding: 10px 12px;
    border-radius: 12px;
    background: color-mix(in srgb, var(--c-tomate) 10%, var(--surface));
    font-size: 0.92rem;
  }
  .ingr summary {
    cursor: pointer;
    font-weight: 700;
    min-height: 44px;
    display: flex;
    align-items: center;
  }
  .ingr p {
    font-size: 0.9rem;
    color: var(--ink-2);
  }
</style>

<script>
  // '¿Os queda…?': tres cosas que según la cuenta se acaban, para confirmarlas con un toque.
  // Así la despensa estimada (y 'Con lo que hay') acierta más sin rellenar nada.
  import { Refrigerator } from '@lucide/svelte'
  import { app, settings, pantrySet } from '../lib/data.svelte.js'
  import { pantry, pantryDoubts } from '../lib/home.js'

  const doubts = $derived(pantryDoubts(pantry(app.tripItems, settings().pantry || {}), settings().pantry || {}).filter((d) => !app.items.some((i) => !i.checked && (d.merc_id ? i.merc_id === d.merc_id : i.name.toLowerCase() === d.name.toLowerCase()))))
</script>

{#if doubts.length}
  <section class="check rise" aria-labelledby="h-check">
    <h2 id="h-check"><Refrigerator size={18} aria-hidden="true" /> ¿Os queda…?</h2>
    <ul role="list">
      {#each doubts as d (d.key)}
        <li>
          <span class="nm">{d.name.replace(/ Hacendado$/, '')}</span>
          <button class="btn sm" onclick={() => pantrySet(d, 'ok')} aria-label={`Sí queda ${d.name}`}>Sí</button>
          <button class="btn sm no" onclick={() => pantrySet(d, 'out')} aria-label={`Se acabó ${d.name}, apuntarlo`}>Se acabó</button>
        </li>
      {/each}
    </ul>
  </section>
{/if}

<style>
  .check {
    margin-top: 14px;
    display: grid;
    gap: 8px;
    padding: 14px 16px;
    border-radius: var(--r);
    background: var(--surface);
    box-shadow: var(--shadow);
  }
  h2 {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 1rem;
  }
  h2 :global(svg) {
    color: var(--c-hielo);
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }
  li {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px 8px;
  }
  .nm {
    flex: 1 1 10rem;
    min-width: 0;
    font-weight: 600;
  }
  .sm {
    min-height: 44px;
    padding: 0 14px;
    font-size: 0.9rem;
  }
  .no {
    background: color-mix(in srgb, var(--c-tomate) 14%, var(--surface));
  }
</style>

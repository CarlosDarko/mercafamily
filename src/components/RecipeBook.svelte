<script>
  // Recetario: buscar y filtrar recetas sencillas y saludables, y las guardadas de casa
  import { Search, Clock, Baby, Leaf, BookOpen } from '@lucide/svelte'
  import { app } from '../lib/data.svelte.js'
  import { KB, QUICK_MIN } from '../lib/recipes-kb.js'
  import { tagsOf } from '../lib/home.js'
  import { norm } from '../lib/format.js'
  import RecipeSheet from './RecipeSheet.svelte'

  let q = $state('')
  let filter = $state('todas')
  let open = $state(null)
  let showAll = $state(false)
  const month = new Date().getMonth() + 1

  const FILTERS = [
    ['todas', 'Todas'],
    ['comida', 'Comidas'],
    ['cena', 'Cenas'],
    ['rapidas', `Rápidas`],
    ['peques', 'Para peques'],
    ['temporada', 'De temporada'],
    ['legumbre', 'Legumbre'],
    ['pescado', 'Pescado'],
    ['verdura', 'Verdura'],
    ['huevo', 'Huevo'],
    ['carne', 'Carne'],
    ['pasta', 'Pasta'],
    ['arroz', 'Arroz'],
    ['casa', 'Nuestras']
  ]
  // Las de casa que no vienen del recetario, con el mismo formato
  const own = $derived(app.recipes.filter((r) => !r.kb_id).map((r) => ({ ...r, tags: tagsOf(r), own: true })))
  const all = $derived([...KB, ...own])
  const list = $derived.by(() => {
    const words = norm(q).split(' ').filter(Boolean)
    return all.filter((r) => {
      if (words.length) {
        const text = norm(r.name + ' ' + (r.ingredients || []).map((i) => i.q || i.name).join(' '))
        if (!words.every((w) => text.includes(w))) return false
      }
      const slot = r.slot || r.meta?.slot
      switch (filter) {
        case 'comida':
        case 'cena':
          return !slot || slot === 'ambas' || slot === filter
        case 'rapidas':
          return (r.time || r.meta?.time || 99) <= QUICK_MIN
        case 'peques':
          return r.kids || r.meta?.kids
        case 'temporada':
          return (r.season || r.meta?.season || []).includes(month)
        case 'casa':
          return r.own || app.recipes.some((x) => x.kb_id === r.id)
        case 'todas':
          return true
        default:
          return (r.tags || []).includes(filter)
      }
    })
  })
  const shown = $derived(showAll || q || filter !== 'todas' ? list : list.slice(0, 8))
</script>

<section class="section" aria-labelledby="h-book">
  <h2 id="h-book"><BookOpen size={20} aria-hidden="true" /> Recetario</h2>
  <p class="hint">{KB.length} recetas sencillas y saludables de cocina de casa, para 3. Al abrir una podéis añadir sus ingredientes a la lista o ponerla en el menú.</p>
  <div class="search">
    <Search size={18} aria-hidden="true" />
    <label class="visually-hidden" for="book-q">Buscar receta o ingrediente</label>
    <input id="book-q" class="input" bind:value={q} placeholder="Buscar: lentejas, calabacín, merluza…" autocomplete="off" />
  </div>
  <div class="filters" role="group" aria-label="Filtrar recetas">
    {#each FILTERS as [k, label] (k)}
      <button class="pill" aria-pressed={filter === k} onclick={() => (filter = k)}>{label}</button>
    {/each}
  </div>
  {#if !list.length}
    <p class="muted">No hay recetas con ese filtro.</p>
  {:else}
    <ul class="cards" role="list">
      {#each shown as r (r.id || r.name)}
        <li>
          <button class="card" onclick={() => (open = r)}>
            <span class="name">{r.name}</span>
            <span class="meta">
              {#if r.time || r.meta?.time}<span><Clock size={14} aria-hidden="true" /> {r.time || r.meta?.time} min</span>{/if}
              {#if r.kids || r.meta?.kids}<span><Baby size={14} aria-hidden="true" /> Peques</span>{/if}
              {#if (r.season || r.meta?.season || []).includes(month)}<span class="season"><Leaf size={14} aria-hidden="true" /> Temporada</span>{/if}
              {#if r.own}<span>De casa</span>{/if}
            </span>
            <span class="tags">{(r.tags || []).join(' · ')}</span>
          </button>
        </li>
      {/each}
    </ul>
    {#if shown.length < list.length}
      <button class="btn btn-ghost" onclick={() => (showAll = true)}>Ver las {list.length} recetas</button>
    {/if}
  {/if}
</section>

{#if open}
  <RecipeSheet recipe={open} onclose={() => (open = null)} />
{/if}

<style>
  h2 :global(svg) {
    vertical-align: -3px;
  }
  .search {
    position: relative;
  }
  .search :global(svg) {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--ink-2);
  }
  .search .input {
    padding-left: 42px;
  }
  .filters {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    margin: 0 calc(var(--gutter) * -1);
    padding: 2px var(--gutter) 6px;
    scrollbar-width: none;
  }
  .pill {
    flex: none;
    min-height: 44px;
    padding: 0 14px;
    border-radius: 999px;
    border: 1.5px solid var(--line);
    background: var(--surface);
    color: var(--ink);
    font: inherit;
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
  }
  .pill[aria-pressed='true'] {
    background: var(--primary-bg);
    border-color: var(--primary-bg);
    color: var(--primary-ink);
  }
  .cards {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 15rem), 1fr));
    gap: 8px;
  }
  .card {
    width: 100%;
    height: 100%;
    display: grid;
    align-content: start;
    gap: 4px;
    padding: 12px 14px;
    border: 0;
    border-radius: var(--r);
    background: var(--surface);
    box-shadow: var(--shadow);
    color: var(--ink);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .name {
    font-weight: 700;
    line-height: 1.3;
  }
  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 10px;
    font-size: 0.82rem;
    color: var(--ink-2);
    font-weight: 600;
  }
  .meta span {
    display: inline-flex;
    align-items: center;
    gap: 3px;
  }
  .season {
    color: var(--accent-text);
  }
  .tags {
    font-size: 0.8rem;
    color: var(--ink-2);
  }
</style>

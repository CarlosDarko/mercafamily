<script>
  // Recetario: buscar y filtrar recetas sencillas y saludables, y las guardadas de casa
  import { Search, Clock, Baby, Leaf, Zap, PartyPopper, Snowflake, Heart, Refrigerator, Clock3, ThumbsDown } from '@lucide/svelte'
  import { app, settings, activeSnoozed } from '../lib/data.svelte.js'
  import { KB, QUICK_MIN } from '../lib/recipes-kb.js'
  import { tagsOf, atHome, pantry } from '../lib/home.js'
  import { norm } from '../lib/format.js'
  import { recipeLook } from '../lib/look.js'
  import RecipeSheet from './RecipeSheet.svelte'

  const lookOf = recipeLook
  let q = $state('')
  let filter = $state('todas')
  let open = $state(null)
  let showAll = $state(false)
  const month = new Date().getMonth() + 1

  const FILTERS = [
    ['todas', 'Todas'],
    ['hay', 'Con lo que hay'],
    ['expres', 'Exprés'],
    ['divertidas', 'Divertidas'],
    ['temporada', 'De temporada'],
    ['gustan', 'Os gustan'],
    ['comida', 'Comidas'],
    ['cena', 'Cenas'],
    ['rapidas', `Rápidas`],
    ['peques', 'Para peques'],
    ['sincocinar', 'Sin cocinar'],
    ['merienda', 'Meriendas'],
    ['apartadas', 'Apartadas'],
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
  const ratings = $derived(settings().ratings || {})
  const snoozed = $derived(activeSnoozed())
  // Lo que hay en casa según las últimas compras (sin lo que se ha terminado)
  const stock = $derived(pantry(app.tripItems, settings().pantry || {}).filter((p) => p.state !== 'out'))
  const have = $derived(stock.map((p) => p.name))
  const haveIds = $derived(new Set(stock.filter((p) => p.merc_id).map((p) => p.merc_id)))
  const list = $derived.by(() => {
    const words = norm(q).split(' ').filter(Boolean)
    if (filter === 'hay')
      return all
        .map((r) => ({ r, h: atHome(r, have, haveIds) }))
        .filter((x) => x.h.have > 0 && x.h.ratio >= 0.5 && !snoozed[x.r.name])
        .sort((a, b) => b.h.ratio - a.h.ratio || a.h.total - b.h.total)
        .map((x) => ({ ...x.r, home: x.h }))
        .filter((r) => !words.length || words.every((w) => norm(r.name).includes(w)))
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
        case 'expres':
          return r.express || (r.time || r.meta?.time || 99) <= 10
        case 'divertidas':
          return r.fun
        case 'sincocinar':
          return r.nocook
        case 'merienda':
          return slot === 'merienda'
        case 'gustan':
          return ratings[r.name] === 1
        case 'apartadas':
          return ratings[r.name] === -1 || !!snoozed[r.name]
        case 'casa':
          return r.own || app.recipes.some((x) => x.kb_id === r.id)
        case 'todas':
          return slot !== 'merienda'
        default:
          return (r.tags || []).includes(filter)
      }
    })
  })
  const shown = $derived(showAll || q || filter !== 'todas' ? list : list.slice(0, 8))
</script>

<section class="section first-r" aria-labelledby="h-book">
  <h2 id="h-book" class="visually-hidden">Recetario</h2>
  <p class="hint">{KB.length} recetas sanas para 3: exprés, divertidas, de temporada y de toda la vida.</p>
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
  {#if filter === 'apartadas'}
    <p class="hint">Las que habéis marcado con 'Ahora no' (vuelven solas a las 3 semanas) o 'No nos gusta' (salen mucho menos). Abrid una para cambiarlo.</p>
  {/if}
  {#if filter === 'hay'}
    <p class="hint">{stock.length ? `Recetas para las que ya tenéis al menos la mitad de los ingredientes, según lo que habéis comprado últimamente.` : 'Cuando terminéis alguna compra, aquí saldrán las recetas que podéis hacer con lo que hay en casa.'}</p>
  {/if}
  {#if !list.length}
    <p class="muted">No hay recetas con ese filtro.</p>
  {:else}
    <ul class="cards" role="list">
      {#each shown as r, i (r.id || r.name)}
        {@const lk = lookOf(r)}
        <li class="rise" style={`--d:${Math.min(i, 8)}`}>
          <button class="card" style={`--rc:${lk.color}`} onclick={() => (open = r)}>
            <span class="r-ic" aria-hidden="true"><lk.icon size={22} /></span>
            <span class="name">{r.name}</span>
            <span class="meta">
              {#if r.time || r.meta?.time}<span><Clock size={14} aria-hidden="true" /> {r.time || r.meta?.time} min</span>{/if}
              {#if r.express}<span class="x"><Zap size={14} aria-hidden="true" /> Exprés</span>{/if}
              {#if r.fun}<span class="f"><PartyPopper size={14} aria-hidden="true" /> Divertida</span>{/if}
              {#if r.nocook}<span><Snowflake size={14} aria-hidden="true" /> Sin cocinar</span>{/if}
              {#if r.kids || r.meta?.kids}<span><Baby size={14} aria-hidden="true" /> Peques</span>{/if}
              {#if ratings[r.name] === 1}<span class="f"><Heart size={14} aria-hidden="true" /> Os gusta</span>{/if}
              {#if snoozed[r.name]}<span><Clock3 size={14} aria-hidden="true" /> Ahora no</span>{/if}
              {#if ratings[r.name] === -1}<span><ThumbsDown size={14} aria-hidden="true" /> No os gusta</span>{/if}
              {#if r.home}<span class="season"><Refrigerator size={14} aria-hidden="true" /> Tenéis {r.home.have} de {r.home.total}</span>{/if}
              {#if (r.season || r.meta?.season || []).includes(month)}<span class="season"><Leaf size={14} aria-hidden="true" /> Temporada</span>{/if}
              {#if r.own}<span>De casa</span>{/if}
            </span>
          </button>
        </li>
      {/each}
    </ul>
    {#if shown.length < list.length}
      <button class="btn btn-block more" onclick={() => (showAll = true)}>Ver las {list.length} recetas</button>
    {/if}
  {/if}
</section>

{#if open}
  <RecipeSheet recipe={open} onclose={() => (open = null)} />
{/if}

<style>
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
    position: relative;
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    column-gap: 12px;
    align-content: start;
    gap: 4px;
    padding: 12px 14px;
    border: 0;
    transition: transform 0.25s var(--ease-spring), box-shadow 0.25s;
    border-radius: var(--r);
    background: var(--surface);
    box-shadow: var(--shadow);
    color: var(--ink);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .card:active {
    transform: scale(0.97);
  }
  @media (hover: hover) {
    .card:hover {
      transform: translateY(-2px);
    }
  }
  .r-ic {
    grid-row: span 2;
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 14px;
    background: color-mix(in srgb, var(--rc) 15%, var(--surface));
    color: var(--rc);
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
  .x {
    color: var(--lemon-ink);
  }
  .f {
    color: var(--tomato);
  }
  .first-r {
    margin-top: 14px;
  }
</style>

<script>
  // 'Hoy coméis…': lo que toca hoy (o lo próximo), con propuesta de un toque si el hueco está vacío,
  // lo que falta para hacerlo, qué sacar del congelador y, el fin de semana, preparar el menú de la siguiente.
  import { UtensilsCrossed, Shuffle, Check, Snowflake, ShoppingBasket, CalendarRange, ChevronRight } from '@lucide/svelte'
  import { app, setMeal, adoptKbRecipe, resolveKbIngredient, addMany, settings, toast } from '../lib/data.svelte.js'
  import { suggestWeek, pantry, atHome, STARTER_RECIPES } from '../lib/home.js'
  import { isoDate } from '../lib/format.js'
  import RecipeSheet from './RecipeSheet.svelte'

  const now = new Date()
  const hour = now.getHours()
  const today = isoDate(now)
  const tomorrow = isoDate(new Date(now.getTime() + 86400000))
  // Antes de las 16:00, comida y cena de hoy. Después, la cena de hoy y la comida de mañana.
  const slots = hour < 16 ? [{ day: today, slot: 'comida', label: 'Hoy coméis' }, { day: today, slot: 'cena', label: 'Hoy cenáis' }] : [{ day: today, slot: 'cena', label: 'Hoy cenáis' }, { day: tomorrow, slot: 'comida', label: 'Mañana coméis' }]

  const seeds = [Math.floor(Math.random() * 999) + 1, Math.floor(Math.random() * 999) + 7]
  // Lo que ya se ha descartado con 'Otra' en cada hueco
  let skipped = $state([[], []])
  let open = $state(null)
  let busy = $state(false)

  const stock = $derived(pantry(app.tripItems, settings().pantry || {}).filter((p) => p.state !== 'out'))
  const haveIds = $derived(new Set(stock.filter((p) => p.merc_id).map((p) => p.merc_id)))
  const have = $derived([...stock.map((p) => p.name), ...app.items.filter((i) => !i.checked).map((i) => i.name)])
  const recent = $derived(app.meals.filter((m) => m.day >= isoDate(new Date(now.getTime() - 14 * 86400000))).map((m) => m.name))
  const pool = $derived([...app.recipes, ...STARTER_RECIPES.filter((s) => !app.recipes.some((r) => r.name === s.name))])

  const cards = $derived(
    slots.map((s, n) => {
      const meal = app.meals.find((m) => m.day === s.day && m.slot === s.slot)
      if (meal) {
        const recipe = app.recipes.find((r) => r.id === meal.recipe_id) || null
        return { ...s, meal, recipe, home: recipe ? atHome(recipe, have, haveIds) : null }
      }
      const taken = slots.map((x) => app.meals.find((m) => m.day === x.day && m.slot === x.slot)?.name).filter(Boolean)
      const [pick] = suggestWeek([s], pool.filter((r) => !skipped[n].includes(r.name)), haveIds, [...recent, ...taken], seeds[n], { ratings: settings().ratings || {}, have })
      return { ...s, meal: null, recipe: pick?.recipe || null, home: pick ? atHome(pick.recipe, have, haveIds) : null }
    })
  )

  async function accept(c) {
    busy = true
    const r = c.recipe.created_at ? c.recipe : await adoptKbRecipe(c.recipe)
    await setMeal({ day: c.day, slot: c.slot, name: r.name, recipe_id: r.id })
    busy = false
    toast(`'${r.name}' en el menú`)
  }
  function another(n, name) {
    skipped[n] = [...skipped[n], name]
  }
  async function addMissing(c) {
    const ings = (c.recipe.ingredients || []).filter((i) => !i.basic).map((i) => (i.q ? resolveKbIngredient(i) : i))
    const miss = new Set(c.home.missing)
    const k = await addMany(ings.filter((i) => miss.has(i.q || i.name)))
    toast(`${k} ingredientes de '${c.recipe.name}' apuntados`)
  }

  // Qué sacar del congelador para mañana
  const defrost = $derived.by(() => {
    const out = []
    for (const m of app.meals.filter((x) => x.day === tomorrow)) {
      const r = app.recipes.find((x) => x.id === m.recipe_id)
      for (const i of r?.ingredients || []) {
        const p = i.merc_id ? app.catalog?.byId.get(i.merc_id) : null
        if (/congelad/i.test(p?.n || i.name || '')) out.push((i.name || p.n).replace(/ Hacendado| ultracongelad[oa]s?| congelad[oa]s?/gi, ''))
      }
    }
    return [...new Set(out)]
  })

  // Viernes a domingo: si la semana que viene está casi vacía, ofrecer el menú
  const dow = now.getDay()
  const nextMonday = isoDate(new Date(now.getTime() + ((8 - dow) % 7 || 7) * 86400000))
  const nextSunday = isoDate(new Date(new Date(nextMonday + 'T12:00').getTime() + 6 * 86400000))
  const planNext = $derived((dow === 0 || dow >= 5) && app.meals.filter((m) => m.day >= nextMonday && m.day <= nextSunday).length < 6)
</script>

<section class="today" aria-labelledby="h-today">
  <h2 id="h-today" class="visually-hidden">Qué coméis</h2>
  <ul class="cards" role="list">
    {#each cards as c, n (c.day + c.slot)}
      <li class="card rise" class:empty={!c.meal} style={`--d:${n + 1}`}>
        <span class="lbl"><UtensilsCrossed size={16} aria-hidden="true" /> {c.label}</span>
        {#if c.meal}
          {#if c.recipe}
            <button class="dish link" onclick={() => (open = c.recipe)}>{c.meal.name} <ChevronRight size={18} aria-hidden="true" /></button>
          {:else}
            <p class="dish">{c.meal.name}</p>
          {/if}
          {#if c.home?.missing.length}
            <p class="miss">Falta: {c.home.missing.slice(0, 3).join(', ')}{c.home.missing.length > 3 ? '…' : ''}</p>
            <button class="btn btn-small" onclick={() => addMissing(c)}><ShoppingBasket size={16} aria-hidden="true" /> Apuntar lo que falta</button>
          {:else if c.home}
            <p class="ok">Tenéis todo en casa</p>
          {/if}
        {:else if c.recipe}
          <p class="sugg">¿Qué tal <button class="link inline" onclick={() => (open = c.recipe)}>{c.recipe.name}</button>?</p>
          <p class="meta">{c.recipe.time || c.recipe.meta?.time || '?'} min{#if c.home?.total} · tenéis {c.home.have} de {c.home.total}{/if}</p>
          <div class="row">
            <button class="btn btn-primary btn-small" onclick={() => accept(c)} disabled={busy}><Check size={16} aria-hidden="true" /> Vale</button>
            <button class="btn btn-small" onclick={() => another(n, c.recipe.name)}><Shuffle size={16} aria-hidden="true" /> Otra</button>
          </div>
        {/if}
      </li>
    {/each}
  </ul>
  {#if defrost.length}
    <p class="note"><Snowflake size={16} aria-hidden="true" /> Para mañana, sacad del congelador: {defrost.join(', ')}.</p>
  {/if}
  {#if planNext}
    <a class="btn btn-block plan" href="#menu-proponer"><CalendarRange size={18} aria-hidden="true" /> Preparar el menú de la semana que viene</a>
  {/if}
</section>

{#if open}
  <RecipeSheet recipe={open} onclose={() => (open = null)} />
{/if}

<style>
  .today {
    display: grid;
    gap: 8px;
    margin-top: 14px;
  }
  .cards {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr));
    gap: 8px;
  }
  .card {
    display: grid;
    align-content: start;
    gap: 6px;
    padding: 12px 14px;
    border-radius: var(--r);
    background: var(--surface);
    box-shadow: var(--shadow);
    min-width: 0;
  }
  .card.empty {
    background: var(--lemon-soft);
    color: var(--lemon-ink);
  }
  .lbl {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.82rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--ink-2);
  }
  .empty .lbl,
  .empty .meta {
    color: inherit;
    opacity: 0.85;
  }
  .dish {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 700;
    line-height: 1.3;
  }
  .link {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .link.inline {
    display: inline;
    font-weight: 700;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .sugg {
    margin: 0;
    font-size: 1.05rem;
    line-height: 1.35;
  }
  .meta,
  .miss,
  .ok {
    margin: 0;
    font-size: 0.88rem;
    color: var(--ink-2);
  }
  .ok {
    color: var(--accent-text);
    font-weight: 600;
  }
  .row {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }
  .btn-small {
    min-height: 44px;
    padding: 0 14px;
    font-size: 0.9rem;
  }
  .note {
    display: flex;
    gap: 8px;
    align-items: center;
    margin: 0;
    padding: 10px 14px;
    border-radius: 12px;
    background: var(--surface-2);
    font-size: 0.9rem;
  }
  .plan {
    text-decoration: none;
  }
</style>

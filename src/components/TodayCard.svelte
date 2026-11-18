<script>
  // 'Hoy coméis…': lo que toca hoy (o lo próximo), con propuesta de un toque si el hueco está vacío,
  // lo que falta para hacerlo, qué sacar del congelador y, el fin de semana, preparar el menú de la siguiente.
  import { Sun, Moon, Shuffle, Check, Snowflake, ShoppingBasket, CalendarRange, ChevronRight } from '@lucide/svelte'
  import { app, setMeal, adoptKbRecipe, resolveKbIngredient, addMany, settings, toast, activeSnoozed } from '../lib/data.svelte.js'
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
      const [pick] = suggestWeek([s], pool.filter((r) => !skipped[n].includes(r.name)), haveIds, [...recent, ...taken], seeds[n], { ratings: settings().ratings || {}, snoozed: activeSnoozed(), have })
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

<section class="today rise" aria-labelledby="h-today">
  <h2 id="h-today" class="today-h">Qué coméis</h2>
  <ul class="rows" role="list">
    {#each cards as c, n (c.day + c.slot)}
      <li class="row-t" class:empty={!c.meal}>
        <span class="ic" class:night={c.slot === 'cena'} aria-hidden="true">{#if c.slot === 'cena'}<Moon size={20} />{:else}<Sun size={20} />{/if}</span>
        <div class="body">
          <span class="lbl">{c.label}{#if !c.meal && c.recipe}&nbsp;· propuesta{/if}</span>
          {#if c.meal}
            {#if c.recipe}
              <button class="dish link" onclick={() => (open = c.recipe)}>{c.meal.name}<ChevronRight size={18} aria-hidden="true" /></button>
            {:else}
              <span class="dish">{c.meal.name}</span>
            {/if}
            {#if c.home?.missing.length}
              <button class="miss" onclick={() => addMissing(c)}><ShoppingBasket size={15} aria-hidden="true" /> Falta {c.home.missing.length === 1 ? c.home.missing[0] : `${c.home.missing.length} cosas`}: apuntar</button>
            {:else if c.home}
              <span class="ok"><Check size={15} aria-hidden="true" /> Tenéis todo</span>
            {/if}
          {:else if c.recipe}
            <button class="dish link sugg" onclick={() => (open = c.recipe)}>¿{c.recipe.name}?</button>
            <span class="meta">{c.recipe.time || c.recipe.meta?.time || '?'} min{#if c.home?.have} · tenéis {c.home.have} de {c.home.total}{/if}</span>
          {/if}
        </div>
        {#if !c.meal && c.recipe}
          <div class="acts">
            <button class="round other" onclick={() => another(n, c.recipe.name)} aria-label={`Otra propuesta para ${c.label.toLowerCase()}`}><Shuffle size={18} aria-hidden="true" /></button>
            <button class="round yes" onclick={() => accept(c)} disabled={busy} aria-label={`Vale, ${c.recipe.name}`}><Check size={20} strokeWidth={2.6} aria-hidden="true" /></button>
          </div>
        {/if}
      </li>
    {/each}
  </ul>
  {#if defrost.length}
    <p class="note"><Snowflake size={16} aria-hidden="true" /> Para mañana, sacad del congelador: {defrost.join(', ')}.</p>
  {/if}
  {#if planNext}
    <a class="plan" href="#menu-proponer"><CalendarRange size={18} aria-hidden="true" /> Preparar el menú de la semana que viene <ChevronRight size={18} aria-hidden="true" /></a>
  {/if}
</section>

{#if open}
  <RecipeSheet recipe={open} onclose={() => (open = null)} />
{/if}

<style>
  .today {
    margin-top: 12px;
    padding: 6px 6px 6px;
    border-radius: 20px;
    background: var(--surface);
    box-shadow: var(--shadow);
  }
  .today-h {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
  }
  .rows {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
  }
  .row-t {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 12px;
    padding: 10px 8px;
    min-width: 0;
  }
  .row-t + .row-t {
    border-top: 1px solid var(--line);
  }
  .ic {
    flex: none;
    display: grid;
    place-items: center;
    width: 42px;
    height: 42px;
    border-radius: 14px;
    background: color-mix(in srgb, var(--c-horno) 15%, var(--surface));
    color: var(--c-horno);
  }
  .ic.night {
    background: color-mix(in srgb, var(--c-uva) 15%, var(--surface));
    color: var(--c-uva);
  }
  .body {
    flex: 1 1 9rem;
    min-width: 0;
    display: grid;
    gap: 1px;
    justify-items: start;
  }
  .lbl {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--ink-2);
  }
  .dish {
    font-size: 1.05rem;
    font-weight: 700;
    line-height: 1.25;
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
    font-size: 1.05rem;
    font-weight: 700;
    text-align: left;
    cursor: pointer;
  }
  .sugg {
    color: var(--ink);
  }
  .meta,
  .ok {
    font-size: 0.85rem;
    color: var(--ink-2);
  }
  .ok {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--accent-text);
    font-weight: 600;
  }
  .miss {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    margin-top: 2px;
    padding: 3px 10px;
    min-height: 32px;
    border: 0;
    border-radius: 999px;
    background: var(--lemon-soft);
    color: var(--lemon-ink);
    font: inherit;
    font-size: 0.85rem;
    font-weight: 650;
    cursor: pointer;
  }
  .acts {
    flex: none;
    margin-left: auto;
    display: flex;
    gap: 6px;
  }
  .round {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border: 0;
    border-radius: 999px;
    cursor: pointer;
    transition: transform 0.2s var(--ease-out);
  }
  .round:active {
    transform: scale(0.92);
  }
  .other {
    background: var(--surface-2);
    color: var(--ink);
  }
  .yes {
    background: var(--c-huerta);
    color: var(--surface);
  }
  .note {
    display: flex;
    gap: 8px;
    align-items: center;
    margin: 4px 8px 6px;
    padding: 10px 12px;
    border-radius: 12px;
    background: color-mix(in srgb, var(--c-hielo) 12%, var(--surface));
    font-size: 0.9rem;
  }
  .note :global(svg) {
    flex: none;
    color: var(--c-hielo);
  }
  .plan {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 2px 8px 6px;
    padding: 12px;
    min-height: 48px;
    border-radius: 12px;
    background: color-mix(in srgb, var(--c-tomate) 10%, var(--surface));
    color: var(--ink);
    font-weight: 650;
    text-decoration: none;
  }
  .plan :global(svg) {
    flex: none;
    color: var(--c-tomate);
  }
  .plan :global(svg:last-child) {
    margin-left: auto;
  }
</style>

<script>
  // Propuesta de menú para los huecos libres: variada, con legumbre y pescado, aprovechando la despensa
  import { X, Shuffle, Check } from '@lucide/svelte'
  import { app, saveRecipe, setMeal, resolveIngredient, resolveKbIngredient, adoptKbRecipe, settings, toast } from '../lib/data.svelte.js'
  import { suggestWeek, pantry, STARTER_RECIPES } from '../lib/home.js'
  import { eur, isoDate } from '../lib/format.js'
  import Sheet from './Sheet.svelte'

  let { days, onclose } = $props()
  let seed = $state(Math.floor(Math.random() * 1000) + 1)
  let saving = $state(false)

  const today = isoDate()
  const free = $derived(
    days
      .filter((d) => d.iso >= today)
      .flatMap((d) => ['comida', 'cena'].map((slot) => ({ day: d.iso, label: d.label, slot })))
      .filter((s) => !app.meals.some((m) => m.day === s.day && m.slot === s.slot))
  )
  const stock = pantry(app.tripItems, settings().pantry || {})
  const pantryOk = new Set(stock.filter((p) => p.state === 'ok' && p.merc_id).map((p) => p.merc_id))
  const pool = [...app.recipes, ...STARTER_RECIPES.filter((s) => !app.recipes.some((r) => r.name === s.name))]
  const since = isoDate(new Date(Date.now() - 14 * 86400000))
  const used = app.meals.filter((m) => m.day >= since && m.day < today).map((m) => m.name)
  const plan = $derived(suggestWeek(free, pool, pantryOk, used, seed))

  // Ingredientes de cada receta como productos del catálogo (las de partida se resuelven con vuestras preferencias)
  const resolved = new Map()
  function ingredientsOf(recipe) {
    if (resolved.has(recipe.name)) return resolved.get(recipe.name)
    const list = (recipe.ingredients || []).map((i) => (typeof i === 'string' ? resolveIngredient(i) : i.q ? resolveKbIngredient(i) : i)).filter((i) => !i.basic)
    resolved.set(recipe.name, list)
    return list
  }
  const onList = (i) => app.items.some((x) => (i.merc_id ? x.merc_id === i.merc_id : x.name.toLowerCase() === i.name.toLowerCase()))
  const cost = $derived.by(() => {
    const need = new Map()
    for (const e of plan) for (const i of ingredientsOf(e.recipe)) if (i.merc_id && !pantryOk.has(i.merc_id) && !onList(i)) need.set(i.merc_id, app.catalog?.byId.get(i.merc_id)?.p || 0)
    return { n: need.size, total: [...need.values()].reduce((s, v) => s + v, 0) }
  })

  async function accept() {
    saving = true
    const chosen = [...plan]
    for (const e of chosen) {
      let r = app.recipes.find((x) => x.name === e.recipe.name)
      if (!r) r = e.recipe.id && e.recipe.steps && !e.recipe.created_at ? await adoptKbRecipe(e.recipe) : await saveRecipe({ name: e.recipe.name, ingredients: ingredientsOf(e.recipe) })
      await setMeal({ day: e.day, slot: e.slot, name: r.name, recipe_id: r.id })
    }
    saving = false
    toast(`Menú puesto: ${chosen.length} platos. Abajo podéis apuntar lo que falta.`)
    onclose()
  }
</script>

<Sheet {onclose} labelledby="prop-title">
  <div class="sheet-head">
    <h2 id="prop-title">Propuesta de menú</h2>
    <button class="icon-btn" onclick={onclose} aria-label="Cerrar"><X size={24} aria-hidden="true" /></button>
  </div>
  {#if !free.length}
    <p>Todos los huecos de lo que queda de semana ya tienen plato. Quitad alguno o mirad la semana siguiente.</p>
  {:else}
    <p class="muted">Para los {free.length} huecos libres: sin repetir, con legumbre y pescado, cenas ligeras y aprovechando lo que hay en casa.</p>
    <ul class="plan" role="list">
      {#each plan as e (e.day + e.slot)}
        <li>
          <span class="when"><span class="d">{e.label}</span><small>{e.slot === 'comida' ? 'Comida' : 'Cena'}</small></span>
          <span class="what">{e.recipe.name}</span>
        </li>
      {/each}
    </ul>
    <p class="cost">Faltaría comprar unos <strong>{cost.n} productos</strong>, alrededor de <strong class="num">{eur(cost.total)}</strong> (precio del envase completo, orientativo).</p>
    <div class="row">
      <button class="btn" onclick={() => (seed += 17)}><Shuffle size={18} aria-hidden="true" /> Otra propuesta</button>
      <span class="spacer"></span>
      <button class="btn btn-primary" onclick={accept} disabled={saving}><Check size={18} aria-hidden="true" /> {saving ? 'Guardando…' : 'Aceptar'}</button>
    </div>
  {/if}
</Sheet>

<style>
  .plan {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 4px;
  }
  .plan li {
    display: grid;
    grid-template-columns: 7rem minmax(0, 1fr);
    gap: 10px;
    padding: 8px 10px;
    border-radius: 10px;
    background: var(--surface-2);
  }
  .when {
    display: grid;
    line-height: 1.25;
  }
  .d {
    font-weight: 700;
    font-size: 0.9rem;
  }
  .d::first-letter {
    text-transform: uppercase;
  }
  .when small {
    color: var(--ink-2);
  }
  .what {
    font-weight: 600;
    align-self: center;
  }
  .cost {
    padding: 10px 14px;
    border-radius: 12px;
    background: var(--lemon-soft);
    color: var(--lemon-ink);
  }
</style>

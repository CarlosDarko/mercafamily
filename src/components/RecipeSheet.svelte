<script>
  // Ficha de una receta: ingredientes para marcar, pasos, añadir a la lista y ponerla en el menú
  import { X, Clock, ShoppingBasket, CalendarPlus, Baby, Leaf, Zap, PartyPopper, Snowflake, ThumbsUp, ThumbsDown } from '@lucide/svelte'
  import { app, resolveKbIngredient, adoptKbRecipe, addMany, setMeal, settings, toast, rateRecipe } from '../lib/data.svelte.js'
  import { pantry, inSeason } from '../lib/home.js'
  import { imgUrl } from '../lib/catalog.js'
  import { eur, isoDate } from '../lib/format.js'
  import Sheet from './Sheet.svelte'

  // recipe: del recetario ({ id, name, ingredients: [{ q, amount, basic }], steps, ... }) o de casa (guardada)
  let { recipe, onclose } = $props()
  const meta = recipe.meta || recipe
  const steps = recipe.steps || []
  const ings = (recipe.ingredients || []).map((i) => (i.q ? resolveKbIngredient(i) : i))
  const okAtHome = new Set(pantry(app.tripItems, settings().pantry || {}).filter((p) => p.state === 'ok' && p.merc_id).map((p) => p.merc_id))
  const onList = (i) => app.items.some((x) => (i.merc_id ? x.merc_id === i.merc_id : x.name.toLowerCase() === i.name.toLowerCase()))
  const why = (i) => (onList(i) ? 'Ya en la lista' : i.merc_id && okAtHome.has(i.merc_id) ? 'Hay en casa' : i.basic ? 'Básico' : null)
  // Marcados por defecto: lo que no está en la lista, ni en casa, ni es un básico
  let chosen = $state(new Set(ings.map((i, n) => (why(i) ? null : n)).filter((n) => n != null)))
  const total = $derived([...chosen].reduce((s, n) => s + (app.catalog?.byId.get(ings[n].merc_id)?.p || 0), 0))
  const listName = app.lists.find((l) => l.id === app.listId)?.name || 'la lista'
  const month = new Date().getMonth() + 1

  function toggle(n) {
    const s = new Set(chosen)
    s.has(n) ? s.delete(n) : s.add(n)
    chosen = s
  }
  async function addToList() {
    const entries = [...chosen].sort().map((n) => ings[n])
    const k = await addMany(entries)
    toast(`${k} ingredientes de '${recipe.name}' apuntados en ${listName}`)
  }

  // Ponerla en el menú: próximos 7 días, comida o cena
  const DAY = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric' })
  const next = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() + i * 86400000)
    return { iso: isoDate(d), label: i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : DAY.format(d) }
  })
  let day = $state(next[0].iso)
  let slot = $state(meta.slot === 'cena' || meta.slot === 'merienda' ? 'cena' : 'comida')
  const rating = $derived((settings().ratings || {})[recipe.name] || 0)
  async function rate(v) {
    await rateRecipe(recipe.name, v)
    toast(rating === v ? (v === 1 ? 'Apuntado: os gusta. Saldrá más en las propuestas.' : 'Apuntado: no la propondremos más.') : 'Valoración quitada')
  }
  const taken = $derived(app.meals.find((m) => m.day === day && m.slot === slot))
  async function toMenu() {
    const r = recipe.created_at ? recipe : await adoptKbRecipe(recipe)
    await setMeal({ day, slot, name: r.name, recipe_id: r.id })
    toast(`'${r.name}' en el menú: ${next.find((d) => d.iso === day).label.toLowerCase()}, ${slot}`)
    onclose()
  }
  const seasonal = (meta.season || []).includes(month)
</script>

<Sheet {onclose} labelledby="rec-title">
  <div class="sheet-head">
    <h2 id="rec-title">{recipe.name}</h2>
    <button class="icon-btn" onclick={onclose} aria-label="Cerrar"><X size={24} aria-hidden="true" /></button>
  </div>
  <p class="meta">
    {#if meta.time}<span><Clock size={16} aria-hidden="true" /> {meta.time} min</span>{/if}
    <span>Para 3</span>
    {#if meta.slot}<span>{({ ambas: 'Comida o cena', comida: 'Comida', cena: 'Cena', merienda: 'Merienda o postre' })[meta.slot]}</span>{/if}
    {#if recipe.express || meta.express}<span><Zap size={16} aria-hidden="true" /> Exprés</span>{/if}
    {#if recipe.fun || meta.fun}<span><PartyPopper size={16} aria-hidden="true" /> Divertida</span>{/if}
    {#if recipe.nocook || meta.nocook}<span><Snowflake size={16} aria-hidden="true" /> Sin cocinar</span>{/if}
    {#if meta.kids}<span><Baby size={16} aria-hidden="true" /> Gusta a los peques</span>{/if}
    {#if seasonal}<span class="season"><Leaf size={16} aria-hidden="true" /> De temporada</span>{/if}
  </p>

  <div class="rate" role="group" aria-label="¿Os gusta?">
    <button class="pill" aria-pressed={rating === 1} onclick={() => rate(1)}><ThumbsUp size={18} aria-hidden="true" /> Nos gusta</button>
    <button class="pill" aria-pressed={rating === -1} onclick={() => rate(-1)}><ThumbsDown size={18} aria-hidden="true" /> No nos gusta</button>
  </div>

  <section aria-labelledby="h-ings">
    <h3 id="h-ings">Ingredientes</h3>
    <ul class="ings" role="list">
      {#each ings as i, n (n)}
        {@const p = i.merc_id ? app.catalog?.byId.get(i.merc_id) : null}
        <li>
          <label>
            <input type="checkbox" checked={chosen.has(n)} onchange={() => toggle(n)} />
            {#if p && imgUrl(p)}<img src={imgUrl(p, 64)} alt="" width="36" height="36" loading="lazy" />{:else}<span class="noimg" aria-hidden="true"></span>{/if}
            <span class="t">
              <span class="nm">{i.q ? i.q.charAt(0).toUpperCase() + i.q.slice(1) : i.name}{#if i.amount}<small>&nbsp;·&nbsp;{i.amount}</small>{/if}</span>
              {#if p}<small class="pr">{p.n} · {eur(p.p)}</small>{/if}
            </span>
            {#if why(i)}<span class="why">{why(i)}</span>{/if}
          </label>
        </li>
      {/each}
    </ul>
    <button class="btn btn-primary btn-block" onclick={addToList} disabled={!chosen.size}><ShoppingBasket size={18} aria-hidden="true" /> Añadir {chosen.size} a {listName} · {eur(total)}</button>
  </section>

  {#if steps.length}
    <section aria-labelledby="h-steps">
      <h3 id="h-steps">Cómo se hace</h3>
      <ol class="steps">
        {#each steps as s (s)}<li>{s}</li>{/each}
      </ol>
    </section>
  {/if}

  <section class="menu" aria-labelledby="h-tomenu">
    <h3 id="h-tomenu">Ponerla en el menú</h3>
    <div class="days" role="group" aria-label="Día">
      {#each next as d (d.iso)}
        <button class="pill" aria-pressed={day === d.iso} onclick={() => (day = d.iso)}>{d.label}</button>
      {/each}
    </div>
    <div class="days" role="group" aria-label="Comida o cena">
      <button class="pill" aria-pressed={slot === 'comida'} onclick={() => (slot = 'comida')}>Comida</button>
      <button class="pill" aria-pressed={slot === 'cena'} onclick={() => (slot = 'cena')}>Cena</button>
    </div>
    {#if taken}<p class="hint">Ese hueco ya tiene '{taken.name}': se cambiará.</p>{/if}
    <button class="btn btn-block" onclick={toMenu}><CalendarPlus size={18} aria-hidden="true" /> Ponerla en el menú</button>
  </section>
</Sheet>

<style>
  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 14px;
    font-size: 0.9rem;
    color: var(--ink-2);
    font-weight: 600;
  }
  .meta span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .season {
    color: var(--accent-text);
  }
  section {
    display: grid;
    gap: 10px;
  }
  .ings {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 4px;
  }
  .ings label {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 52px;
    padding: 4px 8px;
    border-radius: 10px;
    cursor: pointer;
  }
  .ings label:has(input:checked) {
    background: var(--market-soft);
  }
  .ings input {
    width: 22px;
    height: 22px;
    flex: none;
  }
  img,
  .noimg {
    width: 36px;
    height: 36px;
    border-radius: 6px;
    background: var(--surface-2);
    object-fit: contain;
    flex: none;
  }
  .t {
    flex: 1;
    min-width: 0;
    display: grid;
    line-height: 1.3;
  }
  .nm {
    font-weight: 600;
  }
  .nm small,
  .pr {
    color: var(--ink-2);
    font-weight: 500;
  }
  .pr {
    font-size: 0.82rem;
  }
  .why {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--ink-2);
    white-space: nowrap;
  }
  .steps {
    margin: 0;
    padding-left: 22px;
    display: grid;
    gap: 8px;
  }
  .steps li {
    padding-left: 4px;
  }
  .menu {
    padding-top: 10px;
    border-top: 1px solid var(--line);
  }
  .rate {
    display: flex;
    gap: 8px;
  }
  .rate .pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .days {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .pill {
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
</style>

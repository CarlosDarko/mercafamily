<script>
  // 'Prepárame la lista': menú + despensa + frecuencia, todo marcado para quitar lo que sobre
  import { X, Sparkles } from '@lucide/svelte'
  import { app, mealNeeds, addMany, settings, toast } from '../lib/data.svelte.js'
  import { pantry } from '../lib/home.js'
  import { dueSuggestions } from '../lib/insights.js'
  import { imgUrl } from '../lib/catalog.js'
  import { isoDate } from '../lib/format.js'
  import Sheet from './Sheet.svelte'

  let { onclose } = $props()

  const keyOf = (x) => x.merc_id || `t:${x.name.toLowerCase()}`
  const onList = new Set(app.items.map(keyOf))
  const seen = new Set()
  const take = (list, why) =>
    list
      .filter((x) => {
        const k = keyOf(x)
        if (onList.has(k) || seen.has(k)) return false
        seen.add(k)
        return true
      })
      .map((x) => ({ key: keyOf(x), merc_id: x.merc_id, name: x.name, qty: x.qtyAvg || x.qty || 1, why: typeof why === 'function' ? why(x) : why }))

  const stock = pantry(app.tripItems, settings().pantry || {})
  const groups = [
    { title: 'Para el menú de la semana', items: take(mealNeeds(isoDate(), isoDate(new Date(Date.now() + 7 * 86400000)), stock), (x) => x.why) },
    { title: 'Se acaba en casa', items: take(stock.filter((s) => s.state !== 'ok'), (x) => (x.state === 'out' ? 'Se ha acabado' : 'Queda poco')) },
    { title: 'Toca por frecuencia', items: take(dueSuggestions(app.tripItems, app.items, app.catalog).due, (x) => `Cada ${Math.round(x.every)} días, hace ${x.since}`) }
  ].filter((g) => g.items.length)

  let chosen = $state(new Set(groups.flatMap((g) => g.items.map((i) => i.key))))
  const total = $derived(chosen.size)
  const listName = app.lists.find((l) => l.id === app.listId)?.name || 'la lista'

  function toggle(k) {
    const n = new Set(chosen)
    n.has(k) ? n.delete(k) : n.add(k)
    chosen = n
  }
  async function add() {
    const entries = groups.flatMap((g) => g.items).filter((i) => chosen.has(i.key))
    const n = await addMany(entries)
    toast(`${n} productos apuntados en ${listName}`)
    onclose()
  }
</script>

<Sheet {onclose} labelledby="prep-title">
  <div class="sheet-head">
    <h2 id="prep-title">Prepárame la lista</h2>
    <button class="icon-btn" onclick={onclose} aria-label="Cerrar"><X size={24} aria-hidden="true" /></button>
  </div>
  {#if !groups.length}
    <p>No hay nada pendiente: ni ingredientes del menú, ni cosas que se acaben, ni compras habituales que toquen. Cuando tengáis más historial, esto se llenará solo.</p>
  {:else}
    <p class="muted">Quita lo que no haga falta y pulsa añadir.</p>
    {#each groups as g (g.title)}
      <fieldset class="group">
        <legend>{g.title}</legend>
        {#each g.items as it (it.key)}
          {@const p = it.merc_id ? app.catalog?.byId.get(it.merc_id) : null}
          <label class="opt">
            <input type="checkbox" checked={chosen.has(it.key)} onchange={() => toggle(it.key)} />
            {#if p && imgUrl(p)}<img src={imgUrl(p, 64)} alt="" width="36" height="36" loading="lazy" />{/if}
            <span class="o-text"><span>{it.qty > 1 ? `${it.qty} × ` : ''}{it.name}</span><small>{it.why}</small></span>
          </label>
        {/each}
      </fieldset>
    {/each}
    <button class="btn btn-primary btn-block" onclick={add} disabled={!total}><Sparkles size={18} aria-hidden="true" /> Añadir {total} a {listName}</button>
  {/if}
</Sheet>

<style>
  .group {
    border: 0;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 4px;
  }
  legend {
    font-weight: 700;
    margin-bottom: 6px;
  }
  .opt {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 52px;
    padding: 4px 8px;
    border-radius: 10px;
    cursor: pointer;
  }
  .opt:has(input:checked) {
    background: var(--market-soft);
  }
  .opt input {
    width: 22px;
    height: 22px;
    flex: none;
  }
  .opt img {
    border-radius: 6px;
    background: var(--surface-2);
    object-fit: contain;
  }
  .o-text {
    display: grid;
    line-height: 1.3;
  }
  .o-text small {
    color: var(--ink-2);
  }
</style>

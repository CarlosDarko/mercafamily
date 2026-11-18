<script>
  // Selector de listas: cada una con lo que queda por coger. Crear, renombrar y borrar en una hoja.
  import { Plus, Pencil, X, Trash2, ChevronDown, Check, ShoppingBasket, Briefcase, House, PartyPopper, UtensilsCrossed, Baby, PawPrint, Heart, Sun, Gift } from '@lucide/svelte'
  import { app, setList, createList, renameList, deleteList, itemsOfList, toast, PERSON_COLORS } from '../lib/data.svelte.js'

  const ICONS = { cesta: ShoppingBasket, trabajo: Briefcase, casa: House, fiesta: PartyPopper, cena: UtensilsCrossed, bebe: Baby, mascota: PawPrint, salud: Heart, verano: Sun, regalo: Gift }
  const ICON_LABELS = { cesta: 'Cesta', trabajo: 'Trabajo', casa: 'Casa', fiesta: 'Fiesta', cena: 'Cena', bebe: 'Bebé', mascota: 'Mascota', salud: 'Salud', verano: 'Verano', regalo: 'Regalo' }
  import Sheet from './Sheet.svelte'

  let sheet = $state(null) // null | 'pick' | 'new' | 'edit'
  let name = $state('')
  let icon = $state('cesta')
  let color = $state(PERSON_COLORS[0])
  const IDEAS = ['Al volver del trabajo', 'Fin de semana', 'Cumpleaños', 'Cena con amigos']

  const pendingOf = (id) => itemsOfList(id).filter((i) => !i.checked).length
  const current = $derived(app.lists.find((l) => l.id === app.listId))
  const isMain = $derived(app.listId === app.household?.id)

  function openNew() {
    name = ''
    icon = 'trabajo'
    color = PERSON_COLORS[(app.lists.length + 1) % PERSON_COLORS.length]
    sheet = 'new'
  }
  function openEdit() {
    name = current?.name ?? ''
    icon = current?.icon || 'cesta'
    color = current?.color || PERSON_COLORS[0]
    sheet = 'edit'
  }
  async function save(e) {
    e.preventDefault()
    if (!name.trim()) return
    if (sheet === 'new') {
      const l = await createList(name, { icon, color })
      toast(`Lista creada: ${l.name}`)
    } else await renameList(app.listId, name, { icon, color })
    sheet = null
  }
  async function remove() {
    const n = itemsOfList(app.listId).length
    const msg = n ? `¿Borrar la lista '${current.name}' y sus ${n} productos?` : `¿Borrar la lista '${current.name}'?`
    if (!confirm(msg)) return
    await deleteList(app.listId)
    sheet = null
  }
</script>

<!-- El título de la pantalla es la lista actual: al tocarlo se cambia, se crea o se edita -->
<h1 class="title">
  <span class="visually-hidden">Lista de la compra: </span>
  {#if app.lists.length}
    {@const Icon = ICONS[current?.icon] || ShoppingBasket}
    <button class="title-btn" onclick={() => (sheet = 'pick')} aria-haspopup="dialog" style={`--lc:${current?.color || 'var(--c-huerta)'}`}>
      <span class="t-ic" aria-hidden="true"><Icon size={22} /></span>
      <span class="t-name">{current?.name || 'Lista de la compra'}</span>
      <ChevronDown size={24} aria-hidden="true" class="chev" />
    </button>
  {:else}
    Lista de la compra
  {/if}
</h1>

{#if sheet === 'pick'}
  <Sheet onclose={() => (sheet = null)} labelledby="pick-list-title">
    <div class="sheet-head">
      <h2 id="pick-list-title">Vuestras listas</h2>
      <button class="icon-btn" onclick={() => (sheet = null)} aria-label="Cerrar"><X size={24} aria-hidden="true" /></button>
    </div>
    <ul class="lrows" role="list">
      {#each app.lists as l (l.id)}
        {@const Icon = ICONS[l.icon] || ShoppingBasket}
        <li>
          <button class="lrow" aria-current={l.id === app.listId ? 'true' : undefined} onclick={() => (setList(l.id), (sheet = null))} style={`--lc:${l.color || 'var(--c-huerta)'}`}>
            <span class="t-ic" aria-hidden="true"><Icon size={22} /></span>
            <span class="l-text"><strong>{l.name}</strong><small>{pendingOf(l.id) ? `${pendingOf(l.id)} por coger` : 'Nada pendiente'}</small></span>
            {#if l.id === app.listId}<Check size={22} aria-hidden="true" class="l-check" />{/if}
          </button>
        </li>
      {/each}
    </ul>
    <div class="l-actions">
      <button class="btn" onclick={openNew}><Plus size={18} aria-hidden="true" /> Nueva lista</button>
      <button class="btn" onclick={openEdit}><Pencil size={18} aria-hidden="true" /> Editar '{current?.name}'</button>
    </div>
  </Sheet>
{/if}

{#if sheet === 'new' || sheet === 'edit'}
  <Sheet onclose={() => (sheet = null)} labelledby="list-title">
    <form class="stack" onsubmit={save}>
      <div class="sheet-head">
        <h2 id="list-title">{sheet === 'new' ? 'Nueva lista' : 'Editar lista'}</h2>
        <button type="button" class="icon-btn" onclick={() => (sheet = null)} aria-label="Cerrar"><X size={24} aria-hidden="true" /></button>
      </div>
      {#if sheet === 'new'}
        <p class="muted">Cada lista tiene sus productos, su total y su carro. Todos los de casa las ven al momento.</p>
      {/if}
      <label class="field">
        <span>Nombre</span>
        <input class="input" bind:value={name} maxlength="40" required />
      </label>
      <fieldset class="pick">
        <legend class="label">Icono</legend>
        <div class="icons">
          {#each Object.entries(ICONS) as [key, I]}
            <label class="ic" title={ICON_LABELS[key]}>
              <input type="radio" bind:group={icon} value={key} />
              <I size={22} aria-hidden="true" />
              <span class="visually-hidden">{ICON_LABELS[key]}</span>
            </label>
          {/each}
        </div>
      </fieldset>
      <fieldset class="pick">
        <legend class="label">Color</legend>
        <div class="icons">
          {#each PERSON_COLORS as c, i}
            <label class="sw" style={`--c:${c}`}>
              <input type="radio" bind:group={color} value={c} />
              <span class="visually-hidden">Color {i + 1}</span>
            </label>
          {/each}
        </div>
      </fieldset>
      {#if sheet === 'new'}
        <div class="ideas">
          {#each IDEAS as idea}
            <button type="button" class="btn idea" onclick={() => (name = idea)}>{idea}</button>
          {/each}
        </div>
      {/if}
      <button class="btn btn-primary btn-block" type="submit" disabled={!name.trim()}>{sheet === 'new' ? 'Crear lista' : 'Guardar nombre'}</button>
      {#if sheet === 'edit' && !isMain}
        <button type="button" class="btn btn-danger btn-block" onclick={remove}><Trash2 size={18} aria-hidden="true" /> Borrar esta lista</button>
      {:else if sheet === 'edit'}
        <p class="hint">Es la lista principal: se puede renombrar pero no borrar.</p>
      {/if}
    </form>
  </Sheet>
{/if}

<style>
  .title {
    margin: 0;
  }
  .title-btn {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    max-width: 100%;
    margin-left: -6px;
    padding: 4px 8px 4px 6px;
    border: 0;
    border-radius: 16px;
    background: transparent;
    color: var(--ink);
    font: inherit;
    font-size: 1.75rem;
    font-weight: 750;
    letter-spacing: -0.02em;
    line-height: 1.15;
    text-align: left;
    cursor: pointer;
    transition: background-color 0.2s;
  }
  @media (hover: hover) {
    .title-btn:hover {
      background: var(--surface);
    }
  }
  .title-btn :global(.chev) {
    flex: none;
    color: var(--ink-2);
  }
  .t-name {
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .t-ic {
    flex: none;
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border-radius: 13px;
    background: color-mix(in srgb, var(--lc) 16%, var(--surface));
    color: var(--lc);
  }
  .lrows {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }
  .lrow {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 64px;
    padding: 10px 14px 10px 10px;
    border: 1.5px solid var(--line);
    border-radius: 16px;
    background: var(--surface);
    color: var(--ink);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .lrow[aria-current='true'] {
    border-color: var(--lc);
    background: color-mix(in srgb, var(--lc) 8%, var(--surface));
  }
  .l-text {
    flex: 1;
    min-width: 0;
    display: grid;
    line-height: 1.3;
  }
  .l-text small {
    color: var(--ink-2);
  }
  .lrow :global(.l-check) {
    color: var(--lc);
  }
  .l-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .l-actions .btn {
    flex: 1 1 auto;
  }
  .pick {
    border: 0;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 8px;
  }
  .icons {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .ic,
  .sw {
    position: relative;
    width: 48px;
    height: 48px;
    display: grid;
    place-items: center;
    border-radius: 12px;
    border: 2px solid var(--line);
    cursor: pointer;
  }
  .sw {
    background: var(--c);
    border-color: transparent;
  }
  .ic input,
  .sw input {
    position: absolute;
    opacity: 0;
    inset: 0;
    margin: 0;
    cursor: pointer;
  }
  .ic:has(input:checked) {
    border-color: var(--primary-bg);
    background: var(--market-soft);
  }
  .sw:has(input:checked) {
    box-shadow: 0 0 0 3px var(--surface), 0 0 0 6px var(--c);
  }
  .ic:has(input:focus-visible),
  .sw:has(input:focus-visible) {
    outline: 3px solid var(--focus);
    outline-offset: 2px;
  }
  .ideas {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .idea {
    min-height: 44px;
    font-weight: 600;
    font-size: 0.95rem;
  }
</style>

<script>
  // Selector de listas: cada una con lo que queda por coger. Crear, renombrar y borrar en una hoja.
  import { Plus, Pencil, X, Trash2, ShoppingBasket, Briefcase, House, PartyPopper, UtensilsCrossed, Baby, PawPrint, Heart, Sun, Gift } from '@lucide/svelte'
  import { app, setList, createList, renameList, deleteList, itemsOfList, toast, PERSON_COLORS } from '../lib/data.svelte.js'

  const ICONS = { cesta: ShoppingBasket, trabajo: Briefcase, casa: House, fiesta: PartyPopper, cena: UtensilsCrossed, bebe: Baby, mascota: PawPrint, salud: Heart, verano: Sun, regalo: Gift }
  const ICON_LABELS = { cesta: 'Cesta', trabajo: 'Trabajo', casa: 'Casa', fiesta: 'Fiesta', cena: 'Cena', bebe: 'Bebé', mascota: 'Mascota', salud: 'Salud', verano: 'Verano', regalo: 'Regalo' }
  import Sheet from './Sheet.svelte'

  let sheet = $state(null) // null | 'new' | 'edit'
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

{#if app.lists.length}
  <div class="switcher">
    <div class="lists" role="group" aria-label="Listas de la compra">
      {#each app.lists as l (l.id)}
        {@const Icon = ICONS[l.icon] || ShoppingBasket}
        <button class="pill" aria-pressed={l.id === app.listId} onclick={() => setList(l.id)} style={`--lc:${l.color || 'var(--c-huerta)'}`}>
          <Icon size={18} aria-hidden="true" />
          <span>{l.name}</span>
          {#if pendingOf(l.id)}<span class="count num" aria-label={`${pendingOf(l.id)} por coger`}>{pendingOf(l.id)}</span>{/if}
        </button>
      {/each}
    </div>
    <button class="icon-btn round" onclick={openNew} aria-label="Nueva lista"><Plus size={20} aria-hidden="true" /></button>
    <button class="icon-btn edit" onclick={openEdit} aria-label={`Cambiar el nombre o borrar la lista ${current?.name ?? ''}`}>
      <Pencil size={18} aria-hidden="true" />
    </button>
  </div>
{/if}

{#if sheet}
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
  .switcher {
    display: flex;
    align-items: center;
    gap: 4px;
    margin: 6px calc(var(--gutter) * -1) 2px;
    padding: 0 calc(var(--gutter) - 4px) 0 var(--gutter);
  }
  .lists {
    flex: 1;
    min-width: 0;
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding: 4px 2px;
    scrollbar-width: none;
    /* se difumina el borde derecho para que se note que hay más listas */
    mask-image: linear-gradient(to right, #000 calc(100% - 24px), transparent);
  }
  .round {
    width: 44px;
    height: 44px;
    background: var(--surface);
    box-shadow: var(--shadow);
    color: var(--c-huerta);
  }
  .lists::-webkit-scrollbar {
    display: none;
  }
  .pill {
    flex: none;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 44px;
    padding: 0 16px;
    border-radius: 999px;
    border: 1.5px solid var(--line);
    background: var(--surface);
    color: var(--ink);
    font: inherit;
    font-weight: 650;
    font-size: 0.95rem;
    cursor: pointer;
    white-space: nowrap;
    transition: background-color 0.25s, transform 0.2s var(--ease-spring);
  }
  .pill:active {
    transform: scale(0.95);
  }
  .pill :global(svg) {
    color: var(--lc);
  }
  .pill[aria-pressed='true'] {
    background: color-mix(in srgb, var(--lc) 18%, var(--surface));
    border-color: var(--lc);
    border-width: 2px;
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
  .count {
    min-width: 1.6em;
    padding: 0 6px;
    border-radius: 999px;
    background: var(--lemon);
    color: #2b2300;
    font-size: 0.85rem;
    text-align: center;
  }
  .edit {
    color: var(--ink-2);
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

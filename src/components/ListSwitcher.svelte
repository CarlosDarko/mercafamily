<script>
  // Selector de listas: cada una con lo que queda por coger. Crear, renombrar y borrar en una hoja.
  import { Plus, Pencil, X, Trash2 } from '@lucide/svelte'
  import { app, setList, createList, renameList, deleteList, itemsOfList, toast } from '../lib/data.svelte.js'
  import Sheet from './Sheet.svelte'

  let sheet = $state(null) // null | 'new' | 'edit'
  let name = $state('')
  const IDEAS = ['Al volver del trabajo', 'Fin de semana', 'Cumpleaños', 'Cena con amigos']

  const pendingOf = (id) => itemsOfList(id).filter((i) => !i.checked).length
  const current = $derived(app.lists.find((l) => l.id === app.listId))
  const isMain = $derived(app.listId === app.household?.id)

  function openNew() {
    name = ''
    sheet = 'new'
  }
  function openEdit() {
    name = current?.name ?? ''
    sheet = 'edit'
  }
  async function save(e) {
    e.preventDefault()
    if (!name.trim()) return
    if (sheet === 'new') {
      const l = await createList(name)
      toast(`Lista creada: ${l.name}`)
    } else await renameList(app.listId, name)
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
        <button class="pill" aria-pressed={l.id === app.listId} onclick={() => setList(l.id)}>
          <span>{l.name}</span>
          {#if pendingOf(l.id)}<span class="count num" aria-label={`${pendingOf(l.id)} por coger`}>{pendingOf(l.id)}</span>{/if}
        </button>
      {/each}
      <button class="pill add" onclick={openNew}><Plus size={18} aria-hidden="true" /> Nueva lista</button>
    </div>
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
    padding-left: var(--gutter);
  }
  .lists {
    flex: 1;
    min-width: 0;
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding: 4px 2px;
    scrollbar-width: none;
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
  }
  .pill[aria-pressed='true'] {
    background: var(--market);
    border-color: var(--market);
    color: var(--market-ink);
  }
  @media (prefers-color-scheme: dark) {
    .pill[aria-pressed='true'] {
      background: var(--market-2);
      border-color: var(--market-2);
      color: #0f1712;
    }
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
  .add {
    border-style: dashed;
    color: var(--ink-2);
  }
  .edit {
    margin-right: 8px;
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

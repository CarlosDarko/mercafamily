<script>
  // Modo tienda: pantalla encendida, letra grande, orden de pasillos aprendido y 'no había' a mano
  import { X, Check, PackageX, Undo2 } from '@lucide/svelte'
  import { app, itemsOfList, toggleItem, toggleMissing, aisleRank, lineTotal, product, colorOf, missingCount } from '../lib/data.svelte.js'
  import { imgUrl } from '../lib/catalog.js'
  import { eur } from '../lib/format.js'
  import CloseSheet from './CloseSheet.svelte'

  let { onclose } = $props()
  let closing = $state(false)
  let lock = null
  let dlg

  const items = $derived(itemsOfList())
  const todo = $derived(
    items
      .filter((i) => !i.checked && !i.missing && !i.requested)
      .sort((a, b) => aisleRank(a.category) - aisleRank(b.category) || a.name.localeCompare(b.name, 'es'))
  )
  const done = $derived(items.filter((i) => i.checked))
  const missing = $derived(items.filter((i) => i.missing))
  const total = $derived(done.reduce((s, i) => s + (lineTotal(i) || 0), 0))
  const progress = $derived(items.length ? (done.length + missing.length) / items.length : 0)
  const catName = (id) => app.catalog?.cats.get(id)?.n || 'Otros'
  const listName = $derived(app.lists.find((l) => l.id === app.listId)?.name || 'Lista')

  async function keepAwake() {
    try {
      lock = await navigator.wakeLock?.request('screen')
    } catch {}
  }
  $effect(() => {
    dlg.showModal()
    keepAwake()
    const again = () => document.visibilityState === 'visible' && keepAwake()
    document.addEventListener('visibilitychange', again)
    return () => {
      document.removeEventListener('visibilitychange', again)
      lock?.release?.()
    }
  })
</script>

<dialog bind:this={dlg} class="store" aria-labelledby="store-title" oncancel={(e) => (e.preventDefault(), onclose())}>
  <header class="top">
    <div class="titles">
      <h2 id="store-title">En el súper</h2>
      <p>{listName} · <span class="num">{done.length + missing.length} de {items.length}</span></p>
    </div>
    <button class="icon-btn" onclick={onclose} aria-label="Salir del modo tienda"><X size={28} aria-hidden="true" /></button>
  </header>
  <div class="bar" role="progressbar" aria-label="Progreso de la compra" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(progress * 100)}>
    <span style={`width:${progress * 100}%`}></span>
  </div>

  <div class="body">
    {#if !todo.length}
      <p class="all">{items.length ? 'Todo cogido.' : 'Esta lista está vacía.'} {done.length ? 'Pulsa Terminar compra al pagar.' : ''}</p>
    {/if}
    <ol class="rows">
      {#each todo as it, i (it.id)}
        {@const p = product(it)}
        {#if i === 0 || todo[i - 1].category !== it.category}
          <li class="aisle" aria-hidden="true">{catName(it.category)}</li>
        {/if}
        <li class="row">
          <button class="take" onclick={() => toggleItem(it)}>
            {#if p && imgUrl(p)}<img src={imgUrl(p, 120)} alt="" width="56" height="56" />{/if}
            <span class="text">
              <span class="name">{#if it.qty > 1}<span class="qty num">{it.qty}&nbsp;×&nbsp;</span>{/if}{it.name}</span>
              {#if it.note}<span class="note">{it.note}</span>{/if}
              {#if missingCount(it) >= 2}<span class="warn">Suele faltar</span>{/if}
            </span>
            <span class="check" aria-hidden="true"><Check size={26} strokeWidth={3} /></span>
            <span class="visually-hidden">Marcar como cogido</span>
          </button>
          <button class="miss" onclick={() => toggleMissing(it)} aria-label={`No había ${it.name}`}>
            <PackageX size={22} aria-hidden="true" />
            <span>No había</span>
          </button>
        </li>
      {/each}
    </ol>

    {#if done.length || missing.length}
      <details class="donebox">
        <summary>En el carro {done.length}{missing.length ? ` · no había ${missing.length}` : ''}</summary>
        <ul>
          {#each [...done, ...missing] as it (it.id)}
            <li>
              <span class:struck={it.checked}>{it.name}</span>
              {#if it.taken_by && it.taken_by !== app.me}<small style={`color:${colorOf(it.taken_by)}`}>{it.taken_by}</small>{/if}
              {#if it.missing}<small class="warn">No había</small>{/if}
              <button class="icon-btn" onclick={() => (it.missing ? toggleMissing(it) : toggleItem(it))} aria-label={`Devolver ${it.name} a la lista`}><Undo2 size={20} aria-hidden="true" /></button>
            </li>
          {/each}
        </ul>
      </details>
    {/if}
  </div>

  <footer class="foot">
    <div>
      <p class="label">En el carro</p>
      <p class="sum num">{eur(total)}</p>
    </div>
    <button class="btn btn-primary big" disabled={!done.length} onclick={() => (closing = true)}>Terminar compra</button>
  </footer>
</dialog>

{#if closing}
  <CloseSheet total={total} count={done.length} onclose={() => ((closing = false), !itemsOfList().some((i) => i.checked) && onclose())} />
{/if}

<style>
  .store {
    width: 100%;
    max-width: 100%;
    height: 100dvh;
    max-height: 100dvh;
    margin: 0;
    border-radius: 0;
    display: flex;
    flex-direction: column;
    background: var(--paper);
    font-size: 1.15rem;
  }
  .store[open] {
    display: flex;
  }
  .top {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: calc(12px + env(safe-area-inset-top)) var(--gutter) 10px;
    background: var(--market);
    color: var(--market-ink);
  }
  .titles {
    flex: 1;
  }
  .titles p {
    font-size: 0.95rem;
    opacity: 0.9;
  }
  .top .icon-btn {
    color: inherit;
  }
  .bar {
    height: 6px;
    background: var(--surface-2);
  }
  .bar span {
    display: block;
    height: 100%;
    background: var(--lemon);
    transition: width 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .body {
    flex: 1;
    overflow: auto;
    padding: 8px var(--gutter) 16px;
    width: 100%;
    max-width: var(--maxw);
    margin: 0 auto;
  }
  .rows {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
  }
  .aisle {
    margin-top: 12px;
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--ink-2);
  }
  .row {
    min-width: 0;
    display: flex;
    gap: 8px;
    align-items: stretch;
  }
  .take {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 84px;
    padding: 10px 14px;
    border: 0;
    border-radius: 16px;
    background: var(--surface);
    box-shadow: var(--shadow);
    color: var(--ink);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .take:active {
    transform: scale(0.98);
  }
  img {
    width: 56px;
    height: 56px;
    border-radius: 10px;
    background: var(--surface-2);
    object-fit: contain;
    flex: none;
  }
  .text {
    flex: 1;
    min-width: 0;
    display: grid;
    gap: 2px;
    line-height: 1.3;
  }
  .name {
    font-weight: 700;
    overflow-wrap: anywhere;
    hyphens: manual;
    overflow-wrap: anywhere;
  }
  .qty {
    color: var(--accent-text);
  }
  .note {
    font-size: 0.95rem;
    font-style: italic;
  }
  .warn {
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--tomato);
  }
  .check {
    flex: none;
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: 3px solid var(--line);
    color: var(--line);
  }
  .miss {
    flex: none;
    width: 72px;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 2px;
    border: 1.5px dashed var(--line);
    border-radius: 16px;
    background: transparent;
    color: var(--ink-2);
    font: inherit;
    font-size: 0.8rem;
    font-weight: 650;
    cursor: pointer;
  }
  .all {
    padding: 24px 0;
    font-size: 1.2rem;
    font-weight: 650;
  }
  .donebox {
    margin-top: 18px;
  }
  .donebox summary {
    min-height: 48px;
    display: flex;
    align-items: center;
    font-weight: 700;
    cursor: pointer;
  }
  .donebox ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .donebox li {
    display: flex;
    align-items: center;
    gap: 8px;
    border-bottom: 1px dashed var(--line);
  }
  .donebox li span {
    flex: 1;
  }
  .struck {
    text-decoration: line-through;
    color: var(--ink-2);
  }
  .foot {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px var(--gutter) calc(12px + env(safe-area-inset-bottom));
    background: var(--surface);
    border-top: 1px solid var(--line);
  }
  .foot div {
    flex: 1;
  }
  .label {
    font-size: 0.85rem;
    color: var(--ink-2);
    font-weight: 650;
  }
  .sum {
    font-size: 1.6rem;
    font-weight: 800;
  }
  .big {
    min-height: 56px;
    font-size: 1.05rem;
  }
</style>

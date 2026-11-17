<script>
  import { Search, Plus, Heart } from '@lucide/svelte'
  import { app, searchCatalog, addProduct, addText } from '../lib/data.svelte.js'
  import { imgUrl, unitLabel } from '../lib/catalog.js'
  import { eur } from '../lib/format.js'

  let text = $state('')
  let active = $state(-1)
  let input

  const parsed = $derived.by(() => {
    const m = text.trim().match(/^(\d+)\s*(x\s*)?(.+)$/i)
    return m ? { qty: Math.min(Number(m[1]), 99) || 1, q: m[3] } : { qty: 1, q: text.trim() }
  })
  const results = $derived(parsed.q.length >= 2 && app.catalog ? searchCatalog(parsed.q, 8) : [])
  const open = $derived(results.length > 0)

  $effect(() => {
    results
    active = -1
  })

  async function pick(r) {
    await addProduct(r.p, parsed.qty)
    text = ''
    input?.focus()
  }

  async function submit(e) {
    e.preventDefault()
    if (active >= 0 && results[active]) return pick(results[active])
    if (!text.trim()) return
    await addText(text)
    text = ''
    input?.focus()
  }

  function onkey(e) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      active = (active + 1) % results.length
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      active = active <= 0 ? results.length - 1 : active - 1
    } else if (e.key === 'Escape') {
      text = ''
    }
  }
</script>

<form class="add" role="search" aria-label="Añadir a la lista" onsubmit={submit}>
  <label for="add-input" class="visually-hidden">Producto que hace falta</label>
  <div class="add-field">
    <Search size={20} aria-hidden="true" class="add-icon" />
    <input
      bind:this={input}
      bind:value={text}
      onkeydown={onkey}
      id="add-input"
      class="input"
      type="text"
      inputmode="search"
      enterkeyhint="done"
      autocomplete="off"
      autocapitalize="sentences"
      spellcheck="false"
      placeholder="Añadir: leche, 2 tomates…"
      role="combobox"
      aria-expanded={open}
      aria-controls="add-results"
      aria-autocomplete="list"
      aria-activedescendant={active >= 0 ? `opt-${results[active]?.p.id}` : undefined}
      aria-describedby="add-help"
    />
    <button class="btn btn-primary add-btn" type="submit" disabled={!text.trim()}>
      <Plus size={20} aria-hidden="true" />
      <span>Añadir</span>
    </button>
  </div>
  <p id="add-help" class="visually-hidden">Al pulsar Añadir se elige el producto más probable según vuestras preferencias e historial. También puedes elegir uno de la lista.</p>

  <ul id="add-results" class="results panel" role="listbox" aria-label="Productos de Mercadona" hidden={!open}>
    {#each results as r, i (r.p.id)}
      <li
        id={`opt-${r.p.id}`}
        role="option"
        aria-selected={i === active}
        class:active={i === active}
        onclick={() => pick(r)}
        onkeydown={() => {}}
      >
        {#if imgUrl(r.p)}
          <img src={imgUrl(r.p, 96)} alt="" width="44" height="44" loading="lazy" />
        {:else}
          <span class="noimg" aria-hidden="true"></span>
        {/if}
        <span class="r-text">
          <span class="r-name">{r.p.n}</span>
          <span class="r-meta">{unitLabel(r.p)}</span>
          {#if r.reasons.length}
            <span class="r-pref"><Heart size={14} aria-hidden="true" /> Vuestra preferencia</span>
          {/if}
        </span>
        <span class="r-price num">{eur(r.p.p)}</span>
      </li>
    {/each}
  </ul>
  {#if parsed.q.length >= 2 && app.catalog && !results.length}
    <p class="noresults muted" role="status">No está en el catálogo de Mercadona. Pulsa Añadir y se apunta tal cual, sin precio.</p>
  {/if}
</form>

<style>
  .add {
    position: sticky;
    top: 0;
    z-index: 10;
    padding: 10px 0;
    margin: 4px calc(var(--gutter) * -1) 0;
    padding-inline: var(--gutter);
    background: var(--paper);
  }
  .add-field {
    position: relative;
    display: flex;
    gap: 8px;
  }
  .add-field :global(.add-icon) {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--ink-2);
    pointer-events: none;
  }
  .add-field .input {
    padding-left: 44px;
    min-height: 52px;
    font-size: 1.05rem;
    border-radius: 14px;
  }
  .add-btn {
    min-height: 52px;
    border-radius: 14px;
    padding: 0 16px;
  }
  @media (max-width: 380px) {
    .add-btn span {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
    }
    .add-btn {
      width: 52px;
      padding: 0;
    }
  }
  .results {
    list-style: none;
    margin: 8px 0 0;
    padding: 6px;
    max-height: min(60dvh, 460px);
    overflow: auto;
  }
  .results[hidden] {
    display: none;
  }
  .results li {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 60px;
    padding: 6px 10px;
    border-radius: 10px;
    cursor: pointer;
  }
  .results li.active,
  .results li:hover {
    background: var(--market-soft);
  }
  .results img,
  .noimg {
    width: 44px;
    height: 44px;
    border-radius: 8px;
    flex: none;
    background: var(--surface-2);
    object-fit: contain;
  }
  .r-text {
    flex: 1;
    min-width: 0;
    display: grid;
    line-height: 1.3;
  }
  .r-name {
    font-weight: 600;
  }
  .r-meta {
    font-size: 0.85rem;
    color: var(--ink-2);
  }
  .r-pref {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.85rem;
    font-weight: 650;
    color: var(--market-2);
  }
  @media (prefers-color-scheme: light) {
    .r-pref {
      color: var(--market);
    }
  }
  .r-price {
    font-weight: 700;
  }
  .noresults {
    margin-top: 8px;
    font-size: 0.95rem;
  }
</style>

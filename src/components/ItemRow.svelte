<script>
  import { Ellipsis } from '@lucide/svelte'
  import { app, product, unitPrice, lineTotal, toggleItem } from '../lib/data.svelte.js'
  import { imgUrl, unitLabel } from '../lib/catalog.js'
  import { eur } from '../lib/format.js'

  let { item, onedit } = $props()
  const p = $derived(product(item))
  const u = $derived(unitPrice(item))
  const total = $derived(lineTotal(item))
  const meta = $derived(
    [item.qty > 1 && u != null ? `${item.qty} × ${eur(u)}` : item.qty > 1 ? `${item.qty} unidades` : null, p ? unitLabel(p) : null].filter(Boolean).join(' · ')
  )
  const byOther = $derived(item.added_by && item.added_by !== app.me ? item.added_by : null)
</script>

<li class="item" class:done={item.checked}>
  <label class="tap">
    <input type="checkbox" checked={item.checked} onchange={() => toggleItem(item)} />
    <span class="box" aria-hidden="true"></span>
    {#if p && imgUrl(p)}
      <img src={imgUrl(p, 96)} alt="" width="44" height="44" loading="lazy" />
    {/if}
    <span class="text">
      <span class="name">{#if item.qty > 1}<span class="qty num">{item.qty}</span>{/if}{item.name}</span>
      <span class="line2">
        <span class="meta">{meta}</span>
        <span class="price num">{total == null ? 'Sin precio' : eur(total)}</span>
      </span>
      {#if item.note}<span class="note">{item.note}</span>{/if}
      {#if byOther}<span class="meta">Lo ha apuntado {byOther}</span>{/if}
    </span>
  </label>
  <button class="icon-btn" onclick={onedit} aria-label={`Editar ${item.name}`}>
    <Ellipsis size={22} aria-hidden="true" />
  </button>
</li>

<style>
  .item {
    display: flex;
    align-items: center;
    gap: 4px;
    padding-right: 4px;
    border-bottom: 1px solid var(--line);
  }
  .item:last-child {
    border-bottom: 0;
  }
  .tap {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 0 10px 14px;
    min-height: 64px;
    cursor: pointer;
  }
  input {
    position: absolute;
    opacity: 0;
    width: 1px;
    height: 1px;
  }
  .box {
    flex: none;
    width: 28px;
    height: 28px;
    border-radius: 9px;
    border: 2px solid var(--ink-2);
    display: grid;
    place-items: center;
    transition: background-color 0.15s, border-color 0.15s;
  }
  .box::after {
    content: '';
    width: 12px;
    height: 7px;
    border-left: 3px solid #fff;
    border-bottom: 3px solid #fff;
    transform: translateY(-2px) rotate(-45deg) scale(0);
    transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }
  input:checked + .box {
    background: var(--market-2);
    border-color: var(--market-2);
  }
  input:checked + .box::after {
    transform: translateY(-2px) rotate(-45deg) scale(1);
  }
  input:focus-visible + .box {
    outline: 3px solid var(--focus);
    outline-offset: 2px;
  }
  img {
    width: 44px;
    height: 44px;
    border-radius: 8px;
    background: var(--surface-2);
    object-fit: contain;
    flex: none;
  }
  .text {
    flex: 1;
    display: grid;
    gap: 2px;
    min-width: 0;
    line-height: 1.25;
  }
  .name {
    font-weight: 600;
    overflow-wrap: anywhere;
  }
  .qty {
    display: inline-block;
    min-width: 1.6em;
    margin-right: 6px;
    padding: 0 6px;
    border-radius: 6px;
    background: var(--market-soft);
    text-align: center;
    font-weight: 800;
  }
  .meta {
    font-size: 0.85rem;
    color: var(--ink-2);
  }
  .note {
    font-size: 0.9rem;
    font-style: italic;
  }
  .line2 {
    display: flex;
    align-items: baseline;
    gap: 8px;
  }
  .line2 .meta {
    flex: 1;
    min-width: 0;
  }
  .price {
    font-weight: 750;
    white-space: nowrap;
  }
  .done .name {
    text-decoration: line-through;
    text-decoration-thickness: 2px;
    color: var(--ink-2);
  }
  .done img {
    opacity: 0.6;
  }
</style>

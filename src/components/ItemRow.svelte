<script>
  import { ChevronRight, Check } from '@lucide/svelte'
  import { app, product, unitPrice, lineTotal, toggleItem, colorOf, missingCount, conflictsOf, priceTrend } from '../lib/data.svelte.js'
  import { imgUrl, unitLabel } from '../lib/catalog.js'
  import { cheaperFormat, inSeason } from '../lib/home.js'
  import { eur } from '../lib/format.js'
  import { catLook } from '../lib/look.js'
  import { tick } from '../lib/fx.js'
  import { fly } from 'svelte/transition'
  import { cubicOut } from 'svelte/easing'

  let { item, onedit } = $props()
  const p = $derived(product(item))
  const u = $derived(unitPrice(item))
  const total = $derived(lineTotal(item))
  const meta = $derived(
    [item.qty > 1 && u != null ? `${item.qty} × ${eur(u)}` : item.qty > 1 ? `${item.qty} unidades` : null, p ? unitLabel(p) : null].filter(Boolean).join(' · ')
  )
  const byOther = $derived(item.added_by && item.added_by !== app.me ? item.added_by : null)
  const takenOther = $derived(item.checked && item.taken_by && item.taken_by !== app.me ? item.taken_by : null)
  const oftenMissing = $derived(!item.checked && missingCount(item) >= 2)
  const diet = $derived(conflictsOf(item))
  const season = $derived(p && !item.checked && app.catalog ? inSeason(p, app.catalog.cats.get(p.c)?.n) : false)
  const fmt = $derived(p && !item.checked && app.catalog ? cheaperFormat(p, app.catalog.products) : null)
  const trend = $derived(item.merc_id && !item.checked ? priceTrend(item.merc_id) : null)
  const look = $derived(catLook(item.category))
</script>

<li class="item" class:done={item.checked} style={`--cc:${look.color}`} in:fly={{ y: -12, duration: 320, easing: cubicOut }}>
  <label class="check">
    <input type="checkbox" checked={item.checked} onchange={() => (tick(), toggleItem(item))} aria-label={`${item.name}: ${item.checked ? 'en el carro' : 'marcar como cogido'}`} />
    <span class="box" aria-hidden="true"><Check size={18} strokeWidth={3.5} /></span>
  </label>
  <button class="tap" onclick={onedit} aria-describedby={`hint-${item.id}`}>
    {#if p && imgUrl(p)}
      <img src={imgUrl(p, 96)} alt="" width="48" height="48" loading="lazy" />
    {:else}
      <span class="noimg" aria-hidden="true"><look.icon size={22} /></span>
    {/if}
    <span class="text">
      <span class="name">{#if item.qty > 1}<span class="qty num">{item.qty}</span>{/if}{item.name}</span>
      <span class="line2">
        <span class="meta">{meta}</span>
        <span class="price num" class:none={total == null}>{total == null ? 'Sin precio' : eur(total)}</span>
      </span>
      {#if item.note}<span class="note">{item.note}</span>{/if}
      {#if takenOther}
        <span class="who"><span class="dot" style={`background:${colorOf(takenOther)}`}></span>Lo ha cogido {takenOther}</span>
      {:else if byOther && !item.checked}
        <span class="who"><span class="dot" style={`background:${colorOf(byOther)}`}></span>Lo ha apuntado {byOther}</span>
      {/if}
      {#if item.missing}<span class="tag">No había</span>{:else if oftenMissing}<span class="tag soft">Suele faltar</span>{/if}
      {#if trend && Math.abs(trend.diff) >= 0.03}<span class="tag" class:soft={trend.diff < 0}>{trend.diff > 0 ? 'Ha subido' : 'Ha bajado'} un {Math.round(Math.abs(trend.diff) * 100)} %</span>{/if}
      {#if season}<span class="tag season">De temporada</span>{/if}
      {#if fmt}<span class="tag soft">En {fmt.p.z.split(' · ')[0].toLowerCase()} sale un {Math.round(fmt.saving * 100)} % más barato</span>{/if}
      {#if diet.length}<span class="tag">Ojo: {diet.map((d) => `${d.person}, ${d.label.toLowerCase()}`).join(' · ')}</span>{/if}
    </span>
    <ChevronRight size={18} aria-hidden="true" class="chev" />
    <span id={`hint-${item.id}`} class="visually-hidden">Abre la ficha: cantidad, nota, alternativas e ingredientes</span>
  </button>
</li>

<style>
  .item {
    display: flex;
    align-items: center;
    gap: 0;
    border-bottom: 1px solid var(--line);
  }
  .item:last-child {
    border-bottom: 0;
  }
  .check {
    flex: none;
    align-self: stretch;
    display: grid;
    place-items: center;
    width: 56px;
    min-height: 64px;
    cursor: pointer;
  }
  .tap {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 6px 10px 0;
    min-height: 64px;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
    border-radius: 0;
  }
  @media (hover: hover) {
    .tap:hover {
      background: var(--surface-2);
    }
  }
  .tap :global(.chev) {
    flex: none;
    color: var(--ink-2);
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
  .box :global(svg) {
    color: var(--surface);
    transform: scale(0);
    transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }
  input:checked + .box {
    background: var(--c-huerta);
    border-color: var(--c-huerta);
    animation: check-pop 0.4s var(--ease-spring);
  }
  @keyframes check-pop {
    0% {
      transform: scale(0.8);
      box-shadow: 0 0 0 0 color-mix(in srgb, var(--c-huerta) 50%, transparent);
    }
    50% {
      transform: scale(1.15);
    }
    100% {
      box-shadow: 0 0 0 12px transparent;
    }
  }
  input:checked + .box :global(svg) {
    transform: scale(1);
  }
  input:focus-visible + .box {
    outline: 3px solid var(--focus);
    outline-offset: 2px;
  }
  img,
  .noimg {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: color-mix(in srgb, var(--cc) 10%, var(--surface));
    object-fit: contain;
    flex: none;
  }
  .noimg {
    display: grid;
    place-items: center;
    color: var(--cc);
  }
  .text {
    flex: 1;
    display: grid;
    gap: 2px;
    min-width: 0;
    line-height: 1.3;
  }
  .name {
    font-weight: 600;
    overflow-wrap: anywhere;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .qty {
    display: inline-block;
    min-width: 1.6em;
    margin-right: 6px;
    padding: 0 6px;
    border-radius: 6px;
    background: color-mix(in srgb, var(--cc) 16%, var(--surface));
    color: var(--cc);
    text-align: center;
    font-weight: 800;
  }
  .meta {
    font-size: 0.85rem;
    color: var(--ink-2);
  }
  .who {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.85rem;
    color: var(--ink-2);
  }
  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex: none;
  }
  .tag {
    justify-self: start;
    padding: 1px 8px;
    border-radius: 999px;
    background: var(--tomato-soft);
    color: var(--tomato);
    font-size: 0.8rem;
    font-weight: 700;
  }
  .tag.season {
    background: var(--market-soft);
    color: var(--accent-text);
  }
  .tag.soft {
    background: var(--lemon-soft);
    color: var(--lemon-ink);
  }
  .note {
    font-size: 0.9rem;
    font-style: italic;
  }
  .line2 {
    display: flex;
    align-items: baseline;
    gap: 10px;
  }
  .line2 .meta {
    flex: 1;
    min-width: 0;
  }
  .price {
    flex: none;
    font-weight: 750;
    white-space: nowrap;
  }
  .price.none {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--ink-2);
  }
  .done .name {
    text-decoration: line-through;
    text-decoration-thickness: 2px;
    color: var(--ink-2);
  }
  .done img,
  .done .noimg {
    opacity: 0.6;
    filter: grayscale(0.6);
  }
</style>

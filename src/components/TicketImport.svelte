<script>
  // Subir una compra con fotos del ticket (castellano o catalán), sin pasar por la lista.
  // 1) fotos (varias si es largo), 2) lectura, 3) revisión línea a línea y guardar en Gastos.
  import { X, Camera, ImagePlus, Trash2, Search, Check, AlertCircle, ShoppingBag, Plus } from '@lucide/svelte'
  import { app, searchCatalog, saveTicketTrip, toast } from '../lib/data.svelte.js'
  import { readTicketPages, parsePages, matchToCatalog } from '../lib/ticket.js'
  import { imgUrl, unitLabel } from '../lib/catalog.js'
  import { eur, isoDate, parseNum } from '../lib/format.js'
  import Sheet from './Sheet.svelte'

  let { onclose } = $props()
  let step = $state('photos') // photos | reading | review
  let files = $state([])
  let thumbs = $state([])
  let progress = $state(0)
  let error = $state('')
  let rows = $state([])
  let date = $state(isoDate())
  let totalText = $state('')
  let clearList = $state(true)
  let editing = $state(null) // índice de la línea que se está cambiando, o 'new'
  let q = $state('')
  let saving = $state(false)
  let priceEdit = $state(null)
  // Corregir a mano el importe de una línea (el lector a veces confunde una cifra)
  function setPrice(r, v) {
    const n = parseNum(v)
    if (n != null) {
      r.total = n
      r.unit = Math.round((n / (r.qty || 1)) * 100) / 100
    }
    priceEdit = null
  }

  function addFiles(e) {
    const list = [...(e.currentTarget.files || [])]
    e.currentTarget.value = ''
    files = [...files, ...list]
    thumbs = [...thumbs, ...list.map((f) => URL.createObjectURL(f))]
  }
  function removeFile(i) {
    URL.revokeObjectURL(thumbs[i])
    files = files.filter((_, j) => j !== i)
    thumbs = thumbs.filter((_, j) => j !== i)
  }

  async function read() {
    step = 'reading'
    error = ''
    progress = 0
    try {
      const texts = await readTicketPages(files, (p) => (progress = p))
      const t = parsePages(texts)
      if (!t.lines.length) throw new Error('vacío')
      const matched = matchToCatalog(t.lines, (qq, n) => searchCatalog(qq, n))
      rows = matched.map((l) => ({ ...l, on: true }))
      if (t.date) date = t.date
      totalText = t.total != null ? String(t.total).replace('.', ',') : ''
      step = 'review'
    } catch (e) {
      error = e?.message === 'vacío' ? 'No he podido leer líneas en las fotos. Probad con más luz, el ticket estirado y la foto de cerca.' : 'No se ha podido leer el ticket. Comprobad la conexión (la primera vez se descarga el lector) y probad otra vez.'
      step = 'photos'
    }
  }

  // Sin precio leído no se inventa: queda 'sin precio' y no suma
  const priceOf = (r) => (r.total != null ? r.total : null)
  const sum = $derived(Math.round(rows.filter((r) => r.on).reduce((s, r) => s + (priceOf(r) || 0), 0) * 100) / 100)
  const ticketTotal = $derived(parseNum(totalText))
  const gap = $derived(ticketTotal != null ? Math.round((ticketTotal - sum) * 100) / 100 : 0)
  const toCheck = $derived(rows.filter((r) => r.on && !r.sure).length)
  const results = $derived(editing != null && q.trim().length >= 2 ? searchCatalog(q, 20) : [])

  function startEdit(i) {
    editing = i
    q = i === 'new' ? '' : rows[i].q || rows[i].desc
  }
  function choose(p) {
    if (editing === 'new') rows = [...rows, { qty: 1, desc: p.n, q: '', unit: p.p, total: p.p, p, sure: true, on: true, added: true }]
    else {
      const r = rows[editing]
      r.p = p
      r.sure = true
      if (r.unit == null) {
        r.unit = p.p
        r.total = Math.round(p.p * r.qty * 100) / 100
      }
    }
    editing = null
  }

  async function save() {
    saving = true
    const lines = rows
      .filter((r) => r.on)
      .map((r) => ({
        merc_id: r.p?.id ?? null,
        name: r.bag ? 'Bolsas' : r.p?.n || r.desc,
        category: r.p?.c ?? null,
        qty: r.qty,
        price: r.unit ?? (r.total != null ? r.total / r.qty : null)
      }))
    const res = await saveTicketTrip({ date, total: ticketTotal ?? sum, lines, clearList })
    saving = false
    if (res) toast(`Compra guardada: ${eur(ticketTotal ?? sum)}${res.removed ? `, ${res.removed} quitados de la lista` : ''}`, null, 5000)
    onclose()
  }
</script>

<Sheet {onclose} labelledby="tk-title">
  <div class="sheet-head">
    <h2 id="tk-title">Subir un ticket</h2>
    <button class="icon-btn" onclick={onclose} aria-label="Cerrar"><X size={24} aria-hidden="true" /></button>
  </div>

  {#if step === 'photos'}
    <p class="muted">Haced una foto del ticket de papel, en castellano o en catalán. Si es largo, haced varias de arriba abajo, que se solapen un poco: la app junta las partes y no repite líneas.</p>
    {#if thumbs.length}
      <ol class="thumbs" aria-label="Fotos del ticket">
        {#each thumbs as t, i (t)}
          <li>
            <img src={t} alt={`Parte ${i + 1} del ticket`} />
            <span class="n num">{i + 1}</span>
            <button class="rm" onclick={() => removeFile(i)} aria-label={`Quitar la foto ${i + 1}`}><X size={16} aria-hidden="true" /></button>
          </li>
        {/each}
      </ol>
    {/if}
    <label class="btn btn-block pick">
      {#if thumbs.length}<ImagePlus size={20} aria-hidden="true" /> Añadir otra parte{:else}<Camera size={20} aria-hidden="true" /> Hacer foto del ticket{/if}
      <input type="file" accept="image/*" capture="environment" multiple onchange={addFiles} class="visually-hidden" />
    </label>
    <ul class="tips">
      <li>Ticket estirado sobre la mesa y con buena luz, sin sombra del móvil.</li>
      <li>De cerca, que se lean bien los precios.</li>
    </ul>
    {#if error}<p class="error-text" role="alert">{error}</p>{/if}
    <button class="btn btn-primary btn-block" onclick={read} disabled={!files.length}>Leer {files.length > 1 ? `las ${files.length} fotos` : 'el ticket'}</button>
  {:else if step === 'reading'}
    <div class="reading" role="status">
      <p><strong>Leyendo el ticket…</strong></p>
      <div class="bar" aria-hidden="true"><span style={`width:${Math.round(progress * 100)}%`}></span></div>
      <p class="muted">{Math.round(progress * 100)} %. La primera vez tarda un poco más: se descarga el lector de castellano y catalán.</p>
    </div>
  {:else}
    <div class="head-row">
      <label class="field">
        <span class="label">Fecha</span>
        <input class="input" type="date" bind:value={date} />
      </label>
      <label class="field">
        <span class="label">Total del ticket</span>
        <input class="input num" bind:value={totalText} inputmode="decimal" placeholder={eur(sum)} />
      </label>
    </div>
    <p class="summary">
      {rows.filter((r) => r.on).length} líneas · suman <strong class="num">{eur(sum)}</strong>
      {#if toCheck}<span class="chk"><AlertCircle size={16} aria-hidden="true" /> {toCheck} para revisar</span>{/if}
    </p>
    {#if ticketTotal != null && Math.abs(gap) > 0.5}
      <p class="gap">{gap > 0 ? `Las líneas suman ${eur(gap)} menos que el total del ticket.` : `Las líneas suman ${eur(-gap)} más que el total del ticket.`} Suele ser una cifra mal leída: tocad un importe para corregirlo{gap > 0 ? ', o añadid abajo una línea que falte' : ''}. Se guarda igualmente con el total del ticket.</p>
    {/if}

    {#each [['check', 'Para revisar', rows.map((r, i) => i).filter((i) => rows[i].on && !rows[i].sure)], ['ok', 'Bien', rows.map((r, i) => i).filter((i) => !rows[i].on || rows[i].sure)]] as [k, label, idx] (k)}
      {#if idx.length}
        <h3 class="grp" class:warn={k === 'check'}>{label} <span class="num">{idx.length}</span></h3>
        <ul class="lines" role="list">
          {#each idx as i (i)}
            {@const r = rows[i]}
            <li class:off={!r.on} class:check={r.on && !r.sure}>
              <div class="ln">
                <button class="row-b" onclick={() => !r.bag && startEdit(i)} disabled={r.bag} aria-label={r.bag ? undefined : `Cambiar el producto de '${r.desc}'`}>
                  {#if r.bag}
                    <span class="noimg bag" aria-hidden="true"><ShoppingBag size={22} /></span>
                  {:else if r.p && imgUrl(r.p)}
                    <img src={imgUrl(r.p, 96)} alt="" width="44" height="44" loading="lazy" />
                  {:else}
                    <span class="noimg" aria-hidden="true"><Search size={20} /></span>
                  {/if}
                  <span class="tx">
                    <strong>{#if r.qty > 1}<span class="q num">{r.qty} ×</span> {/if}{r.bag ? 'Bolsas' : r.p ? r.p.n : r.desc}</strong>
                    <small>{r.desc}</small>
                  </span>
                </button>
                {#if priceEdit === i}
                  <!-- svelte-ignore a11y_autofocus -->
                  <input class="input num pr-in" inputmode="decimal" value={priceOf(r) != null ? String(priceOf(r)).replace('.', ',') : ''} autofocus aria-label={`Importe de '${r.desc}'`} onblur={(e) => setPrice(r, e.currentTarget.value)} onkeydown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
                {:else}
                  <button class="pr num" onclick={() => (priceEdit = i)} aria-label={`Importe ${priceOf(r) != null ? eur(priceOf(r)) : 'sin leer'}, tocar para corregir`}>{priceOf(r) != null ? eur(priceOf(r)) : '¿?'}</button>
                {/if}
                <button class="x" onclick={() => (r.on = !r.on)} aria-label={r.on ? `Quitar '${r.desc}'` : `Volver a poner '${r.desc}'`}>{#if r.on}<X size={18} aria-hidden="true" />{:else}<Plus size={18} aria-hidden="true" />{/if}</button>
              </div>
              {#if r.on && !r.sure}
                <div class="acts">
                  {#if r.p}<button class="mini ok" onclick={() => (r.sure = true)}><Check size={16} aria-hidden="true" /> Es este</button>{/if}
                  <button class="mini" onclick={() => startEdit(i)}><Search size={16} aria-hidden="true" /> {r.p ? 'Es otro' : 'Elegir producto'}</button>
                </div>
              {/if}
              {#if editing === i}
                {@render picker()}
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
    {/each}
    {#if editing === 'new'}
      <div class="newline">{@render picker()}</div>
    {:else}
      <button class="btn btn-block" onclick={() => startEdit('new')}><Plus size={18} aria-hidden="true" /> Añadir un producto que falta</button>
    {/if}

    <label class="clear"><input type="checkbox" bind:checked={clearList} /> Quitar de la lista lo que ya está comprado</label>
    <button class="btn btn-primary btn-block" onclick={save} disabled={saving || !rows.some((r) => r.on)}>{saving ? 'Guardando…' : `Guardar compra · ${eur(ticketTotal ?? sum)}`}</button>
  {/if}
</Sheet>

{#snippet picker()}
  <div class="picker">
    <label class="visually-hidden" for="tk-q">Buscar el producto</label>
    <input id="tk-q" class="input" bind:value={q} placeholder="Buscar el producto…" autocomplete="off" />
    <ul class="res" role="list">
      {#each results as r (r.p.id)}
        <li>
          <button class="res-b" onclick={() => choose(r.p)}>
            {#if imgUrl(r.p)}<img src={imgUrl(r.p, 96)} alt="" width="40" height="40" loading="lazy" />{/if}
            <span class="tx"><strong>{r.p.n}</strong><small>{unitLabel(r.p)}</small></span>
            <span class="num">{eur(r.p.p)}</span>
          </button>
        </li>
      {/each}
    </ul>
    <button class="btn btn-ghost" onclick={() => (editing = null)}>Cancelar</button>
  </div>
{/snippet}

<style>
  .thumbs {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    gap: 8px;
    overflow-x: auto;
  }
  .thumbs li {
    position: relative;
    flex: none;
  }
  .thumbs img {
    width: 76px;
    height: 110px;
    object-fit: cover;
    border-radius: 12px;
    display: block;
  }
  .n {
    position: absolute;
    left: 6px;
    top: 6px;
    min-width: 22px;
    padding: 0 6px;
    border-radius: 999px;
    background: var(--surface);
    font-weight: 800;
    font-size: 0.8rem;
    text-align: center;
  }
  .rm {
    position: absolute;
    right: 4px;
    top: 4px;
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border: 0;
    border-radius: 999px;
    background: rgb(0 0 0 / 0.55);
    color: #fff;
    cursor: pointer;
  }
  .pick {
    cursor: pointer;
  }
  .tips {
    margin: 0;
    padding-left: 18px;
    color: var(--ink-2);
    font-size: 0.9rem;
  }
  .reading {
    display: grid;
    gap: 10px;
    padding: 20px 0;
  }
  .bar {
    height: 10px;
    border-radius: 5px;
    background: var(--surface-2);
    overflow: hidden;
  }
  .bar span {
    display: block;
    height: 100%;
    background: var(--c-huerta);
    transition: width 0.3s;
  }
  .head-row :global(.input) {
    min-width: 0;
  }
  .head-row {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
  .summary {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
    align-items: center;
  }
  .chk {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--lemon-ink);
    font-weight: 650;
  }
  .gap {
    padding: 10px 12px;
    border-radius: 12px;
    background: var(--lemon-soft);
    color: var(--lemon-ink);
    font-size: 0.92rem;
  }
  .lines {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }
  .lines li {
    display: grid;
    gap: 6px;
    padding: 6px;
    border-radius: 14px;
    background: var(--paper);
  }
  .grp {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.95rem;
  }
  .grp .num {
    padding: 0 8px;
    border-radius: 999px;
    background: var(--surface-2);
    font-size: 0.8rem;
  }
  .grp.warn .num {
    background: var(--lemon);
    color: #2b2300;
  }
  .row-b {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 4px;
    border: 0;
    border-radius: 10px;
    background: transparent;
    color: var(--ink);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .row-b:disabled {
    cursor: default;
  }
  .x {
    flex: none;
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--ink-2);
    cursor: pointer;
  }
  .lines li.check {
    background: var(--lemon-soft);
  }
  .lines li.off {
    opacity: 0.5;
  }
  .ln {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .ln img,
  .noimg {
    flex: none;
    width: 44px;
    height: 44px;
    border-radius: 10px;
    background: #fff;
    object-fit: contain;
  }
  .noimg {
    display: grid;
    place-items: center;
    background: var(--surface);
    color: var(--ink-2);
  }
  .bag {
    color: var(--c-otros);
  }
  .tx {
    flex: 1;
    min-width: 0;
    display: grid;
    line-height: 1.25;
  }
  .tx strong {
    font-size: 0.95rem;
  }
  .tx small {
    font-size: 0.78rem;
    color: var(--ink-2);
  }
  .q {
    color: var(--accent-text);
  }
  .pr {
    flex: none;
    min-height: 40px;
    padding: 0 8px;
    border: 0;
    border-radius: 10px;
    background: transparent;
    color: var(--ink);
    font: inherit;
    font-weight: 800;
    cursor: pointer;
    text-decoration: underline dotted var(--line);
    text-underline-offset: 4px;
  }
  .pr-in {
    flex: none;
    width: 6rem;
    min-height: 40px;
    text-align: right;
  }
  .acts {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding-left: 58px;
  }
  .mini {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-height: 40px;
    padding: 0 12px;
    border: 0;
    border-radius: 999px;
    background: var(--surface);
    color: var(--ink);
    font: inherit;
    font-size: 0.85rem;
    font-weight: 650;
    cursor: pointer;
  }
  .mini.ok {
    background: color-mix(in srgb, var(--c-huerta) 16%, var(--surface));
  }
  .picker,
  .newline {
    display: grid;
    gap: 6px;
  }
  .res {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 4px;
    max-height: 50dvh;
    overflow: auto;
  }
  .res-b {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 52px;
    padding: 6px 10px;
    border: 0;
    border-radius: 12px;
    background: var(--surface);
    color: var(--ink);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .res-b img {
    border-radius: 8px;
    background: #fff;
    object-fit: contain;
  }
  .clear {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 44px;
  }
  .clear input {
    width: 22px;
    height: 22px;
  }
</style>

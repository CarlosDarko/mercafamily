<script>
  // Lo dicho por voz, para revisar antes de apuntar: cada cosa con el producto propuesto y los demás formatos y tamaños
  import { X, Minus, Plus, Mic } from '@lucide/svelte'
  import { app, searchCatalog, addProduct, addText, toast } from '../lib/data.svelte.js'
  import { imgUrl, unitLabel } from '../lib/catalog.js'
  import { eur } from '../lib/format.js'
  import Sheet from './Sheet.svelte'

  let { phrases, heard = '', onclose } = $props()

  // Cada frase: cantidad, lo que se busca, opciones del catálogo y la elegida (null = apuntar tal cual)
  let rows = $state(
    phrases.map((t) => {
      const m = t.trim().match(/^(\d+)\s*(x\s*)?(.+)$/i)
      const qty = m ? Math.min(Number(m[1]), 99) || 1 : 1
      const q = m ? m[3] : t.trim()
      const options = app.catalog ? searchCatalog(q, 24).map((r) => r.p) : []
      return { q, qty, options, pick: options[0]?.id ?? null, on: true }
    })
  )
  const count = $derived(rows.filter((r) => r.on).length)
  let saving = $state(false)

  async function save() {
    saving = true
    const names = []
    for (const r of rows.filter((x) => x.on)) {
      const p = r.pick != null ? app.catalog?.byId.get(r.pick) : null
      if (p) {
        await addProduct(p, r.qty)
        names.push(p.n.replace(/ Hacendado$/, ''))
      } else {
        const it = await addText(`${r.qty} ${r.q}`)
        if (it?.name) names.push(it.name)
      }
    }
    saving = false
    toast(names.length ? `Apuntado: ${names.join(', ')}` : 'No se ha apuntado nada', null, 5000)
    onclose()
  }
</script>

<Sheet {onclose} labelledby="voice-title">
  <div class="sheet-head">
    <h2 id="voice-title">¿Es esto?</h2>
    <button class="icon-btn" onclick={onclose} aria-label="Cerrar sin apuntar"><X size={24} aria-hidden="true" /></button>
  </div>
  {#if heard}<p class="heard"><Mic size={16} aria-hidden="true" /> '{heard}'</p>{/if}

  {#each rows as r, i (i)}
    <section class="row" class:off={!r.on} aria-labelledby={`v-${i}`}>
      <div class="r-head">
        <label class="inc">
          <input type="checkbox" bind:checked={r.on} />
          <h3 id={`v-${i}`}>{r.q.charAt(0).toUpperCase() + r.q.slice(1)}</h3>
        </label>
        <div class="qty" role="group" aria-label={`Cantidad de ${r.q}`}>
          <button class="q-btn" onclick={() => (r.qty = Math.max(1, r.qty - 1))} disabled={r.qty <= 1} aria-label="Una menos"><Minus size={18} aria-hidden="true" /></button>
          <output class="num">{r.qty}</output>
          <button class="q-btn" onclick={() => (r.qty = Math.min(99, r.qty + 1))} aria-label="Una más"><Plus size={18} aria-hidden="true" /></button>
        </div>
      </div>
      {#if r.on}
        {#if r.options.length}
          <p class="hint">{r.options.length === 1 ? 'Un producto en Mercadona' : `${r.options.length} opciones: desliza y toca la que queréis`}</p>
          <ul class="opts" role="list" aria-label={`Opciones para ${r.q}`}>
            {#each r.options as p (p.id)}
              <li>
                <button class="opt" aria-pressed={r.pick === p.id} onclick={() => (r.pick = p.id)}>
                  {#if imgUrl(p)}<img src={imgUrl(p, 120)} alt="" width="64" height="64" loading="lazy" />{:else}<span class="noimg" aria-hidden="true"></span>{/if}
                  <span class="o-name">{p.n.replace(/ Hacendado$/, '')}</span>
                  <span class="o-unit">{unitLabel(p)}</span>
                  <span class="o-price num">{eur(p.p)}</span>
                </button>
              </li>
            {/each}
            <li>
              <button class="opt plain" aria-pressed={r.pick === null} onclick={() => (r.pick = null)}>
                <span class="o-name">Apuntar '{r.q}' tal cual</span>
                <span class="o-unit">Sin producto, lo elegís en la tienda</span>
              </button>
            </li>
          </ul>
        {:else}
          <p class="hint">No está en el catálogo de Mercadona: se apunta tal cual, sin precio.</p>
        {/if}
      {/if}
    </section>
  {/each}

  <button class="btn btn-primary btn-block" onclick={save} disabled={!count || saving}>{saving ? 'Apuntando…' : count === 1 ? 'Apuntar en la lista' : `Apuntar ${count} en la lista`}</button>
</Sheet>

<style>
  .heard {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--ink-2);
    font-style: italic;
  }
  .row {
    display: grid;
    gap: 8px;
    padding: 12px;
    border-radius: 18px;
    background: var(--paper);
  }
  .row.off {
    opacity: 0.6;
  }
  .r-head {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .inc {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 44px;
    cursor: pointer;
  }
  .inc input {
    width: 22px;
    height: 22px;
    flex: none;
  }
  h3 {
    font-size: 1.05rem;
  }
  .qty {
    flex: none;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 3px;
    border-radius: 999px;
    background: var(--surface);
  }
  .q-btn {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border: 0;
    border-radius: 999px;
    background: var(--surface-2);
    color: var(--ink);
    cursor: pointer;
  }
  .q-btn:disabled {
    opacity: 0.4;
  }
  .qty output {
    min-width: 2ch;
    text-align: center;
    font-weight: 800;
  }
  .opts {
    list-style: none;
    margin: 0 -12px;
    padding: 2px 12px 6px;
    display: flex;
    gap: 8px;
    overflow-x: auto;
    scroll-snap-type: x proximity;
    scrollbar-width: none;
  }
  .opts li {
    flex: none;
    scroll-snap-align: start;
  }
  .opt {
    width: 8.25rem;
    height: 100%;
    display: grid;
    align-content: start;
    justify-items: start;
    gap: 3px;
    padding: 10px;
    border: 2px solid transparent;
    border-radius: 16px;
    background: var(--surface);
    color: var(--ink);
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .opt[aria-pressed='true'] {
    border-color: var(--c-huerta);
    background: color-mix(in srgb, var(--c-huerta) 8%, var(--surface));
  }
  .opt img,
  .noimg {
    width: 64px;
    height: 64px;
    border-radius: 10px;
    background: #fff;
    object-fit: contain;
  }
  .o-name {
    font-weight: 650;
    font-size: 0.9rem;
    line-height: 1.25;
  }
  .o-unit {
    font-size: 0.78rem;
    color: var(--ink-2);
  }
  .o-price {
    font-weight: 800;
  }
  .plain {
    align-content: center;
    border-style: dashed;
    border-color: var(--line);
  }
</style>

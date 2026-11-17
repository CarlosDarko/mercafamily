<script>
  import { X, Camera } from '@lucide/svelte'
  import { app, closeTrip, toast, itemsOfList } from '../lib/data.svelte.js'
  import { parseTicket, matchLines, readTicket } from '../lib/ticket.js'
  import { eur, parseNum, isoDate } from '../lib/format.js'
  import Sheet from './Sheet.svelte'

  let { total, count, onclose } = $props()
  const STORES = ['Mercadona', 'Lidl', 'Carrefour', 'Mercado', 'Otra tienda']
  let store = $state('Mercadona')
  let date = $state(isoDate())
  let real = $state('')
  let error = $state('')
  let reading = $state(null) // null | número 0..1
  let found = $state(null)
  let prices = {}

  async function onPhoto(e) {
    const f = e.currentTarget.files?.[0]
    e.currentTarget.value = ''
    if (!f) return
    error = ''
    reading = 0
    try {
      const text = await readTicket(f, (p) => (reading = p))
      const t = parseTicket(text)
      const cart = itemsOfList().filter((i) => i.checked)
      const m = matchLines(t.lines, cart)
      prices = Object.fromEntries(m.map((x) => [x.item.id, x.line.unit]))
      if (t.total) real = String(t.total.toFixed(2)).replace('.', ',')
      found = { total: t.total, lines: t.lines.length, matched: m.length, cart: cart.length }
      if (!t.total && !t.lines.length) error = 'No he podido leer el ticket. Prueba con más luz y el ticket estirado, o escribe el total.'
    } catch (err) {
      console.error(err)
      error = 'No se ha podido leer la foto. Hace falta conexión la primera vez para descargar el lector.'
    }
    reading = null
  }

  async function save(e) {
    e.preventDefault()
    const v = real.trim() ? parseNum(real) : null
    if (real.trim() && (v == null || v <= 0)) {
      error = 'Escribe el importe con números, por ejemplo 62,40.'
      return
    }
    await closeTrip({ store, date, total: v, prices })
    onclose()
  }
</script>

<Sheet {onclose} labelledby="close-title">
  <form class="stack" onsubmit={save}>
    <div class="sheet-head">
      <h2 id="close-title">Terminar compra</h2>
      <button type="button" class="icon-btn" onclick={onclose} aria-label="Cerrar"><X size={24} aria-hidden="true" /></button>
    </div>
    <p>
      Se guardan en Gastos {count === 1 ? 'el' : 'los'} <strong>{count} {count === 1 ? 'producto' : 'productos'}</strong> del carro, con un total previsto de <strong class="num">{eur(total)}</strong>.
      Lo que no hayáis cogido se queda en la lista.
    </p>

    <label class="btn photo">
      <Camera size={20} aria-hidden="true" />
      {reading != null ? `Leyendo el ticket… ${Math.round(reading * 100)} %` : 'Leer el ticket con la cámara'}
      <input class="visually-hidden" type="file" accept="image/*" capture="environment" onchange={onPhoto} disabled={reading != null} />
    </label>
    {#if found}
      <p class="found" role="status">
        {found.total ? `Total leído: ${eur(found.total)}.` : 'No encuentro el total.'}
        {found.matched ? ` Precios reales de ${found.matched} de ${found.cart} productos.` : ''}
      </p>
    {/if}

    <label class="field">
      <span>Total del ticket (opcional)</span>
      <input class="input num" bind:value={real} inputmode="decimal" placeholder={eur(total)} aria-describedby="real-hint" aria-invalid={!!error} />
      <span id="real-hint" class="hint">Si lo dejas en blanco se guarda el previsto con los precios de Mercadona.</span>
      {#if error}<span class="error-text" role="alert">{error}</span>{/if}
    </label>

    <div class="two">
      <label class="field">
        <span>Tienda</span>
        <select class="input" bind:value={store}>
          {#each STORES as s}<option>{s}</option>{/each}
        </select>
      </label>
      <label class="field">
        <span>Fecha</span>
        <input class="input" type="date" bind:value={date} max={isoDate()} required />
      </label>
    </div>

    <button class="btn btn-primary btn-block" type="submit">Guardar compra</button>
  </form>
</Sheet>

<style>
  .photo {
    position: relative;
    background: var(--market-soft);
  }
  .photo:focus-within {
    outline: 3px solid var(--focus);
    outline-offset: 2px;
  }
  .found {
    padding: 10px 14px;
    border-radius: 12px;
    background: var(--lemon-soft);
    color: var(--lemon-ink);
    font-weight: 600;
  }
  .two {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
</style>

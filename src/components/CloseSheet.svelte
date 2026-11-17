<script>
  import { X } from '@lucide/svelte'
  import { closeTrip, toast } from '../lib/data.svelte.js'
  import { eur, parseNum, isoDate } from '../lib/format.js'
  import Sheet from './Sheet.svelte'

  let { total, count, onclose } = $props()
  const STORES = ['Mercadona', 'Lidl', 'Carrefour', 'Mercado', 'Otra tienda']
  let store = $state('Mercadona')
  let date = $state(isoDate())
  let real = $state('')
  let error = $state('')

  async function save(e) {
    e.preventDefault()
    const v = real.trim() ? parseNum(real) : null
    if (real.trim() && (v == null || v <= 0)) {
      error = 'Escribe el importe con números, por ejemplo 62,40.'
      return
    }
    const saved = v ?? total
    await closeTrip({ store, date, total: v })
    toast(`Compra guardada en Gastos: ${eur(saved)}`)
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
  .two {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
</style>

<script>
  // Hoja modal con <dialog> nativo: atrapa el foco, se cierra con Esc y devuelve el foco al cerrar
  import Toast from './Toast.svelte'
  import { app } from '../lib/data.svelte.js'
  let { onclose, labelledby, children } = $props()
  let dlg
  // Con una hoja abierta, lo de fuera no se puede pulsar: el aviso (y su 'Deshacer') se pinta dentro de la hoja de arriba
  const me = Math.random()
  app.sheets = [...app.sheets, me]
  $effect(() => () => (app.sheets = app.sheets.filter((x) => x !== me)))
  const opener = document.activeElement

  $effect(() => {
    dlg.showModal()
    return () => opener?.focus?.()
  })
</script>

<dialog
  bind:this={dlg}
  aria-labelledby={labelledby}
  oncancel={(e) => (e.preventDefault(), onclose())}
  onclick={(e) => e.target === dlg && onclose()}
>
  <div class="sheet">
    {@render children()}
  </div>
  {#if app.sheets.at(-1) === me}<Toast inside />{/if}
</dialog>

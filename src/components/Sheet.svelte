<script>
  // Hoja modal con <dialog> nativo: atrapa el foco, se cierra con Esc y devuelve el foco al cerrar
  let { onclose, labelledby, children } = $props()
  let dlg
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
</dialog>

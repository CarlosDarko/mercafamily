<script>
  // Escáner de código de barras con la cámara (BarcodeDetector). Busca el código en las fichas de Mercadona.
  import { X } from '@lucide/svelte'
  import { app, addProduct, toast } from '../lib/data.svelte.js'
  import { productByEan } from '../lib/nutrition.js'
  import Sheet from './Sheet.svelte'

  let { onclose } = $props()
  let video
  let status = $state('Apunta al código de barras del envase')
  let error = $state('')

  $effect(() => {
    let stream
    let stop = false
    let last = ''
    const detector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a'] })
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then(async (s) => {
        stream = s
        video.srcObject = s
        await video.play()
        while (!stop) {
          try {
            const codes = await detector.detect(video)
            const code = codes[0]?.rawValue
            if (code && code !== last) {
              last = code
              const id = await productByEan(code)
              const p = id ? app.catalog?.byId.get(id) : null
              if (p) {
                await addProduct(p)
                toast(`Añadido: ${p.n}`)
                navigator.vibrate?.(60)
                onclose()
                return
              }
              status = 'Ese código no está en el catálogo de Mercadona. Prueba con otro envase o escríbelo.'
            }
          } catch {}
          await new Promise((r) => setTimeout(r, 250))
        }
      })
      .catch(() => (error = 'No hay permiso para usar la cámara. Actívalo en los ajustes del navegador.'))
    return () => {
      stop = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  })
</script>

<Sheet {onclose} labelledby="scan-title">
  <div class="sheet-head">
    <h2 id="scan-title">Escanear un producto</h2>
    <button class="icon-btn" onclick={onclose} aria-label="Cerrar"><X size={24} aria-hidden="true" /></button>
  </div>
  {#if error}
    <p class="error-text" role="alert">{error}</p>
  {:else}
    <div class="frame">
      <!-- svelte-ignore a11y_media_has_caption -->
      <video bind:this={video} playsinline muted></video>
      <span class="aim" aria-hidden="true"></span>
    </div>
    <p role="status">{status}</p>
  {/if}
</Sheet>

<style>
  .frame {
    position: relative;
    border-radius: 16px;
    overflow: hidden;
    background: #000;
    aspect-ratio: 4 / 3;
  }
  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .aim {
    position: absolute;
    inset: 30% 12%;
    border: 3px solid var(--lemon);
    border-radius: 12px;
    box-shadow: 0 0 0 999px rgb(0 0 0 / 0.35);
  }
</style>

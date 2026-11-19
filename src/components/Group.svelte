<script module>
  // Qué grupos están abiertos: así no se cierran al guardar un ajuste (la pantalla se vuelve a pintar)
  const opened = new Map()
</script>

<script>
  // Grupo plegable de Ajustes: icono de color, título, resumen y contenido al abrir (details/summary nativo)
  import { ChevronDown } from '@lucide/svelte'
  let { id, title, icon: Icon, color = '--c-otros', summary = '', open = false, children } = $props()
  let isOpen = $state(opened.get(id) ?? open)
  $effect(() => {
    opened.set(id, isOpen)
  })
</script>

<details class="group" bind:open={isOpen} style={`--gc: var(${color})`}>
  <summary aria-describedby={summary ? `sum-${id}` : undefined}>
    <span class="g-ic" aria-hidden="true"><Icon size={20} /></span>
    <span class="g-tx">
      <h2 id={`h-${id}`}>{title}</h2>
      {#if summary}<small id={`sum-${id}`}>{summary}</small>{/if}
    </span>
    <ChevronDown size={20} aria-hidden="true" class="g-chev" />
  </summary>
  <div class="g-body">
    {@render children()}
  </div>
</details>

<style>
  .group {
    background: var(--surface);
    border-radius: 18px;
    box-shadow: var(--shadow);
    overflow: hidden;
  }
  .group + :global(.group) {
    margin-top: 8px;
  }
  summary {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 64px;
    padding: 10px 14px;
    cursor: pointer;
    list-style: none;
  }
  summary::-webkit-details-marker {
    display: none;
  }
  .g-ic {
    flex: none;
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border-radius: 13px;
    background: color-mix(in srgb, var(--gc) 15%, var(--surface));
    color: var(--gc);
  }
  .g-tx {
    flex: 1;
    min-width: 0;
    display: grid;
    line-height: 1.25;
  }
  h2 {
    font-size: 1rem;
  }
  small {
    color: var(--ink-2);
    font-size: 0.85rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  summary :global(.g-chev) {
    flex: none;
    color: var(--ink-2);
    transition: transform 0.3s var(--ease-out);
  }
  .group[open] summary :global(.g-chev) {
    transform: rotate(180deg);
  }
  .g-body {
    padding: 0 14px 16px;
    display: grid;
    gap: 12px;
  }
  .group[open] .g-body {
    animation: rise 0.3s var(--ease-out);
  }
  /* Las tarjetas de dentro ya están en una tarjeta: sin sombra ni fondo propio */
  .g-body :global(.panel) {
    box-shadow: none;
    background: transparent;
    padding: 0;
  }
</style>

<script>
  import { app } from '../lib/data.svelte.js'
  // inside: el de dentro de una hoja abierta. El de fuera se calla mientras haya hojas abiertas.
  let { inside = false } = $props()
  const show = $derived(app.toast && (inside || !app.sheets.length))
</script>

<div class="toast-zone" class:inside role="status" aria-live="polite">
  {#if show}
    <div class="toast">
      <span>{app.toast.msg}</span>
      {#if app.toast.action}
        <button class="btn btn-ghost" onclick={() => (app.toast.action.run(), (app.toast = null))}>{app.toast.action.label}</button>
      {/if}
    </div>
  {/if}
</div>

<style>
  .toast-zone {
    position: fixed;
    left: 0;
    right: 0;
    bottom: calc(196px + env(safe-area-inset-bottom));
    display: grid;
    justify-items: center;
    pointer-events: none;
    z-index: 50;
    padding: 0 var(--gutter);
  }
  .inside {
    bottom: calc(24px + env(safe-area-inset-bottom));
  }
  .toast {
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 8px;
    max-width: 560px;
    padding: 8px 8px 8px 18px;
    border-radius: 16px;
    background: var(--ink);
    color: var(--paper);
    box-shadow: var(--shadow);
    animation: up 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .toast .btn {
    color: var(--lemon);
    min-height: 44px;
  }
  @keyframes up {
    from {
      transform: translateY(12px);
      opacity: 0;
    }
  }
</style>

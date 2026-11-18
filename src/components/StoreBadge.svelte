<script>
  // Distintivo de cada tienda con su color de marca (nombre escrito, no se copian sus logotipos)
  let { store, size = 'md' } = $props()
  const S = {
    mercadona: { label: 'Mercadona', bg: '#00843d', fg: '#fff', cls: 'merca' },
    dia: { label: 'Dia', bg: '#e2001a', fg: '#fff', cls: 'dia' },
    consum: { label: 'consum', bg: '#f28c00', fg: '#2b1a00', cls: 'consum' }
  }
  const s = $derived(S[store?.toLowerCase()] || { label: store, bg: 'var(--surface-2)', fg: 'var(--ink)', cls: '' })
</script>

<span class={`badge ${s.cls} ${size}`} style={`--b:${s.bg};--f:${s.fg}`}>{s.label}</span>

<style>
  .badge {
    display: inline-grid;
    place-items: center;
    flex: none;
    min-width: 4.6rem;
    height: 32px;
    padding: 0 10px;
    border-radius: 9px;
    background: var(--b);
    color: var(--f);
    font-weight: 800;
    font-size: 0.9rem;
    letter-spacing: -0.01em;
    line-height: 1;
  }
  .sm {
    min-width: 0;
    height: 24px;
    padding: 0 7px;
    border-radius: 7px;
    font-size: 0.75rem;
  }
  .dia {
    font-size: 1rem;
    letter-spacing: 0.01em;
  }
  .dia.sm {
    font-size: 0.8rem;
  }
  .consum {
    text-transform: lowercase;
    letter-spacing: -0.02em;
  }
</style>

<script>
  import { Search, Plus, Heart, ScanBarcode, Mic, MicOff } from '@lucide/svelte'
  import { voiceSupported, listen, parseSpoken } from '../lib/voice.js'
  import Scanner from './Scanner.svelte'
  import { app, searchCatalog, addProduct, addText, rememberAlias, toast } from '../lib/data.svelte.js'
  import { imgUrl, unitLabel } from '../lib/catalog.js'
  import { inSeason } from '../lib/home.js'
  import { eur } from '../lib/format.js'

  let text = $state('')
  let scanning = $state(false)
  let listening = $state(false)
  let heard = $state('')
  let stopVoice = null
  const canVoice = voiceSupported()

  function toggleVoice() {
    if (listening) return stopVoice?.()
    heard = ''
    listening = true
    stopVoice = listen({
      onResult: (t) => (heard = t),
      onError: (err) => {
        listening = false
        if (err === 'not-allowed') toast('Sin permiso para el micrófono. Actívalo en los ajustes del navegador.')
        else if (err !== 'aborted' && err !== 'no-speech') toast('No te he entendido. Prueba otra vez.')
      },
      onEnd: async (final) => {
        listening = false
        const things = parseSpoken(final || heard)
        heard = ''
        if (!things.length) return
        const names = []
        for (const t of things) {
          const it = await addText(t)
          if (it?.name) names.push(it.name.replace(/ Hacendado$/, ''))
        }
        toast(`Apuntado: ${names.join(', ')}`, null, 5000)
      }
    })
  }
  const canScan = typeof window !== 'undefined' && 'BarcodeDetector' in window && !!navigator.mediaDevices?.getUserMedia
  let active = $state(-1)
  let input

  const parsed = $derived.by(() => {
    const m = text.trim().match(/^(\d+)\s*(x\s*)?(.+)$/i)
    return m ? { qty: Math.min(Number(m[1]), 99) || 1, q: m[3] } : { qty: 1, q: text.trim() }
  })
  const results = $derived(parsed.q.length >= 2 && app.catalog ? searchCatalog(parsed.q, 8) : [])
  const open = $derived(results.length > 0)

  $effect(() => {
    results
    active = -1
  })

  async function pick(r) {
    // Si no era el primero de la lista, se aprende: la próxima vez esta búsqueda pone primero este producto
    if (results[0]?.p.id !== r.p.id) rememberAlias(parsed.q, r.p.id)
    await addProduct(r.p, parsed.qty)
    text = ''
    input?.focus()
  }

  async function submit(e) {
    e.preventDefault()
    if (active >= 0 && results[active]) return pick(results[active])
    if (!text.trim()) return
    await addText(text)
    text = ''
    input?.focus()
  }

  function onkey(e) {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      active = (active + 1) % results.length
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      active = active <= 0 ? results.length - 1 : active - 1
    } else if (e.key === 'Escape') {
      text = ''
    }
  }
</script>

<form class="add" role="search" aria-label="Añadir a la lista" onsubmit={submit}>
  <label for="add-input" class="visually-hidden">Producto que hace falta</label>
  <div class="add-field" style={`--btns:${text.trim() ? 1 : (canVoice ? 1 : 0) + (canScan ? 1 : 0)}`}>
    <Search size={20} aria-hidden="true" class="add-icon" />
    <input
      bind:this={input}
      bind:value={text}
      onkeydown={onkey}
      id="add-input"
      class="input"
      type="text"
      inputmode="search"
      enterkeyhint="done"
      autocomplete="off"
      autocapitalize="sentences"
      spellcheck="false"
      placeholder="¿Qué hace falta?"
      role="combobox"
      aria-expanded={open}
      aria-controls="add-results"
      aria-autocomplete="list"
      aria-activedescendant={active >= 0 ? `opt-${results[active]?.p.id}` : undefined}
      aria-describedby="add-help"
    />
    <div class="in-btns">
      {#if text.trim()}
        <button class="go" type="submit" aria-label="Añadir a la lista"><Plus size={24} strokeWidth={2.6} aria-hidden="true" /></button>
      {:else}
        {#if canVoice}
          <button class="ib" class:live={listening} type="button" onclick={toggleVoice} aria-pressed={listening} aria-label={listening ? 'Dejar de escuchar' : 'Apuntar hablando'}>
            {#if listening}<MicOff size={22} aria-hidden="true" />{:else}<Mic size={22} aria-hidden="true" />{/if}
          </button>
        {/if}
        {#if canScan}
          <button class="ib" type="button" onclick={() => (scanning = true)} aria-label="Escanear código de barras">
            <ScanBarcode size={22} aria-hidden="true" />
          </button>
        {/if}
      {/if}
    </div>
  </div>
  {#if listening}
    <p class="heard" role="status">{heard ? `'${heard}'` : "Te escucho… di por ejemplo 'leche, dos de tomate y pan de molde'"}</p>
  {/if}
  <p id="add-help" class="visually-hidden">Al pulsar Añadir se elige el producto más probable según vuestras preferencias e historial. También puedes elegir uno de la lista.</p>

  <ul id="add-results" class="results panel" role="listbox" aria-label="Productos de Mercadona" hidden={!open}>
    {#each results as r, i (r.p.id)}
      <li
        id={`opt-${r.p.id}`}
        role="option"
        aria-selected={i === active}
        class:active={i === active}
        onclick={() => pick(r)}
        onkeydown={() => {}}
      >
        {#if imgUrl(r.p)}
          <img src={imgUrl(r.p, 96)} alt="" width="44" height="44" loading="lazy" />
        {:else}
          <span class="noimg" aria-hidden="true"></span>
        {/if}
        <span class="r-text">
          <span class="r-name">{r.p.n}</span>
          <span class="r-meta">{unitLabel(r.p)}</span>
          {#if inSeason(r.p, app.catalog?.cats.get(r.p.c)?.n)}<span class="r-season">De temporada</span>{/if}
          {#if r.reasons.length}
            <span class="r-pref"><Heart size={14} aria-hidden="true" /> {r.reasons[0] === 'Lo elegisteis antes' ? r.reasons[0] : 'Vuestra preferencia'}</span>
          {/if}
        </span>
        <span class="r-price num">{eur(r.p.p)}</span>
      </li>
    {/each}
  </ul>
  {#if parsed.q.length >= 2 && app.catalog && !results.length}
    <p class="noresults muted" role="status">No está en el catálogo de Mercadona. Pulsa Añadir y se apunta tal cual, sin precio.</p>
  {/if}
</form>

{#if scanning}
  <Scanner onclose={() => (scanning = false)} />
{/if}

<style>
  .add {
    position: sticky;
    top: 0;
    z-index: 10;
    padding: 10px 0;
    margin: 4px calc(var(--gutter) * -1) 0;
    padding-inline: var(--gutter);
    background: var(--paper);
  }
  .add-field {
    position: relative;
  }
  .add-field :global(.add-icon) {
    position: absolute;
    left: 16px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--c-huerta);
    pointer-events: none;
  }
  .add-field .input {
    padding-left: 48px;
    padding-right: calc(var(--btns) * 46px + 10px);
    min-height: 58px;
    font-size: 1.1rem;
    font-weight: 550;
    border-radius: 999px;
    border: 2px solid transparent;
    background: var(--surface);
    box-shadow: var(--shadow);
    transition: box-shadow 0.25s, border-color 0.25s;
  }
  .add-field .input:focus-visible {
    outline: none;
    border-color: var(--c-huerta);
    box-shadow: 0 0 0 5px color-mix(in srgb, var(--c-huerta) 20%, transparent), var(--shadow);
  }
  .in-btns {
    position: absolute;
    right: 6px;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    gap: 2px;
  }
  .ib,
  .go {
    display: grid;
    place-items: center;
    width: 46px;
    height: 46px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--ink-2);
    cursor: pointer;
  }
  .go {
    background: var(--c-huerta);
    color: #fff;
    animation: go-in 0.35s var(--ease-spring);
  }
  @keyframes go-in {
    from {
      transform: scale(0.4) rotate(-90deg);
    }
  }
  @media (hover: hover) {
    .ib:hover {
      background: var(--surface-2);
      color: var(--ink);
    }
  }
  .ib.live {
    background: var(--c-tomate);
    color: #fff;
    animation: pulse 1.4s ease-in-out infinite;
  }
  @keyframes pulse {
    50% {
      box-shadow: 0 0 0 8px color-mix(in srgb, var(--c-tomate) 22%, transparent);
    }
  }
  .heard {
    margin-top: 8px;
    animation: rise 0.3s var(--ease-out);
    padding: 10px 14px;
    border-radius: 12px;
    background: var(--surface);
    font-weight: 600;
  }
  .results {
    list-style: none;
    margin: 8px 0 0;
    animation: rise 0.25s var(--ease-out);
    padding: 6px;
    max-height: min(60dvh, 460px);
    overflow: auto;
  }
  .results[hidden] {
    display: none;
  }
  .results li {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 60px;
    padding: 6px 10px;
    border-radius: 10px;
    cursor: pointer;
  }
  .results li.active,
  .results li:hover {
    background: var(--market-soft);
  }
  .results img,
  .noimg {
    width: 44px;
    height: 44px;
    border-radius: 8px;
    flex: none;
    background: var(--surface-2);
    object-fit: contain;
  }
  .r-text {
    flex: 1;
    min-width: 0;
    display: grid;
    line-height: 1.3;
  }
  .r-name {
    font-weight: 600;
  }
  .r-meta {
    font-size: 0.85rem;
    color: var(--ink-2);
  }
  .r-pref {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.85rem;
    font-weight: 650;
    color: var(--accent-text);
  }
  .r-season {
    font-size: 0.85rem;
    font-weight: 650;
    color: var(--accent-text);
  }
  .r-price {
    font-weight: 700;
  }
  .noresults {
    margin-top: 8px;
    font-size: 0.95rem;
  }
</style>

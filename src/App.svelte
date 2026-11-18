<script>
  import { ShoppingBasket, ChartColumnBig, Settings as SettingsIcon, ChefHat } from '@lucide/svelte'
  import { flushSync } from 'svelte'
  import { app, boot } from './lib/data.svelte.js'
  import ListView from './components/ListView.svelte'
  import Spending from './components/Spending.svelte'
  import Settings from './components/Settings.svelte'
  import MenuView from './components/MenuView.svelte'
  import Onboarding from './components/Onboarding.svelte'
  import TicketPrint from './components/TicketPrint.svelte'
  import { needsOnboarding, logError } from './lib/data.svelte.js'
  import Welcome from './components/Welcome.svelte'
  import Toast from './components/Toast.svelte'

  const ALL_TABS = [
    { id: 'lista', label: 'Lista', title: 'Lista de la compra', icon: ShoppingBasket, color: 'var(--c-huerta)' },
    { id: 'menu', label: 'Menú', title: 'Menú y despensa', icon: ChefHat, color: 'var(--c-tomate)' },
    { id: 'gastos', label: 'Gastos', title: 'Gastos', icon: ChartColumnBig, adults: true, color: 'var(--c-mar)' },
    { id: 'ajustes', label: 'Ajustes', title: 'Ajustes', icon: SettingsIcon, color: 'var(--c-uva)' }
  ]
  const TABS = $derived(ALL_TABS.filter((t) => !t.adults || !app.prefs.kid))
  const fromHash = () => ALL_TABS.find((t) => location.hash === `#${t.id}` || location.hash.startsWith(`#${t.id}-`))?.id ?? 'lista'
  let tab = $state(fromHash())
  let guide = $state(false)
  $effect(() => {
    if (app.screen === 'ready' && needsOnboarding() && !navigator.webdriver) guide = true
  })

  const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches
  function go(id) {
    if (id === tab) return window.scrollTo({ top: 0, behavior: 'smooth' })
    // Cambio de pestaña con transición (si el navegador la tiene y no se ha pedido menos movimiento)
    const back = TABS.findIndex((t) => t.id === id) < TABS.findIndex((t) => t.id === tab)
    document.documentElement.dataset.dir = back ? 'back' : 'fwd'
    if (document.startViewTransition && !still()) document.startViewTransition(() => flushSync(() => (tab = id)))
    else tab = id
    history.replaceState(null, '', `#${id}`)
    window.scrollTo({ top: 0 })
    requestAnimationFrame(() => document.getElementById('main')?.focus({ preventScroll: true }))
  }

  $effect(() => {
    const t = ALL_TABS.find((x) => x.id === tab)
    document.title = `${t.title} · MercaFamily`
  })

  boot()
  window.addEventListener('hashchange', () => (tab = fromHash()))
  window.addEventListener('mf:go', (e) => go(e.detail))
  window.addEventListener('mf:guide', () => (guide = true))
</script>

<a class="skip-link" href="#main">Saltar al contenido</a>

{#if app.screen === 'loading'}
  <main id="main" class="page center" tabindex="-1" aria-busy="true">
    <p class="muted">Cargando la lista…</p>
  </main>
{:else if app.screen !== 'ready'}
  <Welcome />
{:else}
  <header class="shell">
    <div class="shell-inner">
      <span class="brand">
        <span class="mark" aria-hidden="true"><ShoppingBasket size={20} strokeWidth={2.4} /></span>
        <span>Merca<span class="fam">Family</span></span>
      </span>
      <span class="sync" class:on={app.kind === 'supabase' && app.live && app.online && !app.pending} class:off={!app.online} role="status">
        {#if !app.online}
          Sin conexión{app.pending ? ` · ${app.pending} ${app.pending === 1 ? 'cambio pendiente' : 'cambios pendientes'}` : ''}
        {:else if app.pending}
          Guardando {app.pending}…
        {:else if app.kind === 'local'}
          En este móvil
        {:else if app.live}
          En directo
        {:else}
          Conectando…
        {/if}
      </span>
    </div>
  </header>

  <main id="main" tabindex="-1">
    <svelte:boundary onerror={(e) => logError(e)}>
      {#if tab === 'lista'}
        <ListView />
      {:else if tab === 'menu'}
        <MenuView />
      {:else if tab === 'gastos' && !app.prefs.kid}
        <Spending />
      {:else}
        <Settings />
      {/if}
      {#snippet failed(error, reset)}
        <div class="page crash" role="alert">
          <h1>Algo ha fallado en esta pantalla</h1>
          <p class="muted">Vuestros datos están a salvo. Prueba a volver a cargarla. Si se repite, el error queda apuntado en Ajustes, Estado de la app.</p>
          <div class="row">
            <button class="btn btn-primary" onclick={reset}>Volver a cargar la pantalla</button>
            <button class="btn" onclick={() => location.reload()}>Recargar la app</button>
          </div>
        </div>
      {/snippet}
    </svelte:boundary>
  </main>

  {@const idx = Math.max(0, TABS.findIndex((t) => t.id === tab))}
  <nav class="tabbar" aria-label="Secciones" style={`--tabs:${TABS.length};--i:${idx};--tc:${TABS[idx]?.color}`}>
    <span class="ind" aria-hidden="true"></span>
    {#each TABS as t (t.id)}
      <a href={`#${t.id}`} aria-current={tab === t.id ? 'page' : undefined} onclick={(e) => (e.preventDefault(), go(t.id))} style={`--tc:${t.color}`}>
        <span class="ic"><t.icon size={24} strokeWidth={tab === t.id ? 2.4 : 1.9} aria-hidden="true" /></span>
        <span class="lb">{t.label}</span>
      </a>
    {/each}
  </nav>
{/if}

{#if guide}
  <Onboarding onclose={() => (guide = false)} />
{/if}
{#if app.lastTrip}
  <TicketPrint />
{/if}

<Toast />

<style>
  .crash {
    display: grid;
    gap: 14px;
    padding-top: 32px;
  }
  .crash .row {
    flex-wrap: wrap;
  }
  .center {
    min-height: 60dvh;
    display: grid;
    place-items: center;
  }
  main:focus {
    outline: none;
  }
  .shell {
    background: var(--paper);
    color: var(--ink);
    padding-top: env(safe-area-inset-top);
  }
  .shell-inner {
    max-width: var(--maxw);
    margin: 0 auto;
    padding: 10px var(--gutter) 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 56px;
  }
  .brand {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    font-weight: 800;
    font-size: 1.15rem;
    letter-spacing: -0.03em;
  }
  .mark {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 11px;
    background: var(--c-tomate);
    color: #fff;
    box-shadow: inset 0 -3px 0 rgb(0 0 0 / 0.14), 0 4px 12px -4px var(--c-tomate);
    transform: rotate(-6deg);
  }
  .fam {
    color: var(--c-tomate);
  }
  .sync {
    font-size: 0.85rem;
    font-weight: 600;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    border-radius: 999px;
    background: var(--surface);
    box-shadow: var(--shadow);
    color: var(--ink-2);
    white-space: nowrap;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .sync::before {
    flex: none;
    content: '';
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--lemon);
  }
  .sync.off::before {
    background: var(--c-tomate);
  }
  .sync.on::before {
    background: var(--c-huerta);
    animation: live 2.4s ease-out infinite;
  }
  @keyframes live {
    0% {
      box-shadow: 0 0 0 0 color-mix(in srgb, var(--c-huerta) 55%, transparent);
    }
    70%,
    100% {
      box-shadow: 0 0 0 8px transparent;
    }
  }
  main {
    view-transition-name: main;
  }
  .tabbar {
    view-transition-name: tabbar;
    position: fixed;
    inset: auto 0 0 0;
    z-index: 20;
    display: grid;
    grid-template-columns: repeat(var(--tabs, 4), minmax(0, 1fr));
    background: color-mix(in srgb, var(--surface) 96%, transparent);
    backdrop-filter: blur(14px) saturate(1.4);
    -webkit-backdrop-filter: blur(14px) saturate(1.4);
    border-top: 1px solid var(--line);
    padding-bottom: env(safe-area-inset-bottom);
  }
  /* Indicador que se desliza a la pestaña activa, con el color de cada una */
  .ind {
    position: absolute;
    top: 8px;
    left: 0;
    width: calc(100% / var(--tabs));
    height: 36px;
    display: grid;
    place-items: center;
    transform: translateX(calc(var(--i) * 100%));
    transition: transform 0.45s var(--ease-spring);
    pointer-events: none;
  }
  .ind::before {
    content: '';
    width: 64px;
    height: 36px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--tc) 18%, transparent);
    transition: background-color 0.3s;
  }
  .tabbar a {
    position: relative;
    display: grid;
    justify-items: center;
    gap: 2px;
    padding: 8px 0 10px;
    min-height: 64px;
    color: var(--ink-2);
    text-decoration: none;
    font-size: 0.85rem;
    font-weight: 600;
  }
  .ic {
    display: grid;
    place-items: center;
    height: 36px;
  }
  .tabbar a[aria-current='page'] {
    color: var(--ink);
  }
  .tabbar a[aria-current='page'] .ic {
    color: var(--tc);
    animation: pop 0.45s var(--ease-spring);
  }
  @keyframes pop {
    40% {
      transform: scale(1.22) rotate(-8deg);
    }
  }
  @media (min-width: 700px) {
    .tabbar {
      left: 50%;
      right: auto;
      bottom: 16px;
      width: 480px;
      transform: translateX(-50%);
      border: 1px solid var(--line);
      border-radius: 22px;
      box-shadow: var(--shadow);
      padding-bottom: 0;
    }
  }
</style>

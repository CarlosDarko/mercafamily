<script>
  import { ShoppingBasket, ChartColumnBig, Settings as SettingsIcon, ChefHat } from '@lucide/svelte'
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
    { id: 'lista', label: 'Lista', title: 'Lista de la compra', icon: ShoppingBasket },
    { id: 'menu', label: 'Menú', title: 'Menú y despensa', icon: ChefHat },
    { id: 'gastos', label: 'Gastos', title: 'Gastos', icon: ChartColumnBig, adults: true },
    { id: 'ajustes', label: 'Ajustes', title: 'Ajustes', icon: SettingsIcon }
  ]
  const TABS = $derived(ALL_TABS.filter((t) => !t.adults || !app.prefs.kid))
  const fromHash = () => ALL_TABS.find((t) => `#${t.id}` === location.hash)?.id ?? 'lista'
  let tab = $state(fromHash())
  let guide = $state(false)
  $effect(() => {
    if (app.screen === 'ready' && needsOnboarding() && !navigator.webdriver) guide = true
  })

  function go(id) {
    tab = id
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
      <span class="brand">MercaFamily</span>
      <span class="sync" class:on={app.kind === 'supabase' && app.live && app.online && !app.pending} class:off={!app.online} role="status">
        {#if !app.online}
          Sin conexión{app.pending ? ` · ${app.pending} ${app.pending === 1 ? 'cambio pendiente' : 'cambios pendientes'}` : ''}
        {:else if app.pending}
          Guardando {app.pending}…
        {:else if app.kind === 'local'}
          Solo en este móvil
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

  <nav class="tabbar" aria-label="Secciones" style={`--tabs:${TABS.length}`}>
    {#each TABS as t (t.id)}
      <a href={`#${t.id}`} aria-current={tab === t.id ? 'page' : undefined} onclick={(e) => (e.preventDefault(), go(t.id))}>
        <t.icon size={24} strokeWidth={tab === t.id ? 2.4 : 1.8} aria-hidden="true" />
        <span>{t.label}</span>
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
    background: var(--market);
    color: var(--market-ink);
    padding-top: env(safe-area-inset-top);
  }
  .shell-inner {
    max-width: var(--maxw);
    margin: 0 auto;
    padding: 10px var(--gutter);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 52px;
  }
  .brand {
    font-weight: 800;
    font-size: 1.15rem;
    letter-spacing: -0.03em;
  }
  .sync {
    font-size: 0.875rem;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .sync::before {
    content: '';
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--lemon);
  }
  .sync.off::before {
    background: #ff8a70;
  }
  .sync.on::before {
    background: #8fe0b0;
    box-shadow: 0 0 0 3px rgb(143 224 176 / 0.25);
  }
  .tabbar {
    position: fixed;
    inset: auto 0 0 0;
    z-index: 20;
    display: grid;
    grid-template-columns: repeat(var(--tabs, 4), minmax(0, 1fr));
    background: var(--surface);
    border-top: 1px solid var(--line);
    padding-bottom: env(safe-area-inset-bottom);
  }
  .tabbar a {
    display: grid;
    justify-items: center;
    gap: 2px;
    padding: 8px 0 10px;
    min-height: 60px;
    color: var(--ink-2);
    text-decoration: none;
    font-size: 0.85rem;
    font-weight: 600;
  }
  .tabbar a[aria-current='page'] {
    color: var(--ink);
  }
  .tabbar a[aria-current='page'] span {
    background: var(--market-soft);
    border-radius: 999px;
    padding: 0 10px;
  }
  @media (min-width: 700px) {
    .tabbar {
      left: 50%;
      right: auto;
      bottom: 16px;
      width: 480px;
      transform: translateX(-50%);
      border: 1px solid var(--line);
      border-radius: 20px;
      box-shadow: var(--shadow);
      padding-bottom: 0;
    }
  }
</style>

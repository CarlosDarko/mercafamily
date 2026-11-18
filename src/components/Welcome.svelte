<script>
  // Entrada: nombre (modo local), acceso con email y contraseña y crear o unirse a un hogar (Supabase)
  import { ShoppingBasket } from '@lucide/svelte'
  import { app, setMe, signIn, signUp, createHousehold, joinHousehold, saveSupabaseConfig } from '../lib/data.svelte.js'

  let name = $state(app.me)
  let email = $state(app.email)
  let password = $state('')
  let showPw = $state(false)
  let invite = $state('')
  let homeName = $state('Casa')
  let step = $state('signin')
  let mode = $state('create')
  let busy = $state(false)
  let error = $state(app.error)

  async function run(fn) {
    error = ''
    busy = true
    try {
      await fn()
    } catch (e) {
      error = e?.message || 'Algo ha fallado. Inténtalo otra vez.'
    }
    busy = false
  }

  function start(e) {
    e.preventDefault()
    if (!name.trim()) return (error = 'Escribe tu nombre para que los demás sepan quién apunta cada cosa.')
    setMe(name)
    app.screen = 'ready'
  }
  const login = (e) => (e.preventDefault(), run(() => (step === 'signin' ? signIn(email, password) : signUp(email, password))))
  function household(e) {
    e.preventDefault()
    if (!name.trim()) return (error = 'Escribe tu nombre.')
    run(() => (mode === 'create' ? createHousehold(homeName, name) : joinHousehold(invite, name)))
  }
</script>

<main id="main" class="welcome" tabindex="-1">
  <div class="card">
    <p class="brand" aria-hidden="true"><span class="mark"><ShoppingBasket size={20} strokeWidth={2.4} /></span><span>Merca<span class="fam">Family</span></span></p>

    {#if app.screen === 'welcome'}
      <h1>La compra de casa, entre todos</h1>
      <p class="muted">Apuntáis lo que falta, la app pone el producto y el precio de Mercadona y lleva la cuenta de lo que gastáis.</p>
      <form class="stack" onsubmit={start}>
        <label class="field">
          <span>¿Cómo te llamas?</span>
          <input class="input" bind:value={name} autocomplete="given-name" maxlength="30" required />
        </label>
        {#if error}<p class="error-text" role="alert">{error}</p>{/if}
        <button class="btn btn-primary btn-block" type="submit">Empezar</button>
      </form>
    {:else if app.screen === 'login'}
      <h1>Entrar en la lista familiar</h1>
      <div class="seg" role="group" aria-label="Tipo de acceso">
        <button type="button" class:on={step === 'signin'} aria-pressed={step === 'signin'} onclick={() => ((step = 'signin'), (error = ''))}>Ya tengo cuenta</button>
        <button type="button" class:on={step === 'signup'} aria-pressed={step === 'signup'} onclick={() => ((step = 'signup'), (error = ''))}>Crear cuenta</button>
      </div>
      <form class="stack" onsubmit={login}>
        <label class="field">
          <span>Email</span>
          <input class="input" type="email" bind:value={email} autocomplete="email" autocapitalize="off" required />
        </label>
        <label class="field">
          <span>Contraseña</span>
          <span class="pw">
            <input class="input" type={showPw ? 'text' : 'password'} bind:value={password} autocomplete={step === 'signin' ? 'current-password' : 'new-password'} minlength="6" required aria-describedby="pw-hint" />
            <button type="button" class="btn btn-ghost show" onclick={() => (showPw = !showPw)} aria-pressed={showPw}>{showPw ? 'Ocultar' : 'Ver'}</button>
          </span>
          <span id="pw-hint" class="hint">{step === 'signup' ? 'Al menos 6 caracteres. Cada persona de casa crea su propia cuenta.' : 'La que pusiste al crear la cuenta.'}</span>
        </label>
        {#if error}<p class="error-text" role="alert">{error}</p>{/if}
        <button class="btn btn-primary btn-block" type="submit" disabled={busy}>
          {busy ? 'Un momento…' : step === 'signin' ? 'Entrar' : 'Crear cuenta y entrar'}
        </button>
      </form>
        {#if app.error}
          <button class="btn btn-ghost btn-block" onclick={() => saveSupabaseConfig(null, null)}>Usar la app solo en este móvil</button>
        {/if}
    {:else if app.screen === 'household'}
      <h1>Vuestra lista</h1>
      <form class="stack" onsubmit={household}>
        <label class="field">
          <span>Tu nombre</span>
          <input class="input" bind:value={name} autocomplete="given-name" maxlength="30" required />
        </label>
        <fieldset class="choice">
          <legend class="label">¿Es la primera vez en casa?</legend>
          <label class="opt"><input type="radio" bind:group={mode} value="create" /> Sí, crear la lista de casa</label>
          <label class="opt"><input type="radio" bind:group={mode} value="join" /> No, alguien ya la ha creado</label>
        </fieldset>
        {#if mode === 'create'}
          <label class="field">
            <span>Nombre de la lista</span>
            <input class="input" bind:value={homeName} maxlength="40" />
          </label>
        {:else}
          <label class="field">
            <span>Código para unirse</span>
            <input class="input code" bind:value={invite} autocapitalize="characters" maxlength="8" required />
            <span class="hint">Lo encuentra quien creó la lista en Ajustes, Familia.</span>
          </label>
        {/if}
        {#if error}<p class="error-text" role="alert">{error}</p>{/if}
        <button class="btn btn-primary btn-block" type="submit" disabled={busy}>{mode === 'create' ? 'Crear la lista' : 'Unirme'}</button>
      </form>
    {/if}
  </div>
</main>

<style>
  .welcome {
    min-height: 100dvh;
    display: grid;
    place-items: center;
    padding: 24px var(--gutter);
    background:
      radial-gradient(60% 40% at 15% 10%, color-mix(in srgb, var(--c-limon) 30%, transparent), transparent 70%),
      radial-gradient(50% 40% at 90% 20%, color-mix(in srgb, var(--c-tomate) 24%, transparent), transparent 70%),
      radial-gradient(60% 50% at 50% 100%, color-mix(in srgb, var(--c-huerta) 28%, transparent), transparent 70%),
      var(--paper);
  }
  .welcome:focus {
    outline: none;
  }
  .card {
    width: 100%;
    max-width: 440px;
    padding: 28px 22px;
    border-radius: 24px;
    background: var(--surface);
    box-shadow: 0 30px 60px -30px rgb(0 0 0 / 0.5);
    display: grid;
    gap: 16px;
  }
  .card {
    animation: rise 0.6s var(--ease-out) both;
  }
  .brand {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--ink);
    font-size: 1.15rem;
  }
  .mark {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border-radius: 11px;
    background: var(--c-tomate);
    color: #fff;
    transform: rotate(-6deg);
  }
  .fam {
    color: var(--c-tomate);
  }
  h1 {
    font-size: 2rem;
  }
  .code {
    font-size: 1.4rem;
    letter-spacing: 0.15em;
    font-weight: 700;
  }
  .seg {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 4px;
    padding: 4px;
    border-radius: 14px;
    background: var(--surface-2);
  }
  .seg button {
    min-height: 44px;
    border: 0;
    border-radius: 10px;
    background: transparent;
    color: var(--ink);
    font: inherit;
    font-weight: 650;
    cursor: pointer;
  }
  .seg button.on {
    background: var(--surface);
    box-shadow: var(--shadow);
  }
  .pw {
    display: flex;
    gap: 6px;
  }
  .pw .input {
    flex: 1;
    min-width: 0;
  }
  .show {
    min-height: 48px;
    padding: 0 14px;
  }
  .choice {
    border: 0;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }
  .opt {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: var(--tap);
    padding: 0 14px;
    border: 1.5px solid var(--line);
    border-radius: 12px;
    cursor: pointer;
  }
  .opt:has(input:checked) {
    border-color: var(--market-2);
    background: var(--market-soft);
  }
  .opt input {
    width: 20px;
    height: 20px;
  }
</style>
